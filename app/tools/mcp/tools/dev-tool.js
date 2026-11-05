var fs = require("fs");
var path = require("path");
var z = require("zod").z;
var BaseTool = require("./base-tool.js").BaseTool;

function getCollectionManager() {
    if (typeof CollectionManager !== "undefined") return CollectionManager;
    if (typeof window !== "undefined" && window.CollectionManager) return window.CollectionManager;
    if (typeof global !== "undefined" && global.CollectionManager) return global.CollectionManager;
    return null;
}

function getConfig() {
    if (typeof Config !== "undefined") return Config;
    if (typeof window !== "undefined" && window.Config) return window.Config;
    if (typeof global !== "undefined" && global.Config) return global.Config;
    return null;
}

function RegisterDeveloperCollectionBatchDirTool() {
    BaseTool.call(
        this,
        "register_developer_collection_batch_dir",
        "Registers a local directory containing stencil collection subdirectories in Pencil's dev.stencil.dir configuration, reloads developer collections, marks newly registered collections as available via MCP, and returns only the collections originating from the provided directory.",
        {
            dir: z.string().describe("Absolute or relative path to the batch directory containing stencil collection subdirectories.")
        }
    );
}
RegisterDeveloperCollectionBatchDirTool.prototype = new BaseTool();

RegisterDeveloperCollectionBatchDirTool.prototype.execute = async function (args, context) {
    args = args || {};
    var rawDir = args.dir;
    if (!rawDir || typeof rawDir !== "string" || !rawDir.trim()) {
        throw new Error("Missing required argument: dir");
    }

    var targetDir = path.resolve(rawDir.trim());
    if (!fs.existsSync(targetDir)) {
        throw new Error("Directory does not exist: " + targetDir);
    }
    var stat = fs.statSync(targetDir);
    if (!stat.isDirectory()) {
        throw new Error("Specified path is not a directory: " + targetDir);
    }

    var config = getConfig();
    var colMgr = getCollectionManager();
    if (!colMgr) {
        throw new Error("CollectionManager runtime service is not available.");
    }

    /*
     * dev.stencil.dir stores a semicolon-separated list of directories scanned by
     * CollectionManager._loadDeveloperStencil. Ensure targetDir is present without duplicates.
     */
    var currentConfig = config ? config.get("dev.stencil.dir", "") : "";
    if (currentConfig === "none" || currentConfig === "null") currentConfig = "";
    var dirList = currentConfig
        ? currentConfig.split(";").map(function (p) { return path.resolve(p.trim()); }).filter(Boolean)
        : [];

    var alreadyListed = false;
    for (var i = 0; i < dirList.length; i++) {
        if (dirList[i] === targetDir) {
            alreadyListed = true;
            break;
        }
    }
    if (!alreadyListed) {
        dirList.push(targetDir);
        if (config) {
            config.set("dev.stencil.dir", dirList.join(";"));
        }
    }

    colMgr.reloadDeveloperStencil(false);

    /*
     * Filter loaded developer collections strictly to those residing within targetDir,
     * ensuring each is explicitly flagged mcpVisible = true so it is discoverable across
     * all MCP stencil tools.
     */
    var matchedCollections = [];
    if (colMgr.shapeDefinition && Array.isArray(colMgr.shapeDefinition.collections)) {
        for (var j = 0; j < colMgr.shapeDefinition.collections.length; j++) {
            var col = colMgr.shapeDefinition.collections[j];
            if (!col || !col.developerStencil || !col.installDirPath) continue;

            var colInstallDir = path.resolve(col.installDirPath);
            var relative = path.relative(targetDir, colInstallDir);
            var isInside = relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));

            if (isInside) {
                if (typeof colMgr.setCollectionMcpVisible === "function") {
                    colMgr.setCollectionMcpVisible(col, true);
                } else {
                    col.mcpVisible = true;
                    if (config) {
                        config.set("Collection." + col.id + ".mcpVisible", true);
                    }
                }

                matchedCollections.push({
                    id: col.id,
                    displayName: col.displayName || col.id,
                    description: col.description || "",
                    installDirPath: col.installDirPath,
                    shapeCount: col.shapeDefs ? Object.keys(col.shapeDefs).length : 0,
                    mcpVisible: true
                });
            }
        }
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    success: true,
                    batchDir: targetDir,
                    registeredCount: matchedCollections.length,
                    collections: matchedCollections
                }, null, 2)
            }
        ]
    };
};

