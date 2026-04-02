import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import * as storage from '../lib/storage';
import { mockSegmentation } from '../models/mock-ai';
import { runSegmentation } from '../models/sam';
import { isModelDownloaded } from '../models/model-manager';
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
    logger.log(`Downloaded photo: ${photoBuffer.length} bytes`);

    // Try real SAM segmentation, fall back to mock (AI-DC-3)
    let maskBuffer: Buffer;
    let elements: unknown;
    let modelVersion: string;

    const samAvailable = await isModelDownloaded('sam-vit-b');

    if (samAvailable || process.env.ENABLE_REAL_AI === 'true') {
      try {
        logger.log('Attempting real SAM segmentation...');
        const result = await runSegmentation(photoBuffer);
        maskBuffer = result.maskBuffer;
        elements = result.elements;
        modelVersion = result.modelVersion;
        logger.log(`SAM segmentation successful: ${result.elements.length} elements`);
      } catch (samError) {
        logger.error(`SAM failed, falling back to mock: ${samError}`);
        maskBuffer = await mockSegmentation(photoBuffer);
        elements = {
          labels: ['wall', 'floor', 'ceiling', 'window', 'door'],
          note: 'Mock segmentation (SAM fallback)',
        };
        modelVersion = 'mock-v1';
      }
    } else {
      logger.log('SAM model not available, using mock segmentation');
      maskBuffer = await mockSegmentation(photoBuffer);
      elements = {
        labels: ['wall', 'floor', 'ceiling', 'window', 'door'],
        note: 'Mock segmentation — set ENABLE_REAL_AI=true to use SAM',
      };
      modelVersion = 'mock-v1';
    }

    // Upload mask
    const segId = uuidv4();
    const maskKey = `${userId}/segmentation/${segId}/mask.png`;
    await storage.upload(maskKey, maskBuffer);

    // Create Segmentation record (AI-DC-4: model version tracking)
    await prisma.segmentation.create({
      data: {
        id: segId,
        roomPhotoId,
        maskUrl: storage.getPublicUrl(maskKey),
        modelVersion,
        status: 'COMPLETED',
        elements: elements as any,
      },
    });

    // Update job → COMPLETED
    await prisma.aiJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    logger.log(`Job ${jobId} completed (model: ${modelVersion})`);
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
