// FlowAccess Extension — Persistent Lock v10.0
// Runs at document_start in MAIN world on labs.google
// Blocks signout while extension is active.
// When extension is removed: nukes ALL site data properly (waits for async ops)
// then reloads — equivalent to "Clear browsing data" for this site.

(function () {
  var extensionActive = true;
  var lastHeartbeat = Date.now();
  var STALE_THRESHOLD_MS = 4000;
  var cleanupStarted = false;

  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "FA_EXT_HEARTBEAT") {
      lastHeartbeat = Date.now();
      extensionActive = true;
    }
    if (e.data && e.data.type === "FA_EXT_REMOVED") {
      extensionActive = false;
      doCleanup();
    }
  });

  function nukeCookies() {
    try {
      var cookies = document.cookie.split(";");
      var paths = ["/", "/fx", "/fx/tools", "/fx/tools/flow", "/fx/api", "/fx/api/auth", "/fx/tools/flow/project"];
      var domains = ["labs.google", ".labs.google", ".google", ""];
      for (var i = 0; i < cookies.length; i++) {
        var name = cookies[i].split("=")[0].trim();
        if (!name) continue;
        for (var p = 0; p < paths.length; p++) {
          for (var d = 0; d < domains.length; d++) {
            var base = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + paths[p];
            if (domains[d]) base += ";domain=" + domains[d];
            document.cookie = base;
            document.cookie = base + ";secure";
            document.cookie = base + ";secure;samesite=none";
            document.cookie = base + ";samesite=lax";
          }
        }

        if (name.startsWith("__Host-")) {
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;secure";
        }
        if (name.startsWith("__Secure-")) {
          for (var p2 = 0; p2 < paths.length; p2++) {
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + paths[p2] + ";secure";
            for (var d2 = 0; d2 < domains.length; d2++) {
              if (domains[d2]) {
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + paths[p2] + ";domain=" + domains[d2] + ";secure";
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  function clearIndexedDBData(dbName) {
    return new Promise(function (resolve) {
      try {
        var req = indexedDB.open(dbName);
        req.onsuccess = function (e) {
          var db = e.target.result;
          try {
            var storeNames = Array.from(db.objectStoreNames);
            if (storeNames.length > 0) {
              var tx = db.transaction(storeNames, "readwrite");
              storeNames.forEach(function (name) {
                try { tx.objectStore(name).clear(); } catch (ex) {}
              });
              tx.oncomplete = function () { db.close(); resolve(); };
              tx.onerror = function () { db.close(); resolve(); };
              tx.onabort = function () { db.close(); resolve(); };
            } else {
              db.close();
              resolve();
            }
          } catch (ex) {
            try { db.close(); } catch (e2) {}
            resolve();
          }
        };
        req.onerror = function () { resolve(); };
        req.onblocked = function () { resolve(); };
      } catch (e) {
        resolve();
      }
    });
  }

  function nukeIndexedDB() {
    var knownDBs = [
      "firebaseLocalStorageDb",
      "firebase-heartbeat-database",
      "firebase-installations-database",
      "firebaseLocalStorage",
      "firebase-installations-store",
      "google-labs",
      "google-labs-db",
      "labs-db",
      "__sak",
      "idb-keyval",
      "keyval-store",
      "SCJSDB"
    ];

    var promises = knownDBs.map(function (name) {
      return clearIndexedDBData(name).then(function () {
        try { indexedDB.deleteDatabase(name); } catch (e) {}
      });
    });

    if (indexedDB.databases) {
      var listPromise = indexedDB.databases().then(function (dbs) {
        return Promise.all(dbs.map(function (db) {
          return clearIndexedDBData(db.name).then(function () {
            try { indexedDB.deleteDatabase(db.name); } catch (e) {}
          });
        }));
      }).catch(function () {});
      promises.push(listPromise);
    }

    return Promise.all(promises).catch(function () {});
  }

  function nukeCacheStorage() {
    if (!window.caches) return Promise.resolve();
    return caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        return caches.delete(name).catch(function () {});
      }));
    }).catch(function () {});
  }

  function nukeServiceWorkers() {
    if (!navigator.serviceWorker) return Promise.resolve();
    return navigator.serviceWorker.getRegistrations().then(function (regs) {
      return Promise.all(regs.map(function (reg) {
        return reg.unregister().catch(function () {});
      }));
    }).catch(function () {});
  }

  function doCleanup() {
    if (cleanupStarted) return;
    cleanupStarted = true;

    nukeCookies();
    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}

    var maxWait = new Promise(function (resolve) {
      setTimeout(resolve, 3000);
    });

    var cleanup = Promise.all([
      nukeIndexedDB(),
      nukeCacheStorage(),
      nukeServiceWorkers()
    ]);

    Promise.race([cleanup, maxWait]).then(function () {
      nukeCookies();
      try { localStorage.clear(); } catch (e) {}
      try { sessionStorage.clear(); } catch (e) {}
      window.location.replace("https://labs.google/fx/tools/flow");
    });
  }

  setInterval(function () {
    if (Date.now() - lastHeartbeat > STALE_THRESHOLD_MS) {
      extensionActive = false;
      doCleanup();
    }
  }, 1000);

  var origFetch = window.fetch;
  window.fetch = function () {
    var url = typeof arguments[0] === "string" ? arguments[0] : (arguments[0] && arguments[0].url) || "";
    if (url.indexOf("/auth/signout") !== -1 || url.indexOf("/api/auth/signout") !== -1) {
      if (extensionActive) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      }
    }
    return origFetch.apply(this, arguments);
  };

  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (typeof url === "string" && (url.indexOf("/auth/signout") !== -1 || url.indexOf("/api/auth/signout") !== -1)) {
      if (extensionActive) {
        url = "about:blank";
      }
    }
    return origOpen.apply(this, arguments);
  };
})();
