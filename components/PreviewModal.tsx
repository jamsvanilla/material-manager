'use client';

import { FileWithMeta } from '@/lib/types';
import { useState, useEffect, useCallback } from 'react';
import TagInput from './TagInput';

interface PreviewModalProps {
  file: FileWithMeta | null;
  files: FileWithMeta[];
  onClose: () => void;
  onNavigate: (file: FileWithMeta) => void;
  onUpdate?: () => void; // refresh parent after edits
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export default function PreviewModal({ file, files, onClose, onNavigate, onUpdate }: PreviewModalProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [editFilename, setEditFilename] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const currentIndex = file ? files.findIndex(f => f.id === file.id) : -1;

  // Reset edit state when file changes
  useEffect(() => {
    if (file) {
      setEditFilename(file.filename);
      setEditDescription(file.description || '');
      setEditTags(file.tags?.map(t => t.name) || []);
      setEditCategoryId(file.category_id ? String(file.category_id) : '');
      setShowEdit(false);
    }
  }, [file]);

  // Load categories and tags
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {});
    fetch('/api/tags').then(r => r.json()).then((t: any[]) => setAllTags(t.map(x => x.name))).catch(() => {});
  }, []);

  const goNext = useCallback(() => {
    if (files.length === 0) return;
    const next = (currentIndex + 1) % files.length;
    onNavigate(files[next]);
  }, [currentIndex, files, onNavigate]);

  const goPrev = useCallback(() => {
    if (files.length === 0) return;
    const prev = (currentIndex - 1 + files.length) % files.length;
    onNavigate(files[prev]);
  }, [currentIndex, files, onNavigate]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!file) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (showEdit) return; // Disable nav when editing
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowLeft': goPrev(); break;
        case 'ArrowRight': goNext(); break;
        case 'e': if (!e.metaKey && !e.ctrlKey) setShowEdit(true); break;
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [file, onClose, goNext, goPrev, showEdit]);

  async function handleSave() {
    if (!file) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: editFilename,
          description: editDescription,
          category_id: editCategoryId ? parseInt(editCategoryId) : null,
          tags: editTags,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onNavigate(updated);
        onUpdate?.();
        setShowEdit(false);
      }
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!file) return;
    if (!confirm(`确定删除「${file.filename}」？此操作不可撤销。`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/files/${file.id}`, { method: 'DELETE' });
      if (res.ok) {
        onUpdate?.();
        // Navigate to next or close
        if (files.length <= 1) {
          onClose();
        } else {
          goNext();
        }
      }
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeleting(false);
    }
  }

  const flatCategories = categories.flatMap((c: any) => [c, ...(c.children || [])]);

  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex"
      onClick={(e) => { if (!showEdit) onClose(); }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-20"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 text-white/70 text-sm z-20">
        {currentIndex + 1} / {files.length}
      </div>

      {/* Manage button */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowEdit(!showEdit); }}
        className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors z-20 ${
          showEdit
            ? 'bg-white text-gray-900'
            : 'bg-white/10 text-white hover:bg-white/20'
        }`}
      >
        {showEdit ? '返回预览' : '管理 · E'}
      </button>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Previous */}
        {!showEdit && files.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Next */}
        {!showEdit && files.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        <div
          className={`flex items-center justify-center transition-all duration-300 ${showEdit ? 'max-w-[55vw]' : 'max-w-[85vw]'} max-h-[85vh]`}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={`/api/files/${file.id}/thumbnail`}
            alt={file.filename}
            className="preview-image max-w-full max-h-[85vh] object-contain rounded-lg"
          />
        </div>
      </div>

      {/* Edit panel */}
      {showEdit && (
        <div
          className="w-96 bg-white h-full overflow-y-auto flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-900">编辑素材</h2>

            {/* Filename */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">文件名</label>
              <input
                type="text"
                value={editFilename}
                onChange={(e) => setEditFilename(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">描述</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                placeholder="添加描述..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">分类</label>
              <select
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">未分类</option>
                {flatCategories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? '  └ ' : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">标签</label>
              <TagInput
                tags={editTags}
                onChange={setEditTags}
                suggestions={allTags}
                placeholder="添加标签..."
              />
            </div>

            {/* File info */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>大小</span>
                <span>{formatSize(file.size)}</span>
              </div>
              {file.width && file.height && (
                <div className="flex justify-between">
                  <span>尺寸</span>
                  <span>{file.width} × {file.height}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>格式</span>
                <span>{file.mime_type}</span>
              </div>
              <div className="flex justify-between">
                <span>上传时间</span>
                <span>{new Date(file.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存修改'}
            </button>

            {/* Delete */}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full py-2.5 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {deleting ? '删除中...' : '🗑️ 删除素材'}
            </button>
          </div>
        </div>
      )}

      {/* Bottom info bar (when not editing) */}
      {!showEdit && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-4xl mx-auto flex items-center gap-4 text-white">
            <div className="flex-1">
              <h2 className="text-lg font-medium">{file.filename}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-white/70">
                <span>{formatSize(file.size)}</span>
                {file.width && file.height && (
                  <>
                    <span>·</span>
                    <span>{file.width} × {file.height}</span>
                  </>
                )}
                <span>·</span>
                <span>{file.mime_type}</span>
                <span>·</span>
                <span>{new Date(file.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
              {file.tags && file.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {file.tags.map((tag) => (
                    <span key={tag.id} className="px-2 py-0.5 bg-white/15 rounded-md text-xs text-white/80">
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
              {file.description && (
                <p className="text-sm text-white/60 mt-2">{file.description}</p>
              )}
            </div>
            {file.category && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/15 rounded-lg">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: file.category.color }} />
                <span className="text-sm">{file.category.name}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
