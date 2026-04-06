// FlowAccess Extension — Content Script v2.0
// Runs on labs.google/fx/tools/flow
// Monitors session state and reports back to background

(function () {
  let checked = false;

  function checkSession() {
    if (checked) return;
    checked = true;

    // Look for Google account indicators in the DOM
    const indicators = document.querySelectorAll(
      '[data-email], [aria-label*="account"], [aria-label*="Account"], ' +
      'img[alt*="Google Account"], [data-identifier]'
    );

    if (indicators.length === 0) {
      // No session detected, ask background to re-inject
      chrome.runtime.sendMessage({ type: "SESSION_NOT_ACTIVE" }, () => {
        if (chrome.runtime.lastError) return;
      });
    }
  }

  // Check after initial load
  if (document.readyState === "complete") {
    setTimeout(checkSession, 3000);
  } else {
    window.addEventListener("load", () => setTimeout(checkSession, 3000));
  }

  // Listen for reload request from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "RELOAD") {
      window.location.reload();
    }
  });
})();
