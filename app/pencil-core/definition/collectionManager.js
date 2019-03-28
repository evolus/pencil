var CollectionManager = {};

CollectionManager.shapeDefinition = {};
CollectionManager.shapeDefinition.collections = [];
CollectionManager.shapeDefinition.shapeDefMap = {};
CollectionManager.shapeDefinition.shortcutMap = {};

CollectionManager.addShapeDefCollection = function (collection) {
    if (!collection) return;
    CollectionManager.shapeDefinition.collections.push(collection);
    collection.visible = CollectionManager.isCollectionVisible(collection);
    collection.collapsed = CollectionManager.isCollectionCollapsed(collection);
    //collection.usage = CollectionManager.getCollectionUsage(collection);

    for (var item in collection.shapeDefs) {
        var shapeDef = collection.shapeDefs[item];
        if (shapeDef.constructor == Shortcut) {
            CollectionManager.shapeDefinition.shortcutMap[shapeDef.id] = shapeDef;
        } else {
            CollectionManager.shapeDefinition.shapeDefMap[shapeDef.id] = shapeDef;
        }
    }
    debug("   Loaded: " + collection.displayName);
};
CollectionManager.shapeDefinition.locateDefinition = function (shapeDefId) {
    var def = CollectionManager.shapeDefinition.shapeDefMap[shapeDefId];
    return def;
};
CollectionManager.shapeDefinition.locateBuiltinPrivateShapeDef = function (shapeDefId) {
    for (var collection of CollectionManager.shapeDefinition.collections) {
        if (!collection.builtinPrivateCollection || !collection.builtinPrivateCollection.map) continue;
        var def = collection.builtinPrivateCollection.map[shapeDefId];
        if (def) return def;
    }
    return null;
};
CollectionManager.shapeDefinition.locateShortcut = function (shortcutId) {
    return CollectionManager.shapeDefinition.shortcutMap[shortcutId];
};
CollectionManager.loadUserDefinedStencils = function () {
    try {
        var stencilDir = CollectionManager.getUserStencilDirectory();
        console.log("Loading optional stencils in: " + stencilDir.path);
        CollectionManager._loadUserDefinedStencilsIn(stencilDir);
    } catch (e) {
        console.error(e);
    }
};
CollectionManager.getUserStencilDirectory = function () {
    return Config.getDataFilePath(Config.STENCILS_DIR_NAME);
};
CollectionManager.findCollection = function (collectionId) {
    for (var col of CollectionManager.shapeDefinition.collections) {
        if (col.id == collectionId) return col;
    }
    return null;
};
CollectionManager.loadAdHocCollection = function (dir) {
    CollectionManager.unloadLastAdHocCollection();

    var collection = new ShapeDefCollectionParser().parseURL(path.join(dir, "Definition.xml"));
    collection.userDefined = false;
    collection.installDirPath = dir;
    collection.isAdHoc = true;
    collection.visible = false;

    CollectionManager.addShapeDefCollection(collection);
    CollectionManager.adHocCollection = collection;

    return collection;
};
CollectionManager.unloadLastAdHocCollection = function () {
    if (!CollectionManager.adHocCollection) return;

    for (var item in CollectionManager.adHocCollection.shapeDefs) {
        var shapeDef = CollectionManager.adHocCollection.shapeDefs[item];
        if (shapeDef.constructor == Shortcut) {
            delete CollectionManager.shapeDefinition.shortcutMap[shapeDef.id];
        } else {
            delete CollectionManager.shapeDefinition.shapeDefMap[shapeDef.id];
        }
    }

    CollectionManager.adHocCollection = null;
};
CollectionManager.reloadDeveloperStencil = function (showNotification) {
    ApplicationPane._instance.busy();

    var collections = [];
    for (var collection of CollectionManager.shapeDefinition.collections) {
        if (collection.developerStencil) {
            for (var item in collection.shapeDefs) {
                var shapeDef = collection.shapeDefs[item];
                if (shapeDef.constructor == Shortcut) {
                    delete CollectionManager.shapeDefinition.shortcutMap[shapeDef.id];
                } else {
                    delete CollectionManager.shapeDefinition.shapeDefMap[shapeDef.id];
                }
            }
            continue;
        }
        collections.push(collection);
    }

    CollectionManager.shapeDefinition.collections = collections;
    this._loadDeveloperStencil();
    ApplicationPane._instance.unbusy();

    Pencil.collectionPane.reloadDeveloperCollections();

    if (showNotification) NotificationPopup.show("Developer collections were reloaded.");
};
CollectionManager.getDeveloperStencil = function () {
    for (var collection of CollectionManager.shapeDefinition.collections) {
        if (collection.developerStencil) return collection;
    }
    return null;
};
CollectionManager._loadDeveloperStencil = function () {
    try {
		var stencilPath = Config.get("dev.stencil.path", "null");
		if (!stencilPath || stencilPath == "none" || stencilPath == "null") {
			Config.set("dev.stencil.path", "none");
		} else {
			if (!fs.existsSync(stencilPath)) return;

			var parser = new ShapeDefCollectionParser();
            var collection = parser.parseURL(stencilPath);
            if (!collection) return;
            collection.userDefined = false;
            collection.installDirPath = path.dirname(stencilPath);
            collection.developerStencil = true;
            CollectionManager.addShapeDefCollection(collection);
            CollectionManager.installCollectionFonts(collection);
		}

	} catch (e) {
        console.error(e);
        // Util.error("Failed to load developer stencil", ex.message + "\n" + definitionFile.path, Util.getMessage("button.cancel.close"));
	}

	try {
		var dirPath = Config.get("dev.stencil.dir", "null");
		if (!dirPath || dirPath == "none" || dirPath == "null") {
			Config.set("dev.stencil.dir", "none");
		} else {

			if (!fs.existsSync(dirPath)) return;

			CollectionManager._loadUserDefinedStencilsIn(dirPath, null, "isSystem", "isDeveloperStencil");
		}
	} catch (e) {
        Console.dumpError(e);
        // Util.error("Failed to load developer stencil", ex.message + "\n" + definitionFile.path, Util.getMessage("button.cancel.close"));
	}
};
CollectionManager._loadStencil = function (dir, parser, isSystem, isDeveloperStencil) {

    var definitionFile = CollectionManager.findDefinitionFile(dir);
    if (!definitionFile) { return null; }

    try {
        var collection = parser.parseURL(definitionFile);
        if (!collection) { return null; }

        collection.userDefined = isSystem ? false : true;
        collection.installDirPath = dir;
        collection.developerStencil = isDeveloperStencil ? true : false;
        CollectionManager.addShapeDefCollection(collection);

        return collection;
    } catch (e) {
        console.error(e);
    }
};
CollectionManager._loadUserDefinedStencilsIn = function (stencilDir, excluded, isSystem, isDeveloperStencil) {
    var parser = new ShapeDefCollectionParser();
    var count = 0;

    //loading all stencils
    try {
        if (!fs.existsSync(stencilDir)) { return; }

        var definitionFiles = fs.readdirSync(stencilDir);
        for (var i in definitionFiles) {
            var definitionFile = definitionFiles[i];
            if (excluded && excluded.indexOf(definitionFile) >= 0) {
                continue;
            }
            var folderPath = path.join(stencilDir, definitionFile);
            if (!fs.lstatSync(folderPath).isDirectory()) continue;
            try {
                if (CollectionManager._loadStencil(folderPath, parser, isSystem ? true : false, isDeveloperStencil ? true : false)) {
                    count++;
                }
            } catch (e) {
                console.error(e);
            }
        }
    } catch (e) {
        console.error(e);
    }
};

