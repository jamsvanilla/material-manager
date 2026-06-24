import { mkdirSync, existsSync, unlinkSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const THUMB_DIR = path.join(process.cwd(), 'uploads', 'thumbnails');

// Ensure directories exist
try { mkdirSync(UPLOAD_DIR, { recursive: true }); } catch {}
try { mkdirSync(THUMB_DIR, { recursive: true }); } catch {}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function isAllowedFile(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export function generateStoredName(originalName: string): string {
  const ext = getFileExtension(originalName);
  return `${uuidv4()}${ext}`;
}

export function getUploadPath(storedName: string): string {
  return path.join(UPLOAD_DIR, storedName);
}

export function getThumbnailPath(storedName: string): string {
  const ext = path.extname(storedName);
  return path.join(THUMB_DIR, `${path.basename(storedName, ext)}_thumb.jpg`);
}

export async function generateThumbnail(storedName: string): Promise<string | null> {
  const srcPath = getUploadPath(storedName);
  const thumbPath = getThumbnailPath(storedName);

  if (!existsSync(srcPath)) return null;

  try {
    const ext = path.extname(storedName).toLowerCase();

    if (ext === '.svg') {
      // SVGs don't need thumbnails — they scale natively
      return null;
    }

    await sharp(srcPath)
      .resize(400, 300, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);

    return thumbPath;
  } catch (err) {
    console.error(`Failed to generate thumbnail for ${storedName}:`, err);
    return null;
  }
}

export async function getImageDimensions(
  storedName: string
): Promise<{ width: number | null; height: number | null }> {
  const srcPath = getUploadPath(storedName);

  if (!existsSync(srcPath)) return { width: null, height: null };

  try {
    const ext = path.extname(storedName).toLowerCase();
    if (ext === '.svg') {
      return { width: null, height: null };
    }
    const metadata = await sharp(srcPath).metadata();
    return {
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    };
  } catch {
    return { width: null, height: null };
  }
}

export function deleteUploadedFile(storedName: string) {
  const srcPath = getUploadPath(storedName);
  const thumbPath = getThumbnailPath(storedName);

  if (existsSync(srcPath)) unlinkSync(srcPath);
  if (existsSync(thumbPath)) unlinkSync(thumbPath);
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file || file.size === 0) {
    return { valid: false, error: '文件为空' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `文件大小超过限制 (最大 50MB): ${file.name}` };
  }
  if (!isAllowedFile(file.type)) {
    return { valid: false, error: `不支持的文件格式: ${file.name} (${file.type})` };
  }
  return { valid: true };
}
