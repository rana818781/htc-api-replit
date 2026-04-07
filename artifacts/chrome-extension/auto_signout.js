// FlowAccess Extension — Auto Signout Handler v3.0
// Runs on labs.google/fx/api/auth/signout (MAIN world)
// This script is only injected when the extension is installed.
// If user somehow hits the signout URL while extension is active, redirect back.
// When extension is removed, this script won't be injected — signout completes normally.

(function () {
  if (location.href.includes("/fx/api/auth/signout")) {
    history.replaceState(null, "", "/fx/tools/flow");
    location.href = "https://labs.google/fx/tools/flow";
  }
})();