CollectionManager.loadStencils = function(showNotification) {
    if (ApplicationPane._instance) ApplicationPane._instance.busy();

    CollectionManager.shapeDefinition.collections = [];
    CollectionManager.shapeDefinition.shapeDefMap = {};

    //load all system stencils
    var parser = new ShapeDefCollectionParser();

    debug("Start loading built-in stencil collections:");
    CollectionManager._loadStencil(getStaticFilePath("stencils/Common"), parser, true, false);
    CollectionManager._loadStencil(getStaticFilePath("stencils/BasicWebElements"), parser, true, false);
    CollectionManager._loadStencil(getStaticFilePath("stencils/Gtk.GUI"), parser, true, false);
    CollectionManager._loadStencil(getStaticFilePath("stencils/SketchyGUI"), parser, true, false);
    CollectionManager._loadStencil(getStaticFilePath("stencils/WindowsXP-GUI"), parser, true, false);
    CollectionManager._loadStencil(getStaticFilePath("stencils/CommonShapes_Flowchart"), parser, true, false);
    CollectionManager._loadStencil(getStaticFilePath("stencils/Android.GUI"), parser, true, false);
    CollectionManager._loadStencil(getStaticFilePath("stencils/iOS.GUI"), parser, true, false);
    CollectionManager._loadStencil(getStaticFilePath("stencils/iOS-Wireframe"), parser, true, false);
    CollectionManager._loadStencil(getStaticFilePath("stencils/Prototype_GUI"), parser, true, false);

    debug("Start loading installed stencil collections:");
    CollectionManager._loadUserDefinedStencilsIn(Config.getDataFilePath(Config.STENCILS_DIR_NAME));


    debug("Start loading developer stencil collections:");
    CollectionManager._loadDeveloperStencil();

    var config = Config.get("Collection.collectionPosition");
    var collectionOrder = config ? (config.split(",") || []) : [];

    CollectionManager.shapeDefinition.collections = CollectionManager.shapeDefinition.collections.sort(function (a, b) {
        var indexA = collectionOrder.indexOf(a.id);
        var indexB = collectionOrder.indexOf(b.id);
        return indexA - indexB;
    });

    debug("Finished loading collections, showing collection pane...");

    CollectionManager.reloadCollectionPane();

    if (ApplicationPane._instance) ApplicationPane._instance.unbusy();
    if (showNotification) NotificationPopup.show("All collections were reloaded.");
};
CollectionManager.reloadCollectionPane = function () {
    Pencil.collectionPane.loaded = false;
    Pencil.collectionPane.reload();
};
CollectionManager.installNewCollection = function (callback) {
    var files = dialog.showOpenDialog({
        title: "Install from",
        defaultPath: Config.get("collection.install.recentlyDirPath", null) || os.homedir(),
        filters: [
            { name: "Stencil files", extensions: ["zip", "epc"] }
        ]

    }, function (filenames) {
        if (!filenames || filenames.length <= 0) return;
        Config.set("collection.install.recentlyDirPath", path.dirname(filenames[0]));
        CollectionManager.installCollectionFromFilePath(filenames[0], callback);
    });
};

