import Database from 'better-sqlite3';
import path from 'path';
import { mkdirSync } from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'material-manager.db');

// Ensure data directory exists
try { mkdirSync(DATA_DIR, { recursive: true }); } catch {}

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initTables(_db);
  }
  return _db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      color TEXT DEFAULT '#6366f1',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      stored_name TEXT NOT NULL UNIQUE,
      mime_type TEXT DEFAULT 'application/octet-stream',
      size INTEGER DEFAULT 0,
      width INTEGER,
      height INTEGER,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS file_tags (
      file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (file_id, tag_id)
    );

    -- FTS5 search index for files
    CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
      filename,
      description,
      content='files',
      content_rowid='id'
    );

    -- Triggers to keep FTS in sync
    CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
      INSERT INTO files_fts(rowid, filename, description) VALUES (new.id, new.filename, new.description);
    END;

    CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
      INSERT INTO files_fts(files_fts, rowid, filename, description) VALUES('delete', old.id, old.filename, old.description);
    END;

    CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
      INSERT INTO files_fts(files_fts, rowid, filename, description) VALUES('delete', old.id, old.filename, old.description);
      INSERT INTO files_fts(rowid, filename, description) VALUES (new.id, new.filename, new.description);
    END;
  `);
}

// ==================== Categories ====================

export function getCategories(): any[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM files WHERE category_id = c.id) as count
    FROM categories c ORDER BY c.name
  `).all() as any[];

  // Build tree
  const map = new Map<number, any>();
  const roots: any[] = [];
  for (const r of rows) {
    map.set(r.id, { ...r, children: [] });
  }
  for (const r of rows) {
    const node = map.get(r.id)!;
    if (r.parent_id && map.has(r.parent_id)) {
      map.get(r.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function getCategoryById(id: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

export function createCategory(data: { name: string; parent_id?: number | null; color?: string }) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO categories (name, parent_id, color) VALUES (?, ?, ?)'
  );
  const result = stmt.run(data.name, data.parent_id ?? null, data.color ?? '#6366f1');
  return getCategoryById(result.lastInsertRowid as number);
}

export function updateCategory(id: number, data: { name?: string; parent_id?: number | null; color?: string }) {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.parent_id !== undefined) { fields.push('parent_id = ?'); values.push(data.parent_id); }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
  if (fields.length === 0) return getCategoryById(id);
  values.push(id);
  db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getCategoryById(id);
}

export function deleteCategory(id: number) {
  const db = getDb();
  // Move children to parent level before deleting
  db.prepare('UPDATE files SET category_id = NULL WHERE category_id = ?').run(id);
  db.prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = ?').run(id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
}

// ==================== Files ====================

export function getFiles(params: {
  category?: number;
  tags?: string;
  q?: string;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  const db = getDb();
  const page = params.page || 1;
  const limit = params.limit || 24;
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const bindings: any[] = [];

  // Category filter (including children)
  if (params.category) {
    const childIds = getCategoryDescendants(params.category);
    const allIds = [params.category, ...childIds];
    where += ` AND f.category_id IN (${allIds.map(() => '?').join(',')})`;
    bindings.push(...allIds);
  }

  // Tag filter (AND logic - file must have ALL specified tags)
  if (params.tags) {
    const tagNames = params.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagNames.length > 0) {
      where += ` AND f.id IN (
        SELECT ft.file_id FROM file_tags ft
        JOIN tags t ON t.id = ft.tag_id
        WHERE t.name IN (${tagNames.map(() => '?').join(',')})
        GROUP BY ft.file_id HAVING COUNT(DISTINCT t.id) = ?
      )`;
      bindings.push(...tagNames, tagNames.length);
    }
  }

  // Full-text search
  if (params.q) {
    where += ` AND f.id IN (SELECT rowid FROM files_fts WHERE files_fts MATCH ?)`;
    bindings.push(`"${params.q}"`);
  }

  // Sort
  let orderBy = 'ORDER BY f.created_at DESC';
  switch (params.sort) {
    case 'created_asc': orderBy = 'ORDER BY f.created_at ASC'; break;
    case 'name_asc': orderBy = 'ORDER BY f.filename ASC'; break;
    case 'name_desc': orderBy = 'ORDER BY f.filename DESC'; break;
    case 'size_desc': orderBy = 'ORDER BY f.size DESC'; break;
  }

  // Count total
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM files f ${where}`).get(...bindings) as any;
  const total = countRow?.total || 0;

  // Fetch files
  const files = db.prepare(`
    SELECT f.* FROM files f ${where} ${orderBy} LIMIT ? OFFSET ?
  `).all(...bindings, limit, offset);

  // Enrich with category and tags
  const enriched = files.map((f: any) => ({
    ...f,
    category: f.category_id ? getCategoryById(f.category_id) : null,
    tags: getFileTags(f.id),
  }));

  return {
    files: enriched,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function getFileById(id: number) {
  const db = getDb();
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as any;
  if (!file) return null;
  return {
    ...file,
    category: file.category_id ? getCategoryById(file.category_id) : null,
    tags: getFileTags(file.id),
  };
}

export function createFile(data: {
  filename: string;
  stored_name: string;
  mime_type: string;
  size: number;
  width?: number | null;
  height?: number | null;
  category_id?: number | null;
  description?: string | null;
  tags?: string[];
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO files (filename, stored_name, mime_type, size, width, height, category_id, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.filename, data.stored_name, data.mime_type, data.size,
    data.width ?? null, data.height ?? null,
    data.category_id ?? null, data.description ?? null
  );
  const fileId = result.lastInsertRowid as number;

  // Set tags
  if (data.tags && data.tags.length > 0) {
    setFileTags(fileId, data.tags);
  }

  return getFileById(fileId);
}

export function updateFile(id: number, data: {
  filename?: string;
  category_id?: number | null;
  description?: string | null;
  tags?: string[];
}) {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.filename !== undefined) { fields.push('filename = ?'); values.push(data.filename); }
  if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE files SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  if (data.tags !== undefined) {
    setFileTags(id, data.tags);
  }
  return getFileById(id);
}

export function deleteFile(id: number) {
  const db = getDb();
  db.prepare('DELETE FROM files WHERE id = ?').run(id);
}

export function deleteFiles(ids: number[]) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM files WHERE id = ?');
  const txn = db.transaction(() => {
    for (const id of ids) stmt.run(id);
  });
  txn();
}

export function bulkSetCategory(fileIds: number[], categoryId: number | null) {
  const db = getDb();
  const stmt = db.prepare("UPDATE files SET category_id = ?, updated_at = datetime('now') WHERE id = ?");
  const txn = db.transaction(() => {
    for (const id of fileIds) stmt.run(categoryId, id);
  });
  txn();
}

export function bulkAddTags(fileIds: number[], tagNames: string[]) {
  const db = getDb();
  const txn = db.transaction(() => {
    for (const fileId of fileIds) {
      const existing = getFileTags(fileId).map(t => t.name);
      const merged = [...new Set([...existing, ...tagNames])];
      setFileTags(fileId, merged);
    }
  });
  txn();
}

export function bulkRemoveTags(fileIds: number[], tagNames: string[]) {
  const db = getDb();
  const tagIds = tagNames.map(n => getOrCreateTag(n).id);
  const stmt = db.prepare('DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?');
  const txn = db.transaction(() => {
    for (const fileId of fileIds) {
      for (const tagId of tagIds) stmt.run(fileId, tagId);
    }
  });
  txn();
}

export function getRecentFiles(limit = 8) {
  const db = getDb();
  const files = db.prepare('SELECT * FROM files ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
  return files.map((f: any) => ({
    ...f,
    category: f.category_id ? getCategoryById(f.category_id) : null,
    tags: getFileTags(f.id),
  }));
}

export function getDashboardStats() {
  const db = getDb();
  const totalFiles = (db.prepare('SELECT COUNT(*) as c FROM files').get() as any).c;
  const totalCategories = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as any).c;
  const totalTags = (db.prepare('SELECT COUNT(*) as c FROM tags').get() as any).c;
  const totalSize = (db.prepare('SELECT COALESCE(SUM(size), 0) as s FROM files').get() as any).s;
  const recentUploads = getRecentFiles(8);
  return { totalFiles, totalCategories, totalTags, totalSize, recentUploads };
}

// ==================== Tags ====================

export function getAllTags(): any[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, (SELECT COUNT(*) FROM file_tags WHERE tag_id = t.id) as count
    FROM tags t ORDER BY count DESC
  `).all();
}

