import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import * as storage from '../lib/storage';
import { mockVisualization, addWatermark } from '../models/mock-ai';
import { v4 as uuidv4 } from 'uuid';

const logger = {
  log: (msg: string) => console.log(`[Visualization] ${msg}`),
  error: (msg: string) => console.error(`[Visualization] ${msg}`),
};

export async function processVisualization(job: Job) {
  const { jobId, roomPhotoId, designId, userId, category } = job.data;
  logger.log(`Processing job ${jobId} for photo ${roomPhotoId}, category: ${category}`);

  try {
    // Update job status → PROCESSING
    await prisma.aiJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    // Download original photo
    const photo = await prisma.roomPhoto.findUniqueOrThrow({
      where: { id: roomPhotoId },
    });

    const photoBuffer = await storage.download(photo.originalUrl);
    logger.log(`Downloaded photo: ${photoBuffer.length} bytes`);

    // Run mock visualization
    let resultBuffer = await mockVisualization(photoBuffer, category || 'OTHER');
    logger.log(`Generated visualization: ${resultBuffer.length} bytes`);

    // Add watermark
    resultBuffer = await addWatermark(resultBuffer);
    logger.log(`Added watermark`);

    // Upload result
    const vizId = uuidv4();
    const resultKey = `${userId}/visualizations/${vizId}/result.webp`;
    const imageUrl = await storage.upload(resultKey, resultBuffer);

    // Generate thumbnail
    const sharp = (await import('sharp')).default;
    const thumbBuffer = await sharp(resultBuffer)
      .resize(600, undefined, { fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer();
    const thumbKey = `${userId}/visualizations/${vizId}/thumb.webp`;
    const thumbnailUrl = await storage.upload(thumbKey, thumbBuffer);

    // Create Visualization record (DC-10: immutable, stores model version)
    await prisma.visualization.create({
      data: {
        id: vizId,
        designId,
        imageUrl,
        thumbnailUrl,
        prompt: `Mock ${category} visualization`,
        modelVersion: 'mock-v1',
        status: 'COMPLETED',
        generationParams: { category, mode: 'mock', timestamp: new Date().toISOString() },
      },
    });

    // Update job → COMPLETED
    await prisma.aiJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    logger.log(`Job ${jobId} completed — visualization ${vizId} created`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Job ${jobId} failed: ${errMsg}`);

    await prisma.aiJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: errMsg,
        attempts: { increment: 1 },
        completedAt: new Date(),
      },
    });

    throw error;
  }
}
