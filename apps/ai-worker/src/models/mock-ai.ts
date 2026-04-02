import sharp from 'sharp';

/**
 * Mock segmentation: generate an edge-detection mask from the image.
 * In real mode, this would use SAM (Segment Anything Model).
 */
export async function mockSegmentation(imageBuffer: Buffer): Promise<Buffer> {
  // Convert to grayscale, apply edge detection via Laplacian-like kernel
  const mask = await sharp(imageBuffer)
    .grayscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
    })
    .negate()
    .png()
    .toBuffer();

  return mask;
}

/**
 * Mock visualization: apply category-based color transforms.
 * In real mode, this would use Stable Diffusion + ControlNet.
 */
export async function mockVisualization(
  imageBuffer: Buffer,
  category: string,
): Promise<Buffer> {
  let pipeline = sharp(imageBuffer);

  switch (category) {
    case 'CIVIL':
      // Blue tint — simulates wall paint
      pipeline = pipeline.tint({ r: 100, g: 130, b: 200 });
      break;
    case 'FURNISHINGS':
      // Warm brightness boost — simulates new furniture lighting
      pipeline = pipeline.modulate({ brightness: 1.2, saturation: 1.1 });
      break;
    case 'BATHROOM_CAT':
      // Cyan saturation — simulates new tiles
      pipeline = pipeline.tint({ r: 120, g: 200, b: 200 });
      break;
    case 'KITCHEN_CAT':
      // Green tint — simulates cabinet color
      pipeline = pipeline.tint({ r: 130, g: 190, b: 130 });
      break;
    case 'ELECTRICAL':
      // Warm temperature — simulates new lighting
      pipeline = pipeline.modulate({ brightness: 1.15 }).tint({ r: 220, g: 190, b: 140 });
      break;
    default:
      // Sepia tone — generic transformation
      pipeline = pipeline.modulate({ saturation: 0.5 }).tint({ r: 200, g: 170, b: 130 });
      break;
  }

  return pipeline.webp({ quality: 85 }).toBuffer();
}

/**
 * Add "AI Preview (Mock)" watermark text overlay.
 */
export async function addWatermark(imageBuffer: Buffer, text = 'AI Preview (Mock)'): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;
  const fontSize = Math.max(16, Math.floor(width / 25));

  const svgText = `
    <svg width="${width}" height="${height}">
      <rect x="${width - fontSize * text.length * 0.55 - 20}" y="${height - fontSize - 20}"
            width="${fontSize * text.length * 0.55 + 16}" height="${fontSize + 12}"
            rx="4" fill="rgba(0,0,0,0.6)"/>
      <text x="${width - 12}" y="${height - 16}"
            font-family="Arial, sans-serif" font-size="${fontSize}"
            fill="white" text-anchor="end" font-weight="bold">
        ${text}
      </text>
    </svg>
  `;

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svgText), gravity: 'southeast' }])
    .webp({ quality: 85 })
    .toBuffer();
}
