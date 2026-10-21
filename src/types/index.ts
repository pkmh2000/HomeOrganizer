export type NodeType = 'container' | 'item';

export interface Tag {
  id: string;
  name: string;
  color: string; // hex or tailwind class
}

export interface LoanStatus {
  isLoaned: boolean;
  borrower?: string;
  loanDate?: string;      // YYYY-MM-DD
  returnDueDate?: string; // YYYY-MM-DD
  returnedDate?: string;  // YYYY-MM-DD
  notes?: string;
}

export interface InventoryNode {
  id: string;
  parentId: string | null; // null for top-level root containers/rooms
  type: NodeType;          // 'container' or 'item'
  name: string;
  isPrivate: boolean;      // true = 個人私人, false = 家庭共有

  // Photos
  photos: string[];        // Array of data URLs or URLs. First is main photo.
  receiptPhotos?: string[];// 收據 / 發票 / 保修單照片

  // Quantities & Pricing
  quantity: number;
  unit?: string;           // 個, 包, 瓶, 盒, 條, 台...
  minStockAlert?: number;  // 低庫存警示值
  price?: number;          // 購買價格 (NT$)

  // Barcode & Identification
  barcode?: string;        // 條碼 EAN/UPC/Code128
  qrCode?: string;         // 專屬 QR 識別碼

  // Details
  description?: string;
  url?: string;            // 官網或購買連結
  tags: Tag[];             // 標籤顏色分類
  relatedItemIds?: string[];// 關聯物品 IDs

  // Dates & Life Cycle
  purchaseDate?: string;       // 購買日期
  warrantyExpiry?: string;     // 保修到期
  lastMaintenanceDate?: string;// 上次維修日
  nextMaintenanceDate?: string;// 下次維修日
  expirationDate?: string;     // 消耗品/有效期限
  lastStoredDate?: string;     // 上次存放/更新日

  // Loan Tracking
  loanStatus?: LoanStatus;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMemo {
  id: string;
  title: string;
  content?: string;
  priority: 'low' | 'medium' | 'high';
  assignedMember: string;   // 爸爸, 媽媽, 大寶, 小寶, 全家
  dueDate?: string;
  isDone: boolean;
  relatedNodeId?: string;   // 關聯物品/容器 ID
  createdAt: string;
}

export interface HouseholdData {
  version: string;
  householdName: string;
  exportedAt: string;
  nodes: InventoryNode[];
  memos: FamilyMemo[];
  members: string[];
}

export type ViewTab = 'dashboard' | 'containers' | 'tree' | 'calendar' | 'memos' | 'settings';

export interface FilterOptions {
  searchQuery: string;
  tagId?: string;
  onlyPrivate?: boolean;
  onlyShared?: boolean;
  statusFilter?: 'all' | 'expiring_soon' | 'expired' | 'low_stock' | 'loaned' | 'warranty_soon';
}
