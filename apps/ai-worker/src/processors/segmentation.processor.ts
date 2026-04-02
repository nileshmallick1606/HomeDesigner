import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import * as storage from '../lib/storage';
import { mockSegmentation } from '../models/mock-ai';
import { v4 as uuidv4 } from 'uuid';

const logger = {
  log: (msg: string) => console.log(`[Segmentation] ${msg}`),
  error: (msg: string) => console.error(`[Segmentation] ${msg}`),
};

export async function processSegmentation(job: Job) {
  const { jobId, roomPhotoId, userId } = job.data;
  logger.log(`Processing job ${jobId} for photo ${roomPhotoId}`);

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
    logger.log(`Downloaded photo: ${photo.originalUrl} (${photoBuffer.length} bytes)`);

    // Run mock segmentation
    const maskBuffer = await mockSegmentation(photoBuffer);
    logger.log(`Generated mask: ${maskBuffer.length} bytes`);

    // Upload mask
    const segId = uuidv4();
    const maskKey = `${userId}/segmentation/${segId}/mask.png`;
    const maskUrl = await storage.upload(maskKey, maskBuffer);

    // Create Segmentation record
    await prisma.segmentation.create({
      data: {
        id: segId,
        roomPhotoId,
        maskUrl,
        modelVersion: 'mock-v1',
        status: 'COMPLETED',
        elements: {
          labels: ['wall', 'floor', 'ceiling', 'window', 'door'],
          note: 'Mock segmentation — edge detection only',
        },
      },
    });

    // Update job → COMPLETED
    await prisma.aiJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    logger.log(`Job ${jobId} completed successfully`);
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

    throw error; // BullMQ will retry based on job config
  }
}
