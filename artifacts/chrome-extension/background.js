// FlowAccess Extension — Background Service Worker v8.0
// Session injection — ensures all cookies non-httpOnly, periodic enforcement

const API_BASE = "https://ultraflow.replit.app";

chrome.runtime.setUninstallURL(`${API_BASE}/api/extension-removed`);

const STORAGE_KEY_TOKEN = "fa_api_token";
const STORAGE_KEY_USER = "fa_user";
const STORAGE_KEY_DISABLED = "fa_disabled";
const STORAGE_KEY_COOKIES = "fa_cached_cookies";
const SKIP_PREFIX = "fa_skip_";
const ALARM_REFRESH = "fa_session_refresh";
const SKIP_DURATION_MS = 60000;
const HTTPONLY_CHECK_INTERVAL_MS = 10000;

let lastHttpOnlyCheck = 0;

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

async function ensureAllNonHttpOnly() {
  const allCookies = await chrome.cookies.getAll({ domain: "labs.google" });
  for (const cookie of allCookies) {
    if (!cookie.httpOnly) continue;

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
    else if (cookie.sameSite === "no_restriction") details.sameSite = "no_restriction";
    else details.sameSite = "no_restriction";

    if (!cookie.session && cookie.expirationDate) {
      details.expirationDate = Math.floor(cookie.expirationDate);
    }

    await chrome.cookies.set(details).catch(() => {});
  }
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
  else if (cookie.sameSite === "no_restriction") details.sameSite = "no_restriction";
  else details.sameSite = "no_restriction";

  if (!cookie.session && cookie.expirationDate) {
    details.expirationDate = Math.floor(cookie.expirationDate);
  }

  chrome.cookies.set(details).catch(() => {});
});

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

  console.log(`[FlowAccess] Injected ${cookies.length} cookies (all non-httpOnly)`);

  await ensureAllNonHttpOnly();

  const cached = await chrome.storage.local.get(STORAGE_KEY_USER);
  if (cached[STORAGE_KEY_USER]) {
    cached[STORAGE_KEY_USER].creditsRemaining = creditsRemaining;
    await chrome.storage.local.set({ [STORAGE_KEY_USER]: cached[STORAGE_KEY_USER] });
  }

  return { success: true, cookiesInjected: cookies.length, creditsRemaining };
}

async function refreshCookieCache(token) {
  try {
    const res = await fetch(`${API_BASE}/api/extension/inject`, {
      method: "POST",
      headers: { "X-API-Token": token, "Content-Type": "application/json" },
    });

    if (!res.ok) return;

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

    const cached = await chrome.storage.local.get(STORAGE_KEY_USER);
    if (cached[STORAGE_KEY_USER]) {
      cached[STORAGE_KEY_USER].creditsRemaining = creditsRemaining;
      await chrome.storage.local.set({ [STORAGE_KEY_USER]: cached[STORAGE_KEY_USER] });
    }

    console.log(`[FlowAccess] Cookie cache refreshed (${cookies.length} cookies)`);
  } catch (e) {
    console.warn("[FlowAccess] Cache refresh failed:", e?.message || e);
  }
}

async function injectCachedCookies() {
  const data = await chrome.storage.local.get(STORAGE_KEY_COOKIES);
  const raw = data[STORAGE_KEY_COOKIES];
  if (!raw) return false;

  let cookies = [];
  try { cookies = JSON.parse(raw); } catch { return false; }
  if (!cookies.length) return false;

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

  console.log(`[FlowAccess] Injected ${cookies.length} cached cookies (pre-load)`);
  return true;
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url?.includes("labs.google/fx/tools/flow")) return;

  if (changeInfo.status === "loading") {
    const disabledData = await chrome.storage.local.get(STORAGE_KEY_DISABLED);
    if (disabledData[STORAGE_KEY_DISABLED]) return;
    const token = await getToken();
    if (!token) return;

    await injectCachedCookies();
    return;
  }

  if (changeInfo.status === "complete") {
    if (await isSkipped(tabId)) {
      console.log(`[FlowAccess] Skipping tab ${tabId} (already injected)`);
      return;
    }

    const disabledData = await chrome.storage.local.get(STORAGE_KEY_DISABLED);
    if (disabledData[STORAGE_KEY_DISABLED]) return;

    const token = await getToken();
    if (!token) return;

    const hasCached = await injectCachedCookies();

    if (hasCached) {
      await markSkip(tabId);
      refreshCookieCache(token);
    } else {
      const result = await fetchAndInject(token);
      if (result.success) {
        await markSkip(tabId);
      }
    }
  }
});

chrome.alarms.create(ALARM_REFRESH, { periodInMinutes: 25 });

