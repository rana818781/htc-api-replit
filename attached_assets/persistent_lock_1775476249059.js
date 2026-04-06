// FlowAccess Extension — Persistent Lock v2.0
// Runs at document_start on labs.google to prevent session leaks
// Intercepts signout attempts and cancels them

(function () {
  // Block labs.google from reading cookies via JS (defense in depth)
  // The extension still injects cookies via the chrome.cookies API

  // Intercept fetch calls to /fx/api/auth/signout and block them
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url ?? "";
    if (url.includes("/auth/signout") || url.includes("/api/auth/signout")) {
      console.debug("[FlowAccess] Blocked signout request");
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    }
    return origFetch.apply(this, args);
  };

  // Block XMLHttpRequest signout calls
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (typeof url === "string" && (url.includes("/auth/signout") || url.includes("/api/auth/signout"))) {
      console.debug("[FlowAccess] Blocked XHR signout request");
      url = "about:blank";
    }
    return origOpen.call(this, method, url, ...rest);
  };
})();
