(function () {
    'use strict';

    var https = require("https");
    var electron = require("electron");
    var shell = electron.shell;

    var UpdateService = {
        DOWNLOAD_PAGE_URL: "https://pencil.evolus.vn/Downloads.html"
    };

    /**
     * Fetches the latest version metadata from the configured check URL.
     * @param {Function} callback (err, metadata)
     */
    UpdateService.fetchLatestVersion = function (callback) {
        var checkUrl = Config.get("updater.checkUrl", "https://raw.githubusercontent.com/evolus/pencil/master/version.json");
        try {
            var req = https.get(checkUrl, { timeout: 5000 }, function (res) {
                if (res.statusCode !== 200) {
                    res.resume();
                    return callback(new Error("HTTP " + res.statusCode));
                }
                var rawData = "";
                res.setEncoding("utf8");
                res.on("data", function (chunk) { rawData += chunk; });
                res.on("end", function () {
                    try {
                        var parsed = JSON.parse(rawData);
                        callback(null, parsed);
                    } catch (e) {
                        callback(e);
                    }
                });
            });
            req.on("error", function (err) {
                callback(err);
            });
            req.on("timeout", function () {
                req.abort();
                callback(new Error("Request timed out"));
            });
        } catch (e) {
            callback(e);
        }
    };

    /**
     * Checks for updates.
     * @param {Object} [options] - { manual: boolean }
     */
    UpdateService.checkForUpdates = function (options) {
        options = options || {};
        var isManual = !!options.manual;

        if (!isManual && !Config.get("updater.autoCheck", true)) {
            return;
        }

        UpdateService.fetchLatestVersion(function (err, remoteInfo) {
            if (err) {
                console.debug("Update check failed:", err.message);
                if (isManual) {
                    Dialog.alert("Unable to check for updates. Invalid version metadata received.");
                }
                return;
            }

            if (!remoteInfo || !remoteInfo.version) {
                console.debug("Invalid update metadata received:", remoteInfo);
                if (isManual) {
                    Dialog.alert("Unable to check for updates. Invalid version metadata received.");
                }
                return;
            }

            var currentVersion = (typeof pkgInfo !== "undefined" && pkgInfo.version) ? pkgInfo.version : "0.0.0";
            var isNewer = Util.compareVersion(remoteInfo.version, currentVersion) > 0;

            if (isNewer) {
                var dismissedVersion = Config.get("updater.dismissedVersion", "");
                // If the user already dismissed this specific version, do not notify on background check
                if (!isManual && dismissedVersion === remoteInfo.version) {
                    console.debug("Update available (v" + remoteInfo.version + ") but dismissed by user.");
                    return;
                }

                UpdateService.showNotification(remoteInfo);
            } else {
                if (isManual) {
                    Dialog.alert("You are using the latest version of Pencil (v" + currentVersion + ").");
                }
            }
        });
    };

    /**
     * Persists the dismissed version into Config so this version won't prompt again.
     * @param {string} version
     */
    UpdateService.dismissVersion = function (version) {
        Config.set("updater.dismissedVersion", version);
        console.debug("Version dismissed:", version);
    };

    /**
     * Opens the canonical download page in the system's default browser.
     */
    UpdateService.openDownloadPage = function () {
        shell.openExternal(UpdateService.DOWNLOAD_PAGE_URL);
    };

    /**
     * Displays a non-blocking notification using NotificationPopup.
     * @param {Object} remoteInfo
     */
    UpdateService.showNotification = function (remoteInfo) {
        var message = "A new version of Pencil (v" + remoteInfo.version + ") is available!";
        if (remoteInfo.notes) {
            message += "\n" + remoteInfo.notes;
        }

        NotificationPopup.show(
            message,
            "Download",
            function () {
                UpdateService.openDownloadPage();
            },
            "Dismiss",
            function () {
                UpdateService.dismissVersion(remoteInfo.version);
            },
            12000
        );
    };

    // Attach to global window scope and Node module scope if present
    if (typeof window !== "undefined") {
        window.UpdateService = UpdateService;
    }
    if (typeof global !== "undefined") {
        global.UpdateService = UpdateService;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UpdateService;
    }
})();
