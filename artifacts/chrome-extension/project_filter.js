// FlowAccess — Project Filter v9.0
// Uses CSS injection (not inline styles) so React re-renders can't undo hiding.
// DOM (confirmed):
//   button.jsIRVP parent = div.iBXxRU [2 kids: div.bpmHSr + button]
//   Section level = 4 kids (header, hero, project-grid, ?)
//   Page level = 26 kids

(function () {
  "use strict";

  let styleInjected = false;
  let tilesDone = false;
  let heroDone = false;

  function injectCSS() {
    if (styleInjected) return;
    const s = document.createElement("style");
    s.id = "fa-filter-css";
    s.textContent = "[data-fa-hidden] { display: none !important; visibility: hidden !important; }";
    document.head.appendChild(s);
    styleInjected = true;
  }

  function run() {
    if (tilesDone && heroDone) return;

    injectCSS();

    let newBtn = null;
    for (const btn of document.querySelectorAll("button")) {
      const t = (btn.textContent || "").trim();
      if (/new project/i.test(t) && t.length < 40) {
        newBtn = btn;
        break;
      }
    }
    if (!newBtn) return;

    // ── Step 1: Hide the project list (sibling of button) ─────────────────────
    if (!tilesDone) {
      const btnParent = newBtn.parentElement;
      if (btnParent) {
        let hid = 0;
        for (const child of btnParent.children) {
          if (child === newBtn) continue;
          if (child.tagName === "BUTTON") continue;
          if (!child.hasAttribute("data-fa-hidden")) {
            child.setAttribute("data-fa-hidden", "tiles");
            hid++;
          }
        }
        if (hid > 0) {
          console.log("[FlowAccess] Hid project list (" + hid + " element(s))");
          tilesDone = true;
        }
      }
    }

    // ── Step 2: Hide the hero banner at section level ─────────────────────────
    if (!heroDone) {
      let el = newBtn;
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

        let hid = 0;
        for (const kid of kids) {
          if (kid === el) continue;
          if (kid.contains(newBtn)) continue;
          if (kid === headerEl) continue;
          if (!kid.hasAttribute("data-fa-hidden")) {
            kid.setAttribute("data-fa-hidden", "hero");
            hid++;
          }
        }
        if (hid > 0) {
          console.log("[FlowAccess] Hid " + hid + " section(s) (hero/banner)");
          heroDone = true;
        }
        break;
      }
    }
  }

  // Re-apply hiding if React removes data-fa-hidden attributes
  function patrol() {
    if (!document.getElementById("fa-filter-css")) {
      styleInjected = false;
      injectCSS();
    }
    const marked = document.querySelectorAll("[data-fa-hidden]");
    if (marked.length === 0 && (tilesDone || heroDone)) {
      tilesDone = false;
      heroDone = false;
    }
    if (!tilesDone || !heroDone) run();
  }

  const obs = new MutationObserver(patrol);

  function start() {
    obs.observe(document.body, { childList: true, subtree: true });
    [300, 700, 1200, 2000, 4000, 8000].forEach(ms => setTimeout(patrol, ms));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
