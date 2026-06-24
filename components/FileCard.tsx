'use client';

import { FileWithMeta } from '@/lib/types';
import { useState } from 'react';

interface FileCardProps {
  file: FileWithMeta;
  selected?: boolean;
  onSelect?: (id: number, shiftKey: boolean) => void;
  onClick?: (file: FileWithMeta) => void;
  onDelete?: (id: number) => void;
  selectionMode?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  return d.toLocaleDateString('zh-CN');
}

export default function FileCard({ file, selected, onSelect, onClick, onDelete, selectionMode }: FileCardProps) {
  const [imgError, setImgError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  function handleClick(e: React.MouseEvent) {
    if (selectionMode && onSelect) {
      e.preventDefault();
      onSelect(file.id, e.shiftKey);
      return;
    }
    onClick?.(file);
  }

  function handleCheckboxClick(e: React.MouseEvent) {
    e.stopPropagation();
    onSelect?.(file.id, e.shiftKey);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm(`确定删除「${file.filename}」？`)) {
      onDelete?.(file.id);
    }
    setShowMenu(false);
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation();
    // Open preview with edit mode — we signal via onClick, PreviewModal handles the rest
    onClick?.(file);
    setShowMenu(false);
  }

  return (
    <div
      className={`group relative bg-white rounded-xl border overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${
        selected
          ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={handleClick}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Selection checkbox */}
      {(selectionMode || selected) && (
        <div
          className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors cursor-pointer ${
            selected ? 'bg-indigo-500 border-indigo-500' : 'bg-white/90 border-gray-300 group-hover:border-indigo-400'
          }`}
          onClick={handleCheckboxClick}
        >
          {selected && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}

      {/* Quick actions (hover) */}
      {!selectionMode && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Menu toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 shadow-sm transition-colors"
            title="更多操作"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>
        </div>
      )}

      {/* Dropdown menu */}
      {showMenu && (
        <div
          className="absolute top-10 right-2 z-20 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[140px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleEdit}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            编辑信息
          </button>
          <button
            onClick={handleDelete}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除
          </button>
        </div>
      )}

      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
        {imgError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <svg className="w-10 h-10 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">无预览</span>
          </div>
        ) : (
          <img
            src={`/api/files/${file.id}/thumbnail`}
            alt={file.filename}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 truncate" title={file.filename}>
          {file.filename}
        </h3>

        <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
          <span>{formatSize(file.size)}</span>
          <span>·</span>
          <span>{formatDate(file.created_at)}</span>
        </div>

        {/* Tags */}
        {file.tags && file.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {file.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                {tag.name}
              </span>
            ))}
            {file.tags.length > 3 && (
              <span className="text-xs text-gray-400">+{file.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Category badge */}
        {file.category && (
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: file.category.color }}
            />
            <span className="text-xs text-gray-500 truncate">{file.category.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
