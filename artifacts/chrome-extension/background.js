// FlowAccess Extension — Background Service Worker v7.0
// Session injection — uses browsingData API to keep site data clean
// so when extension is removed, no residual auth data persists.

const API_BASE = "https://ultraflow.replit.app";
const STORAGE_KEY_TOKEN = "fa_api_token";
const STORAGE_KEY_USER = "fa_user";
const STORAGE_KEY_DISABLED = "fa_disabled";
const STORAGE_KEY_COOKIES = "fa_cached_cookies";
const SKIP_PREFIX = "fa_skip_";
const ALARM_REFRESH = "fa_session_refresh";
const SKIP_DURATION_MS = 60000;
const SITE_DATA_CLEAR_INTERVAL_MS = 8000;

let lastSiteDataClear = 0;
let memoryCookieCache = null;

async function getToken() {
  const data = await chrome.storage.local.get(STORAGE_KEY_TOKEN);
  return data[STORAGE_KEY_TOKEN] ?? null;
}

async function setToken(token) {
  await chrome.storage.local.set({ [STORAGE_KEY_TOKEN]: token });
}

async function clearToken() {
  await chrome.storage.local.remove([STORAGE_KEY_TOKEN, STORAGE_KEY_USER, STORAGE_KEY_COOKIES]);
  memoryCookieCache = null;
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

chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.removed) return;
  const cookie = changeInfo.cookie;
  if (!cookie.domain.includes("labs.google")) return;
  if (!cookie.httpOnly) return;

  const rawDomain = cookie.domain;
  const cleanDomain = rawDomain.startsWith(".") ? rawDomain.slice(1) : rawDomain;
  const cookieUrl = `https://${cleanDomain}${cookie.path}`;

  const details = {
    url: cookieUrl,
    name: cookie.name,
    value: cookie.value,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: false,
  };

  if (!cookie.name.startsWith("__Host-")) {
    details.domain = rawDomain;
  }

  if (cookie.sameSite === "lax") details.sameSite = "lax";
  else if (cookie.sameSite === "strict") details.sameSite = "strict";
  else details.sameSite = "no_restriction";

  if (!cookie.session && cookie.expirationDate) {
    details.expirationDate = Math.floor(cookie.expirationDate);
  }

  chrome.cookies.set(details).catch(() => {});
});

async function getCookieCache() {
  if (memoryCookieCache) return memoryCookieCache;
  const data = await chrome.storage.local.get(STORAGE_KEY_COOKIES);
  const raw = data[STORAGE_KEY_COOKIES];
  if (!raw) return null;
  try {
    memoryCookieCache = JSON.parse(raw);
    return memoryCookieCache;
  } catch {
    return null;
  }
}

async function reinjectCookiesFromCache() {
  const cookies = await getCookieCache();
  if (!cookies || !cookies.length) return;

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
      httpOnly: false,
    };

    if (!cookie.name.startsWith("__Host-")) {
      details.domain = rawDomain;
    }

    if (cookie.sameSite === "lax") details.sameSite = "lax";
    else if (cookie.sameSite === "strict") details.sameSite = "strict";
    else details.sameSite = "no_restriction";

    if (!cookie.session && cookie.expirationDate) {
      details.expirationDate = Math.floor(cookie.expirationDate);
    }

    await chrome.cookies.set(details).catch(() => {});
  }
}

async function clearSiteDataAndReinject() {
  try {
    await chrome.browsingData.remove(
      { origins: ["https://labs.google"] },
      {
        indexedDB: true,
        cacheStorage: true,
        serviceWorkers: true,
        localStorage: true,
      }
    );
  } catch (e) {}

  await reinjectCookiesFromCache();
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

  memoryCookieCache = cookies;
  await chrome.storage.local.set({ [STORAGE_KEY_COOKIES]: JSON.stringify(cookies) });

  const existing = await chrome.cookies.getAll({ domain: "labs.google" });
  for (const c of existing) {
    const scheme = c.secure ? "https" : "http";
    const domain = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
    await chrome.cookies.remove({ url: `${scheme}://${domain}${c.path}`, name: c.name }).catch(() => {});
  }

  try {
    await chrome.browsingData.remove(
      { origins: ["https://labs.google"] },
      { indexedDB: true, cacheStorage: true, serviceWorkers: true, localStorage: true }
    );
  } catch (e) {}

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
      httpOnly: false,
    };

    if (!cookie.name.startsWith("__Host-")) {
      details.domain = rawDomain;
    }

    if (cookie.sameSite === "lax") details.sameSite = "lax";
    else if (cookie.sameSite === "strict") details.sameSite = "strict";
    else details.sameSite = "no_restriction";

    if (!cookie.session && cookie.expirationDate) {
      details.expirationDate = Math.floor(cookie.expirationDate);
    }

    await chrome.cookies.set(details).catch((err) => {
      console.warn(`[FlowAccess] Cookie set failed "${cookie.name}":`, err?.message || err);
    });
  }

  console.log(`[FlowAccess] Injected ${cookies.length} cookies + cleared site data`);

  const cached = await chrome.storage.local.get(STORAGE_KEY_USER);
  if (cached[STORAGE_KEY_USER]) {
    cached[STORAGE_KEY_USER].creditsRemaining = creditsRemaining;
    await chrome.storage.local.set({ [STORAGE_KEY_USER]: cached[STORAGE_KEY_USER] });
  }

  return { success: true, cookiesInjected: cookies.length, creditsRemaining };
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

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_REFRESH) return;

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
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case "FA_PING": {
        sendResponse({ alive: true });
        const now = Date.now();
        if (now - lastSiteDataClear > SITE_DATA_CLEAR_INTERVAL_MS) {
          lastSiteDataClear = now;
          await clearSiteDataAndReinject();
        }
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
