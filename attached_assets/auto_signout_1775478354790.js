// FlowAccess Extension — Auto Signout Handler v2.0
// Runs on labs.google/fx/api/auth/signout
// Redirects back to Google Flow instead of completing signout

(function () {
  // If user somehow hits the signout URL, redirect them back
  if (location.href.includes("/fx/api/auth/signout")) {
    history.replaceState(null, "", "/fx/tools/flow");
    location.href = "https://labs.google/fx/tools/flow";
  }
})();
