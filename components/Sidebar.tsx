'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  color: string;
  count: number;
  children?: Category[];
}

export default function Sidebar() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<{ id: number; name: string; count: number }[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatParent, setNewCatParent] = useState<number | null>(null);
  const [hoveredCat, setHoveredCat] = useState<number | null>(null);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentCategory = searchParams.get('category');
  const currentTags = searchParams.get('tags');

  useEffect(() => {
    loadCategories();
    loadTags();
  }, []);

  function loadCategories() {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => {
        setCategories(data);
        // Auto-expand categories that have children
        const expandIds = new Set<number>();
        data.forEach((c: Category) => {
          if (c.children && c.children.length > 0) expandIds.add(c.id);
        });
        setExpandedCategories(expandIds);
      })
      .catch(() => {});
  }

  function loadTags() {
    fetch('/api/tags')
      .then(r => r.json())
      .then(setAllTags)
      .catch(() => {});
  }

  function toggleExpand(id: number) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function navigateToCategory(id: number) {
    router.push(`/browse?category=${id}`);
  }

  function navigateToTag(name: string) {
    router.push(`/browse?tags=${encodeURIComponent(name)}`);
  }

  function navigateToBrowse() {
    router.push('/browse');
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName.trim(), parent_id: newCatParent }),
    });
    if (res.ok) {
      setNewCatName('');
      setShowNewCategory(false);
      loadCategories();
    }
  }

  async function handleUpdateCategory(id: number) {
    if (!editName.trim()) return;
    await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingCategory(null);
    loadCategories();
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm('删除此分类？分类下的素材将变为未分类。')) return;
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    loadCategories();
  }

  const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">素材管理</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === '/' && !currentCategory
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          首页
        </Link>

        <Link
          href="/browse"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === '/browse' && !currentCategory && !currentTags
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          全部素材
        </Link>

        <Link
          href="/upload"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === '/upload'
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          上传素材
        </Link>

        {/* Categories */}
        <div className="pt-4">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">分类</span>
            <button
              onClick={() => setShowNewCategory(!showNewCategory)}
              className="w-5 h-5 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors"
              title="新建分类"
            >
              +
            </button>
          </div>

          {/* New category input */}
          {showNewCategory && (
            <div className="px-3 pb-2 space-y-1">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="分类名称"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateCategory();
                  if (e.key === 'Escape') setShowNewCategory(false);
                }}
                autoFocus
              />
              <div className="flex gap-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewCatParent(null)}
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: c }}
                    title="选择颜色"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-0.5">
            {categories.map((cat) => (
              <div key={cat.id}>
                <div
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                    currentCategory === String(cat.id)
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => navigateToCategory(cat.id)}
                  onMouseEnter={() => setHoveredCat(cat.id)}
                  onMouseLeave={() => setHoveredCat(null)}
                >
                  {/* Expand toggle */}
                  {(cat.children && cat.children.length > 0) ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleExpand(cat.id); }}
                      className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className={`w-3 h-3 transition-transform ${expandedCategories.has(cat.id) ? 'rotate-90' : ''}`}
                        fill="currentColor" viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  ) : (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  )}

                  {editingCategory === cat.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1.5 py-0.5 text-xs outline-none focus:border-indigo-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateCategory(cat.id);
                        if (e.key === 'Escape') setEditingCategory(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 truncate">{cat.name}</span>
                  )}

                  <span className="text-xs text-gray-400">{cat.count}</span>

                  {/* Actions (on hover) */}
                  {hoveredCat === cat.id && editingCategory !== cat.id && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategory(cat.id);
                          setEditName(cat.name);
                        }}
                        className="w-5 h-5 rounded hover:bg-gray-200 flex items-center justify-center text-gray-400"
                        title="重命名"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                        className="w-5 h-5 rounded hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-500"
                        title="删除"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Children */}
                {(cat.children && cat.children.length > 0 && expandedCategories.has(cat.id)) && (
                  <div className="ml-4 space-y-0.5">
                    {cat.children.map((child) => (
                      <div
                        key={child.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
                          currentCategory === String(child.id)
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                        onClick={() => navigateToCategory(child.id)}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: child.color }} />
                        <span className="flex-1 truncate text-xs">{child.name}</span>
                        <span className="text-xs text-gray-400">{child.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {categories.length === 0 && (
              <p className="px-3 text-xs text-gray-400">暂无分类</p>
            )}
          </div>
        </div>

        {/* Tags cloud */}
        <div className="pt-4">
          <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">标签</h3>
          <div className="px-3 flex flex-wrap gap-1.5">
            {allTags.slice(0, 20).map((tag) => (
              <button
                key={tag.id}
                onClick={() => navigateToTag(tag.name)}
                className={`px-2 py-0.5 rounded-md text-xs transition-colors ${
                  currentTags?.includes(tag.name)
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tag.name}
                <span className="ml-1 text-gray-400">{tag.count}</span>
              </button>
            ))}
            {allTags.length > 20 && (
              <span className="text-xs text-gray-400">+{allTags.length - 20} 更多</span>
            )}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          Next.js + SQLite
        </div>
      </div>
    </aside>
  );
}
