'use client';

import { useState, useEffect } from 'react';

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onAction: (action: string, data?: any) => Promise<void>;
}

export default function BulkActionBar({ selectedCount, onClear, onAction }: BulkActionBarProps) {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  const flatCategories = categories.flatMap((c: any) => [c, ...(c.children || [])]);

  async function handleAction(action: string, data?: any) {
    setProcessing(true);
    await onAction(action, data);
    setProcessing(false);
    setShowCategoryDropdown(false);
    setShowTagInput(false);
  }

  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-40 flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">
          已选择 <span className="text-indigo-600">{selectedCount}</span> 个文件
        </span>
        <button
          onClick={onClear}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          取消
        </button>

        <div className="w-px h-6 bg-gray-200" />

        {/* Set category */}
        <div className="relative">
          <button
            onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowTagInput(false); }}
            disabled={processing}
            className="text-sm px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            📁 设置分类
          </button>
          {showCategoryDropdown && (
            <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[180px]">
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
                onClick={() => handleAction('set_category', { category_id: null })}
              >
                清除分类
              </button>
              {flatCategories.map((c: any) => (
                <button
                  key={c.id}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => handleAction('set_category', { category_id: c.id })}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.parent_id ? '  └ ' : ''}{c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add tags */}
        <div className="relative">
          <button
            onClick={() => { setShowTagInput(!showTagInput); setShowCategoryDropdown(false); }}
            disabled={processing}
            className="text-sm px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            🏷️ 添加标签
          </button>
          {showTagInput && (
            <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[220px]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="输入标签，逗号分隔"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      handleAction('add_tags', { tags: tagInput.split(',').map(t => t.trim()).filter(Boolean) });
                      setTagInput('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (tagInput.trim()) {
                      handleAction('add_tags', { tags: tagInput.split(',').map(t => t.trim()).filter(Boolean) });
                      setTagInput('');
                    }
                  }}
                  disabled={!tagInput.trim()}
                  className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Delete */}
        <button
          onClick={() => {
            if (confirm(`确定删除 ${selectedCount} 个文件？此操作不可撤销。`)) {
              handleAction('delete');
            }
          }}
          disabled={processing}
          className="text-sm px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
        >
          🗑️ 删除
        </button>
      </div>
    </div>
  );
}