CollectionManager.findDefinitionFile = function(dir) {
    var defFile = path.join(dir, "Definition.xml");
    if (fs.existsSync(defFile)) {
        return defFile;
    }

    var files = fs.readdirSync(dir);
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var curPath = path.join(dir, f);
        if (fs.lstatSync(curPath).isDirectory()) {
            defFile = path.join(curPath, "Definition.xml");
            if (fs.existsSync(defFile)) {
                return defFile;
            }
        }
    }

    return null;
};
CollectionManager.extractCollection = function(file, callback) {

    return QP.Promise(function(resolve, reject) {
        function error(err) {
            if (callback) {
                callback(err);
            }
            reject(err);
        }

        var filePath = file.path;
        var fileName = file.name.replace(/\.[^\.]+$/, "") + "_" + Math.ceil(Math.random() * 1000) + "_" + (new Date().getTime());

        var targetDir = path.join(CollectionManager.getUserStencilDirectory(), fileName);
        console.log("extracting to", targetDir);

        var admZip = require('adm-zip');

        var zip = new admZip(filePath);
        zip.extractAllToAsync(targetDir, true, function (err) {
            if (err) {
                error(err);
                setTimeout(function() {
                    CollectionManager.removeCollectionDir(targetDir);
                }, 10);
            } else {
                resolve(targetDir);
            }
        });

        // var extractor = unzip.Extract({ path: targetDir });
        // extractor.on("close", function () {
        //     if (callback) {
        //         callback(err);
        //     }
        //     resolve(targetDir);
        // });
        // extractor.on("error", (err) => {
        //     console.log("extract error", err);
        //     error(err);

        //     setTimeout(function() {
        //         CollectionManager.removeCollectionDir(targetDir);
        //     }, 10);
        // });

        // fs.createReadStream(filePath).pipe(extractor);
    });
};
CollectionManager.installCollectionFonts = function (collection) {
    if (!collection.fonts || collection.fonts.length == 0) {
        return;
    }

    var installedFonts = [];
    for (var font of collection.fonts) {
        var existingFont = FontLoader.instance.userRepo.getFont(font.name);
        if (existingFont) {
            if (existingFont.source == collection.id) {
                FontLoader.instance.userRepo.removeFont(existingFont);
            } else {
                console.log("Skip installing: " + font.name);
                continue;   //skip installing this font
            }
        }

        var fontData = {
            fontName: font.name,
            source: collection.id
        }

        for (var variantName in FontRepository.SUPPORTED_VARIANTS) {
            var declaredPath = font[variantName];
            var filePath = "";
            if (declaredPath) {
                var parts = declaredPath.split("/");
                filePath = collection.installDirPath;
                for (var p of parts) {
                    filePath = path.join(filePath, p);
                }

                if (!fs.existsSync(filePath)) filePath = "";
            }

            fontData[variantName + "FilePath"] = filePath;
        }

        console.log("Fontdata to install", fontData);

        FontLoader.instance.installNewFont(fontData);
        installedFonts.push(fontData.fontName);
    }

    if (installedFonts.length > 0) {
        NotificationPopup.show("New fonts installed:\n   " + installedFonts.join("\n   "), "View", function () {
            (new FontManagementDialog()).open();
        });
    }
};
CollectionManager.installCollection = function(targetDir, callback) {
    return QP.Promise(function(resolve, reject) {
        try {
            var definitionFile = CollectionManager.findDefinitionFile(targetDir);
            if (!definitionFile) throw Util.getMessage("collection.specification.is.not.found.in.the.archive");

            var parser = new ShapeDefCollectionParser();
            var collection = parser.parseURL(definitionFile);

            if (collection && collection.id) {
                //check for duplicate of name
                for (i in CollectionManager.shapeDefinition.collections) {
                    var existingCollection = CollectionManager.shapeDefinition.collections[i];
                    if (existingCollection.id == collection.id) {
                        throw Util.getMessage("collection.named.already.installed", collection.id);
                    }
                }
                collection.userDefined = true;
                collection.installDirPath = targetDir;

                //install fonts
                CollectionManager.installCollectionFonts(collection);

                CollectionManager.setCollectionVisible(collection, true);
                CollectionManager.setCollectionCollapsed(collection, false);

                CollectionManager.addShapeDefCollection(collection);
                CollectionManager.loadStencils();

                if (callback) {
                    callback(collection);
                }
                resolve(collection);
            } else {
                throw Util.getMessage("collection.specification.is.not.found.in.the.archive");
            }
        } catch (err) {
            console.log("install error", err);
            if (callback) {
                callback(err);
            }
            reject(err);
            CollectionManager.removeCollectionDir(targetDir);
        }
    });
};
CollectionManager.installCollectionFromFile = function (file, callback) {

    console.log("installCollectionFromFile", file);
    ApplicationPane._instance.busy();

    CollectionManager.extractCollection(file)
        .then((targetDir) => {
            return CollectionManager.installCollection(targetDir);
        })
        .then((collection) => {
            if (callback) {
                callback(null, collection);
            }
        })
        .catch((err) => {
            Dialog.error("Error installing collection. " + err);
            if (callback) {
                callback(err, null);
            }
        })
        .finally(() => {
            CollectionManager.saveCollectionOrder();
            ApplicationPane._instance.unbusy();
        });
};

