// FlowAccess — Project Filter v11
// Hides old projects and hero banner. Header lock handled by header_lock.js.

(function () {
  "use strict";

  console.log("[FlowAccess] project_filter.js loaded");

  function findNewProjectButton() {
    for (const btn of document.querySelectorAll("button")) {
      const t = (btn.textContent || "").trim();
      if (/new project/i.test(t) && t.length < 40) return btn;
    }
    return null;
  }

  function hideTiles() {
    const btn = findNewProjectButton();
    if (!btn) return;

    const parent = btn.parentElement;
    if (!parent) return;

    for (const child of parent.children) {
      if (child === btn) continue;
      if (child.style.display === "none") continue;
      child.style.setProperty("display", "none", "important");
    }
  }

  function hideHero() {
    const btn = findNewProjectButton();
    if (!btn) return;

    let el = btn;
    for (let i = 0; i < 8; i++) {
      el = el.parentElement;
      if (!el || el === document.body) break;

      const sectionParent = el.parentElement;
      if (!sectionParent) break;
      const count = sectionParent.children.length;
      if (count < 3 || count > 6) continue;

      const kids = Array.from(sectionParent.children);

      let headerEl = null;
      let minTop = Infinity;
      for (const kid of kids) {
        const r = kid.getBoundingClientRect();
        if (r.height < 5 || r.width < 50) continue;
        if (r.top < minTop) {
          minTop = r.top;
          headerEl = kid;
        }
      }

      for (const kid of kids) {
        if (kid === el || kid.contains(btn)) continue;
        if (kid === headerEl) continue;
        if (kid.style.display === "none") continue;
        kid.style.setProperty("display", "none", "important");
      }
      break;
    }
  }

  function patrol() {
    hideTiles();
    hideHero();
  }

  const obs = new MutationObserver(patrol);

  function start() {
    console.log("[FlowAccess] project_filter starting patrol");
    obs.observe(document.body, { childList: true, subtree: true });
    [300, 600, 1000, 1500, 2500, 4000, 7000, 12000].forEach(ms =>
      setTimeout(patrol, ms)
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
