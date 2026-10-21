import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Check,
  Lightbulb,
  Plus,
  Zap,
  ShoppingBag,
  Nfc,
  ChefHat,
  Printer,
  ShieldCheck,
} from 'lucide-react';

interface SuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFeature: (featureKey: string) => void;
}

export const SuggestionsModal: React.FC<SuggestionsModalProps> = ({
  isOpen,
  onClose,
  onApplyFeature,
}) => {
  const [votedFeatures, setVotedFeatures] = useState<Set<string>>(new Set(['shopping', 'labels']));

  if (!isOpen) return null;

  const suggestions = [
    {
      id: 'shopping',
      icon: ShoppingBag,
      title: '低庫存耗材一鍵生成「全聯/家樂福採購清單」',
      description: '自動分析所有數量小於警示值的耗材，打包成簡潔的賣場採購清單，可直接勾選與傳給家人。',
      status: '已整合啟用',
      highlight: true,
    },
    {
      id: 'labels',
      icon: Printer,
      title: '實體收納箱專屬 QR Code 標籤即時列印',
      description: '在每個容器卡片點擊「列印標籤貼紙」，印出貼在收納箱外，手機相機一照直接顯現箱內所有東西。',
      status: '已整合啟用',
      highlight: true,
    },
    {
      id: 'nfc',
      icon: Nfc,
      title: '手機 NFC 感應標籤快速尋物 (Web NFC)',
      description: '支援 Android 手機輕觸貼在箱子上的 NFC 晶片貼紙，1 秒開啟該收納箱清單，免開相機掃描。',
      status: '推薦擴展',
      highlight: false,
    },
    {
      id: 'recipes',
      icon: ChefHat,
      title: '臨期乾貨與調味品「智慧清庫存料理靈感」',
      description: '自動比對 7 天內即將到期的食材、橄欖油、乾香菇與燕麥，推薦快速消耗的家常料理做法。',
      status: '推薦擴展',
      highlight: false,
    },
    {
      id: 'batch_print',
      icon: Printer,
      title: 'A4 規格多格標籤貼紙「整戶批量排版列印」',
      description: '大掃除或搬家時，一次將全家 20~50 個收納箱的 QR 碼自動排版到標準 A4 貼紙格式。',
      status: '推薦擴展',
      highlight: false,
    },
  ];

  const toggleVote = (id: string) => {
    setVotedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">功能提示與擴展建議</h3>
              <p className="text-[11px] text-slate-400">依據居家收納使用情境規劃</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto my-3 space-y-3 pr-1 text-xs">
          <p className="text-slate-300">
            您提到了「<strong>未想到 或有需要添加 再提示是否添加功能</strong>」，我們為您預先整理並實裝了核心亮點，並準備了進一步的貼心功能：
          </p>

          {suggestions.map((item) => {
            const Icon = item.icon;
            const isVoted = votedFeatures.has(item.id);

            return (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border transition ${
                  item.highlight
                    ? 'bg-teal-950/20 border-teal-500/40'
                    : 'bg-slate-800/60 border-slate-700/60'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      item.highlight
                        ? 'bg-teal-500/20 text-teal-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-slate-100 truncate text-xs">
                        {item.title}
                      </h4>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold shrink-0 ${
                          item.highlight
                            ? 'bg-teal-500/20 text-teal-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <button
                        onClick={() => toggleVote(item.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition ${
                          isVoted
                            ? 'bg-teal-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>{isVoted ? '已標記感興趣' : '標記此需求'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition"
        >
          返回收納管家
        </button>
      </div>
    </div>
  );
};
