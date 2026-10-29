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
  parentId: string | null; // null for top-level root containers/rooms; or specific container id
  type: NodeType;          // 'container' or 'item'
  name: string;
  isPrivate: boolean;      // true = 個人私人, false = 家庭共有
  isArchived?: boolean;    // true = 已編輯歸檔, false/undefined = 置於未歸檔區 (Inbox)

  // Ownership, Spaces & Permissions (模擬轉移、共有、私有、密碼與私鑰)
  ownerName?: string;      // 擁有者 (例: 爸爸, 媽媽, 大寶, 經理, Alice)
  spaceId?: string;        // 所屬空間 (例: space-home, space-office)
  accessKey?: string;      // 容器專屬私鑰 (6位數密碼或金鑰)
  accessKeyExpiry?: string;// 私鑰到期時間 ('unlimited' 或 ISO 日期時間字串)
  sharedWith?: string[];   // 開放可共同編輯的成員名單 (例: ['媽媽', 'Alice'])

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

export interface StagingDraftCard {
  id: string;
  photoUrl: string;
  name: string;
  type: NodeType;
  isPrivate: boolean;
  quantity: number;
  category?: string;
  color?: string;
  description?: string;
  expirationDate?: string;
  targetDestinationId?: string | null | 'inbox'; // custom per card if overridden
  spaceId?: string;
  ownerName?: string;
  createdAt?: string;
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

export interface StorageSpace {
  id: string;
  name: string;
  type: 'home' | 'office' | 'villa' | 'warehouse' | 'other';
  icon: string;
  description?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  role: 'admin' | 'member' | 'guest';
  pinCode?: string; // 4~6位數密碼或安全PIN
}

export interface GalleryPhoto {
  id: string;
  dataUrl: string;
  title: string;
  createdAt: string;
  nodeId?: string;
  nodeName?: string;
  tags?: string[];
  isPrivate?: boolean;
  ownerName?: string;
}

export interface LocalSnapshot {
  id: string;
  name: string;
  createdAt: string;
  nodeCount: number;
  memoCount: number;
  data: HouseholdData;
}

export type ExportDestination = 'local_snapshot' | 'download_json' | 'clipboard_code';

export interface HouseholdData {
  version: string;
  householdName: string;
  exportedAt: string;
  nodes: InventoryNode[];
  memos: FamilyMemo[];
  members: string[];
  spaces?: StorageSpace[];
  activeSpaceId?: string;
}

export type ViewTab = 'dashboard' | 'containers' | 'tree' | 'calendar' | 'memos' | 'gallery' | 'spaces' | 'settings';

export interface FilterOptions {
  searchQuery: string;
  tagId?: string;
  onlyPrivate?: boolean;
  onlyShared?: boolean;
  onlyUnfiled?: boolean;
  statusFilter?: 'all' | 'expiring_soon' | 'expired' | 'low_stock' | 'loaned' | 'warranty_soon';
}

// ----------------------------------------------------
// Database Destination & Decentralized Storage Types
// ----------------------------------------------------
export type DatabaseDestinationType = 'local' | 'google_drive' | 'nas_webdav';

export interface StorageQuotaInfo {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  safeReserveBytes: number; // e.g. 200MB buffer
  requiredBytes?: number;
  isSufficient: boolean;
  warningMessage?: string;
}

export interface GoogleDriveConfig {
  folderId?: string;
  folderName: string;
  userEmail?: string;
  accessToken?: string;
  autoSync: boolean;
  isVerified?: boolean;
  verifiedAt?: string;
  verificationCodeSentAt?: string;
  savedVaultExists?: boolean;
  remoteNodeCount?: number;
  lastRemoteSyncAt?: string;
}

export interface WebDavConfig {
  serverUrl: string;
  username: string;
  password?: string;
  folderPath: string;
  autoSync: boolean;
}

export interface CloudDiffItem {
  id: string;
  name: string;
  type: 'container' | 'item';
  status: 'local_only' | 'cloud_only' | 'conflicted' | 'identical';
  localNode?: InventoryNode;
  cloudNode?: InventoryNode;
  selectedAction: 'keep_local' | 'keep_cloud' | 'keep_both' | 'discard';
}

export interface CloudDiffResult {
  hasDifferences: boolean;
  localOnlyCount: number;
  cloudOnlyCount: number;
  conflictedCount: number;
  identicalCount: number;
  items: CloudDiffItem[];
  remoteData: HouseholdData | null;
}

export interface DatabaseLocationState {
  activeDestination: DatabaseDestinationType; // defaults to 'local'
  safeReserveMb: number; // default: 200 MB
  lastBackupTime?: string;
  googleDrive: GoogleDriveConfig;
  webdav: WebDavConfig;
  migrationHistory: {
    id: string;
    from: DatabaseDestinationType;
    to: DatabaseDestinationType;
    migratedAt: string;
    nodeCount: number;
    originalDeleted: boolean;
  }[];
}


