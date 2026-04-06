// FlowAccess Persistent Lock v2.0
// Runs on labs.google/fx/tools/flow
// Prevents Google from signing the user out during an active session

(function () {
  // Override XMLHttpRequest to intercept any sign-out network calls
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    const urlStr = typeof url === "string" ? url : url.toString();
    if (
      urlStr.includes("accounts.google.com/logout") ||
      urlStr.includes("/o/oauth2/logout") ||
      urlStr.includes("ServiceLogin")
    ) {
      console.info("FlowAccess: Blocked sign-out XHR request");
      return; // swallow the request
    }
    return originalOpen.call(this, method, url, ...rest);
  };

  // Override fetch to intercept sign-out fetch calls
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    const urlStr = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
    if (
      urlStr.includes("accounts.google.com/logout") ||
      urlStr.includes("/o/oauth2/logout") ||
      urlStr.includes("ServiceLogin")
    ) {
      console.info("FlowAccess: Blocked sign-out fetch request");
      return Promise.resolve(new Response("{}", { status: 200 }));
    }
    return originalFetch.call(this, input, init);
  };

  // Prevent navigation away to Google logout pages
  window.addEventListener("beforeunload", (event) => {
    // Do nothing — just ensure page stays loaded
  });

  // Watch for DOM changes that might indicate a forced sign-out redirect
  const observer = new MutationObserver(() => {
    if (
      document.location.href.includes("accounts.google.com/logout") ||
      document.location.href.includes("/o/oauth2/logout")
    ) {
      document.location.replace("https://labs.google/fx/tools/flow");
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
