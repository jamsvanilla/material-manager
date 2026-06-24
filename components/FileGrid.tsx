'use client';

import { FileWithMeta } from '@/lib/types';
import FileCard from './FileCard';

interface FileGridProps {
  files: FileWithMeta[];
  selectedIds: Set<number>;
  onSelect: (id: number, shiftKey: boolean) => void;
  onCardClick: (file: FileWithMeta) => void;
  onDelete?: (id: number) => void;
  selectionMode: boolean;
  loading?: boolean;
}

export default function FileGrid({ files, selectedIds, onSelect, onCardClick, onDelete, selectionMode, loading }: FileGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-gray-100" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-lg font-medium">还没有素材</p>
        <p className="text-sm mt-1">上传图片开始管理你的素材库</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          selected={selectedIds.has(file.id)}
          onSelect={onSelect}
          onClick={onCardClick}
          onDelete={onDelete}
          selectionMode={selectionMode}
        />
      ))}
    </div>
  );
}
