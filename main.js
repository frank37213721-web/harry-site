/* Harry · 個人網站 — 少量互動 */
(function () {
  "use strict";

  // 年份
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Header 捲動陰影
  var header = document.getElementById("siteHeader");
  var onScroll = function () {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // 進場動畫：IntersectionObserver（尊重 reduced-motion）
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    items.forEach(function (el, i) {
      // 同一區塊內的元素依序淡入
      el.style.transitionDelay = Math.min(i % 6, 5) * 60 + "ms";
      io.observe(el);
    });
  }

  // 錨點平滑捲動（補強 iOS Safari，並在點擊後收合 focus）
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (!id || id === "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", id);
    });
  });

  // 文章大綱（TOC）：捲動時高亮目前所在的段落
  var tocList = document.querySelector(".toc-list");
  if (tocList && "IntersectionObserver" in window) {
    var tocLinks = Array.prototype.slice.call(tocList.querySelectorAll("a"));
    var targets = tocLinks
      .map(function (a) {
        var el = document.getElementById(a.getAttribute("href").slice(1));
        return el ? { link: a, el: el } : null;
      })
      .filter(Boolean);

    if (targets.length) {
      var setActive = function (link) {
        tocLinks.forEach(function (a) { a.classList.remove("active"); });
        if (link) link.classList.add("active");
      };
      var tocObserver = new IntersectionObserver(
        function (entries) {
          var visible = entries
            .filter(function (e) { return e.isIntersecting; })
            .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
          if (!visible.length) return;
          var top = targets.filter(function (t) { return t.el === visible[0].target; })[0];
          if (top) setActive(top.link);
        },
        { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
      );
      targets.forEach(function (t) { tocObserver.observe(t.el); });
    }
  }
})();
