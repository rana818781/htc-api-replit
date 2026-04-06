// FlowAccess — Project Filter v3.0
// Hides ONLY existing project cards on labs.google/fx/tools/flow.
// Targets cards by their date text (e.g. "Apr 06, 09:14 PM").
// Does NOT touch the header, hero banner, or anything else.

(function () {
  "use strict";

  // Date pattern found below each project card: "Apr 06, 09:14 PM"
  const DATE_PATTERN = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s*(?:\d{4},?\s*)?\d{1,2}:\d{2}/i;

  function isNewProject(el) {
    return /new project/i.test(el.textContent || "") &&
           (el.textContent || "").trim().length < 80;
  }

  function hideProjectCards() {
    // Find all small elements whose text matches a date pattern
    const candidates = document.querySelectorAll("div, span, p, time, small");

    for (const dateEl of candidates) {
      const text = (dateEl.textContent || "").trim();
      if (text.length > 40) continue;          // Skip long text (not just a date)
      if (!DATE_PATTERN.test(text)) continue;  // Must look like a date

      // Walk UP from this date element to find the card-level ancestor.
      // The card-level is where: its PARENT also contains a sibling with "New project".
      let card = dateEl.parentElement;
      for (let depth = 0; depth < 8; depth++) {
        if (!card || card === document.body || card === document.documentElement) break;

        const grid = card.parentElement;
        if (!grid) { card = card.parentElement; continue; }

        const siblings = Array.from(grid.children);
        // Confirm we're in the project grid: at least one sibling has "New project"
        const gridHasNewProject = siblings.some(s => s !== card && isNewProject(s));
        if (gridHasNewProject) {
          // ✓ This is a project card in the project grid — hide it
          if (!card.getAttribute("data-fa-hidden")) {
            card.style.setProperty("display", "none", "important");
            card.setAttribute("data-fa-hidden", "1");
          }
          break;
        }

        card = card.parentElement;
      }
    }
  }

  // ── MutationObserver for dynamic content ────────────────────────────────────
  let timer = null;
  let runs = 0;

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { hideProjectCards(); runs++; }, 350);
  }

  const observer = new MutationObserver(() => {
    if (runs < 30) schedule();
  });

  function start() {
    hideProjectCards();
    observer.observe(document.body, { childList: true, subtree: true });
    // Fixed retries to catch lazy-loaded tiles
    [600, 1200, 2000, 3500, 6000].forEach(ms => setTimeout(hideProjectCards, ms));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
