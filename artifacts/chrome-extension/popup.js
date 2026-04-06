// FlowAccess Popup Script

const FLOW_URL = "https://labs.google/fx/tools/flow";

const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const userInfoEl = document.getElementById("user-info");
const userEmailEl = document.getElementById("user-email");
const userCreditsEl = document.getElementById("user-credits");
const btnGenerate = document.getElementById("btn-generate");
const btnDisconnect = document.getElementById("btn-disconnect");
const tokenSection = document.getElementById("token-section");
const tokenInput = document.getElementById("token-input");
const btnConnect = document.getElementById("btn-connect");
const messageEl = document.getElementById("message");

function showMessage(text, type = "error") {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = "block";
  setTimeout(() => {
    messageEl.style.display = "none";
  }, 3000);
}

function setConnected(user) {
  statusDot.className = "status-dot connected";
  statusText.textContent = "Connected";
  userInfoEl.style.display = "block";
  userEmailEl.textContent = user.email;
  const noCredits = user.creditsRemaining <= 0;
  userCreditsEl.textContent = noCredits
    ? "No credits remaining — please upgrade"
    : `${user.creditsRemaining} credits remaining`;
  userCreditsEl.style.color = noCredits ? "#ef4444" : "#22c55e";
  btnGenerate.disabled = false;
  btnGenerate.title = noCredits ? "No credits — upgrade your plan to continue" : "";
  btnDisconnect.style.display = "block";
  tokenSection.style.display = "none";
}

function setDisconnected() {
  statusDot.className = "status-dot disconnected";
  statusText.textContent = "Not connected";
  userInfoEl.style.display = "none";
  btnGenerate.disabled = true;
  btnDisconnect.style.display = "none";
  tokenSection.style.display = "block";
}

// Check status on popup open
chrome.runtime.sendMessage({ type: "FA_GET_STATUS" }, (response) => {
  if (chrome.runtime.lastError || !response) {
    setDisconnected();
    return;
  }
  if (response.connected && response.user) {
    setConnected(response.user);
  } else {
    setDisconnected();
  }
});

// Generate Videos button
btnGenerate.addEventListener("click", async () => {
  btnGenerate.disabled = true;
  btnGenerate.textContent = "Injecting...";

  chrome.runtime.sendMessage({ type: "FA_INJECT" }, (response) => {
    if (chrome.runtime.lastError || !response?.success) {
      showMessage(response?.error || "Injection failed", "error");
      btnGenerate.disabled = false;
      btnGenerate.textContent = "Generate Videos";
      return;
    }

    // Open Google Flow in a new tab
    chrome.tabs.create({ url: FLOW_URL });
    window.close();
  });
});

// Disconnect button
btnDisconnect.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "FA_LOGOUT" }, () => {
    setDisconnected();
    showMessage("Disconnected successfully", "success");
  });
});

// Manual token connect
btnConnect.addEventListener("click", () => {
  const token = tokenInput.value.trim();
  if (!token) {
    showMessage("Please enter an API token", "error");
    return;
  }

  // Get the API base from storage or use a default
  chrome.storage.local.get("flowaccess_api_base", (result) => {
    const apiBase = result.flowaccess_api_base || "";
    chrome.runtime.sendMessage(
      { type: "FA_AUTH_UPDATE", token, apiBase },
      () => {
        // Verify the token works
        chrome.runtime.sendMessage({ type: "FA_GET_STATUS" }, (response) => {
          if (response?.connected && response.user) {
            setConnected(response.user);
            showMessage("Connected successfully!", "success");
          } else {
            showMessage("Invalid token or API unavailable", "error");
          }
        });
      }
    );
  });
});
