// FlowAccess Site Bridge v2.0
// Runs on ultraflow.replit.app
// Reads the stored API token from localStorage and sends it to the extension background

(function () {
  const token = localStorage.getItem("__flowaccess_token__");
  if (!token) return;

  chrome.runtime.sendMessage(
    { type: "FA_AUTH_UPDATE", token },
    (response) => {
      if (chrome.runtime.lastError) {
        // Extension not installed or not available — silent fail
      }
    }
  );
})();
