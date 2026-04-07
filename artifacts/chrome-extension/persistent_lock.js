// FlowAccess Extension — Persistent Lock v4.0
// Runs at document_start in MAIN world on labs.google
// Blocks signout while extension is active; auto-clears cookies and signs out when extension is removed

(function () {
  var SIGNOUT_URL = "https://labs.google/fx/api/auth/signout";
  var extensionActive = true;
  var lastHeartbeat = Date.now();
  var STALE_THRESHOLD_MS = 10000;
  var alreadyCleanedUp = false;

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

  function clearAllCookies() {
    try {
      document.cookie.split(";").forEach(function (c) {
        var name = c.split("=")[0].trim();
        if (!name) return;
        var paths = ["/", "/fx", "/fx/tools", "/fx/tools/flow", "/fx/api", "/fx/api/auth"];
        var domains = [".labs.google", "labs.google", ""];
        paths.forEach(function (p) {
          domains.forEach(function (d) {
            var str = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + p;
            if (d) str += ";domain=" + d;
            document.cookie = str;
          });
        });
      });
    } catch (e) {}
  }

  function doCleanup() {
    if (alreadyCleanedUp) return;
    alreadyCleanedUp = true;
    console.log("[FlowAccess] Extension removed — clearing session");
    clearAllCookies();
    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
    var form = document.createElement("form");
    form.method = "POST";
    form.action = SIGNOUT_URL;
    form.style.display = "none";
    document.body.appendChild(form);
    form.submit();
    setTimeout(function () {
      window.location.replace("https://labs.google/fx/tools/flow");
    }, 3000);
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
