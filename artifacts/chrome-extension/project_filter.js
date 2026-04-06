// FlowAccess — Project Filter v6.0
// Hides old project tiles by detecting they share a HORIZONTAL ROW with
// the "+ New project" tile. Never touches header, hero, or other sections.

(function () {
  "use strict";

  let done = false;

  function run() {
    if (done) return;

    // ── Step 1: Find "+ New project" text node ────────────────────────────
    let newProjEl = null;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (/new project/i.test(node.textContent) &&
          node.textContent.trim().length < 40) {
        newProjEl = node.parentElement;
        break;
      }
    }
    if (!newProjEl) return;

    // ── Step 2: Walk up (max 8 levels) looking for a horizontal row ───────
    // A horizontal row = parent whose visible children all share roughly the
    // same top position (they sit side-by-side, not stacked vertically).

    let card = newProjEl;
    for (let depth = 0; depth < 8; depth++) {
      const parent = card.parentElement;
      if (!parent || parent === document.body || parent === document.documentElement) break;

      const kids = Array.from(parent.children).filter((k) => {
        const s = getComputedStyle(k);
        return s.display !== "none" && s.visibility !== "hidden" &&
               k.getBoundingClientRect().width > 30;
      });

      if (kids.length < 2) { card = parent; continue; }

      // Check if kids form a horizontal row (top positions within 60px)
      const tops = kids.map((k) => k.getBoundingClientRect().top);
      const minTop = Math.min(...tops);
      const maxTop = Math.max(...tops);
      const isRow = (maxTop - minTop) < 60;

      if (isRow && kids.length >= 2) {
        // ✓ Found the tile row — hide everything except "New project" tile
        let hidCount = 0;
        for (const kid of kids) {
          if (kid === card || kid.contains(newProjEl)) continue;
          if (/new project/i.test((kid.textContent || "").trim())) continue;
          kid.style.setProperty("display", "none", "important");
          kid.setAttribute("data-fa-hidden", "1");
          hidCount++;
        }
        if (hidCount > 0) {
          console.log(`[FlowAccess] Hid ${hidCount} old project tile(s)`);
          done = true;
        }
        return;
      }

      card = parent;
    }
  }

  // ── Retry with MutationObserver + timers ──────────────────────────────────
  const observer = new MutationObserver(() => { if (!done) run(); });

  function start() {
    observer.observe(document.body, { childList: true, subtree: true });
    [500, 1000, 2000, 3500, 6000].forEach((ms) =>
      setTimeout(() => { if (!done) run(); }, ms)
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
