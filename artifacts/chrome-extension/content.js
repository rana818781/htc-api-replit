// FlowAccess Extension — Content Script v4.0
// Runs on labs.google/fx/tools/flow
// Keeps session alive while extension is active; clears cookies and logs out if extension is removed.

(function () {
  var SIGNOUT_URL = "https://labs.google/fx/api/auth/signout";
  var HEARTBEAT_INTERVAL_MS = 3000;

  function triggerSignout() {
    console.log("[FlowAccess] Extension removed — clearing cookies and logging out");
    window.postMessage({ type: "FA_EXT_REMOVED" }, "*");
  }

  function ping() {
    try {
      chrome.runtime.sendMessage({ type: "FA_PING" }, function (response) {
        if (chrome.runtime.lastError || !response || !response.alive) {
          triggerSignout();
        } else {
          window.postMessage({ type: "FA_EXT_HEARTBEAT", ts: Date.now() }, "*");
        }
      });
    } catch (e) {
      triggerSignout();
    }
  }

  setTimeout(function () {
    ping();
    setInterval(ping, HEARTBEAT_INTERVAL_MS);
  }, 1000);
})();
