// FlowAccess — Project Filter v2.0
// Hides existing project tiles on labs.google/fx/tools/flow.
// Shows ONLY the "+ New project" tile. Works via DOM scanning + MutationObserver.

(function () {
  "use strict";

  // ── Core logic ──────────────────────────────────────────────────────────────

  function isNewProjectTile(el) {
    const text = (el.textContent || "").trim();
    return /new project/i.test(text) && text.length < 80;
  }

  // Find the "+ New project" card and hide all its siblings in the same grid
  function hideProjectTiles() {
    // Walk every element looking for a small element whose full text is "New project"
    const all = document.querySelectorAll("div, article, li, section, a, button");

    for (const el of all) {
      // Must contain "new project" and nothing else long (not a whole page section)
      const text = (el.textContent || "").trim();
      if (!/new project/i.test(text)) continue;
      if (text.length > 60) continue;

      // Walk UP until we find a sibling-level container
      let candidate = el;
      let parent = candidate.parentElement;

      while (parent && parent !== document.body) {
        const siblings = Array.from(parent.children);

        // Grid containers have multiple children of similar type
        if (siblings.length >= 2) {
          let hidCount = 0;
          for (const sib of siblings) {
            // Keep the tile that contains "New project"
            if (sib.contains(candidate) || isNewProjectTile(sib)) continue;

            sib.style.setProperty("display", "none", "important");
            sib.setAttribute("data-fa-hidden", "1");
            hidCount++;
          }

          if (hidCount > 0) {
            console.log(`[FlowAccess] Hid ${hidCount} project tile(s)`);
            return true; // Done
          }
        }

        candidate = parent;
        parent = parent.parentElement;
      }
    }

    return false;
  }

  // ── MutationObserver to handle dynamic rendering ───────────────────────────

  let timer = null;
  let attempts = 0;

  function scheduleHide() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      hideProjectTiles();
      attempts++;
    }, 300);
  }

  const observer = new MutationObserver(() => {
    if (attempts < 20) scheduleHide(); // Stop after 20 runs (avoid infinite loop)
  });

  function start() {
    hideProjectTiles();

    observer.observe(document.body, { childList: true, subtree: true });

    // Also run at fixed intervals after load in case lazy-loading kicks in
    [500, 1000, 1500, 2500, 4000].forEach(ms =>
      setTimeout(() => { hideProjectTiles(); }, ms)
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
