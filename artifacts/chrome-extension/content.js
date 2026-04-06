// FlowAccess Extension — Content Script v3.0
// Runs on labs.google/fx/tools/flow
// Keeps session alive while extension is active; logs out if extension is removed.

(function () {
  const SIGNOUT_URL = "https://labs.google/fx/api/auth/signout";
  const HEARTBEAT_INTERVAL_MS = 8000; // Check every 8 seconds

  // ── Extension heartbeat ────────────────────────────────────────────────────
  // Pings the background service worker. If it doesn't respond (extension was
  // removed or disabled), navigate to the sign-out URL to log out the session.

  function ping() {
    try {
      chrome.runtime.sendMessage({ type: "FA_PING" }, (response) => {
        if (chrome.runtime.lastError || !response?.alive) {
          console.log("[FlowAccess] Extension removed — logging out session account");
          window.location.replace(SIGNOUT_URL);
        }
      });
    } catch (e) {
      // chrome.runtime is no longer available — extension was removed
      window.location.replace(SIGNOUT_URL);
    }
  }

  // Start heartbeat after initial page settle
  setTimeout(() => {
    ping();
    setInterval(ping, HEARTBEAT_INTERVAL_MS);
  }, 3000);
})();
