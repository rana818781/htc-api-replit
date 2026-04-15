const ALARM_NAME = "veo_cookie_sync";
const SYNC_INTERVAL_MINUTES = 2;
const GOOGLE_FLOW_DOMAIN = "labs.google";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: SYNC_INTERVAL_MINUTES });
  console.log("[SessionKeeper] Installed — sync every", SYNC_INTERVAL_MINUTES, "min");
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    syncCookies();
  }
});

async function syncCookies() {
  const config = await chrome.storage.local.get(["syncKey", "apiUrl"]);
  if (!config.syncKey || !config.apiUrl) {
    console.log("[SessionKeeper] Not configured — skipping sync");
    return;
  }

  try {
    const cookies = await chrome.cookies.getAll({ domain: GOOGLE_FLOW_DOMAIN });

    if (!cookies || cookies.length === 0) {
      console.log("[SessionKeeper] No cookies found for", GOOGLE_FLOW_DOMAIN);
      await updateStatus("warning", "No cookies found for " + GOOGLE_FLOW_DOMAIN);
      return;
    }

    const cookieArray = cookies.map((c) => ({
      domain: c.domain,
      name: c.name,
      value: c.value,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite === "unspecified" ? "no_restriction" : c.sameSite,
      expirationDate: c.expirationDate || undefined,
      hostOnly: c.hostOnly,
    }));

    const resp = await fetch(config.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        syncKey: config.syncKey,
        cookieData: JSON.stringify(cookieArray),
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      console.log("[SessionKeeper] Synced", cookieArray.length, "cookies for session:", data.label);
      await updateStatus("success", `Synced ${cookieArray.length} cookies`);
    } else {
      const err = await resp.json().catch(() => ({ error: "Unknown error" }));
      console.error("[SessionKeeper] Sync failed:", err.error);
      await updateStatus("error", err.error || "Sync failed");
    }
  } catch (e) {
    console.error("[SessionKeeper] Sync error:", e.message);
    await updateStatus("error", e.message);
  }
}

async function updateStatus(status, message) {
  await chrome.storage.local.set({
    lastSyncStatus: status,
    lastSyncMessage: message,
    lastSyncTime: Date.now(),
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SYNC_NOW") {
    syncCookies().then(() => sendResponse({ done: true }));
    return true;
  }
  if (msg.type === "SAVE_CONFIG") {
    chrome.storage.local.set({ syncKey: msg.syncKey, apiUrl: msg.apiUrl }, () => {
      syncCookies().then(() => sendResponse({ done: true }));
    });
    return true;
  }
});
