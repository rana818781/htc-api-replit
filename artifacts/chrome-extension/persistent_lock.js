// FlowAccess Extension — Persistent Lock v3.0
// Runs at document_start in MAIN world on labs.google
// Blocks signout while extension is active; triggers signout when extension is removed

(function () {
  var SIGNOUT_URL = "https://labs.google/fx/api/auth/signout";
  var extensionActive = true;
  var lastHeartbeat = Date.now();
  var STALE_THRESHOLD_MS = 12000;

  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "FA_EXT_HEARTBEAT") {
      lastHeartbeat = Date.now();
      extensionActive = true;
    }
    if (e.data && e.data.type === "FA_EXT_REMOVED") {
      extensionActive = false;
    }
  });

  setInterval(function () {
    if (Date.now() - lastHeartbeat > STALE_THRESHOLD_MS) {
      extensionActive = false;
      console.log("[FlowAccess] Extension heartbeat lost — signing out");
      window.location.replace(SIGNOUT_URL);
    }
  }, 4000);

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