export function getOrCreateTag(name: string) {
  const db = getDb();
  let tag = db.prepare('SELECT * FROM tags WHERE name = ?').get(name) as any;
  if (!tag) {
    const result = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name);
    tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
  }
  return tag;
}

export function getFileTags(fileId: number) {
  const db = getDb();
  return db.prepare(`
    SELECT t.* FROM tags t
    JOIN file_tags ft ON ft.tag_id = t.id
    WHERE ft.file_id = ?
    ORDER BY t.name
  `).all(fileId) as any[];
}

export function setFileTags(fileId: number, tagNames: string[]) {
  const db = getDb();
  const txn = db.transaction(() => {
    db.prepare('DELETE FROM file_tags WHERE file_id = ?').run(fileId);
    for (const name of tagNames) {
      const tag = getOrCreateTag(name.trim());
      db.prepare('INSERT OR IGNORE INTO file_tags (file_id, tag_id) VALUES (?, ?)').run(fileId, tag.id);
    }
  });
  txn();
}

export function deleteTag(id: number) {
  const db = getDb();
  db.prepare('DELETE FROM tags WHERE id = ?').run(id);
}

// ==================== Helpers ====================

function getCategoryDescendants(parentId: number): number[] {
  const db = getDb();
  const ids: number[] = [];
  const queue = [parentId];
  while (queue.length > 0) {
    const pid = queue.shift()!;
    const children = db.prepare('SELECT id FROM categories WHERE parent_id = ?').all(pid) as any[];
    for (const c of children) {
      ids.push(c.id);
      queue.push(c.id);
    }
  }
  return ids;
}

export { getDb };
