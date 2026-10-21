import { InventoryNode, FamilyMemo, HouseholdData } from '../types';

const STORAGE_KEY_NODES = 'homeorganizer_nodes_v2';
const STORAGE_KEY_MEMOS = 'homeorganizer_memos_v2';
const STORAGE_KEY_MEMBERS = 'homeorganizer_members_v2';
const STORAGE_KEY_HOUSEHOLD_NAME = 'homeorganizer_hh_name_v2';

export const DEFAULT_MEMBERS = ['全家', '爸爸', '媽媽', '大寶', '二寶'];

export const TAG_PALETTE = [
  { name: '消耗品', color: '#f59e0b' },
  { name: '食品/乾貨', color: '#10b981' },
  { name: '急救常備藥', color: '#ef4444' },
  { name: '3C/電器', color: '#3b82f6' },
  { name: '工具/修繕', color: '#8b5cf6' },
  { name: '重要文件/卡證', color: '#ec4899' },
  { name: '清潔用品', color: '#06b6d4' },
  { name: '季節衣物', color: '#f97316' },
  { name: '外出裝備', color: '#6366f1' },
  { name: '貴重物品', color: '#eab308' },
];

// Helper sample curated SVG data URIs for instant, reliable loading without external network flakiness
function makeSvgDataUri(bg1: string, bg2: string, emoji: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}" />
        <stop offset="100%" stop-color="${bg2}" />
      </linearGradient>
    </defs>
    <rect width="400" height="300" rx="20" fill="url(#g)" />
    <g transform="translate(200, 120)">
      <text font-size="76" text-anchor="middle" dominant-baseline="central">${emoji}</text>
    </g>
    <rect x="40" y="210" width="320" height="54" rx="14" fill="#0f172a" opacity="0.65" />
    <text x="200" y="244" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Initial Sample Seed Data showcasing multi-level containers, expiry, warranties, loan tracking
