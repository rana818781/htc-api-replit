// Veo Flow API Extension — Site Bridge v2.0
// Runs on ultraflow.replit.app
// Auto-detects the user's API token and sends it to the background worker

(function () {
  const SITE_ORIGIN = "https://ultraflow.replit.app";
  const LS_KEY = "__veoflowapi_token__";

  // Check if we're on the Veo Flow API site
  if (!location.href.includes("replit.app") && !location.href.includes("replit.dev")) return;

  function tryConnect() {
    // Read token from localStorage (set by the dashboard page)
    const token = localStorage.getItem(LS_KEY);
    if (!token) return;

    chrome.runtime.sendMessage(
      { type: "FA_AUTH_UPDATE", token },
      (resp) => {
        if (chrome.runtime.lastError) return;
        if (resp?.success) {
          console.debug("[VeoFlowAPI] Extension connected ✓");
        }
      }
    );
  }

  // Try immediately
  tryConnect();

  // Re-try after page loads fully (for SPA navigation)
  window.addEventListener("load", tryConnect);

  // Watch for localStorage changes (token updated after login)
  window.addEventListener("storage", (e) => {
    if (e.key === LS_KEY && e.newValue) {
      tryConnect();
    }
  });

  // Listen for the site posting a token directly
  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin) return;
    if (e.data?.type === "FA_SET_TOKEN" && e.data?.token) {
      localStorage.setItem(LS_KEY, e.data.token);
      tryConnect();
    }
  });
})();
