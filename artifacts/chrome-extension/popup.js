// Veo Flow API Extension — Popup Script v2.0

const SITE_URL = "https://veoflowapi.com";
const STORAGE_KEY_TOKEN = "fa_api_token";

function show(id) {
  ["loading-screen", "connect-screen", "status-screen"].forEach((s) => {
    document.getElementById(s).style.display = s === id ? (id === "loading-screen" ? "flex" : "block") : "none";
  });
}

function showError(msg) {
  const el = document.getElementById("error-msg");
  el.textContent = msg;
  el.style.display = "block";
}

function hideError() {
  document.getElementById("error-msg").style.display = "none";
}

function setUserUI(user) {
  const displayName = user.username || user.email || "?";
  const initials = displayName.slice(0, 2).toUpperCase();
  document.getElementById("user-avatar").textContent = initials;
  document.getElementById("user-name").textContent = displayName;
  document.getElementById("user-plan").textContent = user.planName || "Free";
  document.getElementById("credits-left").textContent = user.creditsRemaining ?? "—";
  document.getElementById("credits-total").textContent = user.creditsTotal ?? "—";

  const daysLeftText = document.getElementById("days-left-text");
  const expiryRow = document.getElementById("expiry-row");
  if (user.daysLeft !== null && user.daysLeft !== undefined && user.planExpiresAt) {
    daysLeftText.style.display = "block";
    daysLeftText.textContent = user.daysLeft + " days left";
    if (user.daysLeft <= 3) {
      daysLeftText.style.color = "#ef4444";
    } else if (user.daysLeft <= 7) {
      daysLeftText.style.color = "#f59e0b";
    } else {
      daysLeftText.style.color = "#22c55e";
    }

    expiryRow.style.display = "grid";
    const daysEl = document.getElementById("days-left");
    daysEl.textContent = user.daysLeft;
    daysEl.style.color = daysLeftText.style.color;
    const expDate = new Date(user.planExpiresAt);
    document.getElementById("expires-date").textContent = expDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } else {
    daysLeftText.style.display = "none";
    expiryRow.style.display = "none";
  }
}

async function checkFlowTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    const onFlow = tab?.url?.includes("labs.google/fx/tools/flow");
    const badge = document.getElementById("page-badge");
    const text = document.getElementById("page-text");
    if (onFlow) {
      badge.className = "flow-badge on-flow";
      text.textContent = "On Google Flow ✓";
    } else {
      badge.className = "flow-badge not-flow";
      text.textContent = "Not on Google Flow";
    }
    document.getElementById("inject-btn").style.display = onFlow ? "flex" : "none";
  } catch {}
}

async function init() {
  show("loading-screen");

  // Ask background for current status
  chrome.runtime.sendMessage({ type: "FA_GET_STATUS" }, (resp) => {
    if (chrome.runtime.lastError || !resp) {
      show("connect-screen");
      return;
    }

    if (resp.loggedIn && resp.user) {
      setUserUI(resp.user);
      show("status-screen");
      checkFlowTab();
    } else {
      show("connect-screen");
    }
  });
}

// Connect with token
document.getElementById("connect-btn").addEventListener("click", async () => {
  hideError();
  const token = document.getElementById("token-input").value.trim();
  if (!token) {
    showError("Please paste your API token.");
    return;
  }

  const btn = document.getElementById("connect-btn");
  btn.textContent = "Connecting...";
  btn.disabled = true;

  chrome.runtime.sendMessage({ type: "FA_AUTH_UPDATE", token }, (resp) => {
    btn.textContent = "Connect";
    btn.disabled = false;

    if (chrome.runtime.lastError || !resp?.success) {
      showError("Invalid token. Please check and try again.");
      return;
    }

    setUserUI(resp.user);
    show("status-screen");
    checkFlowTab();
  });
});

// Open Veo Flow API site
document.getElementById("open-site-btn").addEventListener("click", () => {
  chrome.tabs.create({ url: SITE_URL });
  window.close();
});

// Inject session manually
document.getElementById("inject-btn").addEventListener("click", async () => {
  const btn = document.getElementById("inject-btn");
  const ok = document.getElementById("inject-ok");
  btn.textContent = "Injecting...";
  btn.disabled = true;
  ok.style.display = "none";

  chrome.runtime.sendMessage({ type: "FA_INJECT" }, (resp) => {
    btn.textContent = "Re-inject API";
    btn.disabled = false;

    if (resp?.success) {
      ok.style.display = "block";
      if (resp.creditsRemaining !== undefined) {
        document.getElementById("credits-left").textContent = resp.creditsRemaining;
      }
      setTimeout(() => { ok.style.display = "none"; }, 3000);
    } else {
      showError(resp?.error || "Injection failed. Please try again.");
    }
  });
});

// Disconnect
document.getElementById("disconnect-btn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "FA_LOGOUT" }, () => {
    show("connect-screen");
  });
});

// Init on load
init();
