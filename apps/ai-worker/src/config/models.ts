import * as path from 'path';

// Model storage directory — Docker volume or local
const MODELS_DIR = process.env.MODELS_DIR || path.resolve(__dirname, '..', '..', '..', '..', 'models');

export interface ModelConfig {
  name: string;
  url: string;
  filePath: string;
  version: string;
  sizeBytes: number; // approximate
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'sam-vit-b': {
    name: 'SAM ViT-B (Segment Anything)',
    url: 'https://huggingface.co/onnx-community/sam-vit-base/resolve/main/encoder_model.onnx',
    filePath: path.join(MODELS_DIR, 'sam-vit-b-encoder.onnx'),
    version: 'sam-vit-b-v1',
    sizeBytes: 375_000_000,
  },
  'sam-vit-b-decoder': {
    name: 'SAM ViT-B Decoder',
    url: 'https://huggingface.co/onnx-community/sam-vit-base/resolve/main/decoder_model.onnx',
    filePath: path.join(MODELS_DIR, 'sam-vit-b-decoder.onnx'),
    version: 'sam-vit-b-v1',
    sizeBytes: 16_000_000,
  },
  'sd15-unet': {
    name: 'Stable Diffusion 1.5 UNet',
    url: 'https://huggingface.co/onnx-community/stable-diffusion-v1-5/resolve/main/unet/model.onnx',
    filePath: path.join(MODELS_DIR, 'sd15-unet.onnx'),
    version: 'sd15-cn-v1',
    sizeBytes: 1_700_000_000,
  },
  'sd15-vae-decoder': {
    name: 'Stable Diffusion 1.5 VAE Decoder',
    url: 'https://huggingface.co/onnx-community/stable-diffusion-v1-5/resolve/main/vae_decoder/model.onnx',
    filePath: path.join(MODELS_DIR, 'sd15-vae-decoder.onnx'),
    version: 'sd15-cn-v1',
    sizeBytes: 150_000_000,
  },
  'sd15-text-encoder': {
    name: 'Stable Diffusion 1.5 Text Encoder',
    url: 'https://huggingface.co/onnx-community/stable-diffusion-v1-5/resolve/main/text_encoder/model.onnx',
    filePath: path.join(MODELS_DIR, 'sd15-text-encoder.onnx'),
    version: 'sd15-cn-v1',
    sizeBytes: 470_000_000,
  },
  'controlnet-canny': {
    name: 'ControlNet Canny',
    url: 'https://huggingface.co/onnx-community/controlnet-canny-sdv1-5/resolve/main/model.onnx',
    filePath: path.join(MODELS_DIR, 'controlnet-canny.onnx'),
    version: 'sd15-cn-v1',
    sizeBytes: 1_400_000_000,
  },
};

export const MODELS_DIR_PATH = MODELS_DIR;
