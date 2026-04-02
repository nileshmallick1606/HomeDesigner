import * as fs from 'fs/promises';
import * as path from 'path';

// The API stores uploads at {api-cwd}/uploads/ which is apps/api/uploads/
// Resolve from project root to be reliable regardless of how the worker is started
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'apps', 'api', 'uploads');

console.log(`[Storage] UPLOADS_DIR resolved to: ${UPLOADS_DIR}`);

export async function upload(key: string, body: Buffer): Promise<string> {
  const filePath = path.join(UPLOADS_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, body);
  return `/api/media/files/${key}`;
}

export async function download(key: string): Promise<Buffer> {
  // Key may be a full URL (http://localhost:4000/api/media/files/...) or relative path
  const cleanKey = key.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api\/media\/files\//, '');
  const filePath = path.join(UPLOADS_DIR, cleanKey);

  try {
    return await fs.readFile(filePath);
  } catch {
    console.error(`[Storage] File not found: ${filePath}`);
    console.error(`[Storage] Original key: "${key}" → cleaned: "${cleanKey}"`);

    // List what's in uploads dir to help debug
    try {
      const entries = await fs.readdir(UPLOADS_DIR, { recursive: true });
      console.error(`[Storage] Available files:`, entries.slice(0, 20));
    } catch {
      console.error(`[Storage] UPLOADS_DIR does not exist: ${UPLOADS_DIR}`);
    }

    throw new Error(`File not found: ${cleanKey}`);
  }
}

export function getPublicUrl(key: string): string {
  return `/api/media/files/${key}`;
}
