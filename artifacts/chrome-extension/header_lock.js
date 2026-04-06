// FlowAccess — Header Lock (runs at document_start)
// Main page: blocks ?, three-dot, ULTRA, profile
// Project page (/project/): blocks three-dot, ULTRA + profile avatar

(function () {
  "use strict";

  const css = document.createElement("style");
  css.textContent = "[data-fa-locked]{cursor:not-allowed!important;opacity:.5!important;}";

  function tryInjectCSS() {
    const target = document.head || document.documentElement;
    if (target && !css.parentNode) target.appendChild(css);
  }
  tryInjectCSS();

  function isProjectPage() {
    return /\/project\//i.test(location.pathname);
  }

  function lockEl(el) {
    if (el.getAttribute("data-fa-locked")) return;
    el.setAttribute("data-fa-locked", "1");
    el.style.setProperty("cursor", "not-allowed", "important");
    el.style.setProperty("opacity", "0.5", "important");
    el.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);
    el.addEventListener("mousedown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);
    el.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);
  }

  function isProfileButton(el) {
    const text = (el.textContent || "").trim().toLowerCase();
    if (/ultra/i.test(text)) return true;
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    const title = (el.getAttribute("title") || "").toLowerCase();
    const all = text + " " + aria + " " + title;
    if (/account|profile|sign out|sign in|user/i.test(all)) return true;
    if (el.querySelector("img[src*='googleusercontent'], img[src*='avatar'], img[src*='profile']")) return true;
    return false;
  }

  function isThreeDotMenu(el) {
    const text = (el.textContent || "").trim().toLowerCase();
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    const title = (el.getAttribute("title") || "").toLowerCase();
    const all = text + " " + aria + " " + title;
    if (/more|menu|vert|three.?dot|kebab|overflow/i.test(all)) return true;
    var inner = el.innerHTML || "";
    if (/more_vert/i.test(inner)) return true;
    if (el.querySelector("[data-icon='more_vert'], .material-icons, mat-icon")) {
      var icon = el.querySelector("[data-icon='more_vert'], .material-icons, mat-icon");
      if (icon && /more_vert/i.test(icon.textContent || icon.getAttribute("data-icon") || "")) return true;
    }
    return false;
  }

  function isSettingsButton(el) {
    const text = (el.textContent || "").trim().toLowerCase();
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    const title = (el.getAttribute("title") || "").toLowerCase();
    const all = text + " " + aria + " " + title;
    if (/help|\?|question/i.test(all)) return true;
    if (/more|menu|vert/i.test(all)) return true;
    if (/settings/i.test(all)) return true;
    return false;
  }

  function scan() {
    tryInjectCSS();
    const onProject = isProjectPage();

    const allClickable = document.querySelectorAll("button, [role='button']");
    for (const el of allClickable) {
      if (el.getAttribute("data-fa-locked")) continue;

      if (isProfileButton(el)) {
        lockEl(el);
        continue;
      }

      if (isThreeDotMenu(el)) {
        lockEl(el);
        continue;
      }

      if (onProject) continue;

      if (isSettingsButton(el)) {
        lockEl(el);
        continue;
      }

      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.top > 80) continue;
      if (r.right < window.innerWidth - 200) continue;

      const text = (el.textContent || "").trim();
      if (/flow tv|discord/i.test(text)) continue;
      if (text.length > 20) continue;

      lockEl(el);
    }

    var menus = document.querySelectorAll("[role='menu'], [role='listbox']");
    for (var m = 0; m < menus.length; m++) {
      var menuEl = menus[m];
      var menuText = (menuEl.textContent || "").toLowerCase();
      if (/download project|product help|flow help center|about flow|learn flow|send app feedback|report legal|privacy notice/i.test(menuText)) {
        menuEl.style.setProperty("display", "none", "important");
        menuEl.style.setProperty("visibility", "hidden", "important");
      }
    }

    const avatarImgs = document.querySelectorAll("img[src*='googleusercontent'], img[src*='avatar']");
    for (const img of avatarImgs) {
      let target = img;
      for (let i = 0; i < 5; i++) {
        target = target.parentElement;
        if (!target) break;
        if (target.tagName === "BUTTON" || target.getAttribute("role") === "button") {
          lockEl(target);
          break;
        }
      }
    }
  }

  const obs = new MutationObserver(scan);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  [0, 100, 300, 600, 1000, 2000].forEach(ms => setTimeout(scan, ms));
})();
