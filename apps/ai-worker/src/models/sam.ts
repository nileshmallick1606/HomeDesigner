import { Tensor, InferenceSession } from 'onnxruntime-node';
import sharp from 'sharp';
import { loadModel, getModelConfig } from './model-manager';

const logger = {
  log: (msg: string) => console.log(`[SAM] ${msg}`),
  error: (msg: string) => console.error(`[SAM] ${msg}`),
};

const SAM_INPUT_SIZE = 1024;
const MASK_THRESHOLD = 0.0;

const SEGMENT_COLORS = [
  { r: 135, g: 206, b: 235 },
  { r: 144, g: 238, b: 144 },
  { r: 255, g: 255, b: 150 },
  { r: 210, g: 180, b: 140 },
  { r: 255, g: 182, b: 193 },
  { r: 186, g: 153, b: 255 },
  { r: 255, g: 200, b: 120 },
  { r: 150, g: 220, b: 200 },
  { r: 255, g: 160, b: 160 },
  { r: 200, g: 200, b: 200 },
];

// ─── Preprocessing ──────────────────────────────────────────────

async function preprocessImage(imageBuffer: Buffer) {
  const meta = await sharp(imageBuffer).metadata();
  const origW = meta.width || 800;
  const origH = meta.height || 600;

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
    origW,
    origH,
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
      feeds[name] = new Tensor('float32', Float32Array.from([px, py]), [1, 1, 2]);
    } else if (name.includes('label')) {
      feeds[name] = new Tensor('float32', Float32Array.from([1]), [1, 1]);
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
      logger.error(`Cannot map decoder input "${m}"`);
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
  if (sd[best] < 0.5) return null;

  const h = masks.dims[2] as number;
  const w = masks.dims[3] as number;
  const slice = new Float32Array(h * w);
  const off = best * h * w;
  for (let i = 0; i < h * w; i++) slice[i] = (masks.data as Float32Array)[off + i];

  return { mask: slice, score: sd[best], h, w };
}

// ─── Label by centroid position ─────────────────────────────────

function labelByPosition(cy: number, cx: number, imgH: number, imgW: number): string {
  const ry = cy / imgH;
  if (ry < 0.22) return 'ceiling';
  if (ry > 0.78) return 'floor';
  const rx = cx / imgW;
  if (rx < 0.18 || rx > 0.82) return 'wall_side';
  return 'wall';
}

// ─── Fallback: position-based heuristic ─────────────────────────

function positionFallback(w: number, h: number) {
  const regions = [
    { label: 'ceiling', c: SEGMENT_COLORS[0], y0: 0, y1: 0.2, x0: 0, x1: 1 },
    { label: 'wall_left', c: SEGMENT_COLORS[1], y0: 0.2, y1: 0.8, x0: 0, x1: 0.15 },
    { label: 'wall_center', c: SEGMENT_COLORS[2], y0: 0.2, y1: 0.8, x0: 0.15, x1: 0.85 },
    { label: 'wall_right', c: SEGMENT_COLORS[1], y0: 0.2, y1: 0.8, x0: 0.85, x1: 1 },
    { label: 'floor', c: SEGMENT_COLORS[3], y0: 0.8, y1: 1, x0: 0, x1: 1 },
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
  try {
    const enc = await loadModel('sam-vit-b');
    const { tensor } = await preprocessImage(imageBuffer);
    logger.log('Running SAM encoder …');
    const raw = await enc.run({ pixel_values: tensor });
    encoderOuts = {};
    for (const k of Object.keys(raw)) {
      encoderOuts[k] = raw[k];
      logger.log(`  encoder output "${k}" shape ${raw[k].dims?.join('×')}`);
    }
  } catch (e) {
    logger.error(`Encoder failed: ${e}`);
  }

  /* ── 2. Decoder (if encoder succeeded) ─────────────────── */
  type Seg = { mask: Float32Array; score: number; h: number; w: number };
  const segments: Seg[] = [];

  if (encoderOuts) {
    try {
      const dec = await loadModel('sam-vit-b-decoder');
      logger.log(`Decoder inputs : ${dec.inputNames.join(', ')}`);
      logger.log(`Decoder outputs: ${dec.outputNames.join(', ')}`);

      const GRID = 8;
      let tried = 0, accepted = 0;

      for (let gy = 0; gy < GRID; gy++) {
        for (let gx = 0; gx < GRID; gx++) {
          const px = ((gx + 0.5) / GRID) * SAM_INPUT_SIZE;
          const py = ((gy + 0.5) / GRID) * SAM_INPUT_SIZE;
          tried++;
          try {
            const seg = await decodePoint(dec, encoderOuts, px, py);
            if (seg) { segments.push(seg); accepted++; }
          } catch (err) {
            if (tried === 1) logger.error(`Decoder point error: ${err}`);
          }
        }
      }
      logger.log(`Decoder: ${accepted}/${tried} points produced segments`);
    } catch (e) {
      logger.error(`Decoder load/run failed: ${e}`);
    }
  }

  /* ── 3. Build colour overlay ───────────────────────────── */
  const rgba = Buffer.alloc(imgW * imgH * 4);
  const elements: Array<{
    label: string; color: string; area: number;
    bbox: { x: number; y: number; w: number; h: number };
  }> = [];

  if (segments.length > 0) {
    const top = segments.sort((a, b) => b.score - a.score).slice(0, 10);

    for (let si = 0; si < top.length; si++) {
      const seg = top[si];
      const col = SEGMENT_COLORS[si % SEGMENT_COLORS.length];
      let area = 0, minX = imgW, maxX = 0, minY = imgH, maxY = 0, sumX = 0, sumY = 0;

      for (let y = 0; y < imgH; y++) {
        for (let x = 0; x < imgW; x++) {
          const mx = Math.floor((x / imgW) * seg.w);
          const my = Math.floor((y / imgH) * seg.h);
          if (seg.mask[my * seg.w + mx] > MASK_THRESHOLD) {
            const i = (y * imgW + x) * 4;
            if (rgba[i + 3] === 0) {
              rgba[i] = col.r; rgba[i+1] = col.g; rgba[i+2] = col.b; rgba[i+3] = 100;
            }
            area++;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
            sumX += x; sumY += y;
          }
        }
      }
      if (area > 200) {
        const label = labelByPosition(sumY / area, sumX / area, imgH, imgW);
        elements.push({
          label: `${label}_${si}`,
          color: `rgba(${col.r},${col.g},${col.b},0.39)`,
          area,
          bbox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
        });
      }
    }
    logger.log(`Rendered ${elements.length} segment overlays`);
  }

  if (elements.length === 0) {
    logger.log('No decoder segments — using position heuristic');
    const fb = positionFallback(imgW, imgH);
    fb.rgba.copy(rgba);
    elements.push(...fb.elements);
  }

  /* ── 4. Composite on original photo ────────────────────── */
  const overlay = await sharp(rgba, { raw: { width: imgW, height: imgH, channels: 4 } })
    .png().toBuffer();

  const maskBuffer = await sharp(imageBuffer)
    .composite([{ input: overlay, blend: 'over' }])
    .png().toBuffer();

  const version = segments.length > 0
    ? (getModelConfig('sam-vit-b')?.version || 'sam-vit-b-v1')
    : 'sam-heuristic-v1';

  logger.log(`Done — ${elements.length} elements, model ${version}`);
  return { maskBuffer, elements, modelVersion: version };
}
