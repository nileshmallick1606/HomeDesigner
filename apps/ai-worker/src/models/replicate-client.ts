import Replicate from 'replicate';

const logger = {
  log: (msg: string) => console.log(`[Replicate] ${msg}`),
  error: (msg: string) => console.error(`[Replicate] ${msg}`),
};

const TIMEOUT_MS = 120_000; // 120 seconds (RA-DC-5)
const DEFAULT_MODEL = 'stability-ai/sdxl:latest';

/**
 * Check if Replicate API is configured (RA-DC-1, RA-DC-2)
 */
export function isReplicateConfigured(): boolean {
  return !!process.env.REPLICATE_API_TOKEN?.trim();
}

/**
 * Generate a visualization via Replicate Cloud API
 *
 * Sends room photo + prompt → receives AI-generated image URL → downloads as Buffer
 * Falls back by throwing on any error (caller handles fallback)
 */
export async function generateVisualization(
  photoBuffer: Buffer,
  prompt: string,
  negativePrompt: string,
  preset: 'draft' | 'final' = 'draft',
): Promise<{ imageBuffer: Buffer; modelVersion: string }> {
  if (!isReplicateConfigured()) {
    throw new Error('Replicate API token not configured');
  }

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN!.trim(),
  });

  const modelId = process.env.REPLICATE_MODEL_ID || DEFAULT_MODEL;
  const steps = preset === 'final' ? 50 : 20;

  logger.log(`Calling Replicate: model=${modelId}, steps=${steps}, preset=${preset}`);
  logger.log(`Prompt: "${prompt.substring(0, 80)}..."`);

  // Convert photo to base64 data URI
  const base64 = `data:image/webp;base64,${photoBuffer.toString('base64')}`;

  // Call Replicate with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const output = await replicate.run(
      modelId as `${string}/${string}:${string}`,
      {
        input: {
          image: base64,
          prompt: prompt,
          negative_prompt: negativePrompt,
          num_inference_steps: steps,
          guidance_scale: 7.5,
          strength: 0.75, // How much to transform (0=no change, 1=full generation)
          scheduler: 'K_EULER',
        },
      },
    );

    clearTimeout(timeout);

    // Output can be a URL string, array of URLs, or ReadableStream
    let imageUrl: string;
    if (typeof output === 'string') {
      imageUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      imageUrl = String(output[0]);
    } else {
      throw new Error(`Unexpected Replicate output format: ${typeof output}`);
    }

    logger.log(`Replicate returned image URL: ${imageUrl.substring(0, 80)}...`);

    // Download the generated image immediately (RA-DC-3: don't depend on Replicate URL)
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download Replicate image: ${response.status}`);
    }
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    logger.log(`Downloaded: ${imageBuffer.length} bytes`);

    // Extract model name for version tracking
    const modelName = modelId.split(':')[0] || modelId;

    return {
      imageBuffer,
      modelVersion: `replicate-${modelName.replace('/', '-')}`,
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Replicate timeout after ${TIMEOUT_MS / 1000}s`);
    }
    throw err;
  }
}
