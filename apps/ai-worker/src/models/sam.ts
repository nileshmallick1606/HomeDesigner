import { Tensor, InferenceSession } from 'onnxruntime-node';
import sharp from 'sharp';
import { loadModel, getModelConfig } from './model-manager';

const logger = {
  log: (msg: string) => console.log(`[SAM] ${msg}`),
  error: (msg: string) => console.error(`[SAM] ${msg}`),
};

const SAM_INPUT_SIZE = 1024;
const MASK_THRESHOLD = 0.0; // SAM outputs logits: >0 = foreground
const IOU_THRESHOLD = 0.5;  // Minimum confidence score
const NMS_OVERLAP = 0.7;    // Skip segments overlapping >70% with accepted ones

const SEGMENT_COLORS = [
  { r: 255, g: 100, b: 100 }, // red
  { r: 100, g: 200, b: 100 }, // green
  { r: 100, g: 150, b: 255 }, // blue
  { r: 255, g: 220, b: 100 }, // yellow
  { r: 200, g: 130, b: 255 }, // purple
  { r: 255, g: 180, b: 130 }, // orange
  { r: 130, g: 220, b: 220 }, // cyan
  { r: 255, g: 150, b: 200 }, // pink
  { r: 180, g: 230, b: 140 }, // lime
  { r: 200, g: 200, b: 200 }, // grey
];

// ─── Preprocessing ──────────────────────────────────────────────

async function preprocessImage(imageBuffer: Buffer) {
  const meta = await sharp(imageBuffer).metadata();
  const origW = meta.width || 800;
  const origH = meta.height || 600;

  // Calculate the actual content region within the 1024x1024 padded canvas
  const scale = Math.min(SAM_INPUT_SIZE / origW, SAM_INPUT_SIZE / origH);
  const contentW = Math.round(origW * scale);
  const contentH = Math.round(origH * scale);
  const offsetX = Math.round((SAM_INPUT_SIZE - contentW) / 2);
  const offsetY = Math.round((SAM_INPUT_SIZE - contentH) / 2);

  const raw = await sharp(imageBuffer)
    .resize(SAM_INPUT_SIZE, SAM_INPUT_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0 },
    })
    .removeAlpha()
    .raw()
    .toBuffer();

  const chw = new Float32Array(3 * SAM_INPUT_SIZE * SAM_INPUT_SIZE);
  const pixels = SAM_INPUT_SIZE * SAM_INPUT_SIZE;
  for (let i = 0; i < pixels; i++) {
    chw[i]              = raw[i * 3]     / 255;
    chw[pixels + i]     = raw[i * 3 + 1] / 255;
    chw[2 * pixels + i] = raw[i * 3 + 2] / 255;
  }

  return {
    tensor: new Tensor('float32', chw, [1, 3, SAM_INPUT_SIZE, SAM_INPUT_SIZE]),
    origW, origH,
    // Content region within the padded 1024x1024 canvas
    contentRegion: { offsetX, offsetY, contentW, contentH },
  };
}

// ─── Decoder helper ─────────────────────────────────────────────

async function decodePoint(
  decoder: InferenceSession,
  encoderOuts: Record<string, Tensor>,
  px: number,
  py: number,
): Promise<{ mask: Float32Array; score: number; h: number; w: number } | null> {
  const feeds: Record<string, Tensor> = {};

  for (const name of decoder.inputNames) {
    if (encoderOuts[name]) {
      feeds[name] = encoderOuts[name];
    } else if (name.includes('point')) {
      feeds[name] = new Tensor('float32', Float32Array.from([px, py]), [1, 1, 1, 2]);
    } else if (name.includes('label')) {
      feeds[name] = new Tensor('int64', BigInt64Array.from([1n]), [1, 1, 1]);
    }
  }

  const missing = decoder.inputNames.filter((n) => !feeds[n]);
  for (const m of missing) {
    if (m === 'mask_input') {
      feeds[m] = new Tensor('float32', new Float32Array(256 * 256), [1, 1, 256, 256]);
    } else if (m === 'has_mask_input') {
      feeds[m] = new Tensor('float32', Float32Array.from([0]), [1]);
    } else if (m.includes('orig_im') || m.includes('image_size')) {
      feeds[m] = new Tensor('float32', Float32Array.from([SAM_INPUT_SIZE, SAM_INPUT_SIZE]), [2]);
    } else {
      return null;
    }
  }

  const out = await decoder.run(feeds);

  const masksKey  = decoder.outputNames.find((n) => n.includes('mask'))  || decoder.outputNames[0];
  const scoresKey = decoder.outputNames.find((n) => n.includes('iou') || n.includes('score')) || decoder.outputNames[1];

  const masks  = out[masksKey];
  const scores = out[scoresKey];
  if (!masks || !scores) return null;

  const sd = scores.data as Float32Array;
  const best = sd.indexOf(Math.max(...sd));
  if (sd[best] < IOU_THRESHOLD) return null;

  const h = masks.dims[2] as number;
  const w = masks.dims[3] as number;
  const slice = new Float32Array(h * w);
  const off = best * h * w;
  for (let i = 0; i < h * w; i++) slice[i] = (masks.data as Float32Array)[off + i];

  return { mask: slice, score: sd[best], h, w };
}