export const INITIAL_SAMPLE_NODES: InventoryNode[] = [
  // Top level 1: 客廳
  {
    id: 'room-living',
    parentId: null,
    type: 'container',
    name: '客廳空間 🛋️',
    isPrivate: false,
    photos: [makeSvgDataUri('#0f766e', '#042f2e', '🛋️', '客廳空間')],
    quantity: 1,
    unit: '間',
    description: '家庭公共活動區域，包含電視櫃、沙發茶几與玄關收納櫃',
    tags: [{ id: 't1', name: '公共區域', color: '#0d9488' }],
    lastStoredDate: '2026-10-18',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-10-18T14:30:00Z',
  },
  // Child container inside 客廳: 電視櫃收納抽屜
  {
    id: 'box-tv-cabinet',
    parentId: 'room-living',
    type: 'container',
    name: '電視櫃三層抽屜 🗄️',
    isPrivate: false,
    photos: [makeSvgDataUri('#1e293b', '#334155', '🗄️', '電視櫃抽屜')],
    quantity: 1,
    unit: '組',
    description: '放置客廳備用線材、說明書、遊戲把手與遙控器備用電池',
    tags: [{ id: 't2', name: '3C/電器', color: '#3b82f6' }],
    lastStoredDate: '2026-10-15',
    createdAt: '2026-09-02T10:00:00Z',
    updatedAt: '2026-10-15T12:00:00Z',
  },
  // Items inside 電視櫃抽屜
  {
    id: 'item-game-pad',
    parentId: 'box-tv-cabinet',
    type: 'item',
    name: 'Switch 普羅無線手把 🎮',
    isPrivate: false,
    photos: [makeSvgDataUri('#3b82f6', '#1d4ed8', '🎮', 'Switch 手把')],
    quantity: 2,
    unit: '支',
    price: 1890,
    barcode: '4902370535747',
    description: '黑色原廠 Pro 手把，已配對主機。',
    tags: [{ id: 't2', name: '3C/電器', color: '#3b82f6' }],
    purchaseDate: '2026-01-15',
    warrantyExpiry: '2027-01-15',
    lastStoredDate: '2026-10-10',
    loanStatus: {
      isLoaned: true,
      borrower: '表弟小豪',
      loanDate: '2026-10-12',
      returnDueDate: '2026-10-25',
      notes: '借去打週末派對，下週日聚餐歸還',
    },
    createdAt: '2026-09-03T11:00:00Z',
    updatedAt: '2026-10-12T16:00:00Z',
  },
  {
    id: 'item-aa-batteries',
    parentId: 'box-tv-cabinet',
    type: 'item',
    name: 'Panasonic 3號充電電池 🔋',
    isPrivate: false,
    photos: [makeSvgDataUri('#0284c7', '#0369a1', '🔋', '3號電池組')],
    quantity: 8,
    unit: '顆',
    minStockAlert: 4,
    price: 650,
    barcode: '4549077677715',
    description: 'eneloop pro 高容量，4顆已充滿備用。',
    tags: [{ id: 't-con', name: '消耗品', color: '#f59e0b' }],
    lastStoredDate: '2026-10-01',
    createdAt: '2026-09-03T11:20:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  },

  // Top level 2: 廚房與儲藏室
  {
    id: 'room-kitchen',
    parentId: null,
    type: 'container',
    name: '廚房與乾貨儲藏櫃 🍳',
    isPrivate: false,
    photos: [makeSvgDataUri('#ea580c', '#c2410c', '🍳', '廚房儲物區')],
    quantity: 1,
    unit: '間',
    description: '食品、料理調味品、廚房備用消耗品集中處',
    tags: [{ id: 't-food', name: '食品/乾貨', color: '#10b981' }],
    lastStoredDate: '2026-10-19',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-10-19T08:00:00Z',
  },
  // Nested Container inside Kitchen: 零食乾貨保鮮箱
  {
    id: 'box-pantry-dry',
    parentId: 'room-kitchen',
    type: 'container',
    name: '中島下層・乾貨密封箱 📦',
    isPrivate: false,
    photos: [makeSvgDataUri('#d97706', '#b45309', '📦', '密封儲存箱')],
    quantity: 1,
    unit: '箱',
    description: '放置未開封義大利麵、罐頭、燕麥與乾燥香菇',
    tags: [{ id: 't-food', name: '食品/乾貨', color: '#10b981' }],
    lastStoredDate: '2026-10-19',
    createdAt: '2026-09-05T12:00:00Z',
    updatedAt: '2026-10-19T08:30:00Z',
  },
  // Items in Pantry box (some expiring soon!)
  {
    id: 'item-olive-oil',
    parentId: 'box-pantry-dry',
    type: 'item',
    name: '特級初榨冷壓橄欖油 🫒',
    isPrivate: false,
    photos: [makeSvgDataUri('#65a30d', '#4d7c0f', '🫒', '初榨橄欖油')],
    quantity: 2,
    unit: '瓶',
    minStockAlert: 1,
    price: 480,
    barcode: '8410293847291',
    description: '西班牙原裝 750ml，開封請避光陰涼保存',
    tags: [
      { id: 't-con', name: '消耗品', color: '#f59e0b' },
      { id: 't-food', name: '食品/乾貨', color: '#10b981' },
    ],
    purchaseDate: '2026-06-10',
    expirationDate: '2026-10-28', // Expiring in 8 days!
    lastStoredDate: '2026-10-19',
    createdAt: '2026-09-05T12:10:00Z',
    updatedAt: '2026-10-19T08:30:00Z',
  },
  {
    id: 'item-organic-oats',
    parentId: 'box-pantry-dry',
    type: 'item',
    name: '有機大燕麥片家庭號 🌾',
    isPrivate: false,
    photos: [makeSvgDataUri('#ca8a04', '#a16207', '🌾', '有機大燕麥片')],
    quantity: 1,
    unit: '大包',
    minStockAlert: 2, // Low stock warning!
    price: 320,
    barcode: '4710088432190',
    description: '早餐必備，只剩最後1包，需要補貨',
    tags: [
      { id: 't-con', name: '消耗品', color: '#f59e0b' },
      { id: 't-food', name: '食品/乾貨', color: '#10b981' },
    ],
    purchaseDate: '2026-08-01',
    expirationDate: '2026-11-15',
    lastStoredDate: '2026-10-19',
    createdAt: '2026-09-05T12:15:00Z',
    updatedAt: '2026-10-19T08:30:00Z',
  },

  // Top level 3: 常備急救醫藥箱
  {
    id: 'room-medicine',
    parentId: null,
    type: 'container',
    name: '家庭急救與常備醫藥櫃 💊',
    isPrivate: false,
    photos: [makeSvgDataUri('#dc2626', '#991b1b', '💊', '急救醫藥櫃')],
    quantity: 1,
    unit: '櫃',
    description: '放置感冒藥、外傷包紮、退燒止痛、血壓計與耳溫槍',
    tags: [{ id: 't-med', name: '急救常備藥', color: '#ef4444' }],
    lastStoredDate: '2026-10-16',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-10-16T18:00:00Z',
  },
  {
    id: 'item-ear-thermometer',
    parentId: 'room-medicine',
    type: 'item',
    name: '百靈耳溫槍旗艦版 🌡️',
    isPrivate: false,
    photos: [makeSvgDataUri('#0284c7', '#0369a1', '🌡️', '百靈耳溫槍')],
    quantity: 1,
    unit: '支',
    price: 2450,
    barcode: '4022495000188',
    description: 'IRT6520，附備用耳套50入',
    tags: [{ id: 't-med', name: '急救常備藥', color: '#ef4444' }],
    purchaseDate: '2025-11-10',
    warrantyExpiry: '2027-11-10',
    lastMaintenanceDate: '2026-05-10',
    nextMaintenanceDate: '2026-11-10', // Calibration check coming up
    lastStoredDate: '2026-10-16',
    createdAt: '2026-09-06T10:00:00Z',
    updatedAt: '2026-10-16T18:00:00Z',
  },
  {
    id: 'item-pain-relief',
    parentId: 'room-medicine',
    type: 'item',
    name: '普拿疼止痛錠加強版 💊',
    isPrivate: false,
    photos: [makeSvgDataUri('#b91c1c', '#7f1d1d', '💊', '普拿疼止痛錠')],
    quantity: 1,
    unit: '盒',
    minStockAlert: 1,
    price: 195,
    barcode: '4710123456789',
    description: '10錠裝，頭痛經痛常備',
    tags: [
      { id: 't-med', name: '急救常備藥', color: '#ef4444' },
      { id: 't-con', name: '消耗品', color: '#f59e0b' },
    ],
    purchaseDate: '2024-10-01',
    expirationDate: '2026-10-24', // Expiring in 4 days!
    lastStoredDate: '2026-10-16',
    createdAt: '2026-09-06T10:15:00Z',
    updatedAt: '2026-10-16T18:00:00Z',
  },
  {
    id: 'item-bandage-pack',
    parentId: 'room-medicine',
    type: 'item',
    name: '3M 滅菌防水OK繃特惠包 🩹',
    isPrivate: false,
    photos: [makeSvgDataUri('#059669', '#065f46', '🩹', '3M 防水OK繃')],
    quantity: 2,
    unit: '包',
    minStockAlert: 2,
    price: 129,
    barcode: '4710367890123',
    description: '綜合尺寸30片入',
    tags: [
      { id: 't-med', name: '急救常備藥', color: '#ef4444' },
      { id: 't-con', name: '消耗品', color: '#f59e0b' },
    ],
    purchaseDate: '2025-03-12',
    expirationDate: '2027-03-12',
    lastStoredDate: '2026-10-16',
    createdAt: '2026-09-06T10:20:00Z',
    updatedAt: '2026-10-16T18:00:00Z',
  },

  // Top level 4: 主臥室與私人收納 (Private container example)
  {
    id: 'room-master-bedroom',
    parentId: null,
    type: 'container',
    name: '主臥室衣帽間 🛏️',
    isPrivate: false,
    photos: [makeSvgDataUri('#7c3aed', '#5b21b6', '🛏️', '主臥室空間')],
    quantity: 1,
    unit: '間',
    description: '主臥室衣物、飾品與私人重要證件保險箱',
    tags: [{ id: 't-cloth', name: '季節衣物', color: '#f97316' }],
    lastStoredDate: '2026-10-18',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-10-18T15:00:00Z',
  },
  // Private Sub-container: 保險箱 (Personal / Private)
  {
    id: 'box-private-safe',
    parentId: 'room-master-bedroom',
    type: 'container',
    name: '私人電子密碼保險箱 🔒',
    isPrivate: true, // Marked as private
    photos: [makeSvgDataUri('#334155', '#0f172a', '🔒', '個人保險箱')],
    quantity: 1,
    unit: '台',
    price: 8800,
    description: '個人私人物件、備用鑰匙、重要文件契約，需要切換私人模式檢視',
    tags: [
      { id: 't-doc', name: '重要文件/卡證', color: '#ec4899' },
      { id: 't-val', name: '貴重物品', color: '#eab308' },
    ],
    purchaseDate: '2024-05-20',
    lastStoredDate: '2026-10-18',
    createdAt: '2026-09-07T14:00:00Z',
    updatedAt: '2026-10-18T15:30:00Z',
  },
  {
    id: 'item-passports',
    parentId: 'box-private-safe',
    type: 'item',
    name: '全家護照與台胞證夾 🛂',
    isPrivate: true,
    photos: [makeSvgDataUri('#0f766e', '#115e59', '🛂', '護照證件包')],
    quantity: 4,
    unit: '本',
    description: '包含爸爸、媽媽、大寶與小寶之最新晶片護照，預計2028過期',
    tags: [{ id: 't-doc', name: '重要文件/卡證', color: '#ec4899' }],
    expirationDate: '2028-08-30',
    lastStoredDate: '2026-10-18',
    createdAt: '2026-09-07T14:10:00Z',
    updatedAt: '2026-10-18T15:30:00Z',
  },

  // Top level 5: 車庫與五金工具箱
  {
    id: 'room-garage',
    parentId: null,
    type: 'container',
    name: '陽台與五金工具收納區 🛠️',
    isPrivate: false,
    photos: [makeSvgDataUri('#475569', '#1e293b', '🛠️', '工具修繕區')],
    quantity: 1,
    unit: '區',
    description: '居家修繕工具、露營裝備、高壓清洗機與備用零件',
    tags: [{ id: 't-tools', name: '工具/修繕', color: '#8b5cf6' }],
    lastStoredDate: '2026-10-14',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-10-14T11:00:00Z',
  },
  {
    id: 'item-bosch-drill',
    parentId: 'room-garage',
    type: 'item',
    name: 'Bosch 18V 震動無刷電鑽套裝 🪛',
    isPrivate: false,
    photos: [makeSvgDataUri('#0284c7', '#075985', '🪛', 'Bosch 電鑽')],
    quantity: 1,
    unit: '組',
    price: 4999,
    barcode: '3165140889216',
    description: '含雙鋰電池與充電座，維修家具及安裝壁掛架必備',
    tags: [{ id: 't-tools', name: '工具/修繕', color: '#8b5cf6' }],
    purchaseDate: '2025-08-20',
    warrantyExpiry: '2026-11-20', // Warranty expiring in 1 month!
    lastMaintenanceDate: '2026-07-01',
    nextMaintenanceDate: '2026-12-01',
    lastStoredDate: '2026-10-14',
    createdAt: '2026-09-08T09:00:00Z',
    updatedAt: '2026-10-14T11:00:00Z',
  },
];

export const INITIAL_SAMPLE_MEMOS: FamilyMemo[] = [
  {
    id: 'memo-1',
    title: '普拿疼快過期了，記得藥局補貨',
    content: '急救醫藥櫃裡的止痛錠10/24到期，下次去康是美記得買新的一盒。',
    priority: 'high',
    assignedMember: '媽媽',
    dueDate: '2026-10-24',
    isDone: false,
    relatedNodeId: 'item-pain-relief',
    createdAt: '2026-10-18T10:00:00Z',
  },
  {
    id: 'memo-2',
    title: '跟表弟催收 Switch 手把',
    content: '10/25 家族聚餐時記得提醒小豪帶來還。',
    priority: 'medium',
    assignedMember: '爸爸',
    dueDate: '2026-10-25',
    isDone: false,
    relatedNodeId: 'item-game-pad',
    createdAt: '2026-10-18T11:30:00Z',
  },
  {
    id: 'memo-3',
    title: '冷壓橄欖油趁促銷補2瓶',
    content: '乾貨密封箱只剩一瓶快見底，全聯特價可多買。',
    priority: 'medium',
    assignedMember: '全家',
    dueDate: '2026-10-28',
    isDone: false,
    relatedNodeId: 'item-olive-oil',
    createdAt: '2026-10-19T09:00:00Z',
  },
  {
    id: 'memo-4',
    title: '百靈耳溫槍每半年校正保養',
    content: '11月送回原廠做感測頭精準度檢校。',
    priority: 'low',
    assignedMember: '爸爸',
    dueDate: '2026-11-10',
    isDone: false,
    relatedNodeId: 'item-ear-thermometer',
    createdAt: '2026-10-16T15:00:00Z',
  },
];

// LocalStorage helpers
export function loadNodes(): InventoryNode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NODES);
    if (!raw) {
      saveNodes(INITIAL_SAMPLE_NODES);
      return INITIAL_SAMPLE_NODES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveNodes(INITIAL_SAMPLE_NODES);
      return INITIAL_SAMPLE_NODES;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load nodes from localStorage', e);
    return INITIAL_SAMPLE_NODES;
  }
}

