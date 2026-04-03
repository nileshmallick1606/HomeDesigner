import { Job } from 'bullmq';
import sharp from 'sharp';
import { prisma } from '../lib/prisma';
import * as storage from '../lib/storage';
import { mockVisualization, addWatermark } from '../models/mock-ai';
import { generateVisualization as generateSD } from '../models/stable-diffusion';
import { isReplicateConfigured, generateVisualization as generateReplicate } from '../models/replicate-client';
import { buildPrompt, getInferenceSteps } from '../models/prompt-builder';
import { v4 as uuidv4 } from 'uuid';

const logger = {
  log: (msg: string) => console.log(`[Visualization] ${msg}`),
  error: (msg: string) => console.error(`[Visualization] ${msg}`),
};

export async function processVisualization(job: Job) {
  const { jobId, roomPhotoId, designId, userId, category, preset } = job.data;
  logger.log(`Processing job ${jobId} for photo ${roomPhotoId}, category: ${category}, preset: ${preset || 'draft'}`);

  try {
    await prisma.aiJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    const photo = await prisma.roomPhoto.findUniqueOrThrow({ where: { id: roomPhotoId } });
    const photoBuffer = await storage.download(photo.originalUrl);
    logger.log(`Downloaded photo: ${photoBuffer.length} bytes`);

    const { positive, negative } = buildPrompt(category || 'OTHER');
    const enableRealAI = process.env.ENABLE_REAL_AI?.trim().toLowerCase() === 'true';

    let resultBuffer: Buffer;
    let modelVersion: string;
    let prompt: string;
    let useWatermark: boolean;

    // ── Three-tier execution: Replicate → Self-hosted SD → Mock ──

    if (isReplicateConfigured()) {
      // TIER 1: Replicate Cloud API (highest quality)
      try {
        logger.log('Tier 1: Calling Replicate Cloud API...');
        const result = await generateReplicate(
          photoBuffer,
          positive,
          negative,
          (preset as 'draft' | 'final') || 'draft',
        );
        resultBuffer = result.imageBuffer;
        modelVersion = result.modelVersion;
        prompt = positive;
        useWatermark = false; // No watermark for Replicate (RA-7)
        logger.log(`Replicate successful: ${modelVersion}`);
      } catch (replicateError) {
        logger.error(`Replicate failed: ${replicateError}`);

        // Fall through to Tier 2
        if (enableRealAI) {
          try {
            logger.log('Tier 2: Falling back to self-hosted SD...');
            const result = await generateSD(
              photoBuffer,
              category || 'OTHER',
              undefined,
              undefined,
              (preset as 'draft' | 'final') || 'draft',
            );
            resultBuffer = result.imageBuffer;
            modelVersion = result.modelVersion;
            prompt = result.prompt;
            useWatermark = false;
            logger.log(`Self-hosted SD successful: ${modelVersion}`);
          } catch (sdError) {
            logger.error(`Self-hosted SD failed: ${sdError}`);
            logger.log('Tier 3: Falling back to mock transforms...');
            resultBuffer = await mockVisualization(photoBuffer, category || 'OTHER');
            modelVersion = 'mock-fallback-v1';
            prompt = `Mock ${category} (Replicate+SD fallback)`;
            useWatermark = true;
          }
        } else {
          logger.log('Tier 3: Falling back to mock transforms...');
          resultBuffer = await mockVisualization(photoBuffer, category || 'OTHER');
          modelVersion = 'mock-fallback-v1';
          prompt = `Mock ${category} (Replicate fallback)`;
          useWatermark = true;
        }
      }
    } else if (enableRealAI) {
      // TIER 2: Self-hosted SD (no Replicate key configured)
      try {
        logger.log('Tier 2: Self-hosted SD (no Replicate key)...');
        const result = await generateSD(
          photoBuffer,
          category || 'OTHER',
          undefined,
          undefined,
          (preset as 'draft' | 'final') || 'draft',
        );
        resultBuffer = result.imageBuffer;
        modelVersion = result.modelVersion;
        prompt = result.prompt;
        useWatermark = false;
      } catch (sdError) {
        logger.error(`Self-hosted SD failed: ${sdError}`);
        resultBuffer = await mockVisualization(photoBuffer, category || 'OTHER');
        modelVersion = 'mock-v1';
        prompt = `Mock ${category} (SD fallback)`;
        useWatermark = true;
      }
    } else {
      // TIER 3: Mock transforms (default)
      logger.log('Tier 3: Mock visualization (no AI configured)');
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

    // Create Visualization record
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
          mode: isReplicateConfigured() ? 'replicate' : enableRealAI ? 'self-hosted' : 'mock',
          timestamp: new Date().toISOString(),
        } as any,
      },
    });

    await prisma.aiJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    logger.log(`Job ${jobId} completed — ${modelVersion}`);
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
