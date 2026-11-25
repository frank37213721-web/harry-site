/* =========================================================
   北極星 Polaris — 靜態網站建置腳本
   - content/articles/*.md → 文章頁（/articles/<slug>）與文章列表（/articles）
   - index.html：注入最新文章、替 CSS/JS 加上內容雜湊版本號
   - styles.css / main.js / assets / admin 複製到 dist/
   Vercel 以 dist/ 為輸出目錄。
   ========================================================= */

import { readdir, readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { marked } from "marked";
import matter from "gray-matter";

const ROOT = path.resolve(".");
const OUT = path.join(ROOT, "dist");
const CONTENT = path.join(ROOT, "content", "articles");

const SITE = "北極星 Polaris";
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23121212'/%3E%3Cpath d='M16 7l2 7 7 2-7 2-2 7-2-7-7-2 7-2z' fill='%23fafaf8'/%3E%3C/svg%3E";

// 內容雜湊：CSS/JS 一改，網址就變，瀏覽器與 CDN 不會拿到舊檔
let ASSET_V = "dev";

marked.setOptions({ gfm: true, breaks: false });

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

// ---- 文章大綱（TOC）：從 ## / ### 標題抽出，產生錨點 id ----
const slugify = (text, used) => {
  let s = String(text)
    .trim()
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, "-")
    .replace(/["'<>&，。！？：；、「」『』（）()\[\]{}《》【】〈〉…—·\/\\]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!s) s = "sec";
  s = s.slice(0, 40).replace(/-+$/, "");
  let id = s;
  let n = 2;
  while (used.has(id)) id = `${s}-${n++}`;
  used.add(id);
  return id;
};

// 用 marked 的 lexer 找出 h2/h3，配 id；再把同樣的 id 塞回渲染出的 HTML
const renderArticle = (markdownContent) => {
  const used = new Set();
  const headings = [];
  for (const t of marked.lexer(markdownContent || "")) {
    if (t.type === "heading" && (t.depth === 2 || t.depth === 3)) {
      const text = String(t.text || "").replace(/[*_`]/g, "");
      headings.push({ depth: t.depth, id: slugify(text, used), text });
    }
  }
  let i = 0;
  const html = marked.parse(markdownContent || "").replace(/<h([23])>/g, (m, d) => {
    const h = headings[i++];
    return h ? `<h${d} id="${esc(h.id)}">` : m;
  });
  return { html, headings };
};

const buildTocTree = (headings) => {
  const tree = [];
  let current = null;
  for (const h of headings) {
    if (h.depth === 2) {
      current = { ...h, subs: [] };
      tree.push(current);
    } else if (current) {
      current.subs.push(h);
    } else {
      tree.push({ ...h, subs: [] });
    }
  }
  return tree;
};

// 大綱做成可彈出/收起的固定面板（position: fixed）。
// 放在文章內容「之後」：即使樣式沒載入，也不會排在標題前面。
const renderToc = (headings) => {
  if (headings.length < 3) return "";
  const items = buildTocTree(headings)
    .map((h) => {
      const subs = h.subs.length
        ? `<ul class="toc-sub">${h.subs
            .map((s) => `<li><a href="#${esc(s.id)}">${esc(s.text)}</a></li>`)
            .join("")}</ul>`
        : "";
      return `<li><a href="#${esc(h.id)}">${esc(h.text)}</a>${subs}</li>`;
    })
    .join("");

  return `
    <button type="button" class="toc-toggle" id="tocToggle" aria-expanded="false" aria-controls="tocPanel">
      <span class="toc-toggle-icon" aria-hidden="true">☰</span>大綱
    </button>
    <div class="toc-backdrop" id="tocBackdrop"></div>
    <nav class="toc-panel" id="tocPanel" aria-label="文章大綱">
      <button type="button" class="toc-panel-close" id="tocPanelClose" aria-label="關閉大綱">✕</button>
      <p class="toc-title">本文大綱</p>
      <ol class="toc-list">${items}</ol>
    </nav>`;
};

const HEADER = `
<a class="skip-link" href="#main">跳到主要內容</a>
<header class="site-header on-dark" id="siteHeader">
  <div class="wrap header-inner">
    <a class="brand" href="/"><span class="brand-zh">北極星</span><span class="brand-en">Polaris</span></a>
    <nav class="site-nav" aria-label="主選單">
      <a href="/#about">關於</a>
      <a href="https://workshop.harryhsieh.com/teachandlearning/" target="_blank" rel="noopener">工作坊 ↗</a>
      <a href="/software">軟體服務</a>
      <a href="/articles">文章</a>
      <a href="/#contact">聯絡</a>
    </nav>
  </div>
</header>`;

const FOOTER = `
<footer class="site-footer">
  <div class="wrap footer-inner">
    <p>© <span id="year">2026</span> 謝孟翔 Harry</p>
    <p>${SITE} ｜ 讓科學教育，回到好奇心與思考。</p>
  </div>
</footer>`;

// <head> 裡的小腳本：加上 .js 讓進場動畫只在有 JS 時啟用；
// 3 秒後無論如何都顯示內容（main.js 載入失敗時的保險）。
const JS_FLAG = `<script>document.documentElement.classList.add("js");setTimeout(function(){document.documentElement.classList.add("show-all")},3000)</script>`;

const page = ({ title, description, content, ogType = "website" }) => `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="author" content="謝孟翔 Harry" />
<meta property="og:type" content="${ogType}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:locale" content="zh_TW" />
<meta name="theme-color" content="#fdfdfc" />
<link rel="icon" href="${FAVICON}" />
${JS_FLAG}
<link rel="stylesheet" href="/styles.css?v=${ASSET_V}" />
</head>
<body>
${HEADER}
<main id="main">
${content}
</main>
${FOOTER}
<script src="/main.js?v=${ASSET_V}" defer></script>
</body>
</html>
`;

const fmtDate = (v) => {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const articlePage = (a) => {
  const toc = renderToc(a.headings);
  // 摘要太長（多半是把內文貼進摘要欄）就不在文章頁重複顯示
  const showSummary = a.summaryText && a.summaryText.length <= 180;
  const content = `
  <article class="article">
    <header class="page-hero">
      <div class="wrap narrow">
        <a class="back-link" href="/articles">← 回文章列表</a>
        <p class="post-meta reveal">${esc(a.dateText)}${a.tag ? ` ｜ ${esc(a.tag)}` : ""}</p>
        <h1 class="reveal">${esc(a.title)}</h1>
        ${showSummary ? `<p class="post-summary reveal">${esc(a.summaryText)}</p>` : ""}
      </div>
    </header>
    <div class="wrap narrow article-main">
      <div class="article-body">
${a.html}
      </div>
      <a class="back-link" href="/articles">← 回文章列表</a>
    </div>${toc}
  </article>`;

  return page({
    title: `${a.title}｜${SITE}`,
    description: a.summaryText ? a.summaryText.slice(0, 150) : a.title,
    ogType: "article",
    content,
  });
};

const card = (a) => {
  const inner = `
        <time>${esc(a.dateText)}</time>
        <h2>${esc(a.title)}${a.external ? ' <span class="card-ext">外部連結 ↗</span>' : ""}</h2>
        ${a.summaryText ? `<p>${esc(a.summaryText)}</p>` : ""}`;
  return a.external
    ? `<li class="article-card"><a href="${esc(a.external)}" target="_blank" rel="noopener">${inner}</a></li>`
    : `<li class="article-card"><a href="/articles/${esc(a.slug)}">${inner}</a></li>`;
};

const articleList = (arts) =>
  `<ul class="article-list">\n${arts.map(card).join("\n")}\n      </ul>`;

const EMPTY_STATE = `
      <ul class="planned reveal">
        <li>我為什麼要用 AI 重新思考教學設計</li>
        <li>十五年教學經驗中，我學到最重要的一件事</li>
        <li>從師鐸獎得主到教育機關：我對台灣科學教育的觀察</li>
        <li>「有趣」是怎麼設計出來的？PBL 教學的實務心得</li>
      </ul>
      <p class="soon reveal">敬請期待——第一批文章正在整理中。</p>`;

const indexPage = (arts) =>
  page({
    title: `文章｜${SITE}`,
    description: "謝孟翔 Harry 整理十五年教學裡最重要的一些思考，寫成文章分享出來。",
    content: `
  <section class="page-hero">
    <div class="wrap list">
      <h1 class="page-title reveal">我正在寫的東西</h1>
      <p class="page-sub reveal">我正在整理十五年教學裡最重要的一些思考，寫成文章分享出來。</p>
    </div>
  </section>
  <section class="page">
    <div class="wrap list">
      ${arts.length ? articleList(arts) : EMPTY_STATE}
    </div>
  </section>`,
  });

const softwarePage = () =>
  page({
    title: `軟體服務｜${SITE}`,
    description: "謝孟翔 Harry 為教學現場開發的軟體與網頁服務。",
    content: `
  <section class="page-hero">
    <div class="wrap list">
      <h1 class="page-title reveal">我開發的軟體與網頁服務</h1>
      <p class="page-sub reveal">從課堂現場遇到的問題出發，自己動手做的工具。</p>
    </div>
  </section>
  <section class="page">
    <div class="wrap list">
      <ul class="products">
        <li class="product card reveal">
          <div class="product-head">
            <h2>Inspira</h2>
            <span class="status open">已上線</span>
          </div>
          <p class="product-tag">像 Keynote 一樣簡潔的互動簡報</p>
          <p>學員掃碼就能投票、貼想法、上傳作品，並在策展區互相觀摩。內附「課堂火花」點子牆，讓每個人的想法在課堂上被看見。</p>
          <p class="product-links">
            <a class="btn" href="https://inspira.tw" target="_blank" rel="noopener">前往 Inspira ↗</a>
          </p>
        </li>
      </ul>
      <p class="soon reveal">更多服務整理中，陸續加入。</p>
    </div>
  </section>`,
  });

const hash8 = (...buffers) => {
  const h = crypto.createHash("md5");
  for (const b of buffers) h.update(b);
  return h.digest("hex").slice(0, 8);
};

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // 版本號 = styles.css + main.js 的內容雜湊
  ASSET_V = hash8(
    await readFile(path.join(ROOT, "styles.css")),
    await readFile(path.join(ROOT, "main.js"))
  );

  // 靜態檔原樣複製
  for (const f of ["styles.css", "main.js"]) {
    if (existsSync(path.join(ROOT, f))) await cp(path.join(ROOT, f), path.join(OUT, f));
  }
  for (const d of ["assets", "admin"]) {
    if (existsSync(path.join(ROOT, d)))
      await cp(path.join(ROOT, d), path.join(OUT, d), { recursive: true });
  }

  // workshop.harryhsieh.com 的頁面（vercel.json 依網域把該子網域改寫到 /workshop/）
  const WORKSHOP = path.join(ROOT, "workshop", "teachandlearning");
  if (existsSync(WORKSHOP))
    await cp(WORKSHOP, path.join(OUT, "workshop", "teachandlearning"), { recursive: true });

  // 讀文章
  let files = [];
  try {
    files = (await readdir(CONTENT)).filter((f) => f.endsWith(".md"));
  } catch {
    console.warn("（沒有 content/articles/ 資料夾，跳過文章）");
  }

  const articles = [];
  for (const file of files) {
    const raw = await readFile(path.join(CONTENT, file), "utf8");
    const { data, content } = matter(raw);
    if (data.draft) {
      console.log("略過草稿：", file);
      continue;
    }
    if (!data.title) {
      console.warn("略過（沒有標題）：", file);
      continue;
    }
    const slug = String(data.slug || file.replace(/\.md$/, "")).trim();
    const { html, headings } = renderArticle(content);
    // 標題／摘要欄位是純文字：把使用者誤貼的 Markdown 粗體、行內程式碼符號拿掉
    const plain = (v) => String(v || "").replace(/\*\*|__|`/g, "");
    const summary = plain(data.summary);
    articles.push({
      title: plain(data.title),
      summary,
      summaryText: String(summary).replace(/\s+/g, " ").trim(),
      tag: data.tag || "",
      slug,
      external: data.external || "",
      date: data.date ? new Date(data.date) : new Date(0),
      dateText: fmtDate(data.date),
      html,
      headings,
    });
  }
  articles.sort((a, b) => b.date - a.date);

  await mkdir(path.join(OUT, "articles"), { recursive: true });
  for (const a of articles) {
    if (a.external) continue;
    await writeFile(path.join(OUT, "articles", `${a.slug}.html`), articlePage(a));
  }
  const listHtml = indexPage(articles);
  await writeFile(path.join(OUT, "articles.html"), listHtml);
  await writeFile(path.join(OUT, "articles", "index.html"), listHtml);
  const softwareHtml = softwarePage();
  await mkdir(path.join(OUT, "software"), { recursive: true });
  await writeFile(path.join(OUT, "software.html"), softwareHtml);
  await writeFile(path.join(OUT, "software", "index.html"), softwareHtml);

  // 首頁：加版本號、注入最新三篇
  let home = await readFile(path.join(ROOT, "index.html"), "utf8");
  home = home
    .replace('href="styles.css"', `href="/styles.css?v=${ASSET_V}"`)
    .replace('src="main.js"', `src="/main.js?v=${ASSET_V}"`)
    .replace("<!--LATEST_ARTICLES-->", articles.length ? articleList(articles.slice(0, 3)) : "");
  await writeFile(path.join(OUT, "index.html"), home);

  console.log(`完成：${articles.length} 篇文章，資源版本 ${ASSET_V} → dist/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
