# HomeOrganizer 推送到 GitHub Pages 說明指南

本專案已完整支援 **GitHub Pages 靜態網站託管** 與 **PWA 全功能離線獨立運作**！
在手機（Android Chrome / iPhone Safari）與桌機（Chrome / Edge）皆可直接線上運行與安裝為桌面專屬 App。

---

## 🚀 方式一：透過 GitHub Actions 自動發布（最推薦、最自動）

專案內已為您配置好 `.github/workflows/deploy.yml`。每次推送到 GitHub 時，GitHub 會自動完成編譯並部署到 Pages：

1. **將專案推送到 GitHub**：
   ```bash
   git add .
   git commit -m "feat: HomeOrganizer PWA for GitHub Pages"
   git branch -M main
   git remote add origin https://github.com/<你的使用者名稱>/<你的儲存庫名稱>.git
   git push -u origin main
   ```

2. **在 GitHub 儲存庫中開啟 Pages**：
   - 開啟 GitHub 儲存庫頁面，點擊上方 **Settings**（設定）。
   - 左側選單點擊 **Pages**。
   - 在 **Build and deployment** 下的 **Source** 選擇：
     👉 **GitHub Actions**
   - 稍等約 1 分鐘，GitHub Actions 執行完畢後即可在 `https://<你的使用者名稱>.github.io/<你的儲存庫名稱>/` 看到您的收納管家！

---

## 📦 方式二：手動編譯並推送到 `gh-pages` 分支

如果您偏好直接推送編譯好的靜態檔案：

```bash
# 1. 執行編譯（產出 dist 目錄）
npm run build

# 2. 部署 dist 至 gh-pages 分支
npx gh-pages -d dist
```

---

## 📱 手機與電腦安裝桌面 App 指南

1. **Android 手機 (Chrome)**：
   - 用 Chrome 開啟您的 GitHub Pages 網址。
   - 點擊網頁上的「**安裝 App**」按鈕，或點擊瀏覽器右上角選單「**安裝應用程式**」/「**加到主螢幕**」。
   - 安裝後從手機桌面圖示啟動，即為無網址列的全螢幕原生體驗。

2. **電腦桌機 (Chrome / Edge)**：
   - 開啟 GitHub Pages 網址。
   - 網址列右側會出現「**安裝 HomeOrganizer**」圖示，點擊即可安裝到電腦桌面與開始功能表。

3. **自成一體與離線獨立運作**：
   - 安裝後無需與特定後端伺服器保持連線，收納資料、照片、條碼、行事曆均儲存於本機。
   - 支援完整的 JSON 全家備份、個別收納箱單獨匯出/匯入分享給家人。
   - 重新連線時，Service Worker 會自動在背景檢查最新版本並無縫更新。
