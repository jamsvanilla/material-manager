import { NextRequest } from 'next/server';
import { deleteTag } from '@/lib/db';

// DELETE /api/tags/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteTag(parseInt(id));
  return Response.json({ success: true });
}
