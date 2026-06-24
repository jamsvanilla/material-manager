import { getAllTags } from '@/lib/db';

// GET /api/tags
export async function GET() {
  const tags = getAllTags();
  return Response.json(tags);
}
