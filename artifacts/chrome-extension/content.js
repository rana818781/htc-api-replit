(function () {
  var HEARTBEAT_INTERVAL_MS = 1000;

  try { localStorage.setItem("__fa_ext_was_active__", "1"); } catch (e) {}

  function triggerSignout() {
    window.postMessage({ type: "FA_EXT_REMOVED" }, "*");
    try { localStorage.setItem("__fa_ext_disconnected__", "1"); } catch (e) {}
  }

  function ping() {
    try {
      chrome.runtime.sendMessage({ type: "FA_PING" }, function (response) {
        if (chrome.runtime.lastError || !response || !response.alive) {
          triggerSignout();
        } else {
          window.postMessage({ type: "FA_EXT_HEARTBEAT", ts: Date.now() }, "*");
          try { localStorage.removeItem("__fa_ext_disconnected__"); } catch (e) {}
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
