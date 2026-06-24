import { NextRequest } from 'next/server';
import { getFileById, updateFile, deleteFile } from '@/lib/db';
import { deleteUploadedFile } from '@/lib/file-utils';

// GET /api/files/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = getFileById(parseInt(id));
  if (!file) {
    return Response.json({ error: '文件不存在' }, { status: 404 });
  }
  return Response.json(file);
}

// PATCH /api/files/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = getFileById(parseInt(id));
  if (!file) {
    return Response.json({ error: '文件不存在' }, { status: 404 });
  }

  const body = await request.json();
  const updated = updateFile(parseInt(id), {
    filename: body.filename,
    category_id: body.category_id,
    description: body.description,
    tags: body.tags,
  });

  return Response.json(updated);
}

// DELETE /api/files/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = getFileById(parseInt(id));
  if (!file) {
    return Response.json({ error: '文件不存在' }, { status: 404 });
  }

  // Delete files from disk
  deleteUploadedFile(file.stored_name);

  // Delete from DB
  deleteFile(parseInt(id));

  return Response.json({ success: true });
}
