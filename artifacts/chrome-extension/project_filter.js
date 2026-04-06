// FlowAccess — Project Filter v5.0
// Hides old project tiles AND the hero/announcement banner.
// Keeps: top header bar + "+ New project" button.

(function () {
  "use strict";

  let done = false;

  function run() {
    if (done) return;

    const viewW = window.innerWidth || document.documentElement.clientWidth;

    // ── 1. Find the "+ New project" tile ─────────────────────────────────────
    let newTile = null;
    for (const el of document.querySelectorAll("div,li,article,button,a")) {
      const text = (el.textContent || "").trim();
      if (!/new project/i.test(text) || text.length > 60) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 80 && r.height > 80) { newTile = el; break; }
    }
    if (!newTile) return; // Not rendered yet

    const tileW = newTile.getBoundingClientRect().width;
    const tileH = newTile.getBoundingClientRect().height;

    // ── 2. Walk up to find the project grid row ───────────────────────────────
    // The grid row is the ancestor whose children have ~same size as the tile.
    let gridRow = null;
    let probe = newTile.parentElement;

    while (probe && probe !== document.body) {
      const kids = Array.from(probe.children);
      const sameSized = kids.filter(k => {
        if (k === newTile || k.contains(newTile)) return false;
        const r = k.getBoundingClientRect();
        return r.width > 60 && r.height > 60
          && Math.abs(r.width  - tileW) / tileW < 0.45
          && Math.abs(r.height - tileH) / tileH < 0.45;
      });

      if (sameSized.length >= 1) {
        gridRow = probe;
        // Hide old project tiles
        for (const s of sameSized) {
          s.style.setProperty("display", "none", "important");
          s.setAttribute("data-fa-hidden", "project");
        }
        console.log(`[FlowAccess] Hid ${sameSized.length} old project tile(s)`);
        break;
      }
      probe = probe.parentElement;
    }

    // ── 3. Hide the hero/announcement banner ─────────────────────────────────
    // The banner is a full-width (>50% viewport) tall (>120px) block that is
    // NOT the header (header is short, <80px usually) and NOT the project grid.
    const searchRoot = gridRow ? gridRow.parentElement : document.body;
    if (searchRoot) {
      for (const sibling of searchRoot.children) {
        if (gridRow && (sibling === gridRow || sibling.contains(gridRow))) continue;

        const r = sibling.getBoundingClientRect();
        // Full-width tall element = hero banner (not the short header bar)
        if (r.width > viewW * 0.5 && r.height > 120) {
          sibling.style.setProperty("display", "none", "important");
          sibling.setAttribute("data-fa-hidden", "hero");
          console.log("[FlowAccess] Hid hero banner");
        }
      }
    }

    done = true;
  }

  // ── Run after render, with retries for lazy-loaded content ─────────────────
  const observer = new MutationObserver(() => { if (!done) run(); });

  function start() {
    observer.observe(document.body, { childList: true, subtree: true });
    [400, 900, 1600, 2800, 5000].forEach(ms => setTimeout(() => { if (!done) run(); }, ms));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