// ─── Non-Maximum Suppression ────────────────────────────────────

function computeOverlap(
  maskA: Uint8Array, maskB: Uint8Array, totalPixels: number,
): number {
  let intersection = 0, unionCount = 0;
  for (let i = 0; i < totalPixels; i++) {
    const a = maskA[i], b = maskB[i];
    if (a || b) unionCount++;
    if (a && b) intersection++;
  }
  return unionCount > 0 ? intersection / unionCount : 0;
}

function binarizeMask(
  mask: Float32Array, maskH: number, maskW: number,
  imgW: number, imgH: number,
  region: { offsetX: number; offsetY: number; contentW: number; contentH: number },
): Uint8Array {
  const binary = new Uint8Array(imgW * imgH);
  for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
      // Map image pixel → mask pixel (accounting for padding)
      const samX = region.offsetX + (x / imgW) * region.contentW;
      const samY = region.offsetY + (y / imgH) * region.contentH;
      const mx = Math.floor((samX / SAM_INPUT_SIZE) * maskW);
      const my = Math.floor((samY / SAM_INPUT_SIZE) * maskH);
      if (mx >= 0 && mx < maskW && my >= 0 && my < maskH) {
        binary[y * imgW + x] = mask[my * maskW + mx] > MASK_THRESHOLD ? 1 : 0;
      }
    }
  }
  return binary;
}

// ─── Label by centroid position ─────────────────────────────────

function labelByPosition(cy: number, cx: number, area: number, imgH: number, imgW: number): string {
  const ry = cy / imgH;
  const relArea = area / (imgW * imgH);
  if (ry < 0.25 && relArea > 0.05) return 'ceiling';
  if (ry > 0.75 && relArea > 0.05) return 'floor';
  if (relArea > 0.15) return 'wall';
  if (relArea < 0.02) return 'fixture';
  const rx = cx / imgW;
  if (rx < 0.2 || rx > 0.8) return 'side_element';
  return 'object';
}

// ─── Fallback ───────────────────────────────────────────────────

function positionFallback(w: number, h: number) {
  const regions = [
    { label: 'ceiling', c: SEGMENT_COLORS[2], y0: 0, y1: 0.2, x0: 0, x1: 1 },
    { label: 'wall_left', c: SEGMENT_COLORS[1], y0: 0.2, y1: 0.8, x0: 0, x1: 0.15 },
    { label: 'wall_center', c: SEGMENT_COLORS[3], y0: 0.2, y1: 0.8, x0: 0.15, x1: 0.85 },
    { label: 'wall_right', c: SEGMENT_COLORS[1], y0: 0.2, y1: 0.8, x0: 0.85, x1: 1 },
    { label: 'floor', c: SEGMENT_COLORS[5], y0: 0.8, y1: 1, x0: 0, x1: 1 },
  ];

  const rgba = Buffer.alloc(w * h * 4);
  const elements: Array<{
    label: string; color: string; area: number;
    bbox: { x: number; y: number; w: number; h: number };
  }> = [];

  for (const r of regions) {
    const ys = Math.floor(h * r.y0), ye = Math.floor(h * r.y1);
    const xs = Math.floor(w * r.x0), xe = Math.floor(w * r.x1);
    for (let y = ys; y < ye; y++)
      for (let x = xs; x < xe; x++) {
        const i = (y * w + x) * 4;
        rgba[i] = r.c.r; rgba[i+1] = r.c.g; rgba[i+2] = r.c.b; rgba[i+3] = 100;
      }
    elements.push({
      label: r.label,
      color: `rgba(${r.c.r},${r.c.g},${r.c.b},0.39)`,
      area: (xe - xs) * (ye - ys),
      bbox: { x: xs, y: ys, w: xe - xs, h: ye - ys },
    });
  }
  return { rgba, elements };
}

// ─── Public API ─────────────────────────────────────────────────

