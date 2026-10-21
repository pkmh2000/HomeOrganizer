import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  Package,
  Layers,
  Box,
  TrendingDown,
  Users,
  ShieldAlert,
  Camera,
  Search,
  Barcode as BarcodeIcon,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  ArrowUpRight,
} from 'lucide-react';
import { InventoryNode, FamilyMemo } from '../types';
import { getExpirationStatus, getNodeAncestors } from '../utils/storage';

interface DashboardProps {
  nodes: InventoryNode[];
  memos: FamilyMemo[];
  householdName: string;
  onOpenBatchIntake: () => void;
  onOpenSearch: () => void;
  onOpenScanner: () => void;
  onSelectNode: (node: InventoryNode) => void;
  onNavigateToContainer: (containerId: string | null) => void;
  onToggleMemoDone: (memoId: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  nodes,
  memos,
  householdName,
  onOpenBatchIntake,
  onOpenSearch,
  onOpenScanner,
  onSelectNode,
  onNavigateToContainer,
  onToggleMemoDone,
  onNavigateTab,
}) => {
  // Compute analytics
  const analytics = useMemo(() => {
    let totalItems = 0;
    let totalContainers = 0;
    let totalValuation = 0;
    const expiringSoon: { node: InventoryNode; status: ReturnType<typeof getExpirationStatus> }[] = [];
    const expired: { node: InventoryNode; status: ReturnType<typeof getExpirationStatus> }[] = [];
    const lowStock: InventoryNode[] = [];
    const loanedOut: InventoryNode[] = [];
    const warrantyExpiring: InventoryNode[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    nodes.forEach((node) => {
      if (node.type === 'container') {
        totalContainers++;
      } else {
        totalItems++;
        if (node.price && node.quantity) {
          totalValuation += node.price * node.quantity;
        }

        // Check expiration
        if (node.expirationDate) {
          const exp = getExpirationStatus(node.expirationDate);
          if (exp.status === 'expired') {
            expired.push({ node, status: exp });
          } else if (exp.status === 'expiring_soon') {
            expiringSoon.push({ node, status: exp });
          }
        }

        // Check low stock
        if (node.minStockAlert !== undefined && node.quantity <= node.minStockAlert) {
          lowStock.push(node);
        }

        // Check loan status
        if (node.loanStatus?.isLoaned) {
          loanedOut.push(node);
        }

        // Check warranty (expiring within 60 days)
        if (node.warrantyExpiry) {
          const wTarget = new Date(node.warrantyExpiry);
          wTarget.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((wTarget.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 60) {
            warrantyExpiring.push(node);
          }
        }
      }
    });

    return {
      totalItems,
      totalContainers,
      totalValuation,
      expiringSoon,
      expired,
      lowStock,
      loanedOut,
      warrantyExpiring,
    };
  }, [nodes]);

  const pendingMemos = memos.filter((m) => !m.isDone);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-950 pb-24">
      {/* Welcome Card & Fast Action Bar */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-teal-900/60 via-slate-900 to-slate-900 border border-teal-500/30 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px] text-teal-400 font-bold uppercase tracking-wider">
              家庭物資智慧監控中心
            </span>
            <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
              <span>{householdName}</span>
            </h1>
          </div>
          <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
            即時同步中
          </span>
        </div>

        {/* 3 Quick Action Big Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <button
            onClick={onOpenBatchIntake}
            className="p-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
          >
            <Camera className="w-5 h-5" />
            <span>拍照收納</span>
          </button>
          <button
            onClick={onOpenSearch}
            className="p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-semibold text-xs flex flex-col items-center justify-center gap-1.5 border border-slate-700 shadow-sm active:scale-95 transition"
          >
            <Search className="w-5 h-5 text-teal-400" />
            <span>視覺找物</span>
          </button>
          <button
            onClick={onOpenScanner}
            className="p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-semibold text-xs flex flex-col items-center justify-center gap-1.5 border border-slate-700 shadow-sm active:scale-95 transition"
          >
            <BarcodeIcon className="w-5 h-5 text-teal-400" />
            <span>掃描條碼</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Items */}
        <div
          onClick={() => onNavigateTab('containers')}
          className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>物品總計</span>
            <Box className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-100">
            {analytics.totalItems}{' '}
            <span className="text-xs font-normal text-slate-400">件</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <span>分佈於 {analytics.totalContainers} 個收納容器</span>
          </div>
        </div>

        {/* Total Valuation */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>家庭資產估值</span>
            <span className="text-teal-400 font-bold">NT$</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-100">
            {analytics.totalValuation > 10000
              ? (analytics.totalValuation / 10000).toFixed(1) + ' 萬'
              : analytics.totalValuation.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            已登記價值物品累計
          </div>
        </div>

        {/* Expiring / Consumables Warning Card */}
        <div
          onClick={() => onNavigateTab('calendar')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-md ${
            analytics.expired.length > 0
              ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
              : analytics.expiringSoon.length > 0
              ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">耗材過期預警</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-100">
            {analytics.expired.length + analytics.expiringSoon.length}{' '}
            <span className="text-xs font-normal text-slate-400">項</span>
          </div>
          <div className="mt-1 text-[11px]">
            {analytics.expired.length > 0
              ? `${analytics.expired.length} 項已過期！點此清理`
              : `${analytics.expiringSoon.length} 項即將到期`}
          </div>
        </div>

        {/* Low Stock / Loaned */}
        <div
          onClick={() => onNavigateTab('calendar')}
          className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>缺貨補貨預警</span>
            <ShoppingBag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-100">
            {analytics.lowStock.length}{' '}
            <span className="text-xs font-normal text-slate-400">項低庫存</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {analytics.loanedOut.length} 件外借他人追蹤中
          </div>
        </div>
      </div>

      {/* CONSUMABLE EXPIRY ALERTS LIST */}
      {(analytics.expired.length > 0 || analytics.expiringSoon.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>即將到期與過期耗材提醒</span>
            </span>
            <button
              onClick={() => onNavigateTab('calendar')}
              className="text-[11px] text-teal-400 hover:underline flex items-center"
            >
              行事曆查看 <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {[...analytics.expired, ...analytics.expiringSoon].slice(0, 4).map(({ node, status }) => {
              const ancestors = getNodeAncestors(nodes, node.id);
              const containerName = ancestors.length > 1 ? ancestors[ancestors.length - 2].name : '根目錄';

              return (
                <div
                  key={node.id}
                  onClick={() => onSelectNode(node)}
                  className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 cursor-pointer flex items-center gap-3 shadow-md transition"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60">
                    {node.photos && node.photos[0] ? (
                      <img src={node.photos[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Box className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-100 text-xs truncate">
                        {node.name}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${status.badgeClass}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <span>存放於: <strong className="text-slate-300">{containerName}</strong></span>
                      <span>•</span>
                      <span>數量: {node.quantity} {node.unit || '個'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LOW STOCK REPLENISHMENT LIST */}
      {analytics.lowStock.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-orange-400 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" />
              <span>低庫存需補貨清單 ({analytics.lowStock.length})</span>
            </span>
          </div>

          <div className="space-y-2">
            {analytics.lowStock.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectNode(item)}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-orange-500/50 cursor-pointer flex items-center justify-between shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60">
                    {item.photos && item.photos[0] ? (
                      <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Box className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-xs">{item.name}</h4>
                    <span className="text-[11px] text-rose-400 font-semibold">
                      目前僅剩 {item.quantity} {item.unit || '件'} (警示值: {item.minStockAlert})
                    </span>
                  </div>
                </div>
                <button className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-semibold">
                  補貨
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LOANED ITEMS TRACKER */}
      {analytics.loanedOut.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-purple-400 flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>借出物品追蹤中 ({analytics.loanedOut.length})</span>
            </span>
          </div>

          <div className="space-y-2">
            {analytics.loanedOut.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectNode(item)}
                className="p-3 rounded-2xl bg-slate-900 border border-purple-500/30 flex items-center justify-between shadow-md cursor-pointer"
              >
                <div>
                  <h4 className="font-bold text-slate-100 text-xs">{item.name}</h4>
                  <p className="text-[11px] text-purple-300 mt-0.5">
                    借給 <strong>{item.loanStatus?.borrower}</strong> • 預計歸還:{' '}
                    {item.loanStatus?.returnDueDate || '未填'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-semibold">
                  追蹤中
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAMILY MEMO & REMINDER BOARD */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>家庭待辦與採購備忘 ({pendingMemos.length})</span>
          </span>
          <button
            onClick={() => onNavigateTab('memos')}
            className="text-[11px] text-teal-400 hover:underline flex items-center"
          >
            全部備忘 <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {pendingMemos.slice(0, 3).map((memo) => (
            <div
              key={memo.id}
              className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3 shadow-md"
            >
              <button
                onClick={() => onToggleMemoDone(memo.id)}
                className="mt-0.5 w-5 h-5 rounded-md border border-slate-600 hover:border-teal-400 flex items-center justify-center shrink-0"
              >
                {memo.isDone && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-100 text-xs truncate">
                    {memo.title}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-teal-300 font-semibold">
                    {memo.assignedMember}
                  </span>
                </div>
                {memo.content && (
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{memo.content}</p>
                )}
                {memo.dueDate && (
                  <div className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>截止: {memo.dueDate}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
