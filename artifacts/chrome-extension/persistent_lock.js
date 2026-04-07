// FlowAccess Extension — Persistent Lock v7.0
// Runs at document_start in MAIN world on labs.google
// Blocks signout while extension is active.
// When extension is removed: blocks page, waits for cookies to expire (15s lifetime),
// then reloads — user is logged out and original Google account returns.

(function () {
  var extensionActive = true;
  var lastHeartbeat = Date.now();
  var STALE_THRESHOLD_MS = 8000;
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

  function showBlockingOverlay() {
    function apply() {
      var overlay = document.createElement("div");
      overlay.id = "fa-session-expired";
      overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;background:#000;display:flex;align-items:center;justify-content:center;flex-direction:column;";

      var msg = document.createElement("div");
      msg.style.cssText = "color:#fff;font-size:18px;font-family:sans-serif;text-align:center;padding:40px;";
      msg.textContent = "Session expired. Logging out...";
      overlay.appendChild(msg);

      var sub = document.createElement("div");
      sub.style.cssText = "color:#888;font-size:14px;font-family:sans-serif;margin-top:10px;";
      sub.id = "fa-countdown";
      overlay.appendChild(sub);

      document.body.appendChild(overlay);

      document.querySelectorAll("body > *:not(#fa-session-expired)").forEach(function (el) {
        el.style.display = "none";
      });

      var secs = 20;
      var timer = setInterval(function () {
        secs--;
        var el = document.getElementById("fa-countdown");
        if (el) el.textContent = "Redirecting in " + secs + "s...";
        if (secs <= 0) clearInterval(timer);
      }, 1000);
    }

    if (document.body) {
      apply();
    } else {
      document.addEventListener("DOMContentLoaded", apply);
    }
  }

  function doCleanup() {
    if (cleanupStarted) return;
    cleanupStarted = true;
    console.log("[FlowAccess] Extension removed — blocking page, waiting for cookies to expire");

    clearAccessibleCookies();
    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}

    showBlockingOverlay();

    setTimeout(function () {
      clearAccessibleCookies();
      window.location.replace("https://labs.google/fx/tools/flow");
    }, 20000);
  }

  setInterval(function () {
    if (Date.now() - lastHeartbeat > STALE_THRESHOLD_MS) {
      extensionActive = false;
      doCleanup();
    }
  }, 2000);

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