CollectionManager.installCollectionFromFilePath = function (filePath, callback) {
    var file = {
        path: filePath,
        name: path.basename(filePath)
    };
    CollectionManager.installCollectionFromFile(file, callback);
};
CollectionManager.installCollectionFromUrl = function (url, callback) {
    var nugget = require("nugget");
    var tempDir = tmp.dirSync({ keep: false, unsafeCleanup: true }).name;
    var filename = path.basename(url);

    console.log('Downloading zip', url, 'to', tempDir, filename);
    var nuggetOpts = {
        target: filename,
        dir: tempDir,
        resume: true,
        quiet: true
    };

    nugget(url, nuggetOpts, function (errors) {
        if (errors) {
            var error = errors[0] // nugget returns an array of errors but we only need 1st because we only have 1 url
            if (error.message.indexOf('404') === -1) {
                Dialog.error(`Error installing collection: ${error.message}`);
                return callback(error);
            }
            Dialog.error(`Failed to find collection at ${url}`);
            return callback(error);
        }

        var filepath = path.join(tempDir, filename);
        console.log('collection downloaded', filepath);

        CollectionManager.installCollectionFromFilePath(filepath, (err, collection) => {
            if (!err && collection) {
                NotificationPopup.show("Collection was installed successfully.");
            }
            callback(err, collection);
        });
    });
};
CollectionManager.setCollectionVisible = function (collection, visible) {
    collection.visible = visible;
    Config.set("Collection." + collection.id + ".visible", visible);
};
CollectionManager.isCollectionVisible = function (collection) {
    var visible = Config.get("Collection." + collection.id + ".visible");
    if (visible == null) visible = true;
    return visible;
};
CollectionManager.setCollectionCollapsed = function (collection, collapsed) {
    collection.collapsed = collapsed;
    Config.set("Collection." + collection.id + ".collapsed", collapsed);
};
CollectionManager.isCollectionCollapsed = function (collection) {
    var collapsed = Config.get("Collection." + collection.id + ".collapsed");
    if (collapsed == null) collapsed = false;
    return collapsed;
};
// CollectionManager.setCollectionUsage = function (collection, value) {
//     collection.usage = value;
//     Config.set("Collection." + collection.id + ".usage", value);
// };
// CollectionManager.getCollectionUsage = function (collection) {
//     collection.usage = value;
//     var value = Config.get("Collection." + collection.id + ".usage");
//     if (value) return parseInt(value, 10);
//     return 0;
// };
CollectionManager.setLastUsedCollection = function (collection) {
    Config.set("Collection.lastUsedCollection.id", collection.id);
};
CollectionManager.getLastUsedCollection = function () {
    return Config.get("Collection.lastUsedCollection.id");
};

