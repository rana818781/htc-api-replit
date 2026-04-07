// FlowAccess Extension — Content Script v5.0
// Runs on labs.google/fx/tools/flow
// Fast heartbeat (1s) — triggers instant cleanup when extension is removed.

(function () {
  var HEARTBEAT_INTERVAL_MS = 1000;

  function triggerSignout() {
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
  }, 500);
})();
