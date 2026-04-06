// FlowAccess — Project Filter v4.0
// Hides ONLY the project history tiles. Uses rendered dimensions to avoid
// accidentally hiding the hero banner, header, or any other page section.

(function () {
  "use strict";

  let done = false;

  function hideProjectCards() {
    if (done) return;

    // ── Step 1: find the "+ New project" tile by text + rendered size ──────
    let newProjTile = null;

    const candidates = document.querySelectorAll("div, li, article, section, a, button");
    for (const el of candidates) {
      const text = (el.textContent || "").trim();
      if (!/new project/i.test(text)) continue;
      if (text.length > 60) continue; // Must be short (just the button text)

      const rect = el.getBoundingClientRect();
      if (rect.width < 80 || rect.height < 80) continue; // Must have visible size

      newProjTile = el;
      break;
    }

    if (!newProjTile) return; // Not loaded yet

    const tileW = newProjTile.getBoundingClientRect().width;
    const tileH = newProjTile.getBoundingClientRect().height;

    // ── Step 2: walk UP until we find the grid where siblings have the
    //    same dimensions as the New Project tile ──────────────────────────────
    let grid = newProjTile.parentElement;

    while (grid && grid !== document.body) {
      const children = Array.from(grid.children);

      // Find siblings that have ~same width & height as the New Project tile
      const projectSiblings = children.filter((c) => {
        if (c === newProjTile || c.contains(newProjTile)) return false;
        if (/new project/i.test((c.textContent || "").trim())) return false;
        const r = c.getBoundingClientRect();
        if (r.width < 60 || r.height < 60) return false;

        const wDiff = Math.abs(r.width - tileW) / tileW;
        const hDiff = Math.abs(r.height - tileH) / tileH;
        return wDiff < 0.4 && hDiff < 0.4; // within 40% of tile size
      });

      if (projectSiblings.length >= 1) {
        // ✓ Found the project grid — hide ONLY the history tiles
        for (const sib of projectSiblings) {
          sib.style.setProperty("display", "none", "important");
          sib.setAttribute("data-fa-hidden", "1");
        }
        console.log(`[FlowAccess] Hid ${projectSiblings.length} old project tile(s)`);
        done = true;
        return;
      }

      grid = grid.parentElement;
    }
  }

  // ── Run after page renders (needs computed dimensions) ────────────────────
  // MutationObserver + timed retries to handle React lazy-loading

  const observer = new MutationObserver(() => {
    if (!done) hideProjectCards();
  });

  function start() {
    observer.observe(document.body, { childList: true, subtree: true });
    // Retry at increasing intervals — tiles may load lazily
    [300, 800, 1500, 2500, 4000, 7000].forEach((ms) =>
      setTimeout(() => { if (!done) hideProjectCards(); }, ms)
    );
  }

  // Wait for DOM to be ready before querying dimensions
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
