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
 *
 * SPEC-022: Improved transforms for more realistic preview quality.
 */
export async function mockVisualization(
  imageBuffer: Buffer,
  category: string,
): Promise<Buffer> {
  let pipeline = sharp(imageBuffer);

  switch (category) {
    case 'CIVIL':
      // Subtle blue wall paint — desaturate slightly then apply soft blue tint
      pipeline = pipeline.modulate({ saturation: 0.8 }).tint({ r: 140, g: 160, b: 210 });
      break;
    case 'FURNISHINGS':
      // Warmer, richer furniture look — boost brightness and saturation
      pipeline = pipeline.modulate({ brightness: 1.15, saturation: 1.2 });
      break;
    case 'BATHROOM_CAT':
      // Tile-like cyan — tint then boost saturation for depth
      pipeline = pipeline.tint({ r: 150, g: 210, b: 210 }).modulate({ saturation: 1.3 });
      break;
    case 'KITCHEN_CAT':
      // Cabinet green — green tint with slight brightness lift
      pipeline = pipeline.tint({ r: 150, g: 200, b: 150 }).modulate({ brightness: 1.1 });
      break;
    case 'ELECTRICAL':
      // Warm glow — brighten then apply warm amber tint
      pipeline = pipeline.modulate({ brightness: 1.2 }).tint({ r: 240, g: 210, b: 160 });
      break;
    default:
      // Enhanced sepia — lower saturation, slight brightness lift, warm beige tint
      pipeline = pipeline.modulate({ saturation: 0.4, brightness: 1.05 }).tint({ r: 210, g: 185, b: 150 });
      break;
  }

  return pipeline.webp({ quality: 85 }).toBuffer();
}

/**
 * Add "AI Preview" watermark text overlay.
 * SPEC-022: Smaller font, lower opacity, shorter text, bottom-right placement.
 */
export async function addWatermark(imageBuffer: Buffer, text = 'AI Preview'): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;
  const fontSize = Math.max(12, Math.floor(width / 40));

  const boxWidth = fontSize * text.length * 0.55 + 12;
  const boxHeight = fontSize + 8;

  const svgText = `
    <svg width="${width}" height="${height}">
      <rect x="${width - boxWidth - 10}" y="${height - boxHeight - 10}"
            width="${boxWidth}" height="${boxHeight}"
            rx="3" fill="rgba(0,0,0,0.4)"/>
      <text x="${width - 8}" y="${height - 16}"
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
