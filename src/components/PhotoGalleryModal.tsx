import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  Upload,
  Camera,
  Trash2,
  Check,
  Search,
  Layers,
  Box,
  Copy,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { GalleryPhoto, InventoryNode } from '../types';
import { loadGalleryPhotos, saveGalleryPhoto, deleteGalleryPhoto } from '../utils/storage';
import { compressImageFile } from '../utils/imageCompressor';
import { ImageLightboxModal } from './ImageLightboxModal';

interface PhotoGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: InventoryNode[];
  onSelectPhoto?: (photoUrl: string) => void; // If provided, behaves as a photo picker
  mode?: 'manage' | 'pick';
}

export const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({
  isOpen,
  onClose,
  nodes,
  onSelectPhoto,
  mode = onSelectPhoto ? 'pick' : 'manage',
}) => {
  const [customGallery, setCustomGallery] = useState<GalleryPhoto[]>(() => loadGalleryPhotos());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'custom' | 'items' | 'containers'>('all');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Collect photos from existing nodes
  const nodePhotos = useMemo(() => {
    const list: GalleryPhoto[] = [];
    nodes.forEach((n) => {
      if (n.photos && n.photos.length > 0) {
        n.photos.forEach((url, idx) => {
          list.push({
            id: `node-${n.id}-p-${idx}`,
            dataUrl: url,
            title: `${n.name} (照片 ${idx + 1})`,
            createdAt: n.updatedAt || n.createdAt,
            nodeId: n.id,
            nodeName: n.name,
            isPrivate: n.isPrivate,
            ownerName: n.ownerName,
          });
        });
      }
      if (n.receiptPhotos && n.receiptPhotos.length > 0) {
        n.receiptPhotos.forEach((url, idx) => {
          list.push({
            id: `node-${n.id}-receipt-${idx}`,
            dataUrl: url,
            title: `${n.name} (收據/保修單)`,
            createdAt: n.updatedAt || n.createdAt,
            nodeId: n.id,
            nodeName: n.name,
            isPrivate: n.isPrivate,
            ownerName: n.ownerName,
          });
        });
      }
    });
    return list;
  }, [nodes]);

  // Combine custom uploaded gallery photos + node photos (de-duplicated by dataUrl)
  const allPhotos = useMemo(() => {
    const seenUrls = new Set<string>();
    const combined: GalleryPhoto[] = [];

    // Custom gallery photos first
    customGallery.forEach((p) => {
      if (!seenUrls.has(p.dataUrl)) {
        seenUrls.add(p.dataUrl);
        combined.push(p);
      }
    });

    // Node photos next
    nodePhotos.forEach((p) => {
      if (!seenUrls.has(p.dataUrl)) {
        seenUrls.add(p.dataUrl);
        combined.push(p);
      }
    });

    return combined;
  }, [customGallery, nodePhotos]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return allPhotos.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesNode = p.nodeName?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNode) return false;
      }

      if (filterType === 'custom') {
        return !p.nodeId;
      }
      if (filterType === 'items') {
        const node = nodes.find((n) => n.id === p.nodeId);
        return node && node.type === 'item';
      }
      if (filterType === 'containers') {
        const node = nodes.find((n) => n.id === p.nodeId);
        return node && node.type === 'container';
      }
      return true;
    });
  }, [allPhotos, searchQuery, filterType, nodes]);

  // Handle uploading photos into gallery
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const dataUrl = await compressImageFile(file, {
          maxWidth: 1080,
          maxHeight: 1080,
          quality: 0.82,
        });

        const newPhoto: GalleryPhoto = {
          id: 'gal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          dataUrl,
          title: file.name.replace(/\.[^/.]+$/, '') || '新圖庫照片',
          createdAt: new Date().toISOString(),
        };

        saveGalleryPhoto(newPhoto);
      } catch (err) {
        console.warn('Failed to upload photo into gallery', err);
      }
    }
    setCustomGallery(loadGalleryPhotos());
  };

  const handleDeleteCustomPhoto = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteGalleryPhoto(id);
    setCustomGallery(loadGalleryPhotos());
  };

  const handlePick = (photo: GalleryPhoto) => {
    if (onSelectPhoto) {
      onSelectPhoto(photo.dataUrl);
      onClose();
    } else {
      setPreviewPhoto(photo.dataUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {mode === 'pick' ? '從圖庫選取照片' : '專屬家庭圖庫 (照片庫存中心)'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-teal-400 font-semibold border border-slate-700">
                  {allPhotos.length} 張照片
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {mode === 'pick'
                  ? '點選任意照片即可立即指派至當前物件或容器'
                  : '所有上傳、拍攝與物件照片均保存在此，後續可重複調用與檢索'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Upload Buttons */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            <button
              onClick={() => cameraInputRef.current?.click()}
              title="拍照存入圖庫"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold border border-slate-700"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">拍照入庫</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              title="上傳圖片到圖庫"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 hover:brightness-110 transition flex items-center gap-1.5 text-xs font-bold shadow"
            >
              <Upload className="w-4 h-4" />
              <span>上傳照片</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 sm:px-5 sm:py-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋照片名稱或關聯物件..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-xl font-medium transition ${
                filterType === 'all'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              全部 ({allPhotos.length})
            </button>
            <button
              onClick={() => setFilterType('items')}
              className={`px-3 py-1 rounded-xl font-medium transition ${
                filterType === 'items'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              物品照片
            </button>
            <button
              onClick={() => setFilterType('containers')}
              className={`px-3 py-1 rounded-xl font-medium transition ${
                filterType === 'containers'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              容器空間
            </button>
            <button
              onClick={() => setFilterType('custom')}
              className={`px-3 py-1 rounded-xl font-medium transition ${
                filterType === 'custom'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              圖庫自存 ({customGallery.length})
            </button>
          </div>
        </div>

        {/* Photos Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredPhotos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <ImageIcon className="w-12 h-12 mb-3 stroke-[1.2] text-slate-600" />
              <p className="font-semibold text-slate-300 mb-1">圖庫中尚無相符照片</p>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                您可以點擊右上角「上傳照片」或「拍照入庫」，將家裡的常備物品或容器照片儲存起來隨時取用。
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold text-xs hover:bg-teal-500/30 transition flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>立即上傳第一張照片</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredPhotos.map((photo) => {
                const isCustom = !photo.nodeId;
                return (
                  <div
                    key={photo.id}
                    onClick={() => handlePick(photo)}
                    className="group relative rounded-2xl bg-slate-800/60 border border-slate-700/60 overflow-hidden cursor-pointer hover:border-teal-500/60 hover:shadow-lg transition flex flex-col"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-square bg-slate-950/80 relative overflow-hidden flex items-center justify-center">
                      <img
                        src={photo.dataUrl}
                        alt={photo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />

                      {/* Pick indicator overlay */}
                      {mode === 'pick' && (
                        <div className="absolute inset-0 bg-teal-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 text-teal-300 font-bold text-xs">
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>選用此張</span>
                        </div>
                      )}

                      {/* Custom badge */}
                      {isCustom && (
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-teal-500/80 text-slate-950 font-bold text-[9px] shadow">
                          圖庫自存
                        </span>
                      )}

                      {/* Delete button for custom gallery photos */}
                      {isCustom && (
                        <button
                          onClick={(e) => handleDeleteCustomPhoto(photo.id, e)}
                          title="從圖庫刪除此照片"
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-slate-400 hover:text-rose-400 hover:bg-rose-950/80 transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div className="p-2.5 bg-slate-900/90 flex-1 flex flex-col justify-between">
                      <p className="font-semibold text-xs text-slate-200 truncate group-hover:text-teal-300 transition" title={photo.title}>
                        {photo.title}
                      </p>
                      {photo.nodeName && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          🔗 關聯：{photo.nodeName}
                        </p>
                      )}
                      <p className="text-[9px] text-slate-500 mt-1">
                        {new Date(photo.createdAt).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>
            {mode === 'pick'
              ? '💡 提示：點選任何照片即可自動帶入；亦可直接上傳新照片。'
              : '💡 所有照片儲存於本機圖庫資料庫，離線即可重複調用。'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            關閉圖庫
          </button>
        </div>
      </div>

      {/* Large Preview Modal with Pinch-to-Zoom */}
      <ImageLightboxModal
        isOpen={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        imageUrl={previewPhoto}
        title="圖庫照片檢視"
      />
    </div>
  );
};
