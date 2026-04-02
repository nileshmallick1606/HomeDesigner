import { Tensor, InferenceSession } from 'onnxruntime-node';
import sharp from 'sharp';
import { loadModel, getModelConfig } from './model-manager';

const logger = {
  log: (msg: string) => console.log(`[SAM] ${msg}`),
  error: (msg: string) => console.error(`[SAM] ${msg}`),
};

const SAM_INPUT_SIZE = 1024;

// Colors for segment visualization (up to 10 segments)
const SEGMENT_COLORS = [
  { r: 135, g: 206, b: 235, a: 100 }, // light blue
  { r: 144, g: 238, b: 144, a: 100 }, // light green
  { r: 255, g: 255, b: 150, a: 100 }, // yellow
  { r: 210, g: 180, b: 140, a: 100 }, // tan
  { r: 255, g: 182, b: 193, a: 100 }, // pink
  { r: 186, g: 153, b: 255, a: 100 }, // lavender
  { r: 255, g: 200, b: 120, a: 100 }, // peach
  { r: 150, g: 220, b: 200, a: 100 }, // teal
  { r: 255, g: 160, b: 160, a: 100 }, // salmon
  { r: 200, g: 200, b: 200, a: 100 }, // grey
];

const ROOM_LABELS = ['wall', 'floor', 'ceiling', 'window', 'door', 'furniture', 'fixture', 'counter', 'shelf', 'other'];

/**
 * Preprocess image for SAM encoder
 */
async function preprocessImage(imageBuffer: Buffer): Promise<{
  tensor: Tensor;
  originalWidth: number;
  originalHeight: number;
}> {
  const metadata = await sharp(imageBuffer).metadata();
  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;

  const resized = await sharp(imageBuffer)
    .resize(SAM_INPUT_SIZE, SAM_INPUT_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0 } })
    .removeAlpha()
    .raw()
    .toBuffer();

  const floatData = new Float32Array(3 * SAM_INPUT_SIZE * SAM_INPUT_SIZE);
  for (let i = 0; i < SAM_INPUT_SIZE * SAM_INPUT_SIZE; i++) {
    floatData[i] = resized[i * 3] / 255.0;
    floatData[SAM_INPUT_SIZE * SAM_INPUT_SIZE + i] = resized[i * 3 + 1] / 255.0;
    floatData[2 * SAM_INPUT_SIZE * SAM_INPUT_SIZE + i] = resized[i * 3 + 2] / 255.0;
  }

  return {
    tensor: new Tensor('float32', floatData, [1, 3, SAM_INPUT_SIZE, SAM_INPUT_SIZE]),
    originalWidth,
    originalHeight,
  };
}

/**
 * Run SAM decoder with a single point prompt
 */
async function runDecoder(
  decoderSession: InferenceSession,
  imageEmbeddings: Tensor,
  pointX: number,
  pointY: number,
): Promise<{ mask: Float32Array; score: number; maskH: number; maskW: number } | null> {
  try {
    // Point coordinates (1, 1, 2) — single point
    const pointCoords = new Tensor('float32', new Float32Array([pointX, pointY]), [1, 1, 2]);
    // Point labels: 1 = foreground point
    const pointLabels = new Tensor('float32', new Float32Array([1]), [1, 1]);
    // No mask input
    const maskInput = new Tensor('float32', new Float32Array(256 * 256).fill(0), [1, 1, 256, 256]);
    const hasMaskInput = new Tensor('float32', new Float32Array([0]), [1]);
    // Original image size
    const origImSize = new Tensor('float32', new Float32Array([SAM_INPUT_SIZE, SAM_INPUT_SIZE]), [2]);

    const feeds: Record<string, Tensor> = {
      image_embeddings: imageEmbeddings,
      point_coords: pointCoords,
      point_labels: pointLabels,
      mask_input: maskInput,
      has_mask_input: hasMaskInput,
      orig_im_size: origImSize,
    };

    const output = await decoderSession.run(feeds);

    // Get masks and scores
    const masks = output.masks || output[Object.keys(output)[0]];
    const scores = output.iou_predictions || output[Object.keys(output)[1]];

    if (!masks || !scores) return null;

    const scoreData = scores.data as Float32Array;
    const bestIdx = scoreData.indexOf(Math.max(...scoreData));
    const bestScore = scoreData[bestIdx];

    if (bestScore < 0.5) return null; // Low confidence

    const maskData = masks.data as Float32Array;
    const maskH = masks.dims[2] as number;
    const maskW = masks.dims[3] as number;
    const maskSize = maskH * maskW;

    // Extract the best mask
    const bestMask = new Float32Array(maskSize);
    for (let i = 0; i < maskSize; i++) {
      bestMask[i] = maskData[bestIdx * maskSize + i];
    }

    return { mask: bestMask, score: bestScore, maskH, maskW };
  } catch (err) {
    logger.error(`Decoder error at (${pointX}, ${pointY}): ${err}`);
    return null;
  }
}

