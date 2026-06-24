import { NextRequest } from 'next/server';
import { getFiles, createFile, deleteFiles, bulkSetCategory, bulkAddTags, bulkRemoveTags } from '@/lib/db';
import { generateStoredName, getUploadPath, generateThumbnail, getImageDimensions, validateFile } from '@/lib/file-utils';
import { writeFileSync } from 'fs';

// GET /api/files — list files with filters
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category');
  const tags = searchParams.get('tags');
  const q = searchParams.get('q');
  const sort = searchParams.get('sort') || 'created_desc';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '24');

  const result = getFiles({
    category: category ? parseInt(category) : undefined,
    tags: tags || undefined,
    q: q || undefined,
    sort,
    page,
    limit: Math.min(limit, 100),
  });

  return Response.json(result);
}

// POST /api/files — upload file(s)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    // Support single file field 'file' for convenience
    const singleFile = formData.get('file') as File | null;
    const allFiles = files.length > 0 ? files : (singleFile ? [singleFile] : []);

    if (allFiles.length === 0) {
      return Response.json({ error: '请选择要上传的文件' }, { status: 400 });
    }

    // Parse metadata
    const categoryId = formData.get('category_id');
    const description = formData.get('description') as string | null;
    const tagNames = (formData.get('tags') as string || '').split(',').map(t => t.trim()).filter(Boolean);

    const uploaded: any[] = [];

    for (const file of allFiles) {
      const validation = validateFile(file);
      if (!validation.valid) {
        return Response.json({ error: validation.error }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const storedName = generateStoredName(file.name);
      const uploadPath = getUploadPath(storedName);

      writeFileSync(uploadPath, buffer);

      // Generate thumbnail
      await generateThumbnail(storedName);

      // Get dimensions
      const dims = await getImageDimensions(storedName);

      // Create DB record
      const record = createFile({
        filename: file.name,
        stored_name: storedName,
        mime_type: file.type,
        size: file.size,
        width: dims.width,
        height: dims.height,
        category_id: categoryId ? parseInt(categoryId as string) : null,
        description: description || null,
        tags: tagNames,
      });

      uploaded.push(record);
    }

    return Response.json(uploaded.length === 1 ? uploaded[0] : uploaded, { status: 201 });
  } catch (err: any) {
    console.error('Upload error:', err);
    return Response.json({ error: '上传失败: ' + err.message }, { status: 500 });
  }
}
