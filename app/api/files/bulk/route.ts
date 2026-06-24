import { NextRequest } from 'next/server';
import { deleteFiles, bulkSetCategory, bulkAddTags, bulkRemoveTags, getFileById } from '@/lib/db';
import { deleteUploadedFile } from '@/lib/file-utils';

// POST /api/files/bulk
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileIds, action, category_id, tags } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return Response.json({ error: '请选择要操作的文件' }, { status: 400 });
    }

    switch (action) {
      case 'set_category': {
        bulkSetCategory(fileIds, category_id ?? null);
        return Response.json({ success: true, affected: fileIds.length });
      }
      case 'add_tags': {
        if (!tags || tags.length === 0) {
          return Response.json({ error: '请指定要添加的标签' }, { status: 400 });
        }
        bulkAddTags(fileIds, tags);
        return Response.json({ success: true, affected: fileIds.length });
      }
      case 'remove_tags': {
        if (!tags || tags.length === 0) {
          return Response.json({ error: '请指定要移除的标签' }, { status: 400 });
        }
        bulkRemoveTags(fileIds, tags);
        return Response.json({ success: true, affected: fileIds.length });
      }
      case 'delete': {
        // Delete files from disk first
        for (const fid of fileIds) {
          const file = getFileById(fid);
          if (file) deleteUploadedFile(file.stored_name);
        }
        deleteFiles(fileIds);
        return Response.json({ success: true, affected: fileIds.length });
      }
      default:
        return Response.json({ error: '不支持的操作: ' + action }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Bulk action error:', err);
    return Response.json({ error: '操作失败: ' + err.message }, { status: 500 });
  }
}