export function saveNodes(nodes: InventoryNode[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_NODES, JSON.stringify(nodes));
  } catch (e) {
    console.error('Failed to save nodes', e);
  }
}

export function loadMemos(): FamilyMemo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMOS);
    if (!raw) {
      saveMemos(INITIAL_SAMPLE_MEMOS);
      return INITIAL_SAMPLE_MEMOS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      saveMemos(INITIAL_SAMPLE_MEMOS);
      return INITIAL_SAMPLE_MEMOS;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load memos', e);
    return INITIAL_SAMPLE_MEMOS;
  }
}

export function saveMemos(memos: FamilyMemo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MEMOS, JSON.stringify(memos));
  } catch (e) {
    console.error('Failed to save memos', e);
  }
}

export function loadMembers(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMBERS);
    if (!raw) {
      saveMembers(DEFAULT_MEMBERS);
      return DEFAULT_MEMBERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveMembers(DEFAULT_MEMBERS);
      return DEFAULT_MEMBERS;
    }
    return parsed;
  } catch (e) {
    return DEFAULT_MEMBERS;
  }
}

export function saveMembers(members: string[]): void {
  localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
}

export function loadHouseholdName(): string {
  return localStorage.getItem(STORAGE_KEY_HOUSEHOLD_NAME) || '甜蜜溫馨之家';
}

