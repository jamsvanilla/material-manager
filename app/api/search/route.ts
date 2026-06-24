import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/search?q=...
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '8');

  if (!q.trim()) {
    return Response.json({ suggestions: [], results: [] });
  }

  const db = getDb();

  // Search suggestions from filenames + tags
  const suggestions = db.prepare(`
    SELECT DISTINCT filename as text, 'file' as type
    FROM files WHERE filename LIKE ? LIMIT 5
  `).all(`%${q}%`);

  const tagSuggestions = db.prepare(`
    SELECT DISTINCT name as text, 'tag' as type
    FROM tags WHERE name LIKE ? LIMIT 5
  `).all(`%${q}%`);

  // Full-text search results
  const results = db.prepare(`
    SELECT f.id, f.filename, f.stored_name, f.mime_type
    FROM files f
    JOIN files_fts ft ON f.id = ft.rowid
    WHERE files_fts MATCH ?
    ORDER BY rank LIMIT ?
  `).all(`"${q}"`, limit);

  return Response.json({
    suggestions: [...suggestions, ...tagSuggestions],
    results,
  });
}
