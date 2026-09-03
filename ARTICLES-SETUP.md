# 文章系統 / `/admin` 登入編輯器 設定說明

網站的文章用 **Markdown 檔** 存在 `content/articles/`，Vercel 部署時由 `build.mjs`
自動轉成 `/articles`（列表）與 `/articles/<代稱>`（內文）頁面。

`/admin/` 是 [Decap CMS](https://decapcms.org)：用 **GitHub 帳號登入**，在網頁上寫文章，
存檔時它會自動 commit 回這個 repo，Vercel 隨即重新部署。

要讓 `/admin/` 能登入，需要做一次性的 GitHub OAuth 設定（約 10 分鐘）。做完之後就不用再碰。

---

## 你會用到的網域

正式網域是 **`harryhsieh.com`**（Cloudflare 註冊）。`admin/config.yml` 已經填好這個網域。

先把網域接上 Vercel（見文末「附錄：把 harryhsieh.com 接到 Vercel」），再做下面的 OAuth 設定，
這樣一次到位。若想先用 `你的專案.vercel.app` 測，把 `admin/config.yml` 三處網域暫時改掉即可。

---

## 步驟 1：建立 GitHub OAuth App

1. 開 <https://github.com/settings/developers> →「OAuth Apps」→「New OAuth App」
2. 依畫面欄位填（新版表單長這樣）：

   | 欄位 | 填什麼 |
   |------|--------|
   | **Application name** | `北極星 Polaris CMS` |
   | **Homepage URL** | `https://harryhsieh.com` |
   | **Application description** | 留空即可（或寫「個人網站文章後台」） |
   | **Redirect URI**（Redirect URIs 區塊那格） | `https://harryhsieh.com/api/callback` |
   | Allow wildcard matching | **不要勾** |
   | Enable Device Flow | **不要勾** |
   | **Expire user access tokens** | **把勾取消**（取消後 token 不會過期，Decap 才不會每 8 小時要你重新登入） |

   > 想同時能用 `*.vercel.app` 網址登入的話，按「Add redirect URI」再加一條
   > `https://你的專案.vercel.app/api/callback`（最多 10 條）。

3. 按「Register application」
4. 記下 **Client ID**
5. 按「Generate a new client secret」，記下 **Client secret**（只會顯示一次，離開就看不到）

---

## 步驟 2：在 Vercel 加環境變數

Vercel 專案 →「Settings」→「Environment Variables」，新增兩個（Production 環境）：

| Name | Value |
|------|-------|
| `GITHUB_OAUTH_CLIENT_ID` | 步驟 1 的 Client ID |
| `GITHUB_OAUTH_CLIENT_SECRET` | 步驟 1 的 Client secret |

存檔。

---

## 步驟 3：`admin/config.yml`

已經填好 `harryhsieh.com`，不用改。（若你改用別的網域，把 `base_url` / `site_url` /
`display_url` 三處換掉即可。）

---

## 步驟 4：登入

1. 到 `https://你的網域/admin/`
2. 按「使用你的 GitHub 帳號來進行登入」
3. 授權後就會進到編輯後台

---

## 日常使用

### 用 `/admin/` 寫（推薦）

「文章」→「New 文章」，填標題、日期、**網址代稱**（英文小寫＋連字號，例如
`why-ai-teaching`）、摘要、內文。

- **草稿**：勾著就不會公開；要發佈時取消勾選再存檔。
- **外部文章連結**：如果文章發在 Medium 等平台，把網址貼進這格，內文就可以留空，
  列表上會出現一張連到外部的卡片。

### 或直接改檔案

在 `content/articles/` 新增一個 `.md` 檔，前面加這段設定：

```markdown
---
title: 文章標題
date: 2026-09-10
slug: my-article
summary: 一兩句摘要。
tag: 分類
draft: false
external: ""
---

正文用 Markdown 寫。
```

`git push` 後自動上線。

---

## 疑難排解

| 狀況 | 檢查 |
|------|------|
| 登入視窗一直轉 / 跳錯 | GitHub OAuth App 的 Redirect URI 是否**完全等於** `https://harryhsieh.com/api/callback`；`GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` 是否有存到 Production；改完環境變數要**重新 Deploy** 才生效 |
| 登入後很快又被登出 | GitHub OAuth App 的「Expire user access tokens」要**取消勾選** |
| `admin` 顯示 config 錯誤 | `admin/config.yml` 的網域三處是否一致、且沒有結尾斜線 |
| 存檔沒反應 | 你的 GitHub 帳號要有這個 repo 的寫入權限（你是 owner 就沒問題） |
| 文章沒出現 | 是不是還勾著「草稿」；`slug` 有沒有重複 |

---

## 附錄：把 harryhsieh.com 接到 Vercel

1. **Vercel** 專案 →「Settings」→「Domains」→ 輸入 `harryhsieh.com`「Add」，
   再加一次 `www.harryhsieh.com`（擇一設為 Primary，另一個會自動轉址）。
2. Vercel 會顯示要在 DNS 加的紀錄。到 **Cloudflare** →該網域→「DNS」→「Records」：
   | 類型 | 名稱 | 值 |
   |------|------|-----|
   | `A` | `@` | `76.76.21.21`（以 Vercel 畫面顯示的為準） |
   | `CNAME` | `www` | `cname.vercel-dns.com`（以 Vercel 畫面顯示的為準） |
3. **重要（Cloudflare 特有）**：把這兩筆紀錄的橘色雲朵點成**灰色**（DNS only），
   或把 Cloudflare 的 SSL/TLS 模式設成 **Full (strict)**，否則會憑證錯誤或無限轉址。
4. 等 Vercel 的 Domains 頁面該網域變成「Valid Configuration」（通常幾分鐘）。

之後 `harryhsieh.com` 就是正式站，`harryhsieh.com/admin/` 就是後台。

## 本機預覽

```bash
npm install     # 第一次
npm run build   # 產生 dist/
npx serve dist  # 或 cd dist && python3 -m http.server 8080
```
（本機沒有 Vercel 的 cleanUrls，網址要帶 `.html`；正式站不用。）
