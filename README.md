# 北極星 Polaris ｜ 謝孟翔 Harry 個人網站

十年理化／物理教師、師鐸獎得主謝孟翔（Harry）的個人影響力網站「北極星 Polaris」（第一版：靜態單頁）。

北極星：**讓台灣的科學教育，從成績篩選回到好奇心與思考。**

## 技術

- 純 HTML / CSS / 少量原生 JS，無框架、無建置步驟、無後端
- 系統字型，零外部請求，Mobile-first
- 進場動畫使用 `IntersectionObserver`，並尊重 `prefers-reduced-motion`
- 順應系統深色模式

## 檔案

| 檔案 | 說明 |
|------|------|
| `index.html` | 全部頁面內容 |
| `styles.css` | 樣式與動畫 |
| `main.js` | 捲動陰影、進場動畫、錨點平滑捲動 |
| `vercel.json` | 靜態部署設定（快取、安全標頭） |

## 本機預覽

直接用瀏覽器打開 `index.html` 即可，或起一個簡單伺服器：

```bash
python3 -m http.server 8000
```

然後開 http://localhost:8000

## 部署（Vercel）

1. 這個資料夾已推上 GitHub。
2. 到 <https://vercel.com/new> 匯入這個 repo。
3. Framework Preset 選 **Other**，Build Command 留空，Output Directory 留空（根目錄即網站）。
4. Deploy。之後每次 `git push` 到 `main` 會自動重新部署。

## 之後要改內容

編輯 `index.html` 裡對應的區塊文字即可，改完 commit + push。

- 聯絡信箱：搜尋 `harryhsieh@icloud.com`
- 文章上線後：把「即將發表」區塊的 `<li>` 換成連結
