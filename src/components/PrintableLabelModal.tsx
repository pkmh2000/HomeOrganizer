import React, { useState, useEffect } from 'react';
import { X, Printer, QrCode, Download, Check } from 'lucide-react';
import { InventoryNode } from '../types';
import { generateQRCodeDataURL } from '../utils/qr';

interface PrintableLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetNode: InventoryNode | null;
}

export const PrintableLabelModal: React.FC<PrintableLabelModalProps> = ({
  isOpen,
  onClose,
  targetNode,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (targetNode) {
      const payload = JSON.stringify({
        app: 'HomeOrganizer',
        id: targetNode.id,
        name: targetNode.name,
        type: targetNode.type,
      });
      generateQRCodeDataURL(payload).then(setQrUrl);
    }
  }, [targetNode]);

  if (!isOpen || !targetNode) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-sm">收納盒實體 QR 貼紙標籤</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div className="my-5 p-4 bg-white rounded-2xl text-slate-900 shadow-xl border-2 border-slate-200 text-center flex flex-col items-center">
          <div className="text-[11px] font-bold text-teal-800 tracking-wider uppercase mb-1">
            HomeOrganizer 收納管理標籤
          </div>
          <h2 className="text-base font-black text-slate-900 truncate max-w-xs">
            {targetNode.name}
          </h2>
          <p className="text-[11px] text-slate-500 mb-2">
            {targetNode.type === 'container' ? '收納容器 / 儲存櫃' : '單一物件'}
          </p>

          {qrUrl ? (
            <img src={qrUrl} alt="QR Code" className="w-40 h-40 border border-slate-100 rounded-lg p-1" />
          ) : (
            <div className="w-40 h-40 bg-slate-100 animate-pulse rounded-lg" />
          )}

          <div className="text-[10px] text-slate-600 mt-2 font-mono">
            ID: {targetNode.id}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            手機相機掃描直達此箱內清單
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>列印標籤貼紙</span>
          </button>
          {qrUrl && (
            <a
              href={qrUrl}
              download={`${targetNode.name}-qr.png`}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 font-semibold text-xs flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              <span>下載</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
