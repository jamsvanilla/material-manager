import { NextRequest } from 'next/server';
import { getFileById } from '@/lib/db';
import { getThumbnailPath, getUploadPath } from '@/lib/file-utils';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

// GET /api/files/[id]/thumbnail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = getFileById(parseInt(id));
  if (!file) {
    return Response.json({ error: '文件不存在' }, { status: 404 });
  }

  // Try thumbnail first, fallback to original
  const thumbPath = getThumbnailPath(file.stored_name);
  const srcPath = getUploadPath(file.stored_name);

  let servePath: string;
  let contentType: string;

  if (existsSync(thumbPath)) {
    servePath = thumbPath;
    contentType = 'image/jpeg';
  } else if (existsSync(srcPath)) {
    servePath = srcPath;
    contentType = file.mime_type || 'application/octet-stream';
  } else {
    return Response.json({ error: '文件未找到' }, { status: 404 });
  }

  const buffer = readFileSync(servePath);
  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
