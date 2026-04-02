import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly useLocal: boolean;
  private readonly localDir: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get('R2_ACCOUNT_ID', '');
    this.useLocal = !accountId;
    this.localDir = path.join(process.cwd(), 'uploads');
    this.apiUrl = this.configService.get('API_URL', 'http://localhost:4000');

    if (this.useLocal) {
      this.logger.warn('R2 not configured — using local filesystem storage at ./uploads');
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    if (this.useLocal) {
      return this.localUpload(key, body);
    }

    // R2 upload would go here when configured
    // For now, always fall back to local
    return this.localUpload(key, body);
  }

  async download(key: string): Promise<Buffer> {
    if (this.useLocal) {
      return this.localDownload(key);
    }
    return this.localDownload(key);
  }

  async delete(key: string): Promise<void> {
    if (this.useLocal) {
      return this.localDelete(key);
    }
    return this.localDelete(key);
  }

  async getSignedUrl(key: string, _expiresIn = 3600): Promise<string> {
    return this.getPublicUrl(key);
  }

  getPublicUrl(key: string): string {
    if (this.useLocal) {
      // Return path-only URL — frontend resolves against API host
      return `/api/media/files/${key}`;
    }
    const publicUrl = this.configService.get('R2_PUBLIC_URL', '');
    return publicUrl ? `${publicUrl}/${key}` : key;
  }

  // --- Local filesystem fallback ---

  private async localUpload(key: string, body: Buffer): Promise<string> {
    const filePath = path.join(this.localDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
    this.logger.log(`Local upload: ${key}`);
    return this.getPublicUrl(key);
  }

  private async localDownload(key: string): Promise<Buffer> {
    const filePath = path.join(this.localDir, key);
    return fs.readFile(filePath);
  }

  private async localDelete(key: string): Promise<void> {
    const filePath = path.join(this.localDir, key);
    try {
      await fs.unlink(filePath);
      this.logger.log(`Local delete: ${key}`);
    } catch {
      // File may not exist, ignore
    }
  }
}
