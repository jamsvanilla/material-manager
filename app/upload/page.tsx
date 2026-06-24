import UploadZone from '@/components/UploadZone';

export default function UploadPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">上传素材</h1>
        <p className="text-sm text-gray-500 mt-1">支持 JPG、PNG、GIF、WebP、SVG 格式，单文件最大 50MB</p>
      </div>
      <UploadZone />
    </div>
  );
}
