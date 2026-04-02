import * as fs from 'fs/promises';
import * as path from 'path';
import { InferenceSession } from 'onnxruntime-node';
import { MODEL_CONFIGS, MODELS_DIR_PATH, type ModelConfig } from '../config/models';

const logger = {
  log: (msg: string) => console.log(`[ModelManager] ${msg}`),
  error: (msg: string) => console.error(`[ModelManager] ${msg}`),
};

// In-memory session cache with idle timeout
const sessionCache = new Map<string, { session: InferenceSession; lastUsed: number }>();
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (AI-DC-5)

/**
 * Check if a model file is already downloaded
 */
export async function isModelDownloaded(modelKey: string): Promise<boolean> {
  const config = MODEL_CONFIGS[modelKey];
  if (!config) return false;
  try {
    await fs.access(config.filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download a model from HuggingFace to local cache (AI-DC-1: lazy download)
 */
export async function downloadModel(modelKey: string): Promise<string> {
  const config = MODEL_CONFIGS[modelKey];
  if (!config) throw new Error(`Unknown model: ${modelKey}`);

  // Check if already exists
  if (await isModelDownloaded(modelKey)) {
    logger.log(`Model already cached: ${config.name}`);
    return config.filePath;
  }

  // Ensure directory exists
  await fs.mkdir(path.dirname(config.filePath), { recursive: true });

  logger.log(`Downloading ${config.name} (~${Math.round(config.sizeBytes / 1_000_000)}MB) from ${config.url}...`);

  try {
    const response = await fetch(config.url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(config.filePath, buffer);

    logger.log(`Downloaded ${config.name}: ${Math.round(buffer.length / 1_000_000)}MB → ${config.filePath}`);
    return config.filePath;
  } catch (error) {
    logger.error(`Failed to download ${config.name}: ${error}`);
    // Clean up partial file
    try { await fs.unlink(config.filePath); } catch { /* ignore */ }
    throw error;
  }
}

/**
 * Load an ONNX model into an InferenceSession (with caching)
 */
export async function loadModel(modelKey: string): Promise<InferenceSession> {
  // Check cache
  const cached = sessionCache.get(modelKey);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.session;
  }

  // Ensure model is downloaded
  const filePath = await downloadModel(modelKey);

  logger.log(`Loading ONNX session: ${modelKey}...`);
  const session = await InferenceSession.create(filePath, {
    executionProviders: ['cpu'],
  });

  sessionCache.set(modelKey, { session, lastUsed: Date.now() });
  logger.log(`Loaded: ${modelKey} (${session.inputNames.join(', ')} → ${session.outputNames.join(', ')})`);

  return session;
}

/**
 * Unload idle models from memory (AI-DC-5)
 */
export function unloadIdleModels(): void {
  const now = Date.now();
  for (const [key, entry] of sessionCache.entries()) {
    if (now - entry.lastUsed > IDLE_TIMEOUT_MS) {
      logger.log(`Unloading idle model: ${key}`);
      sessionCache.delete(key);
      // InferenceSession doesn't have explicit dispose in all versions
      // GC will reclaim memory
    }
  }
}

/**
 * Get model config
 */
export function getModelConfig(modelKey: string): ModelConfig | undefined {
  return MODEL_CONFIGS[modelKey];
}

// Periodically check for idle models
setInterval(unloadIdleModels, 60_000);