/**
 * Label a segment based on its position in the image
 */
function labelSegment(centerY: number, centerX: number, height: number, width: number, area: number): string {
  const relY = centerY / height;
  const relX = centerX / width;
  const relArea = area / (width * height);

  if (relY < 0.25) return 'ceiling';
  if (relY > 0.75) return 'floor';
  if (relArea > 0.15) return 'wall';
  if (relArea < 0.03) return 'fixture';
  if (relX < 0.2 || relX > 0.8) return 'furniture';
  return 'wall';
}

/**
 * Main segmentation function — uses SAM encoder + decoder for real segmentation
 */
export async function runSegmentation(imageBuffer: Buffer): Promise<{
  maskBuffer: Buffer;
  elements: Array<{ label: string; color: string; area: number; bbox: { x: number; y: number; w: number; h: number } }>;
  modelVersion: string;
}> {
  logger.log('Starting SAM segmentation with decoder...');

  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  // Step 1: Run encoder
  const encoderSession = await loadModel('sam-vit-b');
  const { tensor } = await preprocessImage(imageBuffer);

  logger.log('Running SAM encoder...');
  const encoderOutput = await encoderSession.run({ pixel_values: tensor });
  const imageEmbeddings = encoderOutput.image_embeddings || encoderOutput[Object.keys(encoderOutput)[0]];
  logger.log(`Encoder done. Output shape: ${imageEmbeddings.dims?.join('x')}`);

  // Step 2: Try loading decoder
  let decoderSession: InferenceSession | null = null;
  try {
    decoderSession = await loadModel('sam-vit-b-decoder');
    logger.log(`Decoder loaded. Inputs: ${decoderSession.inputNames.join(', ')}`);
  } catch (err) {
    logger.error(`Decoder failed to load: ${err}. Using fallback.`);
  }

  const elements: Array<{ label: string; color: string; area: number; bbox: { x: number; y: number; w: number; h: number } }> = [];
  const maskRGBA = Buffer.alloc(width * height * 4);

  if (decoderSession) {
    // Step 3: Run decoder with grid of point prompts
    const gridSize = 8; // 8x8 = 64 point prompts
    const segments: Array<{ mask: Float32Array; score: number; maskH: number; maskW: number; px: number; py: number }> = [];

    logger.log(`Running decoder with ${gridSize}x${gridSize} point grid...`);

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const px = ((gx + 0.5) / gridSize) * SAM_INPUT_SIZE;
        const py = ((gy + 0.5) / gridSize) * SAM_INPUT_SIZE;

        const result = await runDecoder(decoderSession, imageEmbeddings, px, py);
        if (result && result.score > 0.6) {
          segments.push({ ...result, px, py });
        }
      }
    }

    logger.log(`Decoder produced ${segments.length} segments (from 64 points)`);

    // Step 4: Render segments as colored overlay
    const usedSegments = segments
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10 segments

    for (let si = 0; si < usedSegments.length; si++) {
      const seg = usedSegments[si];
      const color = SEGMENT_COLORS[si % SEGMENT_COLORS.length];
      let pixelCount = 0;
      let minX = width, maxX = 0, minY = height, maxY = 0;
      let sumX = 0, sumY = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Map to mask coordinates
          const mx = Math.floor((x / width) * seg.maskW);
          const my = Math.floor((y / height) * seg.maskH);
          const maskVal = seg.mask[my * seg.maskW + mx];

          if (maskVal > 0) {
            const idx = (y * width + x) * 4;
            // Blend with existing (don't overwrite)
            if (maskRGBA[idx + 3] === 0) {
              maskRGBA[idx] = color.r;
              maskRGBA[idx + 1] = color.g;
              maskRGBA[idx + 2] = color.b;
              maskRGBA[idx + 3] = color.a;
            }
            pixelCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            sumX += x;
            sumY += y;
          }
        }
      }

      if (pixelCount > 100) {
        const centerX = sumX / pixelCount;
        const centerY = sumY / pixelCount;
        const label = labelSegment(centerY, centerX, height, width, pixelCount);

        elements.push({
          label: `${label}_${si}`,
          color: `rgba(${color.r},${color.g},${color.b},${color.a / 255})`,
          area: pixelCount,
          bbox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
        });
      }
    }

    logger.log(`Final segments: ${elements.length}`);
  }

  // Fallback: if decoder produced nothing, use position-based heuristic
  if (elements.length === 0) {
    logger.log('Decoder produced no segments, using position heuristic fallback');

    const regions = [
      { label: 'ceiling', color: SEGMENT_COLORS[0], yStart: 0, yEnd: 0.2, xStart: 0, xEnd: 1 },
      { label: 'wall_left', color: SEGMENT_COLORS[1], yStart: 0.2, yEnd: 0.8, xStart: 0, xEnd: 0.15 },
      { label: 'wall_center', color: SEGMENT_COLORS[2], yStart: 0.2, yEnd: 0.8, xStart: 0.15, xEnd: 0.85 },
      { label: 'wall_right', color: SEGMENT_COLORS[1], yStart: 0.2, yEnd: 0.8, xStart: 0.85, xEnd: 1 },
      { label: 'floor', color: SEGMENT_COLORS[3], yStart: 0.8, yEnd: 1, xStart: 0, xEnd: 1 },
    ];

    for (const r of regions) {
      const yS = Math.floor(height * r.yStart);
      const yE = Math.floor(height * r.yEnd);
      const xS = Math.floor(width * r.xStart);
      const xE = Math.floor(width * r.xEnd);

      for (let y = yS; y < yE; y++) {
        for (let x = xS; x < xE; x++) {
          const idx = (y * width + x) * 4;
          maskRGBA[idx] = r.color.r;
          maskRGBA[idx + 1] = r.color.g;
          maskRGBA[idx + 2] = r.color.b;
          maskRGBA[idx + 3] = r.color.a;
        }
      }

      elements.push({
        label: r.label,
        color: `rgba(${r.color.r},${r.color.g},${r.color.b},${r.color.a / 255})`,
        area: (xE - xS) * (yE - yS),
        bbox: { x: xS, y: yS, w: xE - xS, h: yE - yS },
      });
    }
  }

  // Composite overlay on original photo
  const maskImage = await sharp(maskRGBA, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const maskBuffer = await sharp(imageBuffer)
    .composite([{ input: maskImage, blend: 'over' }])
    .png()
    .toBuffer();

  const config = getModelConfig('sam-vit-b');
  const usedDecoder = elements.length > 0 && elements[0].label.includes('_');
  const modelVersion = usedDecoder ? (config?.version || 'sam-vit-b-v1') : 'sam-heuristic-v1';
  logger.log(`Segmentation complete: ${elements.length} elements, model: ${modelVersion}`);

  return { maskBuffer, elements, modelVersion };
}
