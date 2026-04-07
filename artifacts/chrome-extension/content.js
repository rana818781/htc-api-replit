// FlowAccess Extension — Content Script v4.0
// Runs on labs.google/fx/tools/flow
// Keeps session alive while extension is active; logs out if extension is removed.

(function () {
  const SIGNOUT_URL = "https://labs.google/fx/api/auth/signout";
  const HEARTBEAT_INTERVAL_MS = 3000;

  function triggerSignout() {
    console.log("[FlowAccess] Extension removed — logging out session account");
    window.postMessage({ type: "FA_EXT_REMOVED" }, "*");
    window.location.replace(SIGNOUT_URL);
  }

  function ping() {
    try {
      chrome.runtime.sendMessage({ type: "FA_PING" }, (response) => {
        if (chrome.runtime.lastError || !response?.alive) {
          triggerSignout();
        } else {
          window.postMessage({ type: "FA_EXT_HEARTBEAT", ts: Date.now() }, "*");
        }
      });
    } catch (e) {
      triggerSignout();
    }
  }

  setTimeout(() => {
    ping();
    setInterval(ping, HEARTBEAT_INTERVAL_MS);
  }, 1000);
})();
