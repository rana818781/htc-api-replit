// FlowAccess Extension — Background Service Worker v4.0
// Session injection into labs.google — short-lived cookies, auto-expiry on removal

const API_BASE = "https://ultraflow.replit.app";
const STORAGE_KEY_TOKEN = "fa_api_token";
const STORAGE_KEY_USER = "fa_user";
const STORAGE_KEY_DISABLED = "fa_disabled";
const STORAGE_KEY_COOKIES = "fa_cached_cookies";
const SKIP_PREFIX = "fa_skip_";
const ALARM_REFRESH = "fa_session_refresh";
const ALARM_KEEPALIVE = "fa_cookie_keepalive";
const SKIP_DURATION_MS = 60000;
const COOKIE_LIFETIME_SECS = 180;

async function getToken() {
  const data = await chrome.storage.local.get(STORAGE_KEY_TOKEN);
  return data[STORAGE_KEY_TOKEN] ?? null;
}

async function setToken(token) {
  await chrome.storage.local.set({ [STORAGE_KEY_TOKEN]: token });
}

async function clearToken() {
  await chrome.storage.local.remove([STORAGE_KEY_TOKEN, STORAGE_KEY_USER, STORAGE_KEY_COOKIES]);
}

async function markSkip(tabId) {
  await chrome.storage.session.set({ [`${SKIP_PREFIX}${tabId}`]: Date.now() });
}

async function isSkipped(tabId) {
  const key = `${SKIP_PREFIX}${tabId}`;
  const data = await chrome.storage.session.get(key);
  const ts = data[key];
  if (!ts) return false;
  if (Date.now() - ts < SKIP_DURATION_MS) return true;
  await chrome.storage.session.remove(key);
  return false;
}

async function injectCookiesFromList(cookies) {
  const existing = await chrome.cookies.getAll({ domain: "labs.google" });
  for (const c of existing) {
    const scheme = c.secure ? "https" : "http";
    const domain = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
    await chrome.cookies.remove({ url: `${scheme}://${domain}${c.path}`, name: c.name }).catch(() => {});
  }

  const expiry = Math.floor(Date.now() / 1000) + COOKIE_LIFETIME_SECS;

  for (const cookie of cookies) {
    const rawDomain = cookie.domain || "labs.google";
    const cleanDomain = rawDomain.startsWith(".") ? rawDomain.slice(1) : rawDomain;
    const cookieUrl = `https://${cleanDomain}`;

    const details = {
      url: cookieUrl,
      name: cookie.name,
      value: cookie.value,
      path: cookie.path || "/",
      secure: cookie.secure === true,
      httpOnly: cookie.httpOnly === true,
      expirationDate: expiry,
    };

    if (!cookie.name.startsWith("__Host-")) {
      details.domain = rawDomain;
    }

    if (cookie.sameSite === "lax") details.sameSite = "lax";
    else if (cookie.sameSite === "strict") details.sameSite = "strict";
    else details.sameSite = "no_restriction";

    await chrome.cookies.set(details).catch((err) => {
      console.warn(`[FlowAccess] Cookie set failed "${cookie.name}":`, err?.message || err);
    });
  }

  return cookies.length;
}

