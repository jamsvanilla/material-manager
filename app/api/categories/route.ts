import { NextRequest } from 'next/server';
import { getCategories, createCategory } from '@/lib/db';

// GET /api/categories
export async function GET() {
  const categories = getCategories();
  return Response.json(categories);
}

// POST /api/categories
export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name || !body.name.trim()) {
    return Response.json({ error: '分类名称不能为空' }, { status: 400 });
  }
  const category = createCategory({
    name: body.name.trim(),
    parent_id: body.parent_id ?? null,
    color: body.color,
  });
  return Response.json(category, { status: 201 });
}