export async function runSegmentation(imageBuffer: Buffer): Promise<{
  maskBuffer: Buffer;
  elements: Array<{
    label: string; color: string; area: number;
    bbox: { x: number; y: number; w: number; h: number };
  }>;
  modelVersion: string;
}> {
  logger.log('Starting SAM segmentation …');
  const meta = await sharp(imageBuffer).metadata();
  const imgW = meta.width || 800;
  const imgH = meta.height || 600;

  /* ── 1. Encoder ────────────────────────────────────────── */
  let encoderOuts: Record<string, Tensor> | null = null;
  let contentRegion = { offsetX: 0, offsetY: 0, contentW: SAM_INPUT_SIZE, contentH: SAM_INPUT_SIZE };

  try {
    const enc = await loadModel('sam-vit-b');
    const preproc = await preprocessImage(imageBuffer);
    contentRegion = preproc.contentRegion;
    logger.log(`Content region: offset(${contentRegion.offsetX},${contentRegion.offsetY}) size(${contentRegion.contentW}×${contentRegion.contentH})`);

    logger.log('Running SAM encoder …');
    const raw = await enc.run({ pixel_values: preproc.tensor });
    encoderOuts = {};
    for (const k of Object.keys(raw)) {
      encoderOuts[k] = raw[k];
      logger.log(`  encoder out "${k}" ${raw[k].dims?.join('×')}`);
    }
  } catch (e) {
    logger.error(`Encoder failed: ${e}`);
  }

  /* ── 2. Decoder ────────────────────────────────────────── */
  type RawSeg = { mask: Float32Array; score: number; h: number; w: number };
  const rawSegments: RawSeg[] = [];

  if (encoderOuts) {
    try {
      const dec = await loadModel('sam-vit-b-decoder');
      logger.log(`Decoder inputs: ${dec.inputNames.join(', ')}`);

      // Place grid points ONLY within the content region (not on black padding)
      const GRID = 6; // 6×6 = 36 points (less than 64, but all on actual content)
      let tried = 0, accepted = 0;

      for (let gy = 0; gy < GRID; gy++) {
        for (let gx = 0; gx < GRID; gx++) {
          // Map grid to content region within 1024×1024 canvas
          const px = contentRegion.offsetX + ((gx + 0.5) / GRID) * contentRegion.contentW;
          const py = contentRegion.offsetY + ((gy + 0.5) / GRID) * contentRegion.contentH;
          tried++;
          try {
            const seg = await decodePoint(dec, encoderOuts, px, py);
            if (seg) { rawSegments.push(seg); accepted++; }
          } catch (err) {
            if (tried === 1) logger.error(`Decoder error: ${err}`);
          }
        }
      }
      logger.log(`Decoder: ${accepted}/${tried} points → segments`);
    } catch (e) {
      logger.error(`Decoder failed: ${e}`);
    }
  }

  /* ── 3. Post-process: binarize + NMS + colour ──────────── */
  const rgba = Buffer.alloc(imgW * imgH * 4);
  const elements: Array<{
    label: string; color: string; area: number;
    bbox: { x: number; y: number; w: number; h: number };
  }> = [];

  if (rawSegments.length > 0) {
    // Binarize all masks to image dimensions (accounting for padding)
    const binaryMasks = rawSegments.map((seg) =>
      binarizeMask(seg.mask, seg.h, seg.w, imgW, imgH, contentRegion),
    );

    // Sort by score descending
    const indices = rawSegments
      .map((_, i) => i)
      .sort((a, b) => rawSegments[b].score - rawSegments[a].score);

    // NMS: keep only non-overlapping segments
    const accepted: number[] = [];
    const totalPixels = imgW * imgH;

    for (const idx of indices) {
      let dominated = false;
      for (const accIdx of accepted) {
        const overlap = computeOverlap(binaryMasks[idx], binaryMasks[accIdx], totalPixels);
        if (overlap > NMS_OVERLAP) { dominated = true; break; }
      }
      if (!dominated) {
        accepted.push(idx);
        if (accepted.length >= 8) break; // Max 8 distinct segments
      }
    }

    logger.log(`NMS: ${rawSegments.length} → ${accepted.length} distinct segments`);

    // Render accepted segments
    for (let si = 0; si < accepted.length; si++) {
      const bMask = binaryMasks[accepted[si]];
      const col = SEGMENT_COLORS[si % SEGMENT_COLORS.length];
      let area = 0, minX = imgW, maxX = 0, minY = imgH, maxY = 0, sumX = 0, sumY = 0;

      for (let y = 0; y < imgH; y++) {
        for (let x = 0; x < imgW; x++) {
          if (bMask[y * imgW + x]) {
            const i = (y * imgW + x) * 4;
            if (rgba[i + 3] === 0) {
              rgba[i] = col.r; rgba[i+1] = col.g; rgba[i+2] = col.b; rgba[i+3] = 110;
            }
            area++;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
            sumX += x; sumY += y;
          }
        }
      }

      if (area > 500) { // Minimum meaningful segment size
        const label = labelByPosition(sumY / area, sumX / area, area, imgH, imgW);
        elements.push({
          label: `${label}_${si}`,
          color: `rgba(${col.r},${col.g},${col.b},0.43)`,
          area,
          bbox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
        });
      }
    }
    logger.log(`Final: ${elements.length} labelled segments`);
  }

  // Fallback
  if (elements.length === 0) {
    logger.log('No decoder segments — position heuristic fallback');
    const fb = positionFallback(imgW, imgH);
    fb.rgba.copy(rgba);
    elements.push(...fb.elements);
  }

  /* ── 4. Composite ──────────────────────────────────────── */
  const overlay = await sharp(rgba, { raw: { width: imgW, height: imgH, channels: 4 } })
    .png().toBuffer();

  const maskBuffer = await sharp(imageBuffer)
    .composite([{ input: overlay, blend: 'over' }])
    .png().toBuffer();

  const version = rawSegments.length > 0
    ? (getModelConfig('sam-vit-b')?.version || 'sam-vit-b-v1')
    : 'sam-heuristic-v1';

  logger.log(`Done — ${elements.length} elements, model ${version}`);
  return { maskBuffer, elements, modelVersion: version };
}
