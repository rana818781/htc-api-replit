// FlowAccess Extension — Persistent Lock v8.0
// Runs at document_start in MAIN world on labs.google
// Blocks signout while extension is active.
// When extension is removed: instantly clears ALL cookies (all are non-httpOnly)
// and reloads — user is logged out immediately.

(function () {
  var extensionActive = true;
  var lastHeartbeat = Date.now();
  var STALE_THRESHOLD_MS = 4000;
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

  function nukeAllCookies() {
    try {
      var cookies = document.cookie.split(";");
      var paths = ["/", "/fx", "/fx/tools", "/fx/tools/flow", "/fx/api", "/fx/api/auth", "/fx/tools/flow/project"];
      var domains = ["labs.google", ".labs.google", ".google", ""];
      for (var i = 0; i < cookies.length; i++) {
        var name = cookies[i].split("=")[0].trim();
        if (!name) continue;
        for (var p = 0; p < paths.length; p++) {
          for (var d = 0; d < domains.length; d++) {
            var base = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + paths[p];
            if (domains[d]) base += ";domain=" + domains[d];
            document.cookie = base;
            document.cookie = base + ";secure";
            document.cookie = base + ";secure;samesite=none";
            document.cookie = base + ";samesite=lax";
          }
        }
      }
    } catch (e) {}
  }

  function doCleanup() {
    if (cleanupStarted) return;
    cleanupStarted = true;

    nukeAllCookies();
    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}

    nukeAllCookies();

    window.location.replace("https://labs.google/fx/tools/flow");
  }

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
