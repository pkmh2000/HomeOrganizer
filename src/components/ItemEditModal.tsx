import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  Trash2,
  Barcode as BarcodeIcon,
  QrCode,
  Calendar,
  DollarSign,
  Link as LinkIcon,
  Tag as TagIcon,
  Check,
  Lock,
  Unlock,
  Layers,
  Box,
  Users,
  AlertTriangle,
  Receipt,
  FileText,
  Clock,
  Sparkles,
  Image as ImageIcon,
  Key,
  Inbox,
  Archive,
  Shield,
  FolderInput,
} from 'lucide-react';
import { InventoryNode, Tag, NodeType, LoanStatus } from '../types';
import { TAG_PALETTE, DEFAULT_MEMBERS } from '../utils/storage';
import { generateQRCodeDataURL } from '../utils/qr';
import { compressImageFile } from '../utils/imageCompressor';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { PhotoGalleryModal } from './PhotoGalleryModal';

interface ItemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeToEdit: InventoryNode | null;
  currentContainerId: string | null;
  allNodes: InventoryNode[];
  onSaveNode: (node: InventoryNode) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDrillIntoContainer?: (containerId: string) => void;
}

export const ItemEditModal: React.FC<ItemEditModalProps> = ({
  isOpen,
  onClose,
  nodeToEdit,
  currentContainerId,
  allNodes,
  onSaveNode,
  onDeleteNode,
  onDrillIntoContainer,
}) => {
  const [formData, setFormData] = useState<Partial<InventoryNode>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'dates' | 'loan' | 'qr'>('basic');
  const [showScanner, setShowScanner] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTagColor, setCustomTagColor] = useState('#0d9488');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);

  const handleAnalyzeWithGemini = async () => {
    const photo = formData.photos && formData.photos[0];
    if (!photo || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/gemini/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: photo }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        let expiryStr: string | undefined = undefined;
        if (d.estimatedDaysToExpiry) {
          const dateObj = new Date();
          dateObj.setDate(dateObj.getDate() + Number(d.estimatedDaysToExpiry));
          expiryStr = dateObj.toISOString().split('T')[0];
        }

        setFormData((prev) => ({
          ...prev,
          name: d.name || prev.name,
          type: d.type === 'container' ? 'container' : (d.type === 'item' ? 'item' : prev.type),
          description: d.description || prev.description,
          expirationDate: expiryStr || prev.expirationDate,
          tags: d.category
            ? [
                ...(prev.tags || []).filter((t) => t.name !== d.category),
                { id: 'tag-gemini-' + Date.now(), name: d.category, color: d.color || '#0d9488' },
              ]
            : prev.tags,
        }));
      }
    } catch (e) {
      console.error('Gemini analyze error:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (nodeToEdit) {
      setFormData({
        ...nodeToEdit,
        photos: nodeToEdit.photos || [],
        receiptPhotos: nodeToEdit.receiptPhotos || [],
        tags: nodeToEdit.tags || [],
        relatedItemIds: nodeToEdit.relatedItemIds || [],
        loanStatus: nodeToEdit.loanStatus || { isLoaned: false },
      });
      // Generate QR code for this node
      const qrPayload = JSON.stringify({
        id: nodeToEdit.id,
        name: nodeToEdit.name,
        type: nodeToEdit.type,
        barcode: nodeToEdit.barcode || '',
      });
      generateQRCodeDataURL(qrPayload).then((url) => setQrDataUrl(url));
    } else {
      // New item creation defaults
      const initial: Partial<InventoryNode> = {
        id: 'node-' + Date.now(),
        parentId: currentContainerId,
        type: 'item',
        name: '',
        quantity: 1,
        unit: '個',
        isPrivate: false,
        photos: [],
        receiptPhotos: [],
        tags: [{ id: 't-new', name: '一般物品', color: '#0d9488' }],
        relatedItemIds: [],
        lastStoredDate: new Date().toISOString().split('T')[0],
        loanStatus: { isLoaned: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setFormData(initial);
      generateQRCodeDataURL(JSON.stringify({ id: initial.id })).then((url) => setQrDataUrl(url));
    }
  }, [nodeToEdit, currentContainerId, isOpen]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isReceipt = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const compressed = await compressImageFile(file, {
          maxWidth: 1080,
          maxHeight: 1080,
          quality: 0.82,
        });
        if (isReceipt) {
          setFormData((prev) => ({
            ...prev,
            receiptPhotos: [...(prev.receiptPhotos || []), compressed],
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            photos: [...(prev.photos || []), compressed],
          }));
        }
      } catch (err) {
        console.warn('Failed to compress image in ItemEditModal', err);
      }
    }
  };

  const removePhoto = (index: number, isReceipt = false) => {
    if (isReceipt) {
      setFormData((prev) => ({
        ...prev,
        receiptPhotos: (prev.receiptPhotos || []).filter((_, i) => i !== index),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        photos: (prev.photos || []).filter((_, i) => i !== index),
      }));
    }
  };

  const toggleTag = (paletteItem: { name: string; color: string }) => {
    const currentTags = formData.tags || [];
    const exists = currentTags.some((t) => t.name === paletteItem.name);
    if (exists) {
      setFormData({
        ...formData,
        tags: currentTags.filter((t) => t.name !== paletteItem.name),
      });
    } else {
      setFormData({
        ...formData,
        tags: [
          ...currentTags,
          { id: 'tag-' + Date.now(), name: paletteItem.name, color: paletteItem.color },
        ],
      });
    }
  };

  const addCustomTag = () => {
    if (!customTagInput.trim()) return;
    const currentTags = formData.tags || [];
    setFormData({
      ...formData,
      tags: [
        ...currentTags,
        { id: 'tag-' + Date.now(), name: customTagInput.trim(), color: customTagColor },
      ],
    });
    setCustomTagInput('');
  };

  const toggleRelatedItem = (targetId: string) => {
    const current = formData.relatedItemIds || [];
    if (current.includes(targetId)) {
      setFormData({
        ...formData,
        relatedItemIds: current.filter((id) => id !== targetId),
      });
    } else {
      setFormData({
        ...formData,
        relatedItemIds: [...current, targetId],
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNode: InventoryNode = {
      id: formData.id || 'node-' + Date.now(),
      parentId: formData.parentId === 'unfiled' ? null : (formData.parentId !== undefined ? formData.parentId : currentContainerId),
      type: formData.type || 'item',
      name: formData.name?.trim() || (formData.type === 'container' ? '未命名容器' : '未命名物品'),
      isPrivate: Boolean(formData.isPrivate),
      isArchived: formData.parentId === 'unfiled' ? false : (formData.isArchived !== undefined ? formData.isArchived : true),
      ownerName: formData.ownerName || undefined,
      spaceId: formData.spaceId || undefined,
      accessKey: formData.accessKey?.trim() || undefined,
      accessKeyExpiry: formData.accessKeyExpiry || undefined,
      sharedWith: formData.sharedWith || undefined,
      photos: formData.photos || [],
      receiptPhotos: formData.receiptPhotos || [],
      quantity: Math.max(0, Number(formData.quantity) || 1),
      unit: formData.unit?.trim() || '個',
      minStockAlert: formData.minStockAlert ? Number(formData.minStockAlert) : undefined,
      price: formData.price !== undefined && formData.price !== null && formData.price !== ('' as any)
        ? Number(formData.price)
        : undefined,
      barcode: formData.barcode?.trim() || undefined,
      qrCode: qrDataUrl || undefined,
      description: formData.description?.trim() || undefined,
      url: formData.url?.trim() || undefined,
      tags: formData.tags || [],
      relatedItemIds: formData.relatedItemIds || [],
      purchaseDate: formData.purchaseDate || undefined,
      warrantyExpiry: formData.warrantyExpiry || undefined,
      lastMaintenanceDate: formData.lastMaintenanceDate || undefined,
      nextMaintenanceDate: formData.nextMaintenanceDate || undefined,
      expirationDate: formData.expirationDate || undefined,
      lastStoredDate: formData.lastStoredDate || new Date().toISOString().split('T')[0],
      loanStatus: formData.loanStatus || { isLoaned: false },
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveNode(finalNode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md">
      {/* Hidden inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handlePhotoUpload(e, false)}
      />
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handlePhotoUpload(e, true)}
      />

      {/* Top Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {formData.type === 'container' ? (
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Box className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="text-base font-bold text-slate-100">
              {nodeToEdit ? '編輯資料' : '新增物品/容器'}
            </h2>
            <p className="text-xs text-slate-400">
              {formData.type === 'container' ? '📦 收納容器 / 抽屜 / 空間' : '🏷️ 單一存放物品'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
        <button
          onClick={() => setActiveTab('basic')}
          className={`px-3 py-1.5 rounded-xl font-medium transition shrink-0 ${
            activeTab === 'basic'
              ? 'bg-teal-500 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          基本與照片
        </button>
        <button
          onClick={() => setActiveTab('dates')}
          className={`px-3 py-1.5 rounded-xl font-medium transition shrink-0 ${
            activeTab === 'dates'
              ? 'bg-teal-500 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          期限・維修與保固
        </button>
        <button
          onClick={() => setActiveTab('loan')}
          className={`px-3 py-1.5 rounded-xl font-medium transition shrink-0 ${
            activeTab === 'loan'
              ? 'bg-teal-500 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          借出與歸還追蹤
        </button>
        <button
          onClick={() => setActiveTab('qr')}
          className={`px-3 py-1.5 rounded-xl font-medium transition shrink-0 ${
            activeTab === 'qr'
              ? 'bg-teal-500 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          QR 碼與標籤列印
        </button>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <form id="editForm" onSubmit={handleSubmit} className="space-y-5">
          {/* TAB 1: BASIC & PHOTOS */}
          {activeTab === 'basic' && (
            <>
              {/* Type Switcher: 容器 vs 物件 (As requested: 每一照片/物件可以切換容器或單一物件) */}
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">節點類型切換</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {formData.type === 'container' ? '目前為容器 (可容納子物件/子容器)' : '目前為單一物件 (可隨時升格為容器)'}
                  </span>
                </div>
                <div className="flex rounded-xl bg-slate-800 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'item' })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                      formData.type === 'item'
                        ? 'bg-teal-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>物件</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'container' })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                      formData.type === 'container'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>容器 📦</span>
                  </button>
                </div>
              </div>

              {/* Photos Gallery */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-teal-400" />
                    <span>物品照片 (第一張為主封面照，可上傳多張)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsGalleryPickerOpen(true)}
                      className="text-xs text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 transition"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>從圖庫調用</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" /> + 新增照片
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
                  {formData.photos && formData.photos.length > 0 ? (
                    formData.photos.map((pUrl, idx) => (
                      <div
                        key={idx}
                        className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0 group"
                      >
                        <img src={pUrl} alt="" className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] bg-teal-500 text-slate-950 font-bold">
                            封面
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(idx, false)}
                          className="absolute top-1 right-1 p-1 rounded-md bg-black/75 text-rose-400 hover:bg-rose-500 hover:text-white transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full py-8 border-2 border-dashed border-slate-800 hover:border-teal-500/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-teal-400 transition"
                    >
                      <Camera className="w-8 h-8 mb-2" />
                      <span className="text-xs font-semibold">點此拍照或選取照片</span>
                      <span className="text-[11px] text-slate-500 mt-0.5">最少可先填寫名稱，照片日後補齊</span>
                    </div>
                  )}
                </div>

                {formData.photos && formData.photos.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAnalyzeWithGemini}
                    disabled={isAnalyzing}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-teal-600 via-indigo-600 to-sky-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    <span>{isAnalyzing ? 'Gemini 分析辨識中...' : '✨ Gemini 智慧分析此照片 (自動辨識名稱與標籤)'}</span>
                  </button>
                )}
              </div>

              {/* Name & Private Switch */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">名稱 *</label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.isPrivate)}
                      onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                      className="rounded border-slate-700 text-rose-500 focus:ring-0"
                    />
                    <Lock className="w-3 h-3 text-rose-400" />
                    <span>設為個人私人物件</span>
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 普拿疼加強錠、Switch 手把、冬季羊毛被..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Quantity, Unit, Price */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">數量</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity ?? 1}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">單位</label>
                  <input
                    type="text"
                    value={formData.unit || '個'}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="個/包/瓶/盒"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">價格 (NT$)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price ?? ''}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="例如: 450"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Container Placement & Archiving Status */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FolderInput className="w-4 h-4 text-teal-400" />
                    <span>歸檔目的地 / 存放容器</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-amber-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.parentId === 'unfiled' || formData.isArchived === false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, parentId: 'unfiled', isArchived: false });
                        } else {
                          setFormData({ ...formData, parentId: currentContainerId, isArchived: true });
                        }
                      }}
                      className="rounded border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <Inbox className="w-3.5 h-3.5 text-amber-400" />
                    <span>置於未歸檔區 (Inbox 稍後整理)</span>
                  </label>
                </div>

                <select
                  value={formData.parentId === 'unfiled' ? 'unfiled' : (formData.parentId || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'unfiled') {
                      setFormData({ ...formData, parentId: 'unfiled', isArchived: false });
                    } else if (val === '') {
                      setFormData({ ...formData, parentId: null, isArchived: true });
                    } else {
                      setFormData({ ...formData, parentId: val, isArchived: true });
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-medium"
                >
                  <option value="unfiled">📥 暫置於未歸檔區 (待後續分類整理)</option>
                  <option value="">🏠 全家總覽空間 (最頂層根空間)</option>
                  {allNodes
                    .filter((n) => n.type === 'container' && n.id !== formData.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        📦 {c.name}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  {formData.parentId === 'unfiled' || formData.isArchived === false
                    ? '⚠️ 目前為未歸檔狀態，將顯示在「未歸檔收納盒」中提醒您抽空分類。'
                    : '✓ 已指定收納容器，完成歸檔。'}
                </p>
              </div>

              {/* Ownership & Private Access Key */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-teal-400" />
                      <span>物件歸屬 / 擁有人</span>
                    </label>
                    <select
                      value={formData.ownerName || '全家'}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      {DEFAULT_MEMBERS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-rose-400" />
                      <span>私有隱私狀態</span>
                    </label>
                    <div className="flex items-center h-9">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.isPrivate)}
                          onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-700 text-rose-500 focus:ring-0"
                        />
                        <Lock className="w-3.5 h-3.5 text-rose-400" />
                        <span>設為個人私有 (僅擁有人可見)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* If container and marked as private: offer Access Key (私鑰) and Expiry */}
                {formData.type === 'container' && formData.isPrivate && (
                  <div className="pt-2.5 border-t border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
                      <Key className="w-3.5 h-3.5" />
                      <span>私有容器專屬私鑰 (授權他人限時存取)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formData.accessKey || ''}
                        onChange={(e) => setFormData({ ...formData, accessKey: e.target.value })}
                        placeholder="6位數私鑰 (例: 888888)"
                        className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                      />
                      <select
                        value={formData.accessKeyExpiry || 'unlimited'}
                        onChange={(e) => setFormData({ ...formData, accessKeyExpiry: e.target.value })}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                      >
                        <option value="unlimited">⏳ 私鑰有效期限：永久有效</option>
                        <option value={new Date(Date.now() + 24 * 3600 * 1000).toISOString()}>
                          ⏳ 24 小時後到期
                        </option>
                        <option value={new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()}>
                          ⏳ 7 天後到期
                        </option>
                        <option value={new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()}>
                          ⏳ 30 天後到期
                        </option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Low Stock Threshold */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400">低庫存警示值 (低於此數量時儀表板提醒補貨)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.minStockAlert ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minStockAlert: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="未設定（例如設為 2 顆/包則會預警）"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Barcode with live scan button */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BarcodeIcon className="w-4 h-4 text-teal-400" />
                    <span>商品條碼 (EAN / UPC / Code128)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
                  >
                    <Camera className="w-3.5 h-3.5" /> 鏡頭掃碼填入
                  </button>
                </label>
                <input
                  type="text"
                  value={formData.barcode || ''}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="掃描條碼或手動輸入..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              {/* Description & URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>簡短敘述 / 存放備忘</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="補充說明、放置規格或使用注意事項..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-slate-400" />
                  <span>相關連結 (說明書、原廠購買網址)</span>
                </label>
                <input
                  type="url"
                  value={formData.url || ''}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Tags with color selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <TagIcon className="w-4 h-4 text-teal-400" />
                  <span>分類標籤 (可自訂顏色與標籤)</span>
                </label>

                {/* Preset tag palette */}
                <div className="flex flex-wrap gap-1.5">
                  {TAG_PALETTE.map((pal) => {
                    const isSelected = formData.tags?.some((t) => t.name === pal.name);
                    return (
                      <button
                        key={pal.name}
                        type="button"
                        onClick={() => toggleTag(pal)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                          isSelected
                            ? 'bg-slate-800 border-teal-400 text-white shadow-xs'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pal.color }} />
                        <span>{pal.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-teal-400" />}
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Tag */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={customTagColor}
                    onChange={(e) => setCustomTagColor(e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                    title="選取標籤顏色"
                  />
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    placeholder="新增自訂標籤..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={addCustomTag}
                    disabled={!customTagInput.trim()}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-teal-400 disabled:text-slate-600 text-xs font-semibold hover:bg-slate-700 transition"
                  >
                    + 加入
                  </button>
                </div>
              </div>

              {/* Related Items */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">關聯物品 (配件、搭配組件)</label>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  {allNodes
                    .filter((n) => n.id !== formData.id && n.type === 'item')
                    .map((item) => {
                      const isLinked = formData.relatedItemIds?.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleRelatedItem(item.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                            isLinked ? 'bg-teal-500/15 text-teal-300 font-semibold' : 'hover:bg-slate-800/80 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            <span className="truncate">{item.name}</span>
                          </div>
                          {isLinked && <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: DATES, WARRANTY & MAINTENANCE */}
          {activeTab === 'dates' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <h3 className="text-xs font-bold text-teal-400 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  消耗品有效期限 (過期日提醒)
                </h3>
                <input
                  type="date"
                  value={formData.expirationDate || ''}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-teal-500"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  到期日前 30 天與 7 天，系統將在儀表板與家庭行事曆自動發布預警。
                </p>
              </div>

              {/* Purchase Date & Warranty */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">購買日期</label>
                  <input
                    type="date"
                    value={formData.purchaseDate || ''}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">保修到期日</label>
                  <input
                    type="date"
                    value={formData.warrantyExpiry || ''}
                    onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Maintenance Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">上次維修/保養日</label>
                  <input
                    type="date"
                    value={formData.lastMaintenanceDate || ''}
                    onChange={(e) => setFormData({ ...formData, lastMaintenanceDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">下次預計保養日</label>
                  <input
                    type="date"
                    value={formData.nextMaintenanceDate || ''}
                    onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Last Stored Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">上次存放 / 整理日期</label>
                <input
                  type="date"
                  value={formData.lastStoredDate || ''}
                  onChange={(e) => setFormData({ ...formData, lastStoredDate: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Receipt / Invoice Photos */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    <span>收據 / 發票 / 保證書照片</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => receiptInputRef.current?.click()}
                    className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
                  >
                    <Upload className="w-3.5 h-3.5" /> + 上傳收據
                  </button>
                </div>

                <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
                  {formData.receiptPhotos && formData.receiptPhotos.length > 0 ? (
                    formData.receiptPhotos.map((rUrl, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0"
                      >
                        <img src={rUrl} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx, true)}
                          className="absolute top-1 right-1 p-1 rounded-md bg-black/75 text-rose-400 hover:bg-rose-500 hover:text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div
                      onClick={() => receiptInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-slate-300"
                    >
                      <Receipt className="w-6 h-6 mb-1 opacity-50" />
                      <span className="text-xs">點此拍照保存購買發票或保固章</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOAN & BORROW TRACKING */}
          {activeTab === 'loan' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 text-sm block">目前是否借出外借？</span>
                  <span className="text-xs text-slate-400">開啟可追蹤借給誰與預計歸還時間</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(formData.loanStatus?.isLoaned)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      loanStatus: {
                        ...(formData.loanStatus || {}),
                        isLoaned: e.target.checked,
                        loanDate: e.target.checked
                          ? formData.loanStatus?.loanDate || new Date().toISOString().split('T')[0]
                          : undefined,
                      },
                    })
                  }
                  className="w-5 h-5 rounded border-slate-700 text-teal-500 focus:ring-0"
                />
              </div>

              {formData.loanStatus?.isLoaned && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-purple-300">借出對象 (姓名/稱謂) *</label>
                    <input
                      type="text"
                      value={formData.loanStatus.borrower || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          loanStatus: { ...formData.loanStatus!, borrower: e.target.value },
                        })
                      }
                      placeholder="例如: 表弟小豪、鄰居陳先生、同事 Alice"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">借出日期</label>
                      <input
                        type="date"
                        value={formData.loanStatus.loanDate || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            loanStatus: { ...formData.loanStatus!, loanDate: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">預計歸還日</label>
                      <input
                        type="date"
                        value={formData.loanStatus.returnDueDate || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            loanStatus: { ...formData.loanStatus!, returnDueDate: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">借出備忘備註</label>
                    <input
                      type="text"
                      value={formData.loanStatus.notes || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          loanStatus: { ...formData.loanStatus!, notes: e.target.value },
                        })
                      }
                      placeholder="例如: 借去露營使用，附收納包與兩條充電線"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          loanStatus: {
                            ...formData.loanStatus!,
                            isLoaned: false,
                            returnedDate: new Date().toISOString().split('T')[0],
                          },
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-purple-600/30 text-purple-200 hover:bg-purple-600/50 text-xs font-semibold"
                    >
                      標記為已歸還
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QR CODE */}
          {activeTab === 'qr' && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center justify-center gap-1.5">
                <QrCode className="w-4 h-4 text-teal-400" />
                <span>專屬物品/容器 QR Code 標籤</span>
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                可列印貼在收納箱外盒，家庭成員使用手機掃描即可直達箱內清單！
              </p>

              {qrDataUrl && (
                <div className="inline-block p-4 rounded-2xl bg-white shadow-xl">
                  <img src={qrDataUrl} alt="QR Code" className="w-44 h-44 mx-auto" />
                  <p className="text-slate-900 font-bold text-xs mt-2 truncate max-w-[176px]">
                    {formData.name || '物品/容器標籤'}
                  </p>
                </div>
              )}

              <div className="flex justify-center gap-2">
                <a
                  href={qrDataUrl}
                  download={`${formData.name || 'label'}-qr.png`}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-teal-400 border border-slate-700 text-xs font-semibold hover:bg-slate-700"
                >
                  下載 QR 圖片
                </a>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 pb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {nodeToEdit && onDeleteNode && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`確定要刪除「${nodeToEdit.name}」嗎？若為容器其子物件亦將移除。`)) {
                  onDeleteNode(nodeToEdit.id);
                  onClose();
                }
              }}
              className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
              title="刪除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* If this node is container, show button to drill inside right now */}
          {nodeToEdit && nodeToEdit.type === 'container' && onDrillIntoContainer && (
            <button
              type="button"
              onClick={() => {
                onDrillIntoContainer(nodeToEdit.id);
                onClose();
              }}
              className="px-3 py-2 rounded-xl bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 text-xs font-semibold flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>進入此收納容器</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
          >
            取消
          </button>
          <button
            type="submit"
            form="editForm"
            className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg active:scale-95 transition"
          >
            儲存變更
          </button>
        </div>
      </div>

      {/* Embedded Barcode Scanner */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanResult={(scanned) => {
          setFormData((prev) => ({ ...prev, barcode: scanned }));
        }}
        title="掃描條碼填入"
        subtitle="將包裝條碼置於框中自動填入"
      />

      {/* Embedded Photo Gallery Picker */}
      <PhotoGalleryModal
        isOpen={isGalleryPickerOpen}
        onClose={() => setIsGalleryPickerOpen(false)}
        nodes={allNodes}
        mode="pick"
        onSelectPhoto={(photoUrl) => {
          setFormData((prev) => ({
            ...prev,
            photos: [...(prev.photos || []), photoUrl],
          }));
        }}
      />
    </div>
  );
};
