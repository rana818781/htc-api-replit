// FlowAccess Extension — Background Service Worker v2.0
// Handles session injection into labs.google for FlowAccess users

const API_BASE = "https://ultraflow.replit.app";
const STORAGE_KEY_TOKEN = "fa_api_token";
const STORAGE_KEY_USER = "fa_user";
const STORAGE_KEY_DISABLED = "fa_disabled";

// ─── Token Management ───────────────────────────────────────────────────────

async function getToken() {
  const data = await chrome.storage.local.get(STORAGE_KEY_TOKEN);
  return data[STORAGE_KEY_TOKEN] ?? null;
}

async function setToken(token) {
  await chrome.storage.local.set({ [STORAGE_KEY_TOKEN]: token });
}

async function clearToken() {
  await chrome.storage.local.remove([STORAGE_KEY_TOKEN, STORAGE_KEY_USER]);
}

// ─── API Calls ──────────────────────────────────────────────────────────────

async function fetchUserInfo(token) {
  const res = await fetch(`${API_BASE}/api/extension/me`, {
    headers: { "X-API-Token": token },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchAndInject(token, tabId) {
  const res = await fetch(`${API_BASE}/api/extension/inject`, {
    method: "POST",
    headers: { "X-API-Token": token, "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    return { success: false, error: err.error || "Injection failed" };
  }

  const { cookieData, creditsRemaining } = await res.json();

  // Parse cookies
  let cookies = [];
  try {
    cookies = JSON.parse(cookieData);
  } catch {
    cookies = cookieData
      .split(";")
      .map((part) => {
        const [name, ...valParts] = part.trim().split("=");
        return { name: name.trim(), value: valParts.join("=").trim() };
      })
      .filter((c) => c.name);
  }

  // Inject each cookie into labs.google
  for (const cookie of cookies) {
    // Build the URL for setting cookies
    const rawDomain = cookie.domain || "labs.google";
    const cleanDomain = rawDomain.startsWith(".") ? rawDomain.slice(1) : rawDomain;
    const cookieUrl = cookie.secure ? `https://${cleanDomain}` : `http://${cleanDomain}`;

    const details = {
      url: cookieUrl,
      name: cookie.name,
      value: cookie.value,
      domain: rawDomain,
      path: cookie.path || "/",
      secure: cookie.secure === true,
      httpOnly: cookie.httpOnly === true,
    };

    // sameSite: null means "no_restriction" in Chrome extension API
    if (cookie.sameSite === "lax") details.sameSite = "lax";
    else if (cookie.sameSite === "strict") details.sameSite = "strict";
    else details.sameSite = "no_restriction";

    // Only set expirationDate for persistent cookies (session: false)
    // Session cookies must NOT have an expirationDate
    if (!cookie.session && cookie.expirationDate) {
      details.expirationDate = Math.floor(cookie.expirationDate);
    }

    await chrome.cookies.set(details).catch((err) => {
      console.warn(`[FlowAccess] Failed to set cookie ${cookie.name}:`, err);
    });
  }

  // Update cached user credits
  const cached = await chrome.storage.local.get(STORAGE_KEY_USER);
  if (cached[STORAGE_KEY_USER]) {
    cached[STORAGE_KEY_USER].creditsRemaining = creditsRemaining;
    await chrome.storage.local.set({ [STORAGE_KEY_USER]: cached[STORAGE_KEY_USER] });
  }

  return { success: true, cookiesInjected: cookies.length, creditsRemaining };
}

// ─── Navigation Listener ─────────────────────────────────────────────────────
// Auto-inject when user opens labs.google/fx/tools/flow
// justReloaded tracks tabs we reloaded ourselves — skip re-injection for those

const justReloaded = new Set();

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "loading") return;
  if (!tab.url?.includes("labs.google/fx/tools/flow")) return;

  // If we triggered this reload ourselves, skip to avoid infinite loop
  if (justReloaded.has(tabId)) {
    justReloaded.delete(tabId);
    return;
  }

  const disabledData = await chrome.storage.local.get(STORAGE_KEY_DISABLED);
  if (disabledData[STORAGE_KEY_DISABLED]) return;

  const token = await getToken();
  if (!token) return;

  // Inject fresh cookies to ensure correct account
  const result = await fetchAndInject(token, tabId);

  if (result.success) {
    // Mark this tab so the next load event (caused by our reload) is skipped
    justReloaded.add(tabId);
    setTimeout(() => {
      chrome.tabs.reload(tabId);
    }, 800);
  }
});

// ─── Message Handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {

      // Site bridge sends auth token auto-detected from FlowAccess site
      case "FA_AUTH_UPDATE": {
        const { token } = msg;
        if (!token) break;
        await setToken(token);
        const user = await fetchUserInfo(token);
        if (user) {
          await chrome.storage.local.set({ [STORAGE_KEY_USER]: user });
          sendResponse({ success: true, user });
        } else {
          sendResponse({ success: false });
        }
        break;
      }

      // Popup: get current status
      case "FA_GET_STATUS": {
        const token = await getToken();
        if (!token) {
          sendResponse({ loggedIn: false });
          break;
        }
        const user = await fetchUserInfo(token);
        if (!user) {
          await clearToken();
          sendResponse({ loggedIn: false });
          break;
        }
        await chrome.storage.local.set({ [STORAGE_KEY_USER]: user });
        sendResponse({ loggedIn: true, user });
        break;
      }

      // Popup: manual inject
      case "FA_INJECT": {
        const token = await getToken();
        if (!token) {
          sendResponse({ success: false, error: "Not connected" });
          break;
        }
        const result = await fetchAndInject(token, null);
        sendResponse(result);
        break;
      }

      // Popup: disconnect
      case "FA_LOGOUT": {
        await clearToken();
        sendResponse({ success: true });
        break;
      }

      // Content script: session check failed, try re-inject
      case "SESSION_NOT_ACTIVE": {
        const token = await getToken();
        if (!token) break;
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) await fetchAndInject(token, tabs[0].id);
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ error: "Unknown message type" });
    }
  })();

  return true; // Keep channel open for async response
});
