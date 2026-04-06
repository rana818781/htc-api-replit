// FlowAccess Background Service Worker v2.0
// Handles cookie injection into labs.google for FlowAccess subscribers

const API_BASE = "https://ultraflow.replit.app";
const FLOW_URL = "https://labs.google/fx/tools/flow";

// Track tabs we reloaded ourselves to prevent infinite reload loop
const justReloaded = new Set();

// ─── Token Helpers ────────────────────────────────────────────────────────────

async function getToken() {
  const result = await chrome.storage.local.get("flowaccess_token");
  return result.flowaccess_token || null;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

async function fetchUserInfo(token) {
  if (!token) return null;
  try {
    const resp = await fetch(`${API_BASE}/api/extension/me`, {
      headers: { "X-API-Token": token },
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function injectCookies(token) {
  if (!token) return { success: false, error: "Not connected" };

  try {
    const resp = await fetch(`${API_BASE}/api/extension/inject`, {
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
    let cookies = [];
    try {
      cookies = JSON.parse(data.cookieData);
    } catch {
      // fallback: plain key=value pairs
      cookies = data.cookieData
        .split(";")
        .map((p) => {
          const [name, ...rest] = p.trim().split("=");
          return { name: name.trim(), value: rest.join("=").trim() };
        })
        .filter((c) => c.name);
    }

    for (const cookie of cookies) {
      try {
        await chrome.cookies.set({
          url: "https://labs.google",
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain || ".labs.google",
          path: cookie.path || "/",
          secure: cookie.secure !== false,
          sameSite: cookie.sameSite || "no_restriction",
          expirationDate:
            cookie.expirationDate ||
            Math.floor(Date.now() / 1000) + 86400 * 7,
        });
      } catch (e) {
        console.warn("FlowAccess: could not set cookie", cookie.name, e);
      }
    }

    return { success: true, creditsRemaining: data.creditsRemaining };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Auto-Inject on Navigation ────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "loading") return;
  if (!tab.url?.startsWith(FLOW_URL)) return;

  // Skip tabs we reloaded ourselves (prevent infinite loop)
  if (justReloaded.has(tabId)) {
    justReloaded.delete(tabId);
    return;
  }

  const token = await getToken();
  if (!token) return;

  const result = await injectCookies(token);

  if (result.success) {
    justReloaded.add(tabId);
    setTimeout(() => chrome.tabs.reload(tabId), 800);
  }
});

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {

      // Site bridge: token auto-detected from FlowAccess website
      case "FA_AUTH_UPDATE": {
        if (message.token) {
          await chrome.storage.local.set({ flowaccess_token: message.token });
          // Verify it works
          const user = await fetchUserInfo(message.token);
          sendResponse({ success: !!user, user: user ?? null });
        } else {
          sendResponse({ success: false });
        }
        break;
      }

      // Popup: get current status
      case "FA_GET_STATUS": {
        const token = await getToken();
        if (!token) { sendResponse({ connected: false }); break; }
        const user = await fetchUserInfo(token);
        if (!user) {
          await chrome.storage.local.remove("flowaccess_token");
          sendResponse({ connected: false });
          break;
        }
        sendResponse({ connected: true, user });
        break;
      }

      // Popup: manually inject & open Flow
      case "FA_INJECT": {
        const token = await getToken();
        if (!token) { sendResponse({ success: false, error: "Not connected" }); break; }
        const result = await injectCookies(token);
        sendResponse(result);
        break;
      }

      // Popup: disconnect
      case "FA_LOGOUT": {
        await chrome.storage.local.remove("flowaccess_token");
        sendResponse({ success: true });
        break;
      }

      // Content script: session not active — re-inject
      case "SESSION_NOT_ACTIVE": {
        const token = await getToken();
        if (!token) { sendResponse({ success: false }); break; }
        const result = await injectCookies(token);
        if (result.success && sender.tab?.id) {
          chrome.tabs.sendMessage(sender.tab.id, { type: "RELOAD" });
        }
        sendResponse(result);
        break;
      }

      default:
        sendResponse({ success: false, error: "Unknown message type" });
    }
  })();

  return true; // Keep channel open for async response
});
