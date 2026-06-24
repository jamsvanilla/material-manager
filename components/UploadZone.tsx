'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import TagInput from './TagInput';

interface UploadFile {
  file: File;
  id: string;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export default function UploadZone() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load categories and tags on mount
  useState(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {});
    fetch('/api/tags').then(r => r.json()).then((t) => setAllTags(t.map((x: any) => x.name))).catch(() => {});
  });

  function addFiles(fileList: FileList | File[]) {
    const newFiles: UploadFile[] = Array.from(fileList)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        file: f,
        id: crypto.randomUUID(),
        preview: URL.createObjectURL(f),
        status: 'pending' as const,
      }));
    setFiles(prev => [...prev, ...newFiles]);
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);

    const formData = new FormData();
    let count = 0;
    for (const f of files) {
      if (f.status === 'pending') {
        formData.append('files', f.file);
        count++;
      }
    }
    if (categoryId) formData.append('category_id', categoryId);
    if (tags.length > 0) formData.append('tags', tags.join(','));
    if (description) formData.append('description', description);

    if (count === 0) {
      setUploading(false);
      return;
    }

    // Mark as uploading
    setFiles(prev => prev.map(f => f.status === 'pending' ? { ...f, status: 'uploading' } : f));

    try {
      const res = await fetch('/api/files', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '上传失败');
      }

      // Mark as done
      setFiles(prev => prev.map(f => f.status === 'uploading' ? { ...f, status: 'done' } : f));

      // Navigate to browse after short delay
      setTimeout(() => router.push('/browse'), 500);
    } catch (err: any) {
      setFiles(prev =>
        prev.map(f => f.status === 'uploading' ? { ...f, status: 'error', error: err.message } : f)
      );
    } finally {
      setUploading(false);
    }
  }

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const flatCategories = categories.flatMap((c: any) => [c, ...(c.children || [])]);

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-medium text-gray-700">拖拽图片到此处上传</p>
            <p className="text-sm text-gray-400 mt-1">或点击选择文件 · 支持 JPG, PNG, GIF, WebP, SVG</p>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-4">
          {/* Metadata inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">分类</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="">未分类</option>
                {flatCategories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? '  └ ' : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">标签</label>
              <TagInput tags={tags} onChange={setTags} suggestions={allTags} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">描述</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="添加描述..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
          </div>

          {/* File previews */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {files.map((f) => (
              <div
                key={f.id}
                className={`relative group rounded-lg border overflow-hidden ${
                  f.status === 'error' ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                }`}
              >
                <img src={f.preview} alt={f.file.name} className="w-full aspect-[4/3] object-cover" />
                <div className="p-2">
                  <p className="text-xs text-gray-700 truncate">{f.file.name}</p>
                  <p className="text-xs text-gray-400">
                    {(f.file.size / 1024).toFixed(0)} KB
                    {f.status === 'done' && ' ✓ 已上传'}
                    {f.status === 'error' && <span className="text-red-500"> ✗ {f.error}</span>}
                    {f.status === 'uploading' && ' ⏳ 上传中...'}
                  </p>
                </div>
                {f.status === 'pending' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Upload button */}
          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={pendingCount === 0 || uploading}
              className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? '上传中...' : `上传 ${pendingCount} 个文件`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
