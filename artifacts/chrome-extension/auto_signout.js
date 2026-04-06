// FlowAccess Auto Sign-out Prevention
// Runs on Google logout URLs to redirect back to Google Flow
// instead of completing the sign-out

(function () {
  const currentUrl = window.location.href;

  // Check if this is a Google logout page
  if (
    currentUrl.includes("accounts.google.com/logout") ||
    currentUrl.includes("accounts.google.com/ServiceLogin") ||
    currentUrl.includes("accounts.google.com/o/oauth2/logout")
  ) {
    // Redirect back to Google Flow
    window.location.replace("https://labs.google/fx/tools/flow");
  }
})();
