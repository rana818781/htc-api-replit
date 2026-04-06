// FlowAccess Site Bridge
// Runs on the FlowAccess website (replit.app domain)
// Reads the stored API token from localStorage and sends it to the extension

(function () {
  const token = localStorage.getItem("__flowaccess_token__");
  const apiBase = window.location.origin;

  if (token) {
    chrome.runtime.sendMessage(
      {
        type: "FA_AUTH_UPDATE",
        token,
        apiBase,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          // Extension not installed or not available
        }
      }
    );
  }
})();