CollectionManager.removeCollectionDir = function (targetDir, onRemoved) {
    rimraf(targetDir, {}, function(err) {
        if (onRemoved) {
            onRemoved(err);
        }
    });
};
CollectionManager.uninstallCollection = function (collection, callback) {
    callback = callback || function() {};

    if (!collection.installDirPath || !collection.userDefined) {
        return callback();
    }

    ApplicationPane._instance.busy();
    CollectionManager.removeCollectionDir(collection.installDirPath, function (err) {
        ApplicationPane._instance.unbusy();

        if (!err) {
            CollectionManager.loadStencils();
        }
        CollectionManager.saveCollectionOrder();
        callback(err);
    });
};
CollectionManager.selectDeveloperStencilDir = function () {
	//alert("Please select the directory that contains the 'Definition.xml' file of your stencil");
    dialog.showOpenDialog({
        title: "Select Developer Stetcil 'Definition.xml' file",
        defaultPath: Config.get("dev.stencil.path") || os.homedir(),
        filters: [
            { name: "Definition.xml", extensions: ["xml"] }
        ]

    }, function (filenames) {

        ApplicationPane._instance.unbusy();
        if (!filenames || filenames.length <= 0) return;
        var filePath = filenames[0];
        if (path.basename(filePath) != "Definition.xml") {
            Dialog.error("The selected file is invalid. Please select the 'Definition.xml' file of your stencil.");
            return;
        }
        Config.set("dev.stencil.path", filenames[0]);
        CollectionManager.loadStencils();
    }.bind(this));
};
CollectionManager.unselectDeveloperStencilDir = function () {
    Config.set("dev.stencil.path", "none");
    CollectionManager.reloadDeveloperStencil();
    CollectionManager.saveCollectionOrder();
    NotificationPopup.show("Developer stencil is unloaded.");
};

CollectionManager.reorderCollections = function(collectionId, targetCollectionId) {
    var collections = CollectionManager.shapeDefinition.collections;

    var collection = CollectionManager.findCollection(collectionId);
    var targetCollection = CollectionManager.findCollection(targetCollectionId);
    var index = collections.indexOf(collection);
    collections.splice(index, 1);
    index =  collections.indexOf(targetCollection);
    collections.splice(index, 0, collection);

    CollectionManager.saveCollectionOrder();
}

CollectionManager.saveCollectionOrder = function () {
    var positionString = "";
    for (var i = 0; i < CollectionManager.shapeDefinition.collections.length; i++) {
        positionString += CollectionManager.shapeDefinition.collections[i].id + ",";
    }
    Config.set("Collection.collectionPosition", positionString);
}
