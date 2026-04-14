document.addEventListener("DOMContentLoaded", async () => {
  const config = await chrome.storage.local.get(["syncKey", "apiUrl", "lastSyncStatus", "lastSyncMessage", "lastSyncTime"]);

  if (config.apiUrl) document.getElementById("apiUrl").value = config.apiUrl;
  if (config.syncKey) document.getElementById("syncKey").value = config.syncKey;

  updateStatusUI(config);

  document.getElementById("saveBtn").addEventListener("click", () => {
    const syncKey = document.getElementById("syncKey").value.trim();
    const apiUrl = document.getElementById("apiUrl").value.trim();

    if (!syncKey || !apiUrl) {
      document.getElementById("statusText").textContent = "Fill both fields";
      document.getElementById("statusText").className = "value error";
      return;
    }

    document.getElementById("statusText").textContent = "Saving & syncing...";
    document.getElementById("statusText").className = "value warning";

    chrome.runtime.sendMessage({ type: "SAVE_CONFIG", syncKey, apiUrl }, async () => {
      const updated = await chrome.storage.local.get(["lastSyncStatus", "lastSyncMessage", "lastSyncTime"]);
      updateStatusUI(updated);
    });
  });

  document.getElementById("syncBtn").addEventListener("click", () => {
    document.getElementById("statusText").textContent = "Syncing...";
    document.getElementById("statusText").className = "value warning";

    chrome.runtime.sendMessage({ type: "SYNC_NOW" }, async () => {
      const updated = await chrome.storage.local.get(["lastSyncStatus", "lastSyncMessage", "lastSyncTime"]);
      updateStatusUI(updated);
    });
  });
});

function updateStatusUI(config) {
  const statusEl = document.getElementById("statusText");
  const timeEl = document.getElementById("lastSyncTime");
  const msgEl = document.getElementById("lastSyncMsg");

  if (config.lastSyncStatus) {
    const labels = { success: "OK", error: "Error", warning: "Warning" };
    statusEl.textContent = labels[config.lastSyncStatus] || config.lastSyncStatus;
    statusEl.className = "value " + config.lastSyncStatus;
  } else {
    statusEl.textContent = config.syncKey ? "Ready" : "Not configured";
    statusEl.className = "value idle";
  }

  if (config.lastSyncTime) {
    const ago = Math.round((Date.now() - config.lastSyncTime) / 60000);
    timeEl.textContent = ago < 1 ? "Just now" : ago + " min ago";
  } else {
    timeEl.textContent = "Never";
  }

  msgEl.textContent = config.lastSyncMessage || "—";
}
