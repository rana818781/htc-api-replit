(function () {
  var CHARGE_COOLDOWN_MS = 5000;
  var lastChargeTime = 0;
  var observerStarted = false;

  function isProjectPage() {
    return /labs\.google\/fx\/tools\/flow\/project\//.test(window.location.href);
  }

  function isVideoModeActive() {
    var promptContainer = document.querySelector(
      "[class*='prompt'], [class*='input-area'], [class*='composer'], [class*='bottom-bar']"
    );
    var searchArea = promptContainer || document.body;

    var allText = searchArea.querySelectorAll("span, div, p, button, [class*='chip'], [class*='badge'], [class*='tag'], [class*='label']");
    for (var i = 0; i < allText.length; i++) {
      var el = allText[i];
      var text = (el.textContent || "").trim();
      if (/^Video\s/.test(text) || text === "Video") {
        var rect = el.getBoundingClientRect();
        if (rect.bottom > window.innerHeight * 0.6) {
          return true;
        }
      }
    }

    var tabs = document.querySelectorAll("[role='tab']");
    for (var j = 0; j < tabs.length; j++) {
      var tab = tabs[j];
      var tabText = (tab.textContent || "").trim().toLowerCase();
      if (tabText === "video" && tab.getAttribute("aria-selected") === "true") {
        return true;
      }
    }

    return false;
  }

  function findSendButton(container) {
    var root = container || document.body;

    var ariaButtons = root.querySelectorAll(
      "button[aria-label='Send'], button[aria-label='send'], button[aria-label='Submit'], button[aria-label='Generate']"
    );
    if (ariaButtons.length > 0) return ariaButtons[ariaButtons.length - 1];

    var allButtons = root.querySelectorAll("button");
    var candidates = [];

    for (var i = 0; i < allButtons.length; i++) {
      var btn = allButtons[i];
      var rect = btn.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.width > 56 || rect.height > 56) continue;
      if (rect.bottom < window.innerHeight * 0.6) continue;

      var svg = btn.querySelector("svg");
      if (!svg) continue;

      var btnText = (btn.textContent || "").replace(/\s/g, "");
      if (btnText.length > 3) continue;

      candidates.push({ btn: btn, right: rect.right, bottom: rect.bottom });
    }

    if (candidates.length === 0) return null;

    candidates.sort(function (a, b) {
      return b.right - a.right || b.bottom - a.bottom;
    });

    return candidates[0].btn;
  }

  function chargeCredits() {
    var now = Date.now();
    if (now - lastChargeTime < CHARGE_COOLDOWN_MS) return;
    lastChargeTime = now;

    chrome.runtime.sendMessage({ type: "FA_CHARGE" }, function (resp) {
      if (chrome.runtime.lastError) return;
      if (resp && resp.success) {
        console.log("[FlowAccess] Charged 10 credits for video generation. Remaining:", resp.creditsRemaining);
      } else if (resp && resp.error) {
        console.warn("[FlowAccess] Charge failed:", resp.error);
      }
    });
  }

  function onSendClick(e) {
    if (!isProjectPage()) return;
    if (!isVideoModeActive()) return;
    chargeCredits();
  }

  var attachedButtons = new WeakSet();

  function attachSendListener() {
    if (!isProjectPage()) return;

    var sendBtn = findSendButton();
    if (!sendBtn) return;
    if (attachedButtons.has(sendBtn)) return;

    attachedButtons.add(sendBtn);
    sendBtn.addEventListener("click", onSendClick, true);
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;

    attachSendListener();

    var observer = new MutationObserver(function () {
      attachSendListener();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(startObserver, 2000);
    });
  } else {
    setTimeout(startObserver, 2000);
  }

  var lastUrl = location.href;
  setInterval(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      observerStarted = false;
      if (isProjectPage()) {
        setTimeout(startObserver, 2000);
      }
    }
  }, 1000);
})();
