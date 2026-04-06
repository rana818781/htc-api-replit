// FlowAccess — Project Filter v11
// Hides old projects, hero banner, and locks account/settings buttons.

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

  // ── Lock account-related buttons in the header ──────────────────────────
  // Targets: ? (help), ⋮ (three-dot menu), ULTRA badge, profile avatar
  // Makes them unclickable with cursor: not-allowed

  function lockHeaderButtons() {
    const header = document.querySelector("header") ||
      (function () {
        const btn = findNewProjectButton();
        if (!btn) return null;
        let el = btn;
        for (let i = 0; i < 8; i++) {
          el = el.parentElement;
          if (!el || el === document.body) break;
          const sp = el.parentElement;
          if (!sp) break;
          if (sp.children.length >= 3 && sp.children.length <= 6) {
            const kids = Array.from(sp.children);
            let minTop = Infinity, h = null;
            for (const k of kids) {
              const r = k.getBoundingClientRect();
              if (r.height > 5 && r.width > 50 && r.top < minTop) { minTop = r.top; h = k; }
            }
            return h;
          }
        }
        return null;
      })();

    if (!header) return;

    const allButtons = header.querySelectorAll("button, [role='button'], a[href]");
    for (const el of allButtons) {
      const text = (el.textContent || "").trim().toLowerCase();
      const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
      const title = (el.getAttribute("title") || "").toLowerCase();
      const combined = text + " " + ariaLabel + " " + title;

      const isAccountBtn =
        /ultra/i.test(text) ||
        /help|question|faq|\?/i.test(combined) ||
        /more|menu|three|dot|vert/i.test(combined) ||
        /account|profile|avatar|sign|user|settings/i.test(combined) ||
        el.querySelector("img[src*='avatar'], img[src*='profile'], img[src*='googleusercontent']") !== null;

      if (!isAccountBtn) {
        const r = el.getBoundingClientRect();
        const headerR = header.getBoundingClientRect();
        const isRightSide = r.right > headerR.right - 200;
        if (!isRightSide) continue;
      }

      if (el.getAttribute("data-fa-locked")) continue;
      el.setAttribute("data-fa-locked", "1");
      el.style.setProperty("cursor", "not-allowed", "important");
      el.style.setProperty("opacity", "0.5", "important");
      el.style.setProperty("pointer-events", "auto", "important");

      el.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }, true);
    }

    const imgs = header.querySelectorAll("img");
    for (const img of imgs) {
      const src = (img.src || "").toLowerCase();
      if (src.includes("avatar") || src.includes("profile") || src.includes("googleusercontent")) {
        let target = img;
        for (let i = 0; i < 4; i++) {
          target = target.parentElement;
          if (!target) break;
          if (target.tagName === "BUTTON" || target.getAttribute("role") === "button" ||
              target.tagName === "A") {
            if (!target.getAttribute("data-fa-locked")) {
              target.setAttribute("data-fa-locked", "1");
              target.style.setProperty("cursor", "not-allowed", "important");
              target.style.setProperty("opacity", "0.5", "important");
              target.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
              }, true);
            }
            break;
          }
        }
      }
    }
  }

  function patrol() {
    hideTiles();
    hideHero();
    lockHeaderButtons();
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
