/**
 * Prompt Builder — Maps (category, roomType, subCategory) to SD prompts
 * Used by the visualization processor for Stable Diffusion inference
 */

const STYLE_MODIFIER = 'photorealistic interior design photography, professional lighting, 4k detail, high quality, sharp focus';

const NEGATIVE_PROMPT = 'blurry, deformed, unrealistic, cartoon, anime, low quality, watermark, text, bad anatomy, ugly, distorted, pixelated, overexposed, underexposed';

const CATEGORY_PROMPTS: Record<string, (sub?: string) => string> = {
  CIVIL: (sub) => {
    const color = sub || 'warm beige';
    return `interior room with ${color} painted walls, smooth finish, same furniture and layout, natural lighting`;
  },
  FURNISHINGS: (sub) => {
    const style = sub || 'modern minimalist';
    return `interior room with ${style} furniture arrangement, comfortable seating, warm ambient lighting, organized space`;
  },
  BATHROOM_CAT: (sub) => {
    const pattern = sub || 'white marble';
    return `bathroom with ${pattern} ceramic tiles on walls and floor, modern chrome fixtures, clean design, bright lighting`;
  },
  KITCHEN_CAT: (sub) => {
    const style = sub || 'contemporary white';
    return `kitchen with ${style} cabinets, quartz countertop, organized layout, modern appliances, pendant lighting`;
  },
  ELECTRICAL: (sub) => {
    const style = sub || 'modern recessed';
    return `interior room with ${style} light fixtures, warm ambient lighting, well-lit space, designer lamps`;
  },
  OTHER: (sub) => {
    const desc = sub || 'renovated modern';
    return `${desc} interior room, clean design, professional renovation, well-maintained`;
  },
};

const CATEGORY_NEGATIVE_EXTRAS: Record<string, string> = {
  CIVIL: ', peeling paint, cracks, stains',
  BATHROOM_CAT: ', dirty, mold, rust, broken tiles',
  KITCHEN_CAT: ', messy, dirty dishes, cluttered',
  ELECTRICAL: ', dark, dimly lit, broken lights',
};

/**
 * Build a prompt for Stable Diffusion based on category
 */
export function buildPrompt(
  category: string,
  subCategory?: string,
  roomType?: string,
): { positive: string; negative: string } {
  const promptFn = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.OTHER;
  const basePrompt = promptFn(subCategory);

  const roomContext = roomType ? `, ${roomType.replace(/_/g, ' ').toLowerCase()} room` : '';
  const positive = `${basePrompt}${roomContext}, ${STYLE_MODIFIER}`;
  const negative = `${NEGATIVE_PROMPT}${CATEGORY_NEGATIVE_EXTRAS[category] || ''}`;

  return { positive, negative };
}

/**
 * Get inference steps based on quality preset
 */
export function getInferenceSteps(preset: 'draft' | 'final' = 'draft'): number {
  return preset === 'final' ? 50 : 20;
}

/**
 * Validate prompt for safety (reject inappropriate content)
 */
export function validatePrompt(text: string): boolean {
  const blocklist = ['nsfw', 'nude', 'explicit', 'violent', 'gore', 'weapon'];
  const lower = text.toLowerCase();
  return !blocklist.some((word) => lower.includes(word));
}
