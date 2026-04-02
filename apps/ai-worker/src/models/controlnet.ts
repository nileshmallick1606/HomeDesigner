import sharp from 'sharp';

const logger = {
  log: (msg: string) => console.log(`[ControlNet] ${msg}`),
};

/**
 * Generate Canny edge map from image using Sharp
 * This serves as the ControlNet conditioning input
 */
export async function cannyEdges(imageBuffer: Buffer): Promise<Buffer> {
  logger.log('Generating Canny edge map...');

  const edges = await sharp(imageBuffer)
    .grayscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1], // Laplacian edge detection
    })
    .normalize()
    .toBuffer();

  logger.log('Edge map generated');
  return edges;
}

/**
 * Generate simple depth estimation from image using Sharp
 * Uses brightness as depth proxy (lighter = farther, darker = closer)
 */
export async function depthEstimate(imageBuffer: Buffer): Promise<Buffer> {
  logger.log('Generating depth estimate...');

  const depth = await sharp(imageBuffer)
    .grayscale()
    .blur(5)
    .normalize()
    .negate() // Invert: closer objects darker in depth map
    .toBuffer();

  logger.log('Depth estimate generated');
  return depth;
}

/**
 * Prepare ControlNet conditioning image at target resolution
 */
export async function prepareCondition(
  imageBuffer: Buffer,
  type: 'canny' | 'depth',
  width = 512,
  height = 512,
): Promise<Buffer> {
  let condBuffer: Buffer;

  if (type === 'canny') {
    condBuffer = await cannyEdges(imageBuffer);
  } else {
    condBuffer = await depthEstimate(imageBuffer);
  }

  // Resize to SD input resolution
  return sharp(condBuffer)
    .resize(width, height, { fit: 'fill' })
    .raw()
    .toBuffer();
}
