// FlowAccess — Project Filter v7.0
// Based on actual DOM: button → div → div → tile[4 at parent] → page[26 at parent]
// Hides old project tiles and hero banner. Keeps header + "New project".

(function () {
  "use strict";

  let done = false;

  function run() {
    if (done) return;

    // ── Find the "+ New project" button ──────────────────────────────────────
    let newBtn = null;
    for (const btn of document.querySelectorAll("button")) {
      if (/new project/i.test(btn.textContent) && btn.textContent.trim().length < 40) {
        newBtn = btn;
        break;
      }
    }
    if (!newBtn) return;

    // ── Walk up to the tile row (parent with 3–10 children) ─────────────────
    // Known structure: depth 0-2 have 1-2 children, depth 3 has 4 → tile row
    let el = newBtn;
    for (let depth = 0; depth < 10; depth++) {
      const parent = el.parentElement;
      if (!parent || parent === document.body) break;

      const count = parent.children.length;

      if (count >= 3 && count <= 10) {
        // ✓ This is the tile row — hide all tiles except "New project"
        let hid = 0;
        for (const child of parent.children) {
          if (child === el || child.contains(newBtn)) continue;
          child.style.setProperty("display", "none", "important");
          child.setAttribute("data-fa-hidden", "tile");
          hid++;
        }

        if (hid > 0) {
          console.log(`[FlowAccess] Hid ${hid} project tile(s) at depth ${depth}`);

          // ── Also hide the hero banner at the grandparent level ────────────
          // Grandparent has ~26 children. Find the hero: a large element that
          // is NOT the tile row and NOT the top header bar.
          const grandparent = parent.parentElement;
          if (grandparent && grandparent.children.length > 10) {
            // The header is the FIRST tall-ish element (top of page).
            // The hero banner comes AFTER the header and is also tall.
            let headerFound = false;

            for (const gChild of grandparent.children) {
              if (gChild === parent || gChild.contains(parent)) continue;

              const r = gChild.getBoundingClientRect();
              if (r.height < 10) continue; // Skip invisible elements

              // First significant element = header → keep
              if (!headerFound && r.height > 30) {
                headerFound = true;
                continue;
              }

              // Everything after the header and before/after the grid → hide
              // if it's a tall visual element (hero banner)
              if (r.height > 100) {
                gChild.style.setProperty("display", "none", "important");
                gChild.setAttribute("data-fa-hidden", "hero");
                console.log(`[FlowAccess] Hid hero/banner (${r.height}px)`);
              }
            }
          }

          done = true;
        }
        return;
      }

      el = parent;
    }
  }

  // ── Retry loop ──────────────────────────────────────────────────────────────
  const obs = new MutationObserver(() => { if (!done) run(); });

  function start() {
    obs.observe(document.body, { childList: true, subtree: true });
    [400, 900, 1500, 2500, 5000].forEach(ms =>
      setTimeout(() => { if (!done) run(); }, ms)
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
