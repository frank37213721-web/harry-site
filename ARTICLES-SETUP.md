# 文章系統 / `/admin` 登入編輯器 設定說明

網站的文章用 **Markdown 檔** 存在 `content/articles/`，Vercel 部署時由 `build.mjs`
自動轉成 `/articles`（列表）與 `/articles/<代稱>`（內文）頁面。

`/admin/` 是 [Decap CMS](https://decapcms.org)：用 **GitHub 帳號登入**，在網頁上寫文章，
存檔時它會自動 commit 回這個 repo，Vercel 隨即重新部署。

要讓 `/admin/` 能登入，需要做一次性的 GitHub OAuth 設定（約 10 分鐘）。做完之後就不用再碰。

---

## 你會用到的網域

先確認你的 Vercel 正式網址，例如 `harry-site.vercel.app`（在 Vercel 專案首頁看得到）。
下面用 `你的網域` 代表它，**結尾不要加斜線**。

---

## 步驟 1：建立 GitHub OAuth App

1. 開 <https://github.com/settings/developers> →「OAuth Apps」→「New OAuth App」
2. 填：
   | 欄位 | 值 |
   |------|-----|
   | Application name | `北極星 Polaris CMS`（隨意） |
   | Homepage URL | `https://你的網域` |
   | Authorization callback URL | `https://你的網域/api/callback` |
3. 按「Register application」
4. 記下 **Client ID**
5. 按「Generate a new client secret」，記下 **Client secret**（只會顯示一次）

---

## 步驟 2：在 Vercel 加環境變數

Vercel 專案 →「Settings」→「Environment Variables」，新增兩個（Production 環境）：

| Name | Value |
|------|-------|
| `GITHUB_OAUTH_CLIENT_ID` | 步驟 1 的 Client ID |
| `GITHUB_OAUTH_CLIENT_SECRET` | 步驟 1 的 Client secret |

存檔。

---

## 步驟 3：把網域填進 `admin/config.yml`

打開 `admin/config.yml`，把 **3 處** `__YOUR_DOMAIN__` 換成 `你的網域`：

```yaml
  base_url: https://你的網域
site_url: https://你的網域
display_url: https://你的網域
```

（可以直接請 Claude Code 幫你改，跟它說網域即可。）

commit + push 後 Vercel 會重新部署。

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
| 登入視窗一直轉 / 跳錯 | callback URL 是否**完全等於** `https://你的網域/api/callback`；兩個環境變數是否有存到 Production；改完環境變數要**重新 Deploy** 才生效 |
| `admin` 顯示 config 錯誤 | `admin/config.yml` 的 `__YOUR_DOMAIN__` 是否 3 處都換掉、且沒有結尾斜線 |
| 存檔沒反應 | 你的 GitHub 帳號要有這個 repo 的寫入權限（你是 owner 就沒問題） |
| 文章沒出現 | 是不是還勾著「草稿」；`slug` 有沒有重複 |

## 本機預覽

```bash
npm install     # 第一次
npm run build   # 產生 dist/
npx serve dist  # 或 cd dist && python3 -m http.server 8080
```
（本機沒有 Vercel 的 cleanUrls，網址要帶 `.html`；正式站不用。）
