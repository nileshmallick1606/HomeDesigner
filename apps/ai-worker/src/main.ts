/**
 * AI Worker — BullMQ consumer for AI processing jobs
 *
 * Consumes two queues:
 * - segmentation: Room photo element detection (mock: edge detection)
 * - visualization: Design visualization generation (mock: color transforms)
 */

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { processSegmentation } from './processors/segmentation.processor';
import { processVisualization } from './processors/visualization.processor';
import { prisma } from './lib/prisma';

const logger = {
  log: (msg: string) => console.log(`[AI-Worker] ${new Date().toISOString()} ${msg}`),
  error: (msg: string) => console.error(`[AI-Worker] ${new Date().toISOString()} ${msg}`),
};

async function main() {
  logger.log('Starting AI Worker...');
  logger.log(`ENABLE_REAL_AI: ${process.env.ENABLE_REAL_AI || 'false (mock mode)'}`);
  logger.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'NOT SET'}`);

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  logger.log(`Connected to Redis: ${redisUrl}`);

  // Segmentation worker
  const segWorker = new Worker('segmentation', processSegmentation, {
    connection,
    concurrency: 2,
  });

  segWorker.on('completed', (job) => {
    logger.log(`Segmentation job ${job.id} completed`);
  });
  segWorker.on('failed', (job, err) => {
    logger.error(`Segmentation job ${job?.id} failed: ${err.message}`);
  });

  // Visualization worker
  const vizWorker = new Worker('visualization', processVisualization, {
    connection,
    concurrency: 2,
  });

  vizWorker.on('completed', (job) => {
    logger.log(`Visualization job ${job.id} completed`);
  });
  vizWorker.on('failed', (job, err) => {
    logger.error(`Visualization job ${job?.id} failed: ${err.message}`);
  });

  logger.log('AI Worker ready — listening on queues: segmentation, visualization');

  // Graceful shutdown
  const shutdown = async () => {
    logger.log('Shutting down gracefully...');
    await segWorker.close();
    await vizWorker.close();
    await prisma.$disconnect();
    await connection.quit();
    logger.log('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error(`Failed to start: ${err}`);
  process.exit(1);
});
