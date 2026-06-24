import { getDashboardStats } from '@/lib/db';

// GET /api/stats
export async function GET() {
  const stats = getDashboardStats();
  return Response.json(stats);
}
