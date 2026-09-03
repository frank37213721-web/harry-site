# 北極星 Polaris ｜ 謝孟翔 Harry 個人網站

十年理化／物理教師、師鐸獎得主謝孟翔（Harry）的個人影響力網站「北極星 Polaris」。

北極星：**讓台灣的科學教育，從成績篩選回到好奇心與思考。**

## 技術

- 首頁純 HTML / CSS / 少量原生 JS，無框架、無後端
- 文章用 Markdown 檔（`content/articles/`），部署時由 `build.mjs` 產生頁面
- 系統字型、Mobile-first、進場動畫尊重 `prefers-reduced-motion`、順應系統深色模式

## 檔案

| 檔案 | 說明 |
|------|------|
| `index.html` | 首頁內容 |
| `styles.css` | 全站樣式與動畫 |
| `main.js` | 捲動陰影、進場動畫、錨點平滑捲動 |
| `build.mjs` | 建置腳本：Markdown → 文章頁，靜態檔複製到 `dist/` |
| `content/articles/*.md` | 文章原始檔 |
| `admin/` | Decap CMS（`/admin/` 網頁登入編輯器） |
| `api/auth.js`、`api/callback.js` | GitHub OAuth（給 `/admin/` 用） |
| `vercel.json` | 部署設定（build 指令、輸出目錄、快取、安全標頭） |

## 本機預覽

```bash
npm install     # 第一次
npm run build   # 產生 dist/
cd dist && python3 -m http.server 8080
```

本機沒有 Vercel 的 cleanUrls，子頁網址要帶 `.html`（例如 `/articles/welcome.html`）；正式站不用。

## 部署（Vercel）

已接 GitHub，`git push` 到 `main` 會自動部署。Vercel 專案設定：

- Build Command：`npm run build`（已寫在 `vercel.json`）
- Output Directory：`dist`（已寫在 `vercel.json`）

## 寫文章 / `/admin` 登入編輯器

見 **[ARTICLES-SETUP.md](ARTICLES-SETUP.md)**。

- 快速版：在 `content/articles/` 加一個 `.md` 檔（含 `title` / `date` / `slug` / `draft` 等 front matter），`git push` 即上線。
- `/admin/` 網頁編輯器需要一次性的 GitHub OAuth 設定，步驟見上面文件。

## 之後要改首頁內容

編輯 `index.html` 對應區塊，commit + push。聯絡信箱搜尋 `harryhsieh@icloud.com`。
