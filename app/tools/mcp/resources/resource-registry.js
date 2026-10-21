/**
 * Resource Registry for Pencil MCP Server
 * Manages MCP resources:
 * - pencil://skills/pencil-designer
 * - pencil://collections
 * - pencil://active-document
 */

var fs = require("fs");
var path = require("path");
var defaultLogger = require("../logger.js").defaultLogger;

function ResourceRegistry(options) {
    options = options || {};
    this.logger = options.logger || defaultLogger;
    this.kbDir = options.kbDir || path.join(__dirname, "../kb");
}

ResourceRegistry.prototype.bindToServer = function (mcpServer) {
    var self = this;

    // 1. Skill Resource: pencil://skills/pencil-designer
    mcpServer.registerResource(
        "pencil_designer_skill",
        "pencil://skills/pencil-designer",
        {
            title: "Pencil UI Designer Skill",
            description: "Compiled instructions and workflow rules for the Pencil UI Designer skill.",
            mimeType: "text/markdown"
        },
        async function (uri) {
            var skillPath = path.join(self.kbDir, "skills/pencil-designer/SKILL.md");
            var content = "";
            if (fs.existsSync(skillPath)) {
                content = fs.readFileSync(skillPath, "utf8");
            } else {
                content = "# Pencil Designer Skill\n\nSkill specification file not found.";
            }

            return {
                contents: [
                    {
                        uri: uri.href || uri.toString(),
                        mimeType: "text/markdown",
                        text: content
                    }
                ]
            };
        }
    );

    // 2. Collections Resource: pencil://collections
    mcpServer.registerResource(
        "pencil_collections",
        "pencil://collections",
        {
            title: "Loaded Stencil Collections",
            description: "Summary inspection of installed and loaded stencil collections in Pencil.",
            mimeType: "application/json"
        },
        async function (uri) {
            var collections = [];
            var colMgr = (typeof CollectionManager !== "undefined") ? CollectionManager : (typeof window !== "undefined" ? window.CollectionManager : null);

            var rawCols = (colMgr && colMgr.shapeDefinition && Array.isArray(colMgr.shapeDefinition.collections))
                ? colMgr.shapeDefinition.collections
                : ((colMgr && colMgr.collections) ? colMgr.collections : []);

            for (var i = 0; i < rawCols.length; i++) {
                var c = rawCols[i];
                if (!c || !c.id) continue;
                var isVis = (typeof colMgr.isCollectionVisible === "function") ? colMgr.isCollectionVisible(c) : (c.visible !== false);
                if (!isVis) continue;
                collections.push({
                    id: c.id,
                    displayName: c.displayName,
                    description: c.description
                });
            }

            return {
                contents: [
                    {
                        uri: uri.href || uri.toString(),
                        mimeType: "application/json",
                        text: JSON.stringify({
                            count: collections.length,
                            collections: collections
                        }, null, 2)
                    }
                ]
            };
        }
    );

    // 3. Active Document Resource: pencil://active-document
    mcpServer.registerResource(
        "pencil_active_document",
        "pencil://active-document",
        {
            title: "Active Document State",
            description: "Inspection of the active open document and its pages in Pencil.",
            mimeType: "application/json"
        },
        async function (uri) {
            var appPane = (typeof ApplicationPane !== "undefined" && ApplicationPane._instance) ? ApplicationPane._instance : (typeof window !== "undefined" && window.ApplicationPane ? window.ApplicationPane._instance : null);

            var docData = {
                hasDocument: false,
                name: null,
                pages: []
            };

            var doc = null;
            if (appPane && appPane.controller && appPane.controller.doc) {
                doc = appPane.controller.doc;
            } else if (appPane && appPane.currentDocument) {
                doc = appPane.currentDocument;
            } else if (typeof Pencil !== "undefined" && Pencil.controller && Pencil.controller.doc) {
                doc = Pencil.controller.doc;
            }

            if (doc) {
                docData.hasDocument = true;
                docData.name = (appPane && appPane.controller && typeof appPane.controller.getDocumentName === "function") ? appPane.controller.getDocumentName() : (doc.name || "Untitled");
                if (doc.pages) {
                    for (var i = 0; i < doc.pages.length; i++) {
                        var p = doc.pages[i];
                        docData.pages.push({
                            id: p.id || (p.properties && p.properties.id) || ("page-" + (i + 1)),
                            name: p.name || (p.properties && p.properties.name) || ("Page " + (i + 1)),
                            width: Number(p.width || (p.properties && p.properties.width) || 800),
                            height: Number(p.height || (p.properties && p.properties.height) || 600)
                        });
                    }
                }
            }

            return {
                contents: [
                    {
                        uri: uri.href || uri.toString(),
                        mimeType: "application/json",
                        text: JSON.stringify(docData, null, 2)
                    }
                ]
            };
        }
    );

    // 4. Document Resources: pencil://document/resources
    mcpServer.registerResource(
        "pencil_document_resources",
        "pencil://document/resources",
        {
            title: "Active Document Image Resources",
            description: "Inspection of image assets and file references (ref://) bundled in the active document.",
            mimeType: "application/json"
        },
        async function (uri) {
            var resources = [];
            var refDir = null;

            if (typeof Pencil !== "undefined" && Pencil.documentHandler && Pencil.documentHandler.tempDir) {
                var subRef = (typeof Controller !== "undefined" && Controller.SUB_REFERENCE) ? Controller.SUB_REFERENCE : ".ref";
                refDir = path.join(Pencil.documentHandler.tempDir.name, subRef);
            }

            if (refDir && fs.existsSync(refDir)) {
                try {
                    var files = fs.readdirSync(refDir);
                    for (var i = 0; i < files.length; i++) {
                        var fName = files[i];
                        if (fName.startsWith(".")) continue;
                        var fPath = path.join(refDir, fName);
                        var stat = fs.statSync(fPath);
                        if (!stat.isFile()) continue;

                        var ext = path.extname(fName).toLowerCase();
                        var resType = (ext === ".svg" || fName.endsWith("_svg")) ? "svg" : "bitmap";

                        resources.push({
                            refId: fName,
                            refUri: "ref://" + fName,
                            type: resType,
                            sizeBytes: stat.size
                        });
                    }
                } catch (e) {
                    self.logger.error("Failed to read document reference directory:", e);
                }
            }

            return {
                contents: [
                    {
                        uri: uri.href || uri.toString(),
                        mimeType: "application/json",
                        text: JSON.stringify({
                            count: resources.length,
                            resources: resources
                        }, null, 2)
                    }
                ]
            };
        }
    );

    // 5. Collection Resources: pencil://collections/resources
    mcpServer.registerResource(
        "pencil_collection_resources",
        "pencil://collections/resources",
        {
            title: "Exposed Stencil Collection Resources",
            description: "Summary catalog of vector and bitmap asset bundles exposed by loaded stencil collections.",
            mimeType: "application/json"
        },
        async function (uri) {
            var colMgr = (typeof CollectionManager !== "undefined") ? CollectionManager : (typeof window !== "undefined" ? window.CollectionManager : null);
            var collectionsSummary = [];

            var rawCols = (colMgr && colMgr.shapeDefinition && Array.isArray(colMgr.shapeDefinition.collections))
                ? colMgr.shapeDefinition.collections
                : ((colMgr && colMgr.collections) ? colMgr.collections : []);

            for (var i = 0; i < rawCols.length; i++) {
                var c = rawCols[i];
                if (!c || !c.id || !c.installDirPath) continue;

                var isVis = (typeof colMgr.isCollectionVisible === "function") ? colMgr.isCollectionVisible(c) : (c.visible !== false);
                if (!isVis) continue;

                var resourceBundles = [];
                if (Array.isArray(c.RESOURCE_LIST) && c.RESOURCE_LIST.length > 0) {
                    for (var r = 0; r < c.RESOURCE_LIST.length; r++) {
                        var resItem = c.RESOURCE_LIST[r];
                        if (resItem) {
                            resourceBundles.push({
                                name: resItem.name || resItem.prefix,
                                prefix: resItem.prefix,
                                type: resItem.type || "unknown"
                            });
                        }
                    }
                } else {
                    var candidates = ["Icons", "vectors", "bitmaps", "resources", "images"];
                    for (var d = 0; d < candidates.length; d++) {
                        var candPath = path.join(c.installDirPath, candidates[d]);
                        if (fs.existsSync(candPath)) {
                            resourceBundles.push({
                                name: candidates[d],
                                prefix: candidates[d],
                                type: (candidates[d] === "vectors" || candidates[d] === "Icons") ? "svg" : "bitmap"
                            });
                        }
                    }
                }

                if (resourceBundles.length > 0) {
                    collectionsSummary.push({
                        id: c.id,
                        displayName: c.displayName || c.id,
                        resourceBundles: resourceBundles
                    });
                }
            }

            return {
                contents: [
                    {
                        uri: uri.href || uri.toString(),
                        mimeType: "application/json",
                        text: JSON.stringify({
                            count: collectionsSummary.length,
                            collections: collectionsSummary
                        }, null, 2)
                    }
                ]
            };
        }
    );

    this.logger.debug("Bound MCP resources: pencil://skills/pencil-designer, pencil://collections, pencil://active-document, pencil://document/resources, pencil://collections/resources");
};

module.exports = {
    ResourceRegistry: ResourceRegistry
};
