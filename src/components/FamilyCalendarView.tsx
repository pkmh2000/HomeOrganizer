import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ShieldAlert,
  Wrench,
  Users,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Box,
  Filter,
  ListFilter,
  Grid,
  CalendarRange,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { InventoryNode, FamilyMemo } from '../types';
import { getExpirationStatus } from '../utils/storage';

interface FamilyCalendarViewProps {
  nodes: InventoryNode[];
  memos: FamilyMemo[];
  onSelectNode: (node: InventoryNode) => void;
  onNavigateToContainer: (containerId: string | null) => void;
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: 'expiration' | 'warranty' | 'maintenance' | 'loan_return' | 'memo';
  severity: 'danger' | 'warning' | 'info' | 'success';
  node?: InventoryNode;
  memo?: FamilyMemo;
}

type CalendarViewMode = 'all_timeline' | 'month_grid' | 'year_overview';

export const FamilyCalendarView: React.FC<FamilyCalendarViewProps> = ({
  nodes,
  memos,
  onSelectNode,
  onNavigateToContainer,
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('all_timeline');
  const [activeFilter, setActiveFilter] = useState<'all' | 'expiration' | 'warranty' | 'maintenance' | 'loan_return' | 'memo'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Collect and sort all events across the whole system
  const allEvents = useMemo(() => {
    const list: CalendarEvent[] = [];

    // Expiration dates
    nodes.forEach((node) => {
      if (node.expirationDate) {
        const exp = getExpirationStatus(node.expirationDate);
        list.push({
          id: `exp-${node.id}`,
          date: node.expirationDate,
          title: `[有效期限] ${node.name}`,
          type: 'expiration',
          severity: exp.status === 'expired' ? 'danger' : exp.daysLeft! <= 7 ? 'warning' : 'info',
          node,
        });
      }

      // Warranty dates
      if (node.warrantyExpiry) {
        list.push({
          id: `warr-${node.id}`,
          date: node.warrantyExpiry,
          title: `[保固到期] ${node.name}`,
          type: 'warranty',
          severity: 'warning',
          node,
        });
      }

      // Maintenance dates
      if (node.nextMaintenanceDate) {
        list.push({
          id: `maint-${node.id}`,
          date: node.nextMaintenanceDate,
          title: `[預計保養] ${node.name}`,
          type: 'maintenance',
          severity: 'info',
          node,
        });
      }

      // Loan returns
      if (node.loanStatus?.isLoaned && node.loanStatus.returnDueDate) {
        list.push({
          id: `loan-${node.id}`,
          date: node.loanStatus.returnDueDate,
          title: `[應還歸還] ${node.name} (${node.loanStatus.borrower})`,
          type: 'loan_return',
          severity: 'warning',
          node,
        });
      }
    });

    // Memos with due dates
    memos.forEach((memo) => {
      if (memo.dueDate) {
        list.push({
          id: `memo-${memo.id}`,
          date: memo.dueDate,
          title: `[家庭備忘] ${memo.title} (${memo.assignedMember})`,
          type: 'memo',
          severity: memo.priority === 'high' ? 'danger' : 'info',
          memo,
        });
      }
    });

    // Sort by date ascending
    list.sort((a, b) => a.date.localeCompare(b.date));

    return list;
  }, [nodes, memos]);

  // Filtered by type & search
  const filteredEvents = useMemo(() => {
    return allEvents.filter((e) => {
      if (activeFilter !== 'all' && e.type !== activeFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          e.title.toLowerCase().includes(term) ||
          e.date.includes(term) ||
          e.node?.name.toLowerCase().includes(term) ||
          e.memo?.assignedMember.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [allEvents, activeFilter, searchTerm]);

  // Group events by time ranges for "all_timeline" view
  const timelineGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expired: CalendarEvent[] = [];
    const next7Days: CalendarEvent[] = [];
    const next30Days: CalendarEvent[] = [];
    const next90Days: CalendarEvent[] = [];
    const future: CalendarEvent[] = [];

    filteredEvents.forEach((evt) => {
      const target = new Date(evt.date);
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        expired.push(evt);
      } else if (diffDays <= 7) {
        next7Days.push(evt);
      } else if (diffDays <= 30) {
        next30Days.push(evt);
      } else if (diffDays <= 90) {
        next90Days.push(evt);
      } else {
        future.push(evt);
      }
    });

    return [
      { id: 'expired', label: '🚨 已過期 / 逾期項目', items: expired, badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
      { id: '7days', label: '⚡ 本週緊急 (7天內到期/應還)', items: next7Days, badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
      { id: '30days', label: '⏳ 近期提醒 (30天內)', items: next30Days, badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
      { id: '90days', label: '📅 未來 1~3 個月排程', items: next90Days, badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
      { id: 'future', label: '📦 長期保修與遠期有效期限', items: future, badge: 'bg-slate-800 text-slate-300 border-slate-700' },
    ].filter((g) => g.items.length > 0);
  }, [filteredEvents]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = currentYearMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setCurrentYearMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    const [y, m] = currentYearMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setCurrentYearMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
    setSelectedDay(null);
  };

  // Month grid calculations
  const [currentYear, currentMonthNum] = currentYearMonth.split('-').map(Number);
  const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonthNum - 1, 1).getDay(); // 0 is Sun

  // Events in this selected month
  const currentMonthEvents = filteredEvents.filter((e) => e.date.startsWith(currentYearMonth));

  // Events filtered by selected day in month grid
  const dayEvents = selectedDay
    ? filteredEvents.filter((e) => e.date === selectedDay)
    : currentMonthEvents;

  // Year overview 12-month summary
  const yearSummary = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const mStr = String(i + 1).padStart(2, '0');
      const ym = `${currentYear}-${mStr}`;
      const evts = allEvents.filter((e) => e.date.startsWith(ym));
      return {
        month: i + 1,
        ym,
        events: evts,
      };
    });
    return months;
  }, [allEvents, currentYear]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 pb-20">
      {/* Top Header & View Modes Switcher */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-teal-400" />
              家庭物資行事曆
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              掌握耗材到期、保修期滿、維修保養與外借應還
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-teal-300 font-bold border border-slate-700">
            全部 {allEvents.length} 項排程
          </span>
        </div>

        {/* 3 View Mode Switchers: All Upcoming, Month Grid, Year Overview */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
          <button
            onClick={() => setViewMode('all_timeline')}
            className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
              viewMode === 'all_timeline'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>全部近期時間軸</span>
          </button>
          <button
            onClick={() => setViewMode('month_grid')}
            className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
              viewMode === 'month_grid'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>月曆網格</span>
          </button>
          <button
            onClick={() => setViewMode('year_overview')}
            className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
              viewMode === 'year_overview'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>全年度總覽</span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋排程日期、物品名稱、備忘對象..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-lg shrink-0 transition ${
              activeFilter === 'all'
                ? 'bg-teal-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setActiveFilter('expiration')}
            className={`px-3 py-1 rounded-lg shrink-0 transition ${
              activeFilter === 'expiration'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            耗材過期
          </button>
          <button
            onClick={() => setActiveFilter('warranty')}
            className={`px-3 py-1 rounded-lg shrink-0 transition ${
              activeFilter === 'warranty'
                ? 'bg-blue-500 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            保固到期
          </button>
          <button
            onClick={() => setActiveFilter('maintenance')}
            className={`px-3 py-1 rounded-lg shrink-0 transition ${
              activeFilter === 'maintenance'
                ? 'bg-purple-500 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            定期保養
          </button>
          <button
            onClick={() => setActiveFilter('loan_return')}
            className={`px-3 py-1 rounded-lg shrink-0 transition ${
              activeFilter === 'loan_return'
                ? 'bg-indigo-500 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            借出歸還
          </button>
          <button
            onClick={() => setActiveFilter('memo')}
            className={`px-3 py-1 rounded-lg shrink-0 transition ${
              activeFilter === 'memo'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            家庭備忘
          </button>
        </div>
      </div>

      {/* VIEW 1: ALL UPCOMING TIMELINE (Not limited to any single month!) */}
      {viewMode === 'all_timeline' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {timelineGroups.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <CalendarIcon className="w-12 h-12 mx-auto stroke-[1.5] opacity-40 mb-2" />
              <p className="text-sm font-semibold">目前沒有符合條件的排程事件</p>
              <p className="text-xs mt-1">可在各物品中設定有效期限、保修期與維修日期</p>
            </div>
          ) : (
            timelineGroups.map((group) => (
              <div key={group.id} className="space-y-2.5">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold border ${group.badge}`}>
                    {group.label} ({group.items.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {group.items.map((evt) => (
                    <EventCard
                      key={evt.id}
                      event={evt}
                      onSelectNode={onSelectNode}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 2: INTERACTIVE MONTH GRID (Calendar Month View) */}
      {viewMode === 'month_grid' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Month Navigator */}
          <div className="flex items-center justify-between bg-slate-900 p-2 rounded-2xl border border-slate-800">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-100 text-sm">
              {currentYear} 年 {currentMonthNum} 月
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month Calendar Grid */}
          <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
            {/* Weekday labels */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-500 mb-2">
              <span>日</span>
              <span>一</span>
              <span>二</span>
              <span>三</span>
              <span>四</span>
              <span>五</span>
              <span>六</span>
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-1 text-xs">
              {/* Empty leading days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10 rounded-lg opacity-20" />
              ))}

              {/* Real days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${currentYearMonth}-${String(dayNum).padStart(2, '0')}`;
                const eventsOnThisDay = currentMonthEvents.filter((e) => e.date === dateKey);
                const hasEvent = eventsOnThisDay.length > 0;
                const isSelected = selectedDay === dateKey;

                return (
                  <button
                    key={dayNum}
                    onClick={() => setSelectedDay(isSelected ? null : dateKey)}
                    className={`h-11 rounded-xl flex flex-col items-center justify-center p-1 transition relative ${
                      isSelected
                        ? 'bg-teal-500 text-slate-950 font-black shadow-md'
                        : hasEvent
                        ? 'bg-slate-800 text-slate-100 border border-teal-500/40 hover:bg-slate-700'
                        : 'text-slate-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {hasEvent && (
                      <span className="flex gap-0.5 mt-0.5">
                        {eventsOnThisDay.slice(0, 3).map((e, idx) => (
                          <span
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${
                              e.type === 'expiration'
                                ? 'bg-amber-400'
                                : e.type === 'warranty'
                                ? 'bg-blue-400'
                                : 'bg-teal-300'
                            }`}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Events on selected day / month */}
          <div className="space-y-2 pt-1">
            <div className="text-xs text-slate-400 flex items-center justify-between px-1">
              <span>
                {selectedDay
                  ? `${selectedDay} 共有 ${dayEvents.length} 項日程`
                  : `${currentYear}年${currentMonthNum}月 共有 ${dayEvents.length} 項日程`}
              </span>
              {selectedDay && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-teal-400 text-xs hover:underline"
                >
                  顯示全月
                </button>
              )}
            </div>

            {dayEvents.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                此日期無排程事項
              </div>
            ) : (
              dayEvents.map((evt) => (
                <EventCard
                  key={evt.id}
                  event={evt}
                  onSelectNode={onSelectNode}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: FULL YEAR OVERVIEW (12 Months at a Glance) */}
      {viewMode === 'year_overview' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between px-1 text-xs text-slate-400">
            <span className="font-bold text-slate-200">{currentYear} 年度 12 個月份全排程總覽</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {yearSummary.map((m) => (
              <div
                key={m.month}
                onClick={() => {
                  setCurrentYearMonth(m.ym);
                  setViewMode('month_grid');
                }}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  m.events.length > 0
                    ? 'bg-slate-900 border-teal-500/40 hover:border-teal-400 shadow-md'
                    : 'bg-slate-900/50 border-slate-800 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 text-sm">
                    {m.month} 月
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      m.events.length > 0
                        ? 'bg-teal-500/20 text-teal-300'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {m.events.length} 項
                  </span>
                </div>

                <div className="mt-2 text-[11px] space-y-1">
                  {m.events.slice(0, 2).map((e) => (
                    <div key={e.id} className="truncate text-slate-300">
                      • {e.title}
                    </div>
                  ))}
                  {m.events.length > 2 && (
                    <div className="text-[10px] text-teal-400">
                      + 還有 {m.events.length - 2} 項...
                    </div>
                  )}
                  {m.events.length === 0 && (
                    <div className="text-[10px] text-slate-600">無事項</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for individual Event Cards
const EventCard: React.FC<{
  event: CalendarEvent;
  onSelectNode: (node: InventoryNode) => void;
}> = ({ event, onSelectNode }) => {
  const isDanger = event.severity === 'danger';
  const isWarning = event.severity === 'warning';

  return (
    <div
      onClick={() => {
        if (event.node) onSelectNode(event.node);
      }}
      className={`p-3.5 rounded-2xl bg-slate-900 border transition cursor-pointer flex items-center gap-3 shadow-md ${
        isDanger
          ? 'border-rose-500/40 hover:border-rose-500'
          : isWarning
          ? 'border-amber-500/40 hover:border-amber-500'
          : 'border-slate-800 hover:border-teal-500/50'
      }`}
    >
      {/* Date Badge */}
      <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700/80 flex flex-col items-center justify-center shrink-0">
        <span className="text-[10px] text-slate-400">
          {event.date.split('-')[1]} 月
        </span>
        <span className="text-lg font-black text-slate-100">
          {event.date.split('-')[2]}
        </span>
      </div>

      {/* Event Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              event.type === 'expiration'
                ? 'bg-amber-500/20 text-amber-300'
                : event.type === 'warranty'
                ? 'bg-blue-500/20 text-blue-300'
                : event.type === 'maintenance'
                ? 'bg-purple-500/20 text-purple-300'
                : event.type === 'loan_return'
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {event.type === 'expiration'
              ? '耗材到期'
              : event.type === 'warranty'
              ? '保修到期'
              : event.type === 'maintenance'
              ? '維修保養'
              : event.type === 'loan_return'
              ? '外借應還'
              : '家庭待辦'}
          </span>
          <span className="text-xs text-slate-400 font-mono">{event.date}</span>
        </div>

        <h4 className="font-bold text-slate-100 text-sm mt-1 truncate">
          {event.title}
        </h4>

        {event.node && (
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
            <span>數量: {event.node.quantity} {event.node.unit || '個'}</span>
            {event.node.photos && event.node.photos[0] && (
              <span>• 點擊查看物品與存放位置</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
