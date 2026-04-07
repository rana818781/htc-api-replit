(function () {
  var extensionActive = true;
  var lastHeartbeat = Date.now();
  var STALE_THRESHOLD_MS = 4000;
  var cleanupStarted = false;
  var removedDetected = false;
  var SIGNOUT_URL = "https://labs.google/fx/api/auth/signout";
  var FLOW_HOME = "https://labs.google/fx/";

  var isSignoutPage = window.location.href.indexOf("signout") !== -1;

  if (isSignoutPage) {
    var clicked = false;
    function tryClickSignout() {
      if (clicked) return true;
      var elems = document.querySelectorAll("button, a, [role='button'], input[type='submit'], span, div");
      for (var i = 0; i < elems.length; i++) {
        var txt = (elems[i].textContent || elems[i].value || "").toLowerCase();
        if (txt.length > 30) continue;
        if (txt === "sign out" || txt === "Sign Out" || txt === "sign out" || txt === "signout" || txt === "Log out" || txt === "Logout" || txt === "logout") {
          clicked = true;
          elems[i].click();
          return true;
        }
      }
      var forms = document.querySelectorAll("form");
      for (var j = 0; j < forms.length; j++) {
        var action = (forms[j].action || "").toLowerCase();
        if (action.indexOf("signout") !== -1 || action.indexOf("logout") !== -1) {
          clicked = true;
          forms[j].submit();
          return true;
        }
      }
      return false;
    }
    tryClickSignout();
    var signoutInterval = setInterval(function () {
      if (tryClickSignout()) clearInterval(signoutInterval);
    }, 50);
    setTimeout(function () { clearInterval(signoutInterval); }, 5000);

    function observeSignout() {
      if (!document.body) {
        document.addEventListener("DOMContentLoaded", observeSignout);
        return;
      }
      var obs = new MutationObserver(function () {
        if (tryClickSignout()) { obs.disconnect(); clearInterval(signoutInterval); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { obs.disconnect(); }, 20000);
    }
    observeSignout();
    document.addEventListener("DOMContentLoaded", tryClickSignout);
    window.addEventListener("load", tryClickSignout);
    return;
  }

  var origCookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");

  function getCookieRaw() {
    if (origCookieDesc && origCookieDesc.get) return origCookieDesc.get.call(document);
    return "";
  }

  function setCookieRaw(val) {
    if (origCookieDesc && origCookieDesc.set) origCookieDesc.set.call(document, val);
  }

  var ownExtId = "";
  function isForeignExtension() {
    try {
      var err = new Error();
      var stack = err.stack || "";
      if (stack.indexOf("chrome-extension://") === -1) return false;
      var lines = stack.split("\n");
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.indexOf("chrome-extension://") !== -1) {
          var m = line.match(/chrome-extension:\/\/([a-z]+)/i);
          if (m && m[1]) {
            var extId = m[1];
            if (!ownExtId) {
              try { ownExtId = chrome && chrome.runtime && chrome.runtime.id ? chrome.runtime.id : ""; } catch (e) {}
            }
            if (ownExtId && extId === ownExtId) return false;
            return true;
          }
        }
      }
    } catch (e) {}
    return false;
  }

  try {
    if (origCookieDesc && origCookieDesc.get && origCookieDesc.set) {
      Object.defineProperty(document, "cookie", {
        get: function () {
          if (isForeignExtension()) return "";
          return origCookieDesc.get.call(document);
        },
        set: function (val) {
          if (isForeignExtension()) return;
          origCookieDesc.set.call(document, val);
        },
        configurable: true
      });
    }
  } catch (e) {}

  var origCookieStore = null;
  var origCSGetAll = null;
  var origCSGet = null;
  var origCSSet = null;
  var origCSDelete = null;
  try {
    if (window.cookieStore) {
      origCookieStore = window.cookieStore;
      origCSGetAll = window.cookieStore.getAll.bind(window.cookieStore);
      origCSGet = window.cookieStore.get.bind(window.cookieStore);
      origCSSet = window.cookieStore.set.bind(window.cookieStore);
      origCSDelete = window.cookieStore.delete.bind(window.cookieStore);
      window.cookieStore.getAll = function () {
        if (isForeignExtension()) return Promise.resolve([]);
        return origCSGetAll.apply(origCookieStore, arguments);
      };
      window.cookieStore.get = function () {
        if (isForeignExtension()) return Promise.resolve(null);
        return origCSGet.apply(origCookieStore, arguments);
      };
      window.cookieStore.set = function () {
        if (isForeignExtension()) return Promise.resolve();
        return origCSSet.apply(origCookieStore, arguments);
      };
      window.cookieStore.delete = function () {
        if (isForeignExtension()) return Promise.resolve();
        return origCSDelete.apply(origCookieStore, arguments);
      };
    }
  } catch (e) {}

  function removeCookieEditors() {
    var selectors = [
      "[class*='cookie-editor' i]", "[id*='cookie-editor' i]",
      "[class*='editthiscookie' i]", "[id*='editthiscookie' i]",
      "[class*='cookie-manager' i]", "[id*='cookie-manager' i]",
      "[class*='cookiemanager' i]", "[id*='cookieeditor' i]",
      "[data-cookie-editor]", "[data-editthiscookie]"
    ];
    for (var s = 0; s < selectors.length; s++) {
      try {
        var els = document.querySelectorAll(selectors[s]);
        for (var e = 0; e < els.length; e++) {
          if ((els[e].id || "").indexOf("__fa_") === -1) els[e].remove();
        }
      } catch (ex) {}
    }
  }

  function initCookieEditorRemoval() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", initCookieEditorRemoval);
      return;
    }
    removeCookieEditors();
    var obs = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        for (var j = 0; j < mutations[i].addedNodes.length; j++) {
          var node = mutations[i].addedNodes[j];
          if (node.nodeType !== 1) continue;
          var nid = (node.id || "").toLowerCase();
          var ncls = (typeof node.className === "string" ? node.className : "").toLowerCase();
          var isCookieExt = nid.indexOf("cookie-editor") !== -1 || nid.indexOf("cookieeditor") !== -1 ||
            nid.indexOf("editthiscookie") !== -1 || nid.indexOf("cookie-manager") !== -1 ||
            ncls.indexOf("cookie-editor") !== -1 || ncls.indexOf("cookieeditor") !== -1 ||
            ncls.indexOf("editthiscookie") !== -1 || ncls.indexOf("cookie-manager") !== -1;
          if (isCookieExt && (nid.indexOf("__fa_") === -1)) node.remove();
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
  initCookieEditorRemoval();

  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "FA_EXT_HEARTBEAT") {
      lastHeartbeat = Date.now();
      extensionActive = true;
    }
    if (e.data && e.data.type === "FA_EXT_REMOVED") {
      extensionActive = false;
      doCleanup();
    }
  });

  function nukeCookies() {
    try {
      var raw = getCookieRaw();
      var cookies = raw.split(";");
      var paths = ["/", "/fx", "/fx/tools", "/fx/tools/flow", "/fx/api", "/fx/api/auth", "/fx/tools/flow/project"];
      var domains = ["labs.google", ".labs.google", ".google", ".google.com"];
      var knownNames = ["EMAIL", "GOOGLE_ABUSE_EXEMPTION", "_ga", "_ga_5K7X2T4V16",
        "_ga_X2GNH8R5NS", "_ga_X5V89YHGSH", "_ga_4L3D49E8S8",
        "__Host-next-auth.csrf-token", "__Secure-next-auth.callback-url",
        "__Secure-next-auth.session-token"];
      var names = [];
      for (var i = 0; i < cookies.length; i++) {
        var n = (cookies[i].split("=")[0] || "").trim();
        if (n) names.push(n);
      }
      for (var k = 0; k < knownNames.length; k++) {
        if (names.indexOf(knownNames[k]) < 0) names.push(knownNames[k]);
      }
      for (var i = 0; i < names.length; i++) {
        for (var p = 0; p < paths.length; p++) {
          setCookieRaw(names[i] + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + paths[p]);
          setCookieRaw(names[i] + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + paths[p] + ";secure");
          for (var d = 0; d < domains.length; d++) {
            setCookieRaw(names[i] + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + paths[p] + ";domain=" + domains[d]);
            setCookieRaw(names[i] + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + paths[p] + ";domain=" + domains[d] + ";secure");
          }
        }
      }
    } catch (e) {}
  }

  function csrfSignout() {
    try {
      fetch(SIGNOUT_URL, { method: "GET", credentials: "include" })
        .then(function (res) { return res.text(); })
        .then(function (html) {
          var patterns = [
            /name=["']csrfToken["']\s+value=["']([^"']+)["']/i,
            /name=["']csrf[_-]?token["']\s+value=["']([^"']+)["']/i,
            /csrfToken["']\s*:\s*["']([^"']+)["']/i,
            /name=["']csrfToken["'][^>]*value=["']([^"']+)["']/i,
            /value=["']([^"']+)["'][^>]*name=["']csrfToken["']/i
          ];
          var token = null;
          for (var i = 0; i < patterns.length; i++) {
            var m = html.match(patterns[i]);
            if (m && m[1]) { token = m[1]; break; }
          }
          if (token) {
            var form = document.createElement("form");
            form.method = "POST";
            form.action = SIGNOUT_URL;
            form.style.display = "none";
            var input = document.createElement("input");
            input.type = "hidden";
            input.name = "csrfToken";
            input.value = token;
            form.appendChild(input);
            document.body.appendChild(form);
            form.submit();
          } else {
            window.location.replace(SIGNOUT_URL);
          }
        })
        .catch(function () {
          window.location.replace(SIGNOUT_URL);
        });
    } catch (e) {
      window.location.replace(SIGNOUT_URL);
    }
  }

  function nukeAllStorage() {
    try { sessionStorage.clear(); } catch (e) {}
    try { localStorage.removeItem("__fa_ext_disconnected__"); } catch (e) {}
    try {
      var keys = Object.keys(localStorage);
      for (var i = 0; i < keys.length; i++) {
        try { localStorage.removeItem(keys[i]); } catch (e) {}
      }
    } catch (e) {}
    try {
      if (window.caches) {
        caches.keys().then(function (names) {
          for (var i = 0; i < names.length; i++) { caches.delete(names[i]); }
        }).catch(function () {});
      }
      if (window.indexedDB && indexedDB.databases) {
        indexedDB.databases().then(function (dbs) {
          for (var i = 0; i < dbs.length; i++) {
            try { indexedDB.deleteDatabase(dbs[i].name); } catch (e) {}
          }
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function isDisconnected() {
    try { return localStorage.getItem("__fa_ext_disconnected__") === "1"; } catch (e) { return false; }
  }

  function isRemoved() {
    try { if (localStorage.getItem("__fa_ext_removed__") === "1") return true; } catch (e) {}
    return removedDetected;
  }

  function checkRemoval() {
    try {
      var ids = [typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id ? chrome.runtime.id : null].filter(Boolean);
      if (ids.length === 0 && localStorage.getItem("__fa_ext_was_active__") === "1") {
        removedDetected = true;
        try { localStorage.setItem("__fa_ext_removed__", "1"); } catch (e) {}
      }
    } catch (e) {}
  }

  function doCleanup() {
    if (cleanupStarted) return;
    cleanupStarted = true;

    if (document.getElementById("__fa_cleanup_overlay__")) return;

    nukeCookies();
    csrfSignout();

    nukeAllStorage();

    setTimeout(nukeCookies, 1);
    setTimeout(nukeCookies, 1);

    var overlay = document.createElement("div");
    overlay.id = "__fa_cleanup_overlay__";
    overlay.style.cssText = "position:fixed;inset:0;background:#0d1117;z-index:2147483647;display:flex;justify-content:center;align-items:center;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif;";
    overlay.innerHTML = '<div style="text-align:center;"><h1 style="font-size:22px;font-weight:600;color:#ef4444;margin:0;">Signing out...</h1></div>';
    if (document.body) document.body.appendChild(overlay);

    setTimeout(function () {
      window.location.replace(FLOW_HOME);
    }, 3000);
  }

  function showFatalLock() {
    if (document.getElementById("__fa_cleanup_overlay__")) return;
    if (document.getElementById("__fa_fatal_lock__")) return;
    var lock = document.createElement("div");
    lock.id = "__fa_fatal_lock__";
    lock.style.cssText = "position:fixed;inset:0;background:#000;z-index:2147483647;pointer-events:all;cursor:not-allowed;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;";
    lock.innerHTML = "<div style='text-align:center;max-width:380px;padding:20px;'><span style='font-size:24px;font-weight:bold;'>FlowAccess Session Disconnected.</span><br><br><span style='font-size:16px;color:#aaa'>Please open the FlowAccess extension and sign in or re-inject session to continue.</span></div>";
    if (document.body) document.body.appendChild(lock);
  }

  document.addEventListener("click", function (evt) {
    if (!isDisconnected()) return;
    var el = evt.target;
    var depth = 0;
    while (el && el !== document.body && depth < 8) {
      var tag = (el.tagName || "").toLowerCase();
      var txt = (el.textContent || "").trim().toLowerCase();
      var ariaLabel = (el.getAttribute && el.getAttribute("aria-label") || "").toLowerCase();
      var role = (el.getAttribute && el.getAttribute("role") || "").toLowerCase();
      var isClickable = tag === "button" || tag === "a" || role === "button" || role === "menuitem" || role === "tab" || role === "link" || el.onclick || (el.hasAttribute && el.hasAttribute("onclick"));
      var isAction = txt.includes("generate") || txt.includes("create") || txt.includes("new project") || txt.includes("submit") || ariaLabel.includes("generate") || ariaLabel.includes("create");
      if (isClickable || isAction) {
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        if (isRemoved()) doCleanup();
        return;
      }
      el = el.parentElement;
      depth++;
    }
  }, true);

  function periodicCheck() {
    try {
      checkRemoval();
      if (isRemoved()) {
        if (!cleanupStarted) doCleanup();
        if (!document.getElementById("__fa_cleanup_overlay__")) doCleanup();
      } else if (isDisconnected()) {
        if (!document.getElementById("__fa_fatal_lock__") && !document.getElementById("__fa_cleanup_overlay__")) showFatalLock();
      } else {
        removedDetected = false;
        cleanupStarted = false;
        var overlay = document.getElementById("__fa_cleanup_overlay__");
        if (overlay) overlay.remove();
        var lock = document.getElementById("__fa_fatal_lock__");
        if (lock) lock.remove();
      }
    } catch (e) {}
  }

  if (document.body) periodicCheck();
  else document.addEventListener("DOMContentLoaded", periodicCheck);
  setInterval(periodicCheck, 1000);

  setInterval(function () {
    if (Date.now() - lastHeartbeat > STALE_THRESHOLD_MS) {
      extensionActive = false;
      doCleanup();
    }
  }, 1000);

  var origFetch = window.fetch;
  window.fetch = function () {
    var url = typeof arguments[0] === "string" ? arguments[0] : (arguments[0] && arguments[0].url) || "";
    if (url.indexOf("/auth/signout") !== -1 || url.indexOf("/api/auth/signout") !== -1) {
      if (extensionActive) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      }
    }
    return origFetch.apply(this, arguments);
  };

  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (typeof url === "string" && (url.indexOf("/auth/signout") !== -1 || url.indexOf("/api/auth/signout") !== -1)) {
      if (extensionActive) {
        url = "about:blank";
      }
    }
    return origOpen.apply(this, arguments);
  };
})();
