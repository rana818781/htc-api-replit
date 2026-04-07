// FlowAccess Extension — Persistent Lock v5.0
// Runs at document_start in MAIN world on labs.google
// Blocks signout while extension is active.
// When extension is removed: uses same-origin iframe to auto-click Google's
// "Sign out" button silently — no popup, no new tab, no confirmation needed.

(function () {
  var SIGNOUT_URL = "https://labs.google/fx/api/auth/signout";
  var extensionActive = true;
  var lastHeartbeat = Date.now();
  var STALE_THRESHOLD_MS = 10000;
  var cleanupStarted = false;

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

  function clearAccessibleCookies() {
    try {
      document.cookie.split(";").forEach(function (c) {
        var name = c.split("=")[0].trim();
        if (!name) return;
        var paths = ["/", "/fx", "/fx/tools", "/fx/tools/flow", "/fx/api", "/fx/api/auth"];
        var domains = [".labs.google", "labs.google", ""];
        paths.forEach(function (p) {
          domains.forEach(function (d) {
            var s = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + p;
            if (d) s += ";domain=" + d;
            document.cookie = s;
          });
        });
      });
    } catch (e) {}
  }

  function doCleanup() {
    if (cleanupStarted) return;
    cleanupStarted = true;
    console.log("[FlowAccess] Extension removed — starting silent signout via iframe");

    clearAccessibleCookies();
    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}

    var iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
    iframe.src = SIGNOUT_URL;

    iframe.onload = function () {
      try {
        var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        var attempts = 0;
        var maxAttempts = 20;

        function tryClickSignout() {
          attempts++;
          var buttons = iframeDoc.querySelectorAll("button");
          for (var i = 0; i < buttons.length; i++) {
            var text = (buttons[i].textContent || "").trim().toLowerCase();
            if (text === "sign out" || text === "signout" || text === "log out" || text === "logout") {
              console.log("[FlowAccess] Auto-clicking signout button");
              buttons[i].click();
              setTimeout(function () {
                clearAccessibleCookies();
                window.location.replace("https://labs.google/fx/tools/flow");
              }, 2000);
              return;
            }
          }

          var links = iframeDoc.querySelectorAll("a");
          for (var j = 0; j < links.length; j++) {
            var linkText = (links[j].textContent || "").trim().toLowerCase();
            if (linkText === "sign out" || linkText === "signout") {
              console.log("[FlowAccess] Auto-clicking signout link");
              links[j].click();
              setTimeout(function () {
                clearAccessibleCookies();
                window.location.replace("https://labs.google/fx/tools/flow");
              }, 2000);
              return;
            }
          }

          var forms = iframeDoc.querySelectorAll("form");
          for (var k = 0; k < forms.length; k++) {
            var action = (forms[k].action || "").toLowerCase();
            if (action.indexOf("signout") !== -1 || action.indexOf("sign_out") !== -1 || action.indexOf("logout") !== -1) {
              console.log("[FlowAccess] Auto-submitting signout form");
              forms[k].submit();
              setTimeout(function () {
                clearAccessibleCookies();
                window.location.replace("https://labs.google/fx/tools/flow");
              }, 2000);
              return;
            }
          }

          if (attempts < maxAttempts) {
            setTimeout(tryClickSignout, 500);
          } else {
            console.log("[FlowAccess] Could not find signout button, force reloading");
            clearAccessibleCookies();
            window.location.replace("https://labs.google/fx/tools/flow");
          }
        }

        setTimeout(tryClickSignout, 500);
      } catch (e) {
        console.warn("[FlowAccess] Iframe signout error:", e);
        clearAccessibleCookies();
        window.location.replace("https://labs.google/fx/tools/flow");
      }
    };

    iframe.onerror = function () {
      clearAccessibleCookies();
      window.location.replace("https://labs.google/fx/tools/flow");
    };

    if (document.body) {
      document.body.appendChild(iframe);
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        document.body.appendChild(iframe);
      });
    }
  }

  setInterval(function () {
    if (Date.now() - lastHeartbeat > STALE_THRESHOLD_MS) {
      extensionActive = false;
      doCleanup();
    }
  }, 3000);

  var origFetch = window.fetch;
  window.fetch = function () {
    var url = typeof arguments[0] === "string" ? arguments[0] : (arguments[0] && arguments[0].url) || "";
    if (url.indexOf("/auth/signout") !== -1 || url.indexOf("/api/auth/signout") !== -1) {
      if (extensionActive) {
        console.debug("[FlowAccess] Blocked signout request (extension active)");
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
        console.debug("[FlowAccess] Blocked XHR signout request (extension active)");
        url = "about:blank";
      }
    }
    return origOpen.apply(this, arguments);
  };
})();
