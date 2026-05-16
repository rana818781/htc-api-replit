// HTC API — Header Lock (runs at document_start)
// Main page: blocks ?, three-dot, ULTRA, profile
// Project page (/project/): blocks three-dot, ULTRA + profile avatar
// All pages: blocks "Veo 3.1 - Quality" model selection

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

      var rect = el.getBoundingClientRect();
      var inHeader = rect.width > 0 && rect.height > 0 && rect.top <= 80 && rect.right >= window.innerWidth - 250;

      if (isProfileButton(el)) {
        lockEl(el);
        continue;
      }

      if (inHeader && isThreeDotMenu(el)) {
        lockEl(el);
        continue;
      }

      if (onProject) continue;

      if (inHeader && isSettingsButton(el)) {
        lockEl(el);
        continue;
      }

      if (!inHeader) continue;
      if (rect.width === 0 || rect.height === 0) continue;

      const text = (el.textContent || "").trim();
      if (/flow tv|discord/i.test(text)) continue;
      if (text.length > 20) continue;

      lockEl(el);
    }

    var BLOCKED_MODEL_RE = /veo\s*3\.1\s*-\s*quality/i;

    function hideModelItem(el) {
      if (el.getAttribute("data-fa-model-blocked")) return;
      el.setAttribute("data-fa-model-blocked", "1");
      el.style.setProperty("display", "none", "important");
      el.style.setProperty("visibility", "hidden", "important");
      el.style.setProperty("height", "0", "important");
      el.style.setProperty("overflow", "hidden", "important");
      el.style.setProperty("pointer-events", "none", "important");
      el.style.setProperty("position", "absolute", "important");
      el.style.setProperty("opacity", "0", "important");
      var blocker = function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      };
      el.addEventListener("click", blocker, true);
      el.addEventListener("mousedown", blocker, true);
      el.addEventListener("pointerdown", blocker, true);
      el.addEventListener("touchstart", blocker, true);
    }

    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    while (walker.nextNode()) {
      var tnode = walker.currentNode;
      if (!BLOCKED_MODEL_RE.test(tnode.textContent)) continue;
      var container = tnode.parentElement;
      for (var up = 0; up < 8 && container; up++) {
        var tag = container.tagName.toLowerCase();
        var role = (container.getAttribute("role") || "").toLowerCase();
        if (tag === "li" || role === "option" || role === "menuitem" || role === "menuitemradio" || role === "listitem") {
          hideModelItem(container);
          break;
        }
        if (container.parentElement && container.parentElement.getAttribute("role") === "listbox") {
          hideModelItem(container);
          break;
        }
        if (container.parentElement && container.parentElement.children.length >= 2 && container.parentElement.children.length <= 8) {
          var siblings = container.parentElement.children;
          var looksLikeList = true;
          for (var si = 0; si < siblings.length; si++) {
            if (siblings[si].tagName !== container.tagName) { looksLikeList = false; break; }
          }
          if (looksLikeList && container.getBoundingClientRect().height > 20) {
            hideModelItem(container);
            break;
          }
        }
        container = container.parentElement;
      }
    }

    var generateBtn = null;
    var allBtns = document.querySelectorAll("button, [role='button']");
    for (var gi = 0; gi < allBtns.length; gi++) {
      var btnText = (allBtns[gi].textContent || "").trim().toLowerCase();
      if (BLOCKED_MODEL_RE.test(btnText)) {
        var genArrow = allBtns[gi].parentElement ? allBtns[gi].parentElement.querySelector("[aria-label*='generate'], [aria-label*='send'], [aria-label*='submit']") : null;
        if (genArrow) lockEl(genArrow);
      }
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
