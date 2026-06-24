import { NextRequest } from 'next/server';
import { getCategoryById, updateCategory, deleteCategory } from '@/lib/db';

// PATCH /api/categories/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cat = getCategoryById(parseInt(id));
  if (!cat) {
    return Response.json({ error: '分类不存在' }, { status: 404 });
  }
  const body = await request.json();
  const updated = updateCategory(parseInt(id), {
    name: body.name,
    parent_id: body.parent_id,
    color: body.color,
  });
  return Response.json(updated);
}

// DELETE /api/categories/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cat = getCategoryById(parseInt(id));
  if (!cat) {
    return Response.json({ error: '分类不存在' }, { status: 404 });
  }
  deleteCategory(parseInt(id));
  return Response.json({ success: true });
}
