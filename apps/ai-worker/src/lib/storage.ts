import * as fs from 'fs/promises';
import * as path from 'path';

// Shared storage with the API — reads/writes to apps/api/uploads/
const UPLOADS_DIR = path.resolve(__dirname, '..', '..', '..', 'api', 'uploads');

export async function upload(key: string, body: Buffer): Promise<string> {
  const filePath = path.join(UPLOADS_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, body);
  return `/api/media/files/${key}`;
}

export async function download(key: string): Promise<Buffer> {
  // Key may be a full URL path or just the key
  const cleanKey = key.replace('/api/media/files/', '');
  const filePath = path.join(UPLOADS_DIR, cleanKey);
  return fs.readFile(filePath);
}

export function getPublicUrl(key: string): string {
  return `/api/media/files/${key}`;
}