export function saveHouseholdName(name: string): void {
  localStorage.setItem(STORAGE_KEY_HOUSEHOLD_NAME, name);
}

// Tree and Ancestor Path Utilities (crucial for "搜尋關鍵字 會帶出父子連結圖片")
export function getNodeAncestors(nodes: InventoryNode[], targetId: string): InventoryNode[] {
  const map = new Map<string, InventoryNode>(nodes.map((n) => [n.id, n]));
  const path: InventoryNode[] = [];
  let current = map.get(targetId);

  while (current) {
    path.unshift(current);
    if (!current.parentId) break;
    current = map.get(current.parentId);
  }

  return path;
}

// Get all descendants of a container (recursive)
export function getDescendantIds(nodes: InventoryNode[], containerId: string): string[] {
  const results: string[] = [];
  const children = nodes.filter((n) => n.parentId === containerId);
  for (const child of children) {
    results.push(child.id);
    if (child.type === 'container') {
      results.push(...getDescendantIds(nodes, child.id));
    }
  }
  return results;
}

// Count items and containers inside a subtree
export function getSubtreeStats(nodes: InventoryNode[], containerId: string | null) {
  const directChildren = nodes.filter((n) => n.parentId === containerId);
  let totalContainers = 0;
  let totalItems = 0;
  let totalValue = 0;

  const countDeep = (pId: string | null) => {
    const list = nodes.filter((n) => n.parentId === pId);
    for (const item of list) {
      if (item.type === 'container') {
        totalContainers++;
        countDeep(item.id);
      } else {
        totalItems++;
        if (item.price && item.quantity) {
          totalValue += item.price * item.quantity;
        }
      }
    }
  };

  countDeep(containerId);

  return {
    directCount: directChildren.length,
    totalContainers,
    totalItems,
    totalValue,
  };
}

