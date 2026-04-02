import { Job } from 'bullmq';
import sharp from 'sharp';
import { prisma } from '../lib/prisma';
import * as storage from '../lib/storage';
import { mockVisualization, addWatermark } from '../models/mock-ai';
import { generateVisualization } from '../models/stable-diffusion';
import { v4 as uuidv4 } from 'uuid';

const logger = {
  log: (msg: string) => console.log(`[Visualization] ${msg}`),
  error: (msg: string) => console.error(`[Visualization] ${msg}`),
};

export async function processVisualization(job: Job) {
  const { jobId, roomPhotoId, designId, userId, category, preset } = job.data;
  logger.log(`Processing job ${jobId} for photo ${roomPhotoId}, category: ${category}, preset: ${preset || 'draft'}`);

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

    const enableRealAI = process.env.ENABLE_REAL_AI?.trim().toLowerCase() === 'true';
    let resultBuffer: Buffer;
    let modelVersion: string;
    let prompt: string;
    let useWatermark: boolean;

    if (enableRealAI) {
      try {
        logger.log('Attempting SD + ControlNet visualization...');
        const result = await generateVisualization(
          photoBuffer,
          category || 'OTHER',
          undefined,
          undefined,
          (preset as 'draft' | 'final') || 'draft',
        );
        resultBuffer = result.imageBuffer;
        modelVersion = result.modelVersion;
        prompt = result.prompt;
        useWatermark = false; // No watermark for real/enhanced AI
        logger.log(`SD visualization successful: ${modelVersion}`);
      } catch (sdError) {
        logger.error(`SD failed, falling back to mock: ${sdError}`);
        resultBuffer = await mockVisualization(photoBuffer, category || 'OTHER');
        modelVersion = 'mock-v1';
        prompt = `Mock ${category} visualization (SD fallback)`;
        useWatermark = true;
      }
    } else {
      logger.log('Using mock visualization (ENABLE_REAL_AI not set)');
      resultBuffer = await mockVisualization(photoBuffer, category || 'OTHER');
      modelVersion = 'mock-v1';
      prompt = `Mock ${category} visualization`;
      useWatermark = true;
    }

    // Add watermark only for mock outputs
    if (useWatermark) {
      resultBuffer = await addWatermark(resultBuffer);
      logger.log('Added watermark (mock mode)');
    }

    // Upload result
    const vizId = uuidv4();
    const resultKey = `${userId}/visualizations/${vizId}/result.webp`;
    const imageUrl = await storage.upload(resultKey, resultBuffer);

    // Generate thumbnail
    const thumbBuffer = await sharp(resultBuffer)
      .resize(600, undefined, { fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer();
    const thumbKey = `${userId}/visualizations/${vizId}/thumb.webp`;
    const thumbnailUrl = await storage.upload(thumbKey, thumbBuffer);

    // Create Visualization record (AI-DC-4: model version tracking)
    await prisma.visualization.create({
      data: {
        id: vizId,
        designId,
        imageUrl,
        thumbnailUrl,
        prompt,
        modelVersion,
        status: 'COMPLETED',
        generationParams: {
          category,
          preset: preset || 'draft',
          mode: enableRealAI ? 'real' : 'mock',
          timestamp: new Date().toISOString(),
        } as any,
      },
    });

    // Update job → COMPLETED
    await prisma.aiJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    logger.log(`Job ${jobId} completed — visualization ${vizId} (${modelVersion})`);
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
