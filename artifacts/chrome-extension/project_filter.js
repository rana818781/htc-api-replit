// FlowAccess — Project Filter v8.0
// DOM structure (confirmed):
//   button "New project" [2 at parent]
//     → div.iBXxRU (btn + project-list)  [1 at parent]
//       → div.bYukoK                     [1 at parent]
//         → div.crzReP                   [4 at parent = section level]
//           → div                        [26 at parent = page level]
//
// Strategy:
//   1. Hide old projects: button's SIBLING inside div.iBXxRU (the virtuoso list)
//   2. Hide hero banner: at the 4-children section level, keep header + project section

(function () {
  "use strict";

  let tilesDone = false;
  let heroDone = false;

  function run() {
    if (tilesDone && heroDone) return;

    let newBtn = null;
    for (const btn of document.querySelectorAll("button")) {
      const t = (btn.textContent || "").trim();
      if (/new project/i.test(t) && t.length < 40) {
        newBtn = btn;
        break;
      }
    }
    if (!newBtn) return;

    // ── Step 1: Hide old project tiles ────────────────────────────────────────
    // Button's parent (div.iBXxRU) has 2 children:
    //   child 1 = project list (virtuoso scroller)
    //   child 2 = "New project" button
    // Hide everything in that parent EXCEPT the button.
    if (!tilesDone) {
      const btnParent = newBtn.parentElement;
      if (btnParent) {
        let hid = 0;
        for (const child of btnParent.children) {
          if (child === newBtn) continue;
          if (child.tagName === "BUTTON") continue;
          child.style.setProperty("display", "none", "important");
          child.setAttribute("data-fa-hidden", "tiles");
          hid++;
        }
        if (hid > 0) {
          console.log("[FlowAccess] Hid project list (" + hid + " sibling(s) of New Project button)");
          tilesDone = true;
        }
      }
    }

    // ── Step 2: Hide hero banner ──────────────────────────────────────────────
    // Walk up from button to the section level (parent with 3-6 children).
    // Keep: the section that contains "New project" (project grid)
    //        + the section with the SMALLEST top (header bar).
    // Hide: everything else (hero banner, etc.).
    if (!heroDone) {
      let el = newBtn;
      for (let i = 0; i < 8; i++) {
        el = el.parentElement;
        if (!el || el === document.body) break;

        const sectionParent = el.parentElement;
        if (!sectionParent) break;

        const count = sectionParent.children.length;
        if (count < 3 || count > 6) continue;

        // Found the section level (4 children expected)
        const kids = Array.from(sectionParent.children);

        // Find the header = visible child with the smallest top position
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

        let hid = 0;
        for (const kid of kids) {
          if (kid === el) continue;
          if (kid.contains(newBtn)) continue;
          if (kid === headerEl) continue;
          kid.style.setProperty("display", "none", "important");
          kid.setAttribute("data-fa-hidden", "hero");
          hid++;
        }

        if (hid > 0) {
          console.log("[FlowAccess] Hid " + hid + " section(s) (hero/banner)");
          heroDone = true;
        }
        break;
      }
    }
  }

  const obs = new MutationObserver(() => {
    if (!tilesDone || !heroDone) run();
  });

  function start() {
    obs.observe(document.body, { childList: true, subtree: true });
    [300, 800, 1500, 2500, 5000].forEach(ms =>
      setTimeout(() => { if (!tilesDone || !heroDone) run(); }, ms)
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
