# workshop.harryhsieh.com（已併入本專案）

「回到教與學的本質」系列工作坊的宣傳與報名頁，原本是獨立的 Vercel 專案 `workshop-promo`，
現在跟個人網站放在同一個 repo、同一個 Vercel 專案。

- 頁面：`workshop/teachandlearning/`（`index.html` 宣傳頁、`register.html` 站內報名、`og.png`、`img/` 講者照片）
  → 建置時複製到 `dist/workshop/teachandlearning/`
- 網址：`vercel.json` 把 **workshop.harryhsieh.com** 這個網域的所有請求改寫到 `/workshop/…`，
  所以 `https://workshop.harryhsieh.com/teachandlearning/` 與 `/teachandlearning/register` 維持原樣；
  `workshop.harryhsieh.com/` 與 `/register` 會轉到對應頁面；
  從主網域開 `/workshop/…` 會轉到子網域。
- 頁面內的圖片與報名連結都寫成 `/teachandlearning/…` 絕對路徑，不受網址有無結尾斜線影響。
- `apps-script/Code.gs`：站內報名寫進 Google 試算表的 Apps Script（部署在 Google，不隨網站發佈；
  網址已寫在 `register.html` 的 `ENDPOINT`）。
- 報名名額：站內報名與進修網的人數是分開的，每場 25 人要合併兩邊名單自行控管。
