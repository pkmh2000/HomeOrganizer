# 解決 GitHub Pages 推送後「桌機網頁無畫面 / 白畫面」排查與部署教學

如果在推送至 GitHub Pages 後，桌機或手機瀏覽器開啟時**出現白畫面（無畫面）**，通常是因為以下三個核心原因：

---

## 🔍 白畫面的原因與已修復機制

1. **GitHub Pages 的 Source（來源）選錯**：
   - ⚠️ **問題**：如果在 GitHub 的 Settings -> Pages 中選了「Deploy from a branch（從分支發布）」，GitHub Pages 會直接讀取根目錄未編譯的原始碼（含瀏覽器看不懂的 `.tsx`），導致瀏覽器報錯 `SyntaxError: Unexpected token '<'` 而白畫面。
   - ✅ **解決**：在 GitHub Pages 設定中，將 Source 改為 **「GitHub Actions」**，讓 GitHub 自動執行 `npm run build` 編譯發布！

2. **缺少結尾斜線（Trailing Slash）導致相對路徑 404**：
   - ⚠️ **問題**：若網址開啟為 `https://username.github.io/repo`（後面沒有 `/`），瀏覽器會將相對路徑 `./assets/...` 解讀成 `https://username.github.io/assets/...`，進而 404 找不到檔案造成白畫面。
   - ✅ **解決**：已在 `index.html` 加入自動補全結尾斜線的即時轉址腳本，任何網址輸入均會自動校正為完整路徑。

3. **缺少 `.nojekyll` 檔案**：
   - ⚠️ **問題**：GitHub Pages 預設會用 Jekyll 靜態產生器處理檔案，可能忽略下劃線命名或特定結構的 JS 檔案。
   - ✅ **解決**：已自動生成 `.nojekyll`，強制 GitHub Pages 忠實輸出 Vite 編譯後的純靜態檔案。

4. **Service Worker 快取衝突**：
   - ⚠️ **問題**：舊版多餘的 `public/sw.js` 搶佔了 VitePWA 產生的 Workbox 腳本，導致桌面瀏覽器快取找不到產出檔案。
   - ✅ **解決**：已統一收斂由 VitePWA 產出正規的 PWA Service Worker 與 Workbox，並在前端加入了 `ErrorBoundary` 錯誤捕捉介面，遇到任何問題均能顯示診斷訊息與單鍵修復。

---

## 🚀 正確推送與發布步驟（只需 2 步）

### 步驟 1：推送到 GitHub 儲存庫

在您的終端機執行：
```bash
git add .
git commit -m "fix: resolve github pages blank screen & deploy with actions"
git branch -M main
git push -u origin main
```

### 步驟 2：在 GitHub 設定頁面啟用 GitHub Actions 發布（關鍵步驟！）

1. 開啟您的 GitHub 專案頁面。
2. 點擊頂部 **Settings**（設定）標籤。
3. 在左側選單中找到並點擊 **Pages**。
4. 在 **Build and deployment**（建置與部署）區域：
   - 找到 **Source**（來源）下拉選單。
   - ⚠️ **務必切換為：`GitHub Actions`**（不要選 Deploy from a branch）。
5. 切換完成後，點擊上方選單的 **Actions** 標籤，即可看到 `Deploy to GitHub Pages` 工作流程正在自動編譯建置！
6. 等待約 1 分鐘綠色打勾完成，即可點擊提供的網址開啟您的收納管家，桌機與手機均能正常呈現且流暢運行！

---

## 📱 手機「可以顯示 但無法安裝」原因與解答

### 1. iPhone / iPad (iOS Safari)
- **原因**：Apple WebKit 瀏覽器核心**不支援** Chromium 的 `beforeinstallprompt` 自動彈跳對話框。
- **安裝方法**：
  1. 點擊 Safari 底部工具列中央的 **「分享」按鈕**（向上箭頭圖示）。
  2. 向上滑動選單，點選 **「加入主畫面 ⊞」**。
  3. 點選右上角 **「新增」**，桌面即會生成全螢幕獨立運作的 App！

### 2. 社群通訊軟體內建瀏覽器（LINE / FB Messenger / WeChat）
- **原因**：LINE 等社群 App 的內建 WebView 封鎖了 PWA 桌面安裝與 Service Worker 權限。
- **安裝方法**：
  - 點選右上角「…」或分享圖示，選擇 **「在系統預設瀏覽器中開啟」**（Chrome 或 Safari），即可直接使用單鍵安裝。

### 3. Android (Chrome)
- **原因**：若曾點擊過「取消」或瀏覽器尚未觸發自動提示。
- **安裝方法**：
  - 網頁頂部已提供 **「安裝 App」** 按鈕，點選即可呼叫安裝；
  - 亦可點選 Chrome 右上角 **「三個點選單（⋮）」** ➔ 選擇 **「加到主畫面」** 或 **「安裝應用程式」**！

