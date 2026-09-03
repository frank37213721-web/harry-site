/* =========================================================
   北極星 Polaris — 靜態網站建置腳本
   把 content/articles/*.md 轉成文章頁，並產生文章列表頁。
   靜態檔（index.html / styles.css / main.js / assets / admin）
   原樣複製到 dist/。Vercel 以 dist/ 為輸出目錄。
   ========================================================= */

import { readdir, readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { marked } from "marked";
import matter from "gray-matter";

const ROOT = path.resolve(".");
const OUT = path.join(ROOT, "dist");
const CONTENT = path.join(ROOT, "content", "articles");

const SITE = "北極星 Polaris";
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23faf6ee'/%3E%3Cpath d='M16 5l2.4 8.1L26.5 16l-8.1 2.9L16 27l-2.4-8.1L5.5 16l8.1-2.9z' fill='%23c9772f'/%3E%3C/svg%3E";

marked.setOptions({ gfm: true, breaks: false });

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

const HEADER = `
<a class="skip-link" href="#main">跳到主要內容</a>
<header class="site-header" id="siteHeader">
  <div class="wrap header-inner">
    <a class="brand" href="/"><span class="brand-star" aria-hidden="true">✦</span> ${SITE}</a>
    <nav class="site-nav" aria-label="主選單">
      <a href="/#about">關於我</a>
      <a href="/#work">我在做的事</a>
      <a href="/articles">文章</a>
      <a href="/#contact">聯絡</a>
    </nav>
  </div>
</header>`;

const FOOTER = `
<footer class="site-footer">
  <div class="wrap footer-inner">
    <span class="brand-star" aria-hidden="true">✦</span>
    <p>© <span id="year">2026</span> 謝孟翔 Harry ｜ ${SITE} ｜ 讓科學教育，回到好奇心與思考。</p>
  </div>
</footer>`;

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
<meta name="theme-color" content="#faf6ee" />
<link rel="icon" href="${FAVICON}" />
<link rel="stylesheet" href="/styles.css" />
</head>
<body>
${HEADER}
<main id="main">
${content}
</main>
${FOOTER}
<script src="/main.js" defer></script>
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

const articlePage = (a) =>
  page({
    title: `${a.title}｜${SITE}`,
    description: a.summary || a.title,
    ogType: "article",
    content: `
  <article class="section article">
    <div class="wrap narrow">
      <a class="back-link" href="/articles">← 回文章列表</a>
      <p class="post-meta reveal">${esc(a.dateText)}${a.tag ? ` ｜ ${esc(a.tag)}` : ""}</p>
      <h1 class="reveal">${esc(a.title)}</h1>
      ${a.summary ? `<p class="post-summary reveal">${esc(a.summary)}</p>` : ""}
      <div class="article-body">
${a.html}
      </div>
      <a class="back-link" href="/articles">← 回文章列表</a>
    </div>
  </article>`,
  });

const card = (a) => {
  const inner = `
        <time>${esc(a.dateText)}</time>
        <h2>${esc(a.title)}${a.external ? ' <span class="card-ext">外部連結 ↗</span>' : ""}</h2>
        ${a.summary ? `<p>${esc(a.summary)}</p>` : ""}`;
  return a.external
    ? `<li class="article-card"><a href="${esc(a.external)}" target="_blank" rel="noopener">${inner}</a></li>`
    : `<li class="article-card"><a href="/articles/${esc(a.slug)}">${inner}</a></li>`;
};

const EMPTY_STATE = `
      <ul class="planned reveal">
        <li>我為什麼要用 AI 重新思考教學設計</li>
        <li>十年教學經驗中，我學到最重要的一件事</li>
        <li>從師鐸獎得主到教育機關：我對台灣科學教育的觀察</li>
        <li>「有趣」是怎麼設計出來的？PBL 教學的實務心得</li>
      </ul>
      <p class="soon reveal"><span class="pulse" aria-hidden="true"></span>敬請期待——第一批文章正在整理中。</p>`;

const indexPage = (arts) =>
  page({
    title: `文章｜${SITE}`,
    description: "謝孟翔 Harry 整理十年教學裡最重要的一些思考，寫成文章分享出來。",
    content: `
  <section class="section">
    <div class="wrap narrow">
      <p class="eyebrow reveal">文章</p>
      <h1 class="reveal">我正在寫的東西</h1>
      <p class="reveal">我正在整理十年教學裡最重要的一些思考，寫成文章分享出來。</p>
      ${
        arts.length
          ? `<ul class="article-list">\n${arts.map(card).join("\n")}\n      </ul>`
          : EMPTY_STATE
      }
    </div>
  </section>`,
  });

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // 靜態檔原樣複製
  for (const f of ["index.html", "styles.css", "main.js"]) {
    if (existsSync(path.join(ROOT, f))) await cp(path.join(ROOT, f), path.join(OUT, f));
  }
  for (const d of ["assets", "admin"]) {
    if (existsSync(path.join(ROOT, d)))
      await cp(path.join(ROOT, d), path.join(OUT, d), { recursive: true });
  }

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
    articles.push({
      title: data.title,
      summary: data.summary || "",
      tag: data.tag || "",
      slug,
      external: data.external || "",
      date: data.date ? new Date(data.date) : new Date(0),
      dateText: fmtDate(data.date),
      html: marked.parse(content || ""),
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

  console.log(`完成：${articles.length} 篇文章 → dist/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
