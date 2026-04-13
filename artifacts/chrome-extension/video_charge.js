(function () {
  var CHARGE_COOLDOWN_MS = 5000;
  var lastChargeTime = 0;
  var observerStarted = false;
  var currentObserver = null;

  function isProjectPage() {
    return /labs\.google\/fx\/tools\/flow\/project\//.test(window.location.href);
  }

  function getVideoMultiplier() {
    var allElements = document.querySelectorAll("span, div, button, [class*='chip'], [class*='badge'], [class*='tag']");
    for (var i = 0; i < allElements.length; i++) {
      var el = allElements[i];
      var text = (el.textContent || "").trim();

      var match = text.match(/Video\s*.*?x(\d)/i);
      if (match) {
        var rect = el.getBoundingClientRect();
        if (rect.bottom > window.innerHeight * 0.5 && rect.width > 0) {
          return parseInt(match[1], 10);
        }
      }
    }

    var tabs = document.querySelectorAll("[role='tab']");
    for (var j = 0; j < tabs.length; j++) {
      var tab = tabs[j];
      var tabText = (tab.textContent || "").trim().toLowerCase();
      if (tabText === "video" && tab.getAttribute("aria-selected") === "true") {
        var multiplierBtns = document.querySelectorAll("button");
        for (var k = 0; k < multiplierBtns.length; k++) {
          var mBtn = multiplierBtns[k];
          var mText = (mBtn.textContent || "").trim();
          var mMatch = mText.match(/^x(\d)$/);
          if (mMatch) {
            var style = window.getComputedStyle(mBtn);
            var bg = style.backgroundColor;
            if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
              var rgb = bg.match(/\d+/g);
              if (rgb) {
                var brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
                if (brightness > 100) {
                  return parseInt(mMatch[1], 10);
                }
              }
            }
          }
        }
        return 1;
      }
    }

    return 0;
  }

  function findSendButton() {
    var allButtons = document.querySelectorAll("button");
    for (var i = 0; i < allButtons.length; i++) {
      var btn = allButtons[i];
      var icon = btn.querySelector("i.google-symbols, i[class*='google-symbols']");
      if (icon && icon.textContent.trim() === "arrow_forward") {
        return btn;
      }
    }

    var ariaButtons = document.querySelectorAll(
      "button[aria-label='Send'], button[aria-label='send'], button[aria-label='Create'], button[aria-label='Generate']"
    );
    if (ariaButtons.length > 0) return ariaButtons[ariaButtons.length - 1];

    return null;
  }

  function chargeCredits(multiplier) {
    var now = Date.now();
    if (now - lastChargeTime < CHARGE_COOLDOWN_MS) return;
    lastChargeTime = now;

    var credits = multiplier * 10;

    chrome.runtime.sendMessage({ type: "FA_CHARGE", credits: credits }, function (resp) {
      if (chrome.runtime.lastError) return;
      if (resp && resp.success) {
        console.log("[FlowAccess] Charged " + resp.creditsCharged + " credits for video generation (x" + multiplier + "). Remaining: " + resp.creditsRemaining);
      } else if (resp && resp.error) {
        console.warn("[FlowAccess] Charge failed:", resp.error);
      }
    });
  }

  function onSendClick() {
    if (!isProjectPage()) return;
    var multiplier = getVideoMultiplier();
    if (multiplier > 0) {
      chargeCredits(multiplier);
    }
  }

  var attachedButtons = new WeakSet();

  function attachSendListener() {
    if (!isProjectPage()) return;

    var sendBtn = findSendButton();
    if (!sendBtn) return;
    if (attachedButtons.has(sendBtn)) return;

    attachedButtons.add(sendBtn);
    sendBtn.addEventListener("click", onSendClick, true);
    console.log("[FlowAccess] Send button detected and listener attached");
  }

  function stopObserver() {
    if (currentObserver) {
      currentObserver.disconnect();
      currentObserver = null;
    }
    observerStarted = false;
  }

  function startObserver() {
    if (observerStarted) return;
    if (!isProjectPage()) return;
    observerStarted = true;

    attachSendListener();

    currentObserver = new MutationObserver(function () {
      if (!isProjectPage()) {
        stopObserver();
        return;
      }
      attachSendListener();
    });

    currentObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("[FlowAccess] Video charge observer started on project page");
  }

  function checkAndStart() {
    if (isProjectPage()) {
      startObserver();
    } else {
      stopObserver();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(checkAndStart, 2000);
    });
  } else {
    setTimeout(checkAndStart, 2000);
  }

  var lastUrl = location.href;
  setInterval(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      stopObserver();
      if (isProjectPage()) {
        setTimeout(startObserver, 2000);
      }
    }
  }, 1000);
})();
