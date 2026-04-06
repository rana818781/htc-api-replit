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

  // Parse cookies — supports JSON array (EditThisCookie) or document.cookie string
  let cookies = [];
  const trimmed = cookieData.trim();
  if (trimmed.startsWith("[")) {
    // JSON array format (EditThisCookie / Cookie-Editor)
    try { cookies = JSON.parse(trimmed); } catch { cookies = []; }
  } else {
    // document.cookie string format: "name=value; name2=value2; ..."
    cookies = trimmed
      .split(";")
      .map((part) => {
        const idx = part.indexOf("=");
        if (idx === -1) return null;
        const name = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (!name) return null;
        // Infer secure from cookie name prefix
        const secure = name.startsWith("__Secure-") || name.startsWith("__Host-");
        return { name, value, secure, httpOnly: false, session: true, domain: "labs.google" };
      })
      .filter(Boolean);
  }

  // ── Step 1: Clear ALL existing labs.google cookies so the user's own
  //            account is fully logged out before injecting the session. ──────
  const existingCookies = await chrome.cookies.getAll({ domain: "labs.google" });
  for (const c of existingCookies) {
    const scheme = c.secure ? "https" : "http";
    const cookieDomain = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
    await chrome.cookies.remove({ url: `${scheme}://${cookieDomain}${c.path}`, name: c.name })
      .catch(() => {});
  }
  console.log(`[FlowAccess] Cleared ${existingCookies.length} existing labs.google cookies`);

  // ── Step 2: Inject each session cookie ──────────────────────────────────────
  for (const cookie of cookies) {
    const rawDomain = cookie.domain || "labs.google";
    const cleanDomain = rawDomain.startsWith(".") ? rawDomain.slice(1) : rawDomain;

    // Always use https:// — labs.google is HTTPS-only
    const cookieUrl = `https://${cleanDomain}`;

    const details = {
      url: cookieUrl,
      name: cookie.name,
      value: cookie.value,
      path: cookie.path || "/",
      secure: cookie.secure === true,
      httpOnly: cookie.httpOnly === true,
    };

    // __Host- prefix cookies MUST NOT have a domain attribute (Chrome requirement)
    // __Secure- prefix cookies can have domain but must be secure
    // All other cookies get their domain set
    if (!cookie.name.startsWith("__Host-")) {
      details.domain = rawDomain;
    }

    // sameSite: null → "no_restriction" in Chrome extension API
    if (cookie.sameSite === "lax") details.sameSite = "lax";
    else if (cookie.sameSite === "strict") details.sameSite = "strict";
    else details.sameSite = "no_restriction";

    // Only set expirationDate for persistent (non-session) cookies
    if (!cookie.session && cookie.expirationDate) {
      details.expirationDate = Math.floor(cookie.expirationDate);
    }

    const setCookieResult = await chrome.cookies.set(details).catch((err) => {
      console.warn(`[FlowAccess] Failed to set cookie "${cookie.name}":`, err?.message || err);
      return null;
    });

    if (setCookieResult) {
      console.log(`[FlowAccess] Set cookie: ${cookie.name}`);
    }
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
// Auto-inject when user opens labs.google/fx/tools/flow.
// Uses chrome.storage.session (survives service-worker restarts) to track which
// tabs we already reloaded, preventing an infinite reload loop.

const SKIP_PREFIX = "fa_skip_tab_";

async function markSkip(tabId) {
  await chrome.storage.session.set({ [`${SKIP_PREFIX}${tabId}`]: Date.now() });
}

async function shouldSkip(tabId) {
  const key = `${SKIP_PREFIX}${tabId}`;
  const data = await chrome.storage.session.get(key);
  const ts = data[key];
  if (!ts) return false;
  // Only skip for 15 seconds — after that allow fresh injection
  if (Date.now() - ts < 15000) return true;
  await chrome.storage.session.remove(key);
  return false;
}

async function clearSkip(tabId) {
  await chrome.storage.session.remove(`${SKIP_PREFIX}${tabId}`);
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "loading") return;
  if (!tab.url?.includes("labs.google/fx/tools/flow")) return;

  // Skip this load — we triggered it ourselves to apply the injected cookies
  if (await shouldSkip(tabId)) {
    await clearSkip(tabId);
    return;
  }

  const disabledData = await chrome.storage.local.get(STORAGE_KEY_DISABLED);
  if (disabledData[STORAGE_KEY_DISABLED]) return;

  const token = await getToken();
  if (!token) return;

  const result = await fetchAndInject(token, tabId);

  if (result.success) {
    // Mark this tab before reloading so the next load event is skipped
    await markSkip(tabId);
    setTimeout(() => chrome.tabs.reload(tabId), 800);
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