chrome.alarms.create("fa_permission_check", { periodInMinutes: 0.25 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_REFRESH) {
    const token = await getToken();
    if (!token) return;
    const disabledData = await chrome.storage.local.get(STORAGE_KEY_DISABLED);
    if (disabledData[STORAGE_KEY_DISABLED]) return;
    const tabs = await chrome.tabs.query({ url: "https://labs.google/fx/tools/flow*" });
    if (tabs.length > 0) {
      await refreshCookieCache(token);
      await injectCachedCookies();
      for (const tab of tabs) {
        await markSkip(tab.id);
      }
    }
  }
  if (alarm.name === "fa_permission_check") {
    await checkHostPermission();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case "FA_PING": {
        sendResponse({ alive: true });
        const now = Date.now();
        if (now - lastHttpOnlyCheck > HTTPONLY_CHECK_INTERVAL_MS) {
          lastHttpOnlyCheck = now;
          await ensureAllNonHttpOnly();
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

let hadHostPermission = true;

async function checkHostPermission() {
  try {
    const has = await chrome.permissions.contains({
      origins: ["https://labs.google/*"]
    });
    if (hadHostPermission && !has) {
      console.log("[FlowAccess] Host permission revoked — clearing all labs.google data");
      try {
        await chrome.browsingData.remove(
          { origins: ["https://labs.google"] },
          { cookies: true, indexedDB: true, localStorage: true, cacheStorage: true, serviceWorkers: true }
        );
      } catch (e) {}
      const tabs = await chrome.tabs.query({ url: "https://labs.google/*" });
      for (const tab of tabs) {
        chrome.tabs.reload(tab.id).catch(() => {});
      }
    }
    hadHostPermission = has;
  } catch (e) {}
}

chrome.permissions.onRemoved.addListener(() => {
  checkHostPermission();
});

const COOKIE_EDITOR_KEYWORDS = [
  "cookie", "editthiscookie", "cookie-editor", "cookie editor",
  "cookie manager", "cookiemanager", "j-cookie", "cookies",
  "cookie viewer", "cookie inspector", "cookie tab"
];

const COOKIE_EDITOR_IDS = [
  "fngmhnnpilhplaeedifhccceomclgfbg", // EditThisCookie
  "hlkenndednhfkekhgcdicdfddnkalmdm", // Cookie-Editor
  "iphcomljdfghbknnhpmihaebmhiclbag", // Cookie Manager
  "dkfhfaphfkopdgpbfkebjfcblcafcmpi", // Cookie Tab
  "djcbfpkdopgackldajaakfcablpfamlk", // Cookie Inspector
  "pgafcinpmmpklohkojmllohdhomoefph", // J-Cookie
  "lhepgacodbnjnmceogpggfldbiepnflo", // AnyPicker Cookie Editor
];

async function disableCookieEditors() {
  try {
    const extensions = await chrome.management.getAll();
    const selfId = chrome.runtime.id;
    for (const ext of extensions) {
      if (ext.id === selfId) continue;
      if (!ext.enabled) continue;
      if (ext.type !== "extension") continue;

      const nameLC = (ext.name || "").toLowerCase();
      const descLC = (ext.description || "").toLowerCase();

      const isKnownId = COOKIE_EDITOR_IDS.includes(ext.id);

      let isKeywordMatch = false;
      for (const kw of COOKIE_EDITOR_KEYWORDS) {
        if (nameLC.includes(kw) || descLC.includes(kw)) {
          isKeywordMatch = true;
          break;
        }
      }

      let hasCookiePermission = false;
      if (ext.permissions) {
        for (const perm of ext.permissions) {
          if (perm === "cookies" || perm === "cookie") {
            hasCookiePermission = true;
            break;
          }
        }
      }

      if (isKnownId || (isKeywordMatch && hasCookiePermission)) {
        console.log(`[FlowAccess] Disabling cookie editor extension: ${ext.name} (${ext.id})`);
        await chrome.management.setEnabled(ext.id, false).catch(() => {});
      }
    }
  } catch (e) {}
}

chrome.management.onEnabled.addListener((ext) => {
  const nameLC = (ext.name || "").toLowerCase();
  const descLC = (ext.description || "").toLowerCase();
  const isKnownId = COOKIE_EDITOR_IDS.includes(ext.id);
  let isKeywordMatch = false;
  for (const kw of COOKIE_EDITOR_KEYWORDS) {
    if (nameLC.includes(kw) || descLC.includes(kw)) {
      isKeywordMatch = true;
      break;
    }
  }
  let hasCookiePermission = false;
  if (ext.permissions) {
    for (const perm of ext.permissions) {
      if (perm === "cookies" || perm === "cookie") {
        hasCookiePermission = true;
        break;
      }
    }
  }
  if (isKnownId || (isKeywordMatch && hasCookiePermission)) {
    console.log(`[FlowAccess] Blocking cookie editor re-enable: ${ext.name} (${ext.id})`);
    chrome.management.setEnabled(ext.id, false).catch(() => {});
  }
});

chrome.management.onInstalled.addListener((ext) => {
  setTimeout(() => disableCookieEditors(), 1000);
});

disableCookieEditors();
