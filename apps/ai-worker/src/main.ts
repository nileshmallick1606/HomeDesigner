/**
 * AI Worker — BullMQ consumer for AI processing jobs
 *
 * This worker handles:
 * - Room segmentation (SAM) — SPEC-005
 * - Visualization generation (SD + ControlNet) — SPEC-006
 *
 * Placeholder entry point — processors added in later specs.
 */

const logger = {
  log: (msg: string) => console.log(`[AI-Worker] ${msg}`),
  error: (msg: string) => console.error(`[AI-Worker] ${msg}`),
};

async function main() {
  logger.log('AI Worker starting...');
  logger.log('No processors registered yet. Waiting for SPEC-005/006.');
  logger.log('AI Worker ready (idle).');

  // Keep process alive
  process.on('SIGINT', () => {
    logger.log('Shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.log('Shutting down gracefully...');
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error(`Failed to start: ${err}`);
  process.exit(1);
});
