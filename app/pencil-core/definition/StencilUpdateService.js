(function () {
    'use strict';

    var fs = require("fs");
    var http = require("http");
    var https = require("https");
    var crypto = require("crypto");

    var StencilUpdateService = {};

    /**
     * Fetches the repository XML text from a given URL (HTTP, HTTPS, or local file).
     * @param {string} repoUrl
     * @param {Function} callback (err, xmlText)
     */
    StencilUpdateService.fetchRepositoryXml = function (repoUrl, callback) {
        if (!repoUrl) {
            return callback(new Error("Empty repository URL"));
        }

        if (repoUrl.indexOf("file://") === 0 || repoUrl.indexOf("/") === 0 || repoUrl.indexOf("./") === 0) {
            var filePath = repoUrl.indexOf("file://") === 0 ? repoUrl.substring(7) : repoUrl;
            fs.readFile(filePath, "utf8", function (err, data) {
                if (err) {
                    return callback(err);
                }
                callback(null, data);
            });
            return;
        }

        var client = repoUrl.indexOf("https:") === 0 ? https : http;
        try {
            var req = client.get(repoUrl, { timeout: 8000 }, function (res) {
                if (res.statusCode !== 200) {
                    res.resume();
                    return callback(new Error("HTTP " + res.statusCode));
                }
                var rawData = "";
                res.setEncoding("utf8");
                res.on("data", function (chunk) { rawData += chunk; });
                res.on("end", function () {
                    callback(null, rawData);
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
     * Parses the repository XML string into a structured list of collections and metadata.
     * @param {string} xmlString
     * @returns {{ collections: Array, metadata: Object }}
     */
    StencilUpdateService.parseRepositoryXml = function (xmlString) {
        var parser = (typeof DOMParser !== "undefined") ? new DOMParser() : new (require("@xmldom/xmldom").DOMParser)();
        var dom = parser.parseFromString(xmlString, "text/xml");
        var root = dom.documentElement;
        if (!root) {
            return { collections: [], metadata: {} };
        }

        var _camelCase = (typeof _ !== "undefined" && _.camelCase) ? _.camelCase : function (str) {
            return str.replace(/[-_]([a-z])/g, function (g) { return g[1].toUpperCase(); });
        };

        var metadata = {};
        var collections = [];

        for (var i = 0; i < root.childNodes.length; i++) {
            var child = root.childNodes[i];
            if (child.nodeType !== 1) continue;

            var tag = child.localName || child.nodeName;
            if (tag === "metadata") {
                for (var m = 0; m < child.childNodes.length; m++) {
                    var mNode = child.childNodes[m];
                    if (mNode.nodeType === 1) {
                        var mKey = mNode.localName || mNode.nodeName;
                        metadata[mKey] = (mNode.textContent || "").trim();
                    }
                }
            } else if (tag === "Collection" || tag === "collection") {
                var minVersion = child.getAttribute("required-version");
                if (minVersion && typeof pkgInfo !== "undefined" && pkgInfo.version) {
                    if (Util.compareVersion(pkgInfo.version, minVersion) < 0) {
                        continue;
                    }
                }
                var col = {};
                for (var p = 0; p < child.childNodes.length; p++) {
                    var prop = child.childNodes[p];
                    if (prop.nodeType === 1) {
                        var propKey = _camelCase(prop.localName || prop.nodeName);
                        col[propKey] = (prop.textContent || "").trim();
                    }
                }
                if (col.id) {
                    collections.push(col);
                }
            }
        }

        return {
            collections: collections,
            metadata: metadata
        };
    };

    /**
     * Computes a deterministic fingerprint string based on the collections and metadata.
     * @param {Array} collections
     * @param {Object} metadata
     * @returns {string}
     */
    StencilUpdateService.computeFingerprint = function (collections, metadata) {
        var tokens = [];
        if (metadata && metadata.updated) {
            tokens.push("meta:" + metadata.updated);
        }
        for (var i = 0; i < collections.length; i++) {
            var c = collections[i];
            tokens.push(c.id + "@" + (c.version || "") + "@" + (c.updated || ""));
        }
        tokens.sort();
        var raw = tokens.join("|");
        return crypto.createHash("sha256").update(raw).digest("hex");
    };

    /**
     * Evaluates repository collections against installed collections to detect updates and new collections.
     * @param {Array} repoCollections
     * @returns {{ hasUpdates: boolean, updatedCollections: Array, newCollections: Array }}
     */
    StencilUpdateService.evaluateUpdates = function (repoCollections) {
        var updatedCollections = [];
        var newCollections = [];

        var installedCollections = (typeof CollectionManager !== "undefined" &&
            CollectionManager.shapeDefinition &&
            CollectionManager.shapeDefinition.collections) ?
            CollectionManager.shapeDefinition.collections : [];

        for (var i = 0; i < repoCollections.length; i++) {
            var repoCol = repoCollections[i];
            var installed = null;
            for (var j = 0; j < installedCollections.length; j++) {
                if (installedCollections[j].id === repoCol.id) {
                    installed = installedCollections[j];
                    break;
                }
            }

            if (installed) {
                var localVersion = installed.version || Config.get("Collection." + repoCol.id + ".version", null);
                if (repoCol.version && localVersion) {
                    if (Util.compareVersion(repoCol.version, localVersion) > 0) {
                        updatedCollections.push({
                            id: repoCol.id,
                            displayName: repoCol.displayName || installed.displayName || repoCol.id,
                            localVersion: localVersion,
                            remoteVersion: repoCol.version,
                            url: repoCol.url
                        });
                    }
                }
            } else {
                newCollections.push({
                    id: repoCol.id,
                    displayName: repoCol.displayName || repoCol.id,
                    version: repoCol.version || "1.0",
                    url: repoCol.url
                });
            }
        }

        return {
            hasUpdates: updatedCollections.length > 0 || newCollections.length > 0,
            updatedCollections: updatedCollections,
            newCollections: newCollections
        };
    };

    /**
     * Runs automated check against Config.CORE_COLLECTION_REPO_URL.
     * @param {Function} [callback] (err, result)
     */
    StencilUpdateService.checkForUpdates = function (callback) {
        callback = callback || function () {};

        if (!Config.get("collection.updater.autoCheck", true)) {
            return callback(null, { skipped: true });
        }

        var repoUrl = Config.get(Config.CORE_COLLECTION_REPO_URL, "https://raw.githubusercontent.com/evolus/stencils-repository/master/repository.xml");

        StencilUpdateService.fetchRepositoryXml(repoUrl, function (err, xmlText) {
            if (err) {
                console.debug("Stencil update check failed:", err.message);
                return callback(err);
            }

            try {
                var parsed = StencilUpdateService.parseRepositoryXml(xmlText);
                var fingerprint = StencilUpdateService.computeFingerprint(parsed.collections, parsed.metadata);
                var dismissedFingerprint = Config.get("collection.updater.dismissedFingerprint", "");

                Config.set("collection.updater.lastCheckTime", Date.now());

                if (dismissedFingerprint && dismissedFingerprint === fingerprint) {
                    console.debug("Stencil repository update dismissed by user (fingerprint matched).");
                    return callback(null, { hasUpdates: false, dismissed: true, fingerprint: fingerprint });
                }

                var evaluation = StencilUpdateService.evaluateUpdates(parsed.collections);
                evaluation.fingerprint = fingerprint;

                if (evaluation.hasUpdates) {
                    StencilUpdateService.showNotification(evaluation);
                }

                callback(null, evaluation);
            } catch (e) {
                console.debug("Stencil update check evaluation error:", e.message);
                callback(e);
            }
        });
    };

    /**
     * Persists dismissed fingerprint to Config.
     * @param {string} fingerprint
     */
    StencilUpdateService.dismissUpdate = function (fingerprint) {
        Config.set("collection.updater.dismissedFingerprint", fingerprint);
        console.debug("Stencil updates dismissed for fingerprint:", fingerprint);
    };

    /**
     * Opens the CollectionBrowserDialog focused on the official repository.
     */
    StencilUpdateService.openCollectionBrowser = function () {
        if (typeof CollectionBrowserDialog !== "undefined") {
            var collectionPanel = (typeof Pencil !== "undefined" && Pencil.collectionPane) ? Pencil.collectionPane : null;
            var dialog = new CollectionBrowserDialog(collectionPanel);
            dialog.open();
        }
    };

    /**
     * Displays non-blocking notification toast.
     * @param {Object} updateSummary
     */
    StencilUpdateService.showNotification = function (updateSummary) {
        var message = "Updates are available in the Stencil Repository!";
        var details = [];
        if (updateSummary.updatedCollections.length > 0) {
            var updatedNames = updateSummary.updatedCollections.map(function (c) { return c.displayName; }).slice(0, 3).join(", ");
            if (updateSummary.updatedCollections.length > 3) {
                updatedNames += " +" + (updateSummary.updatedCollections.length - 3) + " more";
            }
            details.push(updateSummary.updatedCollections.length + " collection update(s): " + updatedNames);
        }
        if (updateSummary.newCollections.length > 0) {
            var newNames = updateSummary.newCollections.map(function (c) { return c.displayName; }).slice(0, 3).join(", ");
            if (updateSummary.newCollections.length > 3) {
                newNames += " +" + (updateSummary.newCollections.length - 3) + " more";
            }
            details.push(updateSummary.newCollections.length + " new collection(s): " + newNames);
        }

        if (details.length > 0) {
            message += "\n" + details.join("\n");
        }

        NotificationPopup.show(
            message,
            "Browse Collections",
            function () {
                StencilUpdateService.openCollectionBrowser();
            },
            "Dismiss",
            function () {
                StencilUpdateService.dismissUpdate(updateSummary.fingerprint);
            },
            12000
        );
    };

    // Attach to global window scope and Node module scope
    if (typeof window !== "undefined") {
        window.StencilUpdateService = StencilUpdateService;
    }
    if (typeof global !== "undefined") {
        global.StencilUpdateService = StencilUpdateService;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = StencilUpdateService;
    }
})();