// Convert a single container and its children to JSON for export
export function exportContainerSubtree(nodes: InventoryNode[], rootContainerId: string): string {
  const root = nodes.find((n) => n.id === rootContainerId);
  if (!root) throw new Error('Container not found');

  const descendantIds = new Set(getDescendantIds(nodes, rootContainerId));
  descendantIds.add(rootContainerId);

  const subtreeNodes = nodes.filter((n) => descendantIds.has(n.id));

  const exportPayload = {
    version: '2.0',
    type: 'container_export',
    rootContainerName: root.name,
    exportedAt: new Date().toISOString(),
    nodes: subtreeNodes,
  };

  return JSON.stringify(exportPayload, null, 2);
}

// Export full household backup
export function exportFullHousehold(nodes: InventoryNode[], memos: FamilyMemo[], members: string[], householdName: string): string {
  const backup: HouseholdData = {
    version: '2.0',
    householdName,
    exportedAt: new Date().toISOString(),
    nodes,
    memos,
    members,
  };
  return JSON.stringify(backup, null, 2);
}

// Check expiration status
export function getExpirationStatus(dateStr?: string): {
  status: 'valid' | 'expiring_soon' | 'expired' | 'none';
  daysLeft?: number;
  label: string;
  badgeClass: string;
} {
  if (!dateStr) {
    return { status: 'none', label: '未設定期限', badgeClass: 'bg-slate-800 text-slate-400' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);

  if (isNaN(target.getTime())) {
    return { status: 'none', label: '日期無效', badgeClass: 'bg-slate-800 text-slate-400' };
  }

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      daysLeft: diffDays,
      label: `已過期 ${Math.abs(diffDays)} 天`,
      badgeClass: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    };
  } else if (diffDays <= 7) {
    return {
      status: 'expiring_soon',
      daysLeft: diffDays,
      label: diffDays === 0 ? '今日到期！' : `${diffDays} 天後即將到期`,
      badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold',
    };
  } else if (diffDays <= 30) {
    return {
      status: 'expiring_soon',
      daysLeft: diffDays,
      label: `${diffDays} 天後到期`,
      badgeClass: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/20',
    };
  } else {
    return {
      status: 'valid',
      daysLeft: diffDays,
      label: `剩餘 ${diffDays} 天`,
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    };
  }
}
