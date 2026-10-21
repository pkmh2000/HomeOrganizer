import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Calendar,
  Users,
  AlertCircle,
  X,
  FileText,
  Link as LinkIcon,
} from 'lucide-react';
import { FamilyMemo, InventoryNode } from '../types';

interface FamilyMemosViewProps {
  memos: FamilyMemo[];
  members: string[];
  nodes: InventoryNode[];
  onSaveMemo: (memo: FamilyMemo) => void;
  onDeleteMemo: (memoId: string) => void;
  onToggleDone: (memoId: string) => void;
}

export const FamilyMemosView: React.FC<FamilyMemosViewProps> = ({
  memos,
  members,
  nodes,
  onSaveMemo,
  onDeleteMemo,
  onToggleDone,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('全部');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newMember, setNewMember] = useState(members[0] || '全家');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newRelatedNodeId, setNewRelatedNodeId] = useState<string>('');

  const filteredMemos = memos.filter((m) => {
    if (selectedMemberFilter === '全部') return true;
    return m.assignedMember === selectedMemberFilter;
  });

  const handleCreateMemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const memo: FamilyMemo = {
      id: 'memo-' + Date.now(),
      title: newTitle.trim(),
      content: newContent.trim() || undefined,
      assignedMember: newMember,
      priority: newPriority,
      dueDate: newDueDate || undefined,
      relatedNodeId: newRelatedNodeId || undefined,
      isDone: false,
      createdAt: new Date().toISOString(),
    };

    onSaveMemo(memo);
    setNewTitle('');
    setNewContent('');
    setNewDueDate('');
    setNewRelatedNodeId('');
    setShowAddModal(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 pb-20">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
            家庭成員備忘與採購清單
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">全家共享待辦、採購備忘與物資提醒</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>新增備忘</span>
        </button>
      </div>

      {/* Member Filter Bar */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
        <button
          onClick={() => setSelectedMemberFilter('全部')}
          className={`px-3 py-1.5 rounded-lg shrink-0 transition font-medium ${
            selectedMemberFilter === '全部'
              ? 'bg-teal-500 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          全體成員 ({memos.length})
        </button>
        {members.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMemberFilter(m)}
            className={`px-3 py-1.5 rounded-lg shrink-0 transition font-medium ${
              selectedMemberFilter === m
                ? 'bg-teal-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Memos List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMemos.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto stroke-[1.5] opacity-40 mb-2" />
            <p className="text-sm">目前沒有備忘事項</p>
            <p className="text-xs mt-1">點擊上方「新增備忘」為家人指派採購或整理工作</p>
          </div>
        ) : (
          filteredMemos.map((memo) => {
            const related = memo.relatedNodeId
              ? nodes.find((n) => n.id === memo.relatedNodeId)
              : null;

            return (
              <div
                key={memo.id}
                className={`p-3.5 rounded-2xl bg-slate-900 border transition shadow-md flex items-start gap-3 ${
                  memo.isDone
                    ? 'border-slate-800/60 opacity-60'
                    : memo.priority === 'high'
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : 'border-slate-800'
                }`}
              >
                <button
                  onClick={() => onToggleDone(memo.id)}
                  className="mt-0.5 text-slate-400 hover:text-teal-400"
                >
                  {memo.isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-teal-400" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`font-bold text-sm ${
                        memo.isDone ? 'line-through text-slate-400' : 'text-slate-100'
                      }`}
                    >
                      {memo.title}
                    </h4>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-teal-300 font-semibold border border-slate-700">
                        {memo.assignedMember}
                      </span>
                      <button
                        onClick={() => onDeleteMemo(memo.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {memo.content && (
                    <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">
                      {memo.content}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                    {memo.dueDate && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Calendar className="w-3 h-3" />
                        <span>預計完成: {memo.dueDate}</span>
                      </span>
                    )}
                    {related && (
                      <span className="flex items-center gap-1 text-teal-400">
                        <LinkIcon className="w-3 h-3" />
                        <span>關聯物品: {related.name}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Memo Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm">新增家庭備忘事項</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMemo} className="mt-4 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">備忘標題 *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如: 買OK繃、提醒小豪歸還Switch、送修吸塵器"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">詳細內容 / 附註說明</label>
                <textarea
                  rows={2}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="補充說明規格或地點..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">指派成員</label>
                  <select
                    value={newMember}
                    onChange={(e) => setNewMember(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none"
                  >
                    {members.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">優先級</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none"
                  >
                    <option value="low">一般</option>
                    <option value="medium">中等</option>
                    <option value="high">急件 (重要)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">截止日期 (選填)</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">關聯物品 (選填)</label>
                <select
                  value={newRelatedNodeId}
                  onChange={(e) => setNewRelatedNodeId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none"
                >
                  <option value="">-- 無關聯物品 --</option>
                  {nodes
                    .filter((n) => n.type === 'item')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md mt-2"
              >
                建立備忘
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