async function fetchAndInject(token) {
  const res = await fetch(`${API_BASE}/api/extension/inject`, {
    method: "POST",
    headers: { "X-API-Token": token, "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    return { success: false, error: err.error || "Injection failed" };
  }

  const { cookieData, creditsRemaining } = await res.json();

  let cookies = [];
  const trimmed = (cookieData || "").trim();
  if (trimmed.startsWith("[")) {
    try { cookies = JSON.parse(trimmed); } catch { cookies = []; }
  } else {
    cookies = trimmed.split(";").map((part) => {
      const idx = part.indexOf("=");
      if (idx === -1) return null;
      const name = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (!name) return null;
      const secure = name.startsWith("__Secure-") || name.startsWith("__Host-");
      return { name, value, secure, httpOnly: false, session: true, domain: "labs.google" };
    }).filter(Boolean);
  }

  await chrome.storage.local.set({ [STORAGE_KEY_COOKIES]: JSON.stringify(cookies) });

  const count = await injectCookiesFromList(cookies);
  console.log(`[FlowAccess] Injected ${count} cookies (${COOKIE_LIFETIME_SECS}s lifetime)`);

  const cached = await chrome.storage.local.get(STORAGE_KEY_USER);
  if (cached[STORAGE_KEY_USER]) {
    cached[STORAGE_KEY_USER].creditsRemaining = creditsRemaining;
    await chrome.storage.local.set({ [STORAGE_KEY_USER]: cached[STORAGE_KEY_USER] });
  }

  return { success: true, cookiesInjected: count, creditsRemaining };
}

async function refreshCookiesFromCache() {
  const data = await chrome.storage.local.get(STORAGE_KEY_COOKIES);
  const raw = data[STORAGE_KEY_COOKIES];
  if (!raw) return;

  let cookies;
  try { cookies = JSON.parse(raw); } catch { return; }
  if (!cookies || !cookies.length) return;

  const expiry = Math.floor(Date.now() / 1000) + COOKIE_LIFETIME_SECS;

  for (const cookie of cookies) {
    const rawDomain = cookie.domain || "labs.google";
    const cleanDomain = rawDomain.startsWith(".") ? rawDomain.slice(1) : rawDomain;
    const cookieUrl = `https://${cleanDomain}`;

    const details = {
      url: cookieUrl,
      name: cookie.name,
      value: cookie.value,
      path: cookie.path || "/",
      secure: cookie.secure === true,
      httpOnly: cookie.httpOnly === true,
      expirationDate: expiry,
    };

    if (!cookie.name.startsWith("__Host-")) {
      details.domain = rawDomain;
    }

    if (cookie.sameSite === "lax") details.sameSite = "lax";
    else if (cookie.sameSite === "strict") details.sameSite = "strict";
    else details.sameSite = "no_restriction";

    await chrome.cookies.set(details).catch(() => {});
  }

  console.log(`[FlowAccess] Refreshed ${cookies.length} cookies (${COOKIE_LIFETIME_SECS}s lifetime)`);
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!tab.url?.includes("labs.google/fx/tools/flow")) return;

  if (await isSkipped(tabId)) {
    console.log(`[FlowAccess] Skipping tab ${tabId} (already injected)`);
    return;
  }

  const disabledData = await chrome.storage.local.get(STORAGE_KEY_DISABLED);
  if (disabledData[STORAGE_KEY_DISABLED]) return;

  const token = await getToken();
  if (!token) return;

  const result = await fetchAndInject(token);

  if (result.success) {
    await markSkip(tabId);
    setTimeout(() => chrome.tabs.reload(tabId), 500);
  }
});

chrome.alarms.create(ALARM_REFRESH, { periodInMinutes: 25 });
chrome.alarms.create(ALARM_KEEPALIVE, { periodInMinutes: 2 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_KEEPALIVE) {
    const token = await getToken();
    if (!token) return;
    const disabledData = await chrome.storage.local.get(STORAGE_KEY_DISABLED);
    if (disabledData[STORAGE_KEY_DISABLED]) return;
    await refreshCookiesFromCache();
    return;
  }

  if (alarm.name === ALARM_REFRESH) {
    const token = await getToken();
    if (!token) return;
    const disabledData = await chrome.storage.local.get(STORAGE_KEY_DISABLED);
    if (disabledData[STORAGE_KEY_DISABLED]) return;

    const tabs = await chrome.tabs.query({ url: "https://labs.google/fx/tools/flow*" });
    for (const tab of tabs) {
      const result = await fetchAndInject(token);
      if (result.success) {
        await markSkip(tab.id);
        chrome.tabs.reload(tab.id);
      }
    }
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case "FA_PING": {
        sendResponse({ alive: true });
        break;
      }

      case "FA_AUTH_UPDATE": {
        const { token } = msg;
        if (!token) { sendResponse({ success: false }); break; }
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

      case "FA_GET_STATUS": {
        const token = await getToken();
        if (!token) { sendResponse({ loggedIn: false }); break; }
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

      case "FA_INJECT": {
        const token = await getToken();
        if (!token) { sendResponse({ success: false, error: "Not connected" }); break; }
        const result = await fetchAndInject(token);
        sendResponse(result);
        break;
      }

      case "FA_LOGOUT": {
        await clearToken();
        sendResponse({ success: true });
        break;
      }

      default:
        sendResponse({ error: "Unknown message type" });
    }
  })();
  return true;
});

async function fetchUserInfo(token) {
  const res = await fetch(`${API_BASE}/api/extension/me`, {
    headers: { "X-API-Token": token },
  });
  if (!res.ok) return null;
  return res.json();
}
