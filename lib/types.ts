// ===== Database row types =====

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  color: string;
  created_at: string;
}

export interface CategoryWithCount extends Category {
  count: number;
  children?: CategoryWithCount[];
}

export interface FileRecord {
  id: number;
  filename: string;
  stored_name: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  category_id: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileWithMeta extends FileRecord {
  category: Category | null;
  tags: Tag[];
}

export interface Tag {
  id: number;
  name: string;
}

export interface TagWithCount extends Tag {
  count: number;
}

// ===== API types =====

export interface FileListParams {
  category?: number;
  tags?: string;
  q?: string;
  sort?: 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc' | 'size_desc';
  page?: number;
  limit?: number;
}

export interface FileListResponse {
  files: FileWithMeta[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UploadResult {
  id: number;
  filename: string;
  stored_name: string;
  size: number;
  mime_type: string;
  width: number | null;
  height: number | null;
}

export interface FileUpdatePayload {
  filename?: string;
  category_id?: number | null;
  description?: string | null;
  tags?: string[];
}

export interface BulkActionPayload {
  fileIds: number[];
  action: 'set_category' | 'add_tags' | 'remove_tags' | 'delete';
  category_id?: number;
  tags?: string[];
}

export interface CategoryPayload {
  name: string;
  parent_id?: number | null;
  color?: string;
}

export interface DashboardStats {
  totalFiles: number;
  totalCategories: number;
  totalTags: number;
  totalSize: number;
  recentUploads: FileWithMeta[];
}
