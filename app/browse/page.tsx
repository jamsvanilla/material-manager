'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import FileGrid from '@/components/FileGrid';
import SearchBar from '@/components/SearchBar';
import BulkActionBar from '@/components/BulkActionBar';
import PreviewModal from '@/components/PreviewModal';
import { FileWithMeta, FileListResponse } from '@/lib/types';

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileWithMeta | null>(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Filter state from URL
  const category = searchParams.get('category') || '';
  const tags = searchParams.get('tags') || '';
  const q = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'created_desc';
  const page = parseInt(searchParams.get('page') || '1');

  const loadFiles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (tags) params.set('tags', tags);
    if (q) params.set('q', q);
    params.set('sort', sort);
    params.set('page', String(page));
    params.set('limit', '24');

    try {
      const res = await fetch(`/api/files?${params.toString()}`);
      const data: FileListResponse = await res.json();
      setFiles(data.files);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to load files', err);
    } finally {
      setLoading(false);
    }
  }, [category, tags, q, sort, page]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Clear selections when filters change
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [category, tags, q]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'page') params.delete('page'); // Reset page on filter change
    router.push(`/browse?${params.toString()}`);
  }

  function handleSelect(id: number, shiftKey: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) setSelectionMode(false);
      } else {
        // Shift-select range
        if (shiftKey && lastSelectedIndex !== null) {
          const currentIndex = files.findIndex(f => f.id === id);
          const start = Math.min(lastSelectedIndex, currentIndex);
          const end = Math.max(lastSelectedIndex, currentIndex);
          for (let i = start; i <= end; i++) {
            next.add(files[i].id);
          }
        } else {
          next.add(id);
        }
        setSelectionMode(true);
        setLastSelectedIndex(files.findIndex(f => f.id === id));
      }
      return next;
    });
  }

  function handleCardClick(file: FileWithMeta) {
    if (selectionMode) {
      handleSelect(file.id, false);
    } else {
      setPreviewFile(file);
    }
  }

  async function handleDeleteSingle(id: number) {
    try {
      await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (previewFile?.id === id) setPreviewFile(null);
      loadFiles();
    } catch (err) {
      console.error('Delete failed', err);
    }
  }

  async function handleBulkAction(action: string, data?: any) {
    try {
      const res = await fetch('/api/files/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: Array.from(selectedIds),
          action,
          ...data,
        }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        setSelectionMode(false);
        loadFiles();
      }
    } catch (err) {
      console.error('Bulk action failed', err);
    }
  }

  function handlePreviewNavigate(file: FileWithMeta) {
    setPreviewFile(file);
  }

  const sortOptions = [
    { value: 'created_desc', label: '最新上传' },
    { value: 'created_asc', label: '最早上传' },
    { value: 'name_asc', label: '名称 A-Z' },
    { value: 'name_desc', label: '名称 Z-A' },
    { value: 'size_desc', label: '文件大小' },
  ];

  const activeFilters: { label: string; onRemove: () => void }[] = [];
  if (category) {
    activeFilters.push({ label: `分类: ${category}`, onRemove: () => updateFilter('category', '') });
  }
  if (tags) {
    activeFilters.push({ label: `标签: ${tags}`, onRemove: () => updateFilter('tags', '') });
  }
  if (q) {
    activeFilters.push({ label: `搜索: "${q}"`, onRemove: () => updateFilter('q', '') });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with search */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex-shrink-0">
          {q ? `搜索: "${q}"` : tags ? `标签: ${tags}` : '全部素材'}
        </h1>
        <SearchBar initialValue={q} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-indigo-400"
        >
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Selection toggle */}
        <button
          onClick={() => {
            setSelectionMode(!selectionMode);
            if (selectionMode) setSelectedIds(new Set());
          }}
          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
            selectionMode ? 'bg-indigo-100 text-indigo-700' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {selectionMode ? '退出选择' : '批量选择'}
        </button>

        {/* Select all */}
        {selectionMode && (
          <button
            onClick={() => {
              if (selectedIds.size === files.length) {
                setSelectedIds(new Set());
              } else {
                setSelectedIds(new Set(files.map(f => f.id)));
              }
            }}
            className="text-sm text-indigo-500 hover:text-indigo-600"
          >
            {selectedIds.size === files.length ? '取消全选' : '全选'}
          </button>
        )}

        {/* Active filters */}
        {activeFilters.map((f) => (
          <span
            key={f.label}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm"
          >
            {f.label}
            <button onClick={f.onRemove} className="hover:text-indigo-900 ml-1">×</button>
          </span>
        ))}

        <span className="ml-auto text-sm text-gray-400">
          {total} 个素材
        </span>
      </div>

      {/* File grid */}
      <FileGrid
        files={files}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onCardClick={handleCardClick}
        onDelete={handleDeleteSingle}
        selectionMode={selectionMode}
        loading={loading}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-1">
          <button
            onClick={() => updateFilter('page', String(Math.max(1, page - 1)))}
            disabled={page <= 1}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一页
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => updateFilter('page', String(pageNum))}
                className={`w-10 h-10 rounded-lg text-sm transition-colors ${
                  pageNum === page
                    ? 'bg-indigo-500 text-white'
                    : 'border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => updateFilter('page', String(Math.min(totalPages, page + 1)))}
            disabled={page >= totalPages}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={() => { setSelectedIds(new Set()); setSelectionMode(false); }}
        onAction={handleBulkAction}
      />

      {/* Preview modal */}
      {previewFile && (
        <PreviewModal
          file={previewFile}
          files={files}
          onClose={() => setPreviewFile(null)}
          onNavigate={handlePreviewNavigate}
          onUpdate={loadFiles}
        />
      )}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <BrowseContent />
    </Suspense>
  );
}
