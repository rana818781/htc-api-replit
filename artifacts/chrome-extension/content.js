// FlowAccess Content Script
// Runs on labs.google/fx/tools/flow
// Checks if Google account is active and signals background if not

function isSignedIn() {
  // Check for common Google account indicators in the DOM
  const indicators = [
    // Google account avatar/photo
    'img[aria-label*="Google Account"]',
    'img[data-noaft]',
    // Account menu button
    'a[aria-label*="Google Account"]',
    '[data-email]',
    // Profile picture elements
    '.gb_A', // Google bar account link
    '#gb_70',
    '#gbw',
  ];

  for (const selector of indicators) {
    if (document.querySelector(selector)) {
      return true;
    }
  }

  // Check for sign-in button (means NOT signed in)
  const signInButtons = [
    'a[href*="accounts.google.com/signin"]',
    'a[data-action="sign in"]',
    '.signin-button',
  ];
  for (const selector of signInButtons) {
    if (document.querySelector(selector)) {
      return false;
    }
  }

  // Check cookies for any Google auth cookies
  const cookies = document.cookie;
  if (cookies.includes("SID=") || cookies.includes("HSID=") || cookies.includes("SSID=")) {
    return true;
  }

  return null; // Unknown state
}

// Check after 3 seconds to let the page load
setTimeout(() => {
  const signedIn = isSignedIn();

  if (signedIn === false) {
    // Not signed in — notify background to re-inject
    chrome.runtime.sendMessage(
      { type: "SESSION_NOT_ACTIVE" },
      (response) => {
        if (chrome.runtime.lastError) {
          // Extension not available, ignore
        }
      }
    );
  }
}, 3000);

// Listen for RELOAD message from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "RELOAD") {
    window.location.reload();
  }
});
