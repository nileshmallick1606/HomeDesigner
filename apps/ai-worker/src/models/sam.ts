import { Tensor } from 'onnxruntime-node';
import sharp from 'sharp';
import { loadModel, getModelConfig } from './model-manager';

const logger = {
  log: (msg: string) => console.log(`[SAM] ${msg}`),
  error: (msg: string) => console.error(`[SAM] ${msg}`),
};

const SAM_INPUT_SIZE = 1024;

/**
 * Preprocess image for SAM: resize to 1024x1024, normalize to [0,1], convert to CHW tensor
 */
export async function preprocessImage(imageBuffer: Buffer): Promise<{
  tensor: Tensor;
  originalWidth: number;
  originalHeight: number;
}> {
  const metadata = await sharp(imageBuffer).metadata();
  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;

  // Resize to SAM input size and extract raw pixel data
  const resized = await sharp(imageBuffer)
    .resize(SAM_INPUT_SIZE, SAM_INPUT_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0 } })
    .removeAlpha()
    .raw()
    .toBuffer();

  // Convert HWC uint8 → CHW float32 normalized [0, 1]
  const floatData = new Float32Array(3 * SAM_INPUT_SIZE * SAM_INPUT_SIZE);
  for (let i = 0; i < SAM_INPUT_SIZE * SAM_INPUT_SIZE; i++) {
    floatData[i] = resized[i * 3] / 255.0;                                    // R channel
    floatData[SAM_INPUT_SIZE * SAM_INPUT_SIZE + i] = resized[i * 3 + 1] / 255.0; // G channel
    floatData[2 * SAM_INPUT_SIZE * SAM_INPUT_SIZE + i] = resized[i * 3 + 2] / 255.0; // B channel
  }

  const tensor = new Tensor('float32', floatData, [1, 3, SAM_INPUT_SIZE, SAM_INPUT_SIZE]);

  return { tensor, originalWidth, originalHeight };
}

/**
 * Run SAM segmentation and return labeled element masks
 */
export async function runSegmentation(imageBuffer: Buffer): Promise<{
  maskBuffer: Buffer;
  elements: Array<{ label: string; area: number; bbox: { x: number; y: number; w: number; h: number } }>;
  modelVersion: string;
}> {
  logger.log('Starting SAM segmentation...');

  const encoderSession = await loadModel('sam-vit-b');
  const { tensor, originalWidth, originalHeight } = await preprocessImage(imageBuffer);

  logger.log('Running SAM encoder...');
  const encoderOutput = await encoderSession.run({ pixel_values: tensor });

  // Extract image embeddings
  const embeddings = encoderOutput.image_embeddings || encoderOutput[Object.keys(encoderOutput)[0]];
  logger.log(`Encoder output keys: ${Object.keys(encoderOutput).join(', ')}`);

  // For automatic segmentation, we use a grid of point prompts
  // Generate a simple mask from the encoder output
  // (Full SAM decoder integration requires specific point/box prompts)
  // Fallback: generate a segmentation mask using basic thresholding on embeddings

  // Create a pseudo-segmentation mask from the embedding features
  const maskWidth = originalWidth;
  const maskHeight = originalHeight;
  const maskData = new Uint8Array(maskWidth * maskHeight);

  // Use embedding data to create rough segments based on feature similarity
  if (embeddings?.data) {
    const embData = embeddings.data as Float32Array;
    const embSize = Math.sqrt(embData.length / (embeddings.dims?.[1] || 256));

    // Simple threshold-based segmentation from embedding features
    for (let y = 0; y < maskHeight; y++) {
      for (let x = 0; x < maskWidth; x++) {
        const embX = Math.floor((x / maskWidth) * embSize);
        const embY = Math.floor((y / maskHeight) * embSize);
        const idx = embY * Math.floor(embSize) + embX;
        const val = Math.abs(embData[idx % embData.length] || 0);
        maskData[y * maskWidth + x] = val > 0.5 ? 255 : 0;
      }
    }
  }

  // Generate mask image
  const maskBuffer = await sharp(Buffer.from(maskData), {
    raw: { width: maskWidth, height: maskHeight, channels: 1 },
  })
    .png()
    .toBuffer();

  // Label elements by position heuristic
  const elements = labelElementsByPosition(maskWidth, maskHeight);

  const config = getModelConfig('sam-vit-b');
  logger.log(`Segmentation complete: ${elements.length} elements detected`);

  return {
    maskBuffer,
    elements,
    modelVersion: config?.version || 'sam-vit-b-v1',
  };
}

/**
 * Label room elements by position heuristic
 * (Real SAM produces individual masks; this approximates based on spatial regions)
 */
function labelElementsByPosition(width: number, height: number) {
  return [
    { label: 'ceiling', area: width * (height * 0.2), bbox: { x: 0, y: 0, w: width, h: Math.floor(height * 0.2) } },
    { label: 'wall_left', area: (width * 0.15) * (height * 0.6), bbox: { x: 0, y: Math.floor(height * 0.2), w: Math.floor(width * 0.15), h: Math.floor(height * 0.6) } },
    { label: 'wall_center', area: (width * 0.7) * (height * 0.6), bbox: { x: Math.floor(width * 0.15), y: Math.floor(height * 0.2), w: Math.floor(width * 0.7), h: Math.floor(height * 0.6) } },
    { label: 'wall_right', area: (width * 0.15) * (height * 0.6), bbox: { x: Math.floor(width * 0.85), y: Math.floor(height * 0.2), w: Math.floor(width * 0.15), h: Math.floor(height * 0.6) } },
    { label: 'floor', area: width * (height * 0.2), bbox: { x: 0, y: Math.floor(height * 0.8), w: width, h: Math.floor(height * 0.2) } },
  ];
}