function ReloadDeveloperCollectionsTool() {
    BaseTool.call(
        this,
        "reload_developer_collections",
        "Reloads all developer stencil collections in-memory from disk, re-parsing Definition.xml files and updating canvas shape definitions and desktop palette UI live without application restart.",
        {}
    );
}
ReloadDeveloperCollectionsTool.prototype = new BaseTool();

ReloadDeveloperCollectionsTool.prototype.execute = async function (args, context) {
    var colMgr = getCollectionManager();
    if (!colMgr) {
        throw new Error("CollectionManager runtime service is not available.");
    }

    colMgr.reloadDeveloperStencil(false);

    var reloadedCollections = [];
    if (colMgr.shapeDefinition && Array.isArray(colMgr.shapeDefinition.collections)) {
        for (var i = 0; i < colMgr.shapeDefinition.collections.length; i++) {
            var col = colMgr.shapeDefinition.collections[i];
            if (!col || !col.developerStencil) continue;

            reloadedCollections.push({
                id: col.id,
                displayName: col.displayName || col.id,
                description: col.description || "",
                installDirPath: col.installDirPath || null,
                shapeCount: col.shapeDefs ? Object.keys(col.shapeDefs).length : 0,
                mcpVisible: Boolean(col.mcpVisible)
            });
        }
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    success: true,
                    message: "Developer collections reloaded.",
                    count: reloadedCollections.length,
                    collections: reloadedCollections
                }, null, 2)
            }
        ]
    };
};

function ListDeveloperCollectionsTool() {
    BaseTool.call(
        this,
        "list_developer_collections",
        "Lists all developer stencil collections currently loaded in Pencil, along with their install paths, shape counts, MCP visibility status, and configured batch directories.",
        {}
    );
}
ListDeveloperCollectionsTool.prototype = new BaseTool();

ListDeveloperCollectionsTool.prototype.execute = async function (args, context) {
    var colMgr = getCollectionManager();
    var config = getConfig();

    var currentConfig = config ? config.get("dev.stencil.dir", "") : "";
    if (currentConfig === "none" || currentConfig === "null") currentConfig = "";
    var configuredDirs = currentConfig
        ? currentConfig.split(";").map(function (p) { return p.trim(); }).filter(Boolean)
        : [];

    var devCollections = [];
    if (colMgr && colMgr.shapeDefinition && Array.isArray(colMgr.shapeDefinition.collections)) {
        for (var i = 0; i < colMgr.shapeDefinition.collections.length; i++) {
            var col = colMgr.shapeDefinition.collections[i];
            if (!col || !col.developerStencil) continue;

            devCollections.push({
                id: col.id,
                displayName: col.displayName || col.id,
                description: col.description || "",
                installDirPath: col.installDirPath || null,
                shapeCount: col.shapeDefs ? Object.keys(col.shapeDefs).length : 0,
                mcpVisible: Boolean(col.mcpVisible)
            });
        }
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    configuredBatchDirs: configuredDirs,
                    developerCollectionsCount: devCollections.length,
                    developerCollections: devCollections
                }, null, 2)
            }
        ]
    };
};

module.exports = {
    RegisterDeveloperCollectionBatchDirTool: RegisterDeveloperCollectionBatchDirTool,
    ReloadDeveloperCollectionsTool: ReloadDeveloperCollectionsTool,
    ListDeveloperCollectionsTool: ListDeveloperCollectionsTool
};
