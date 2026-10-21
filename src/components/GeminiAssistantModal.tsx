import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Clock,
  Compass,
  Lightbulb,
  Search,
  ChefHat,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { InventoryNode } from '../types';

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: InventoryNode[];
  onSelectNode: (node: InventoryNode) => void;
  onNavigateToContainer: (containerId: string | null) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  matchedNodeId?: string;
}

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  isOpen,
  onClose,
  nodes,
  onSelectNode,
  onNavigateToContainer,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'gemini',
      text: '你好！我是你的 Gemini 家庭收納智慧管家 🤖✨\n你可以直接問我：「護照放在哪裡？」、「家裡有什麼快過期了？」或「電鑽在客廳還是車庫？」等任何問題！',
    },
  ]);

  if (!isOpen) return null;

  const quickPrompts = [
    '我的護照收在哪裡？',
    '家裡有哪些即將過期的耗材或食品？',
    'Switch 手把借給誰了？什麼時候該還？',
    '百靈耳溫槍在哪個抽屜？',
    '電鑽工具套裝收在哪一區？',
    '快過期的乾貨有甚麼料理建議？',
  ];

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsg: Message = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      // Build lightweight inventory summary for Gemini context
      const inventorySummary = nodes.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        parentId: n.parentId,
        tags: n.tags?.map((t) => t.name),
        quantity: n.quantity,
        unit: n.unit,
        expirationDate: n.expirationDate,
        warrantyExpiry: n.warrantyExpiry,
        loanStatus: n.loanStatus,
        description: n.description,
      }));

      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          inventoryData: inventorySummary,
        }),
      });

      const data = await res.json();
      if (data.success && data.answer) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'gemini-' + Date.now(),
            sender: 'gemini',
            text: data.answer,
          },
        ]);
      } else {
        throw new Error(data.error || '無法取得回答');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          sender: 'gemini',
          text: `抱歉，詢問時遇到問題：${err.message || '請確認網路連線或 API 金鑰設定。'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-400 via-emerald-400 to-sky-400 p-0.5 flex items-center justify-center shadow-lg">
            <Sparkles className="w-4.5 h-4.5 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>Gemini 智慧家庭收納小幫手</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                Gemini 3.8
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">自然語言詢問物品位置、到期分析與生活建議</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Prompts Strip */}
      <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
        <span className="text-[11px] text-slate-400 shrink-0 font-medium flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          快捷詢問：
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp)}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-teal-300 border border-slate-700/60 shrink-0 transition text-xs"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-teal-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-teal-400 border border-slate-700'
              }`}
            >
              {msg.sender === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.sender === 'user'
                  ? 'bg-teal-600 text-white font-medium rounded-tr-xs'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs shadow-md'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-teal-400 bg-slate-900 p-3 rounded-2xl border border-slate-800 w-fit">
            <Sparkles className="w-4 h-4 animate-spin text-teal-400" />
            <span>Gemini 正在全家收納庫存中為您比對...</span>
          </div>
        )}
      </div>

      {/* Input Footer */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 pb-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="詢問 Gemini：例如「護照放在哪？」、「電鑽在哪裡？」..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>發送</span>
          </button>
        </form>
      </div>
    </div>
  );
};
