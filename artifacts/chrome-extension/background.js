// FlowAccess Background Service Worker
// Handles cookie injection and prevents infinite reload loops

const FLOW_URL = "https://labs.google/fx/tools/flow";
const API_BASE = ""; // Will be set via storage or use the replit.app domain

// Track tabs we reloaded ourselves to prevent infinite reload loop
const justReloaded = new Set();

// Get stored API token
async function getToken() {
  const result = await chrome.storage.local.get("flowaccess_token");
  return result.flowaccess_token || null;
}

// Get stored API base URL
async function getApiBase() {
  const result = await chrome.storage.local.get("flowaccess_api_base");
  return result.flowaccess_api_base || "";
}

// Fetch user info using API token
async function fetchUserInfo(token) {
  const apiBase = await getApiBase();
  if (!apiBase || !token) return null;
  try {
    const resp = await fetch(`${apiBase}/api/extension/me`, {
      headers: { "X-API-Token": token },
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// Inject cookies into the browser for labs.google
async function injectCookies(token) {
  const apiBase = await getApiBase();
  if (!apiBase || !token) {
    return { success: false, error: "No API configuration" };
  }

  try {
    const resp = await fetch(`${apiBase}/api/extension/inject`, {
      method: "POST",
      headers: { "X-API-Token": token },
    });

    if (resp.status === 403) {
      return { success: false, error: "No credits remaining" };
    }
    if (!resp.ok) {
      return { success: false, error: "Injection failed" };
    }

    const data = await resp.json();
    const cookies = JSON.parse(data.cookieData);

    // Set all cookies for labs.google
    for (const cookie of cookies) {
      try {
        const cookieDetails = {
          url: "https://labs.google",
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain || ".labs.google",
          path: cookie.path || "/",
          secure: cookie.secure !== undefined ? cookie.secure : true,
          httpOnly: cookie.httpOnly !== undefined ? cookie.httpOnly : false,
        };
        if (cookie.sameSite) {
          cookieDetails.sameSite = cookie.sameSite;
        }
        if (cookie.expirationDate) {
          cookieDetails.expirationDate = cookie.expirationDate;
        }
        await chrome.cookies.set(cookieDetails);
      } catch (e) {
        console.warn("Failed to set cookie:", cookie.name, e);
      }
    }

    return {
      success: true,
      creditsRemaining: data.creditsRemaining,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Listen for tab navigation to Google Flow
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "loading") return;
  if (!tab.url || !tab.url.startsWith(FLOW_URL)) return;

  // Prevent infinite reload loop
  if (justReloaded.has(tabId)) {
    justReloaded.delete(tabId);
    return;
  }

  const token = await getToken();
  if (!token) return;

  const result = await injectCookies(token);

  if (result.success) {
    // Mark tab as about to be reloaded by us
    justReloaded.add(tabId);
    // Reload after cookies are set
    setTimeout(() => {
      chrome.tabs.reload(tabId);
    }, 800);
  }
});

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "FA_AUTH_UPDATE": {
        if (message.token) {
          await chrome.storage.local.set({ flowaccess_token: message.token });
        }
        if (message.apiBase) {
          await chrome.storage.local.set({ flowaccess_api_base: message.apiBase });
        }
        sendResponse({ success: true });
        break;
      }

      case "FA_GET_STATUS": {
        const token = await getToken();
        if (!token) {
          sendResponse({ connected: false });
          break;
        }
        const user = await fetchUserInfo(token);
        sendResponse({ connected: !!user, user });
        break;
      }

      case "FA_INJECT": {
        const token = await getToken();
        if (!token) {
          sendResponse({ success: false, error: "Not connected" });
          break;
        }
        const result = await injectCookies(token);
        sendResponse(result);
        break;
      }

      case "FA_LOGOUT": {
        await chrome.storage.local.remove(["flowaccess_token"]);
        sendResponse({ success: true });
        break;
      }

      case "SESSION_NOT_ACTIVE": {
        // Re-inject without reload
        const token = await getToken();
        if (!token) {
          sendResponse({ success: false });
          break;
        }
        const result = await injectCookies(token);
        if (result.success && sender.tab?.id) {
          // Send reload message to content script
          chrome.tabs.sendMessage(sender.tab.id, { type: "RELOAD" });
        }
        sendResponse(result);
        break;
      }

      default:
        sendResponse({ success: false, error: "Unknown message type" });
    }
  })();
  return true; // Keep message channel open for async response
});
