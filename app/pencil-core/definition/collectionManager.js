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
    collection.usage = CollectionManager.getCollectionUsage(collection);

    for (var item in collection.shapeDefs) {
        var shapeDef = collection.shapeDefs[item];
        if (shapeDef.constructor == Shortcut) {
            CollectionManager.shapeDefinition.shortcutMap[shapeDef.id] = shapeDef;
        } else {
            CollectionManager.shapeDefinition.shapeDefMap[shapeDef.id] = shapeDef;
        }
    }

};
CollectionManager.shapeDefinition.locateDefinition = function (shapeDefId) {
    var def = CollectionManager.shapeDefinition.shapeDefMap[shapeDefId];
    return def;
};
CollectionManager.shapeDefinition.locateShortcut = function (shortcutId) {
    return CollectionManager.shapeDefinition.shortcutMap[shortcutId];
};
CollectionManager.loadUserDefinedStencils = function () {
    try {
        var stencilDir = CollectionManager.getUserStencilDirectory();
        debug("Loading optional stencils in: " + stencilDir.path);
        CollectionManager._loadUserDefinedStencilsIn(stencilDir);
    } catch (e) {
        Console.dumpError(e);
    }
};
CollectionManager.getUserStencilDirectory = function () {
    // return CollectionManager.getSpecialDirs("ProfD", "Pencil/Stencils");
    return Config.getDataFilePath(Config.STENCILS_DIR_NAME);
};
CollectionManager.getSpecialDirs = function (id, subFolders) {
    var properties = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties);

    var stencilDir = properties.get(id, Components.interfaces.nsIFile);
    var subs = subFolders.split(/\//);
    for (var i = 0; i < subs.length; i ++) {
        stencilDir.append(subs[i]);
    }

    return stencilDir;
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
            CollectionManager.addShapeDefCollection(collection);
		}

	} catch (e) {
        Console.dumpError(e);
        // Util.error("Failed to load developer stencil", ex.message + "\n" + definitionFile.path, Util.getMessage("button.cancel.close"));
	}

	try {
		var dirPath = Config.get("dev.stencil.dir", "null");
		if (!dirPath || dirPath == "none" || dirPath == "null") {
			Config.set("dev.stencil.dir", "none");
		} else {

			if (!fs.existsSync(dirPath)) return;

			CollectionManager._loadUserDefinedStencilsIn(dirPath, null, "isSystem");
		}
	} catch (e) {
        Console.dumpError(e);
        // Util.error("Failed to load developer stencil", ex.message + "\n" + definitionFile.path, Util.getMessage("button.cancel.close"));
	}


    /*
	try {
		var path = Config.get("dev.stencil.path", "null");
		if (!path || path == "none" || path == "null") {
			Config.set("dev.stencil.path", "none");
		} else {
			var file = Components.classes["@mozilla.org/file/local;1"].
		    createInstance(Components.interfaces.nsILocalFile);
			file.initWithPath(path);

			if (!file.exists()) return;

			var parser = new ShapeDefCollectionParser();
			CollectionManager._loadStencil(file, parser, "isSystem");
		}

	} catch (e) {
        Util.error("Failed to load developer stencil", ex.message + "\n" + definitionFile.path, Util.getMessage("button.cancel.close"));
	}

	try {
		var path = Config.get("dev.stencil.dir", "null");
		if (!path || path == "none" || path == "null") {
			Config.set("dev.stencil.dir", "none");
		} else {
			var file = Components.classes["@mozilla.org/file/local;1"].
		    createInstance(Components.interfaces.nsILocalFile);
			file.initWithPath(path);

			if (!file.exists()) return;

			CollectionManager._loadUserDefinedStencilsIn(file, null, "isSystem");
		}
	} catch (e) {
        Util.error("Failed to load developer stencil", ex.message + "\n" + definitionFile.path, Util.getMessage("button.cancel.close"));
	}
    */
};
CollectionManager._loadStencil = function (dir, parser, isSystem) {

    var definitionFile = path.join(dir, "Definition.xml");
    if (!fs.existsSync(definitionFile)) return;

    try {
        var collection = parser.parseURL(definitionFile);
        if (!collection) return;
        collection.userDefined = isSystem ? false : true;
        collection.installDirPath = dir;
        CollectionManager.addShapeDefCollection(collection);
    } catch (e) {
        Console.dumpError(e);
        // Util.error(Util.getMessage("error.title"), Util.getMessage("stencil.cannot.be.parsed", definitionFile, ex.message), Util.getMessage("button.cancel.close"));
    }

    /*
	var definitionFile = dir;
	definitionFile.append("Definition.xml");
    if (!definitionFile.exists() || definitionFile.isDirectory()) return;

    var uri = ios.newFileURI(definitionFile);

    try {
        var collection = parser.parseFile(definitionFile, uri.spec);
        collection.userDefined = isSystem ? false : true;
        collection.installDirPath = definitionFile.parent.path;
        CollectionManager.addShapeDefCollection(collection);
    } catch (ex) {
        Util.error(Util.getMessage("error.title"), Util.getMessage("stencil.cannot.be.parsed", definitionFile.path, ex.message), Util.getMessage("button.cancel.close"))
        //alert("Warning:\nThe stencil at: " + definitionFile.path + " cannot be parsed.\nError: " + ex.message);
    }
    */

};
CollectionManager._loadUserDefinedStencilsIn = function (stencilDir, excluded, isSystem) {
    debug("Loading stencils in: " + stencilDir + "\n excluded: " + excluded);

    var parser = new ShapeDefCollectionParser();

    //loading all stencils
    try {
        if (!fs.existsSync(stencilDir)) return;
        var definitionFiles = fs.readdirSync(stencilDir);
        for (var i in definitionFiles) {
            var definitionFile = definitionFiles[i];
            if (excluded && excluded.indexOf(definitionFile) >= 0) {
                continue;
            }
            var folderPath = path.join(stencilDir, definitionFile);
            CollectionManager._loadStencil(folderPath, parser, isSystem ? true : false);
        }

    } catch (e) {
        Console.dumpError(e);
    }


    /*
    try {
        if (!stencilDir.exists() || !stencilDir.isDirectory()) return;
        var entries = stencilDir.directoryEntries;
        while(entries.hasMoreElements())
        {
            var definitionFile = entries.getNext();
            definitionFile.QueryInterface(Components.interfaces.nsIFile);
            if (excluded && excluded.indexOf(definitionFile.leafName) >= 0) {
                continue;
            }

            CollectionManager._loadStencil(definitionFile, parser, isSystem ? true : false);
        }
    } catch (e) {
        Console.dumpError(e);
    }
    */
};

CollectionManager.loadStencils = function() {
    CollectionManager.shapeDefinition.collections = [];
    CollectionManager.shapeDefinition.shapeDefMap = { };

    //load all system stencils
    var parser = new ShapeDefCollectionParser();
    CollectionManager.addShapeDefCollection(parser.parseURL("stencils/Common/Definition.xml"));
    CollectionManager.addShapeDefCollection(parser.parseURL("stencils/BasicWebElements/Definition.xml"));
    CollectionManager.addShapeDefCollection(parser.parseURL("stencils/SketchyGUI/Definition.xml"));

    CollectionManager.addShapeDefCollection(parser.parseURL("stencils/CommonShapes_BasicShapes/Definition.xml"));
    CollectionManager.addShapeDefCollection(parser.parseURL("stencils/CommonShapes_BlockArrow/Definition.xml"));
    CollectionManager.addShapeDefCollection(parser.parseURL("stencils/CommonShapes_Flowchart/Definition.xml"));
    CollectionManager.addShapeDefCollection(parser.parseURL("stencils/ExtJSKitchenSink_Neptune/Definition.xml"));
    CollectionManager.addShapeDefCollection(parser.parseURL("stencils/iOS7/Definition.xml"));
    // CollectionManager.addShapeDefCollection(parser.parseURL("stencils/Windows7/Definition.xml"));

    /*
    if (navigator.userAgent.indexOf("Firefox") < 0) {
        CollectionManager._loadUserDefinedStencilsIn(CollectionManager.getSpecialDirs("CurProcD", "content/pencil/stencil"),
        "Common, Annotation, BasicWebElements, SketchyGUI, Gtk.GUI, WindowsXP-GUI, Native.GUI", "isSystem");
    }

    //CollectionManager.addShapeDefCollection(parser.parseURL("stencil/iPhone/Definition.xml"));

    CollectionManager._loadUserDefinedStencilsIn(CollectionManager.getSpecialDirs("ProfD", "Pencil/Stencils"));
    CollectionManager.shapeDefinition.collections = CollectionManager.shapeDefinition.collections.sort(function (a, b) {
    	if (a.id == "Evolus.Common") return -1;
    	return a.displayName > b.displayName ? 1 : (a.displayName < b.displayName ? -1 : 0);
    });
    CollectionManager._loadDeveloperStencil();

    PrivateCollectionManager.loadPrivateCollections();
    Pencil.collectionPane.reloadCollections();
    Pencil.privateCollectionPane.reloadCollections();
    */

    CollectionManager._loadUserDefinedStencilsIn(Config.getDataFilePath(Config.STENCILS_DIR_NAME));
    CollectionManager.shapeDefinition.collections = CollectionManager.shapeDefinition.collections.sort(function (a, b) {
        if (a.usage != b.usage) return a.usage > b.usage ? -1 : (a.usage < b.usage ? 1 : 0);
    	if (a.id == "Evolus.Common") return -1;
    	return a.displayName > b.displayName ? 1 : (a.displayName < b.displayName ? -1 : 0);
    });
    CollectionManager._loadDeveloperStencil();
    CollectionManager.reloadCollectionPane();
};
CollectionManager.reloadCollectionPane = function () {
    Pencil.collectionPane.loaded = false;
    Pencil.collectionPane.reload();
};
CollectionManager.installNewCollection = function (callback) {
    /*
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, Util.getMessage("filepicker.open.document"), nsIFilePicker.modeOpen);
    fp.appendFilter(Util.getMessage("filepicker.pencil.collection.archives"), "*.epc; *.zip");
    fp.appendFilter(Util.getMessage("filepicker.all.files"), "*");

    if (fp.show() != nsIFilePicker.returnOK) return;
    */

    var files = dialog.showOpenDialog({
        title: "Install from",
        defaultPath: os.homedir(),
        filters: [
            { name: "Stencil files", extensions: ["zip", "epc"] }
        ]

    }, function (filenames) {
        if (!filenames || filenames.length <= 0) return;
        CollectionManager.installCollectionFromFilePath(filenames[0], callback);
    });
};

CollectionManager.installCollectionFromFile = function (file, callback) {
    ApplicationPane._instance.busy();
    var filePath = file.path;
    var fileName = file.name.replace(/\.[^\.]+$/, "") + "_" + Math.ceil(Math.random() * 1000) + "_" + (new Date().getTime());

    var targetDir = path.join(CollectionManager.getUserStencilDirectory(), fileName);
    console.log("targetPath:", targetDir);

    var extractor = unzip.Extract({ path: targetDir });
    extractor.on("close", function () {
        try {
            var definitionFile = path.join(targetDir, "Definition.xml");
            if (!fs.existsSync(definitionFile)) throw Util.getMessage("collection.specification.is.not.found.in.the.archive");

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

                CollectionManager.setCollectionVisible(collection, true);
                CollectionManager.setCollectionCollapsed(collection, false);

                CollectionManager.addShapeDefCollection(collection);
                CollectionManager.loadStencils();
                if (callback) callback();
                ApplicationPane._instance.unbusy();
            } else {
                throw Util.getMessage("collection.specification.is.not.found.in.the.archive");
            }
        } catch (e) {
            console.log("error:", e);
            Dialog.error("Error installing collection.");
            //CollectionManager.removeCollectionDir(targetDir);
            ApplicationPane._instance.unbusy();
        }
    });
    fs.createReadStream(filePath).pipe(extractor);
};
CollectionManager.installCollectionFromFile_old = function (file) {
    var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
                   .createInstance(Components.interfaces.nsIZipReader);
    zipReader.open(file);

    var targetDir = CollectionManager.getUserStencilDirectory();
    //generate a random number
    targetDir.append(file.leafName.replace(/\.[^\.]+$/, "") + "_" + Math.ceil(Math.random() * 1000) + "_" + (new Date().getTime()));

    var targetPath = targetDir.path;

    var isWindows = true;
    if (navigator.platform.indexOf("Windows") < 0) {
        isWindows = false;
    }

    var entryEnum = zipReader.findEntries(null);
    while (entryEnum.hasMore()) {
        var entry = entryEnum.getNext();

        var targetFile = Components.classes["@mozilla.org/file/local;1"]
                   .createInstance(Components.interfaces.nsILocalFile);
        targetFile.initWithPath(targetPath);

        debug(entry);
        if (zipReader.getEntry(entry).isDirectory) continue;

        var parts = entry.split("\\");
        if (parts.length == 1) {
            parts = entry.split("/");
        } else {
            var testParts = entry.split("/");
            if (testParts.lenth > 1) {
                debug("unregconized entry (bad name): " + entry);
                continue;
            }
        }
        for (var i = 0; i < parts.length; i ++) {
            targetFile.append(parts[i]);
        }

        debug("Extracting '" + entry + "' --> " + targetFile.path + "...");

        var parentDir = targetFile.parent;
        if (!parentDir.exists()) {
            parentDir.create(parentDir.DIRECTORY_TYPE, 0777);
        }
        zipReader.extract(entry, targetFile);
        targetFile.permissions = 0600;
    }
    var extractedDir = Components.classes["@mozilla.org/file/local;1"]
                   .createInstance(Components.interfaces.nsILocalFile);

    extractedDir.initWithPath(targetPath);

    //try loading the collection
    try {
        var definitionFile = Components.classes["@mozilla.org/file/local;1"]
                       .createInstance(Components.interfaces.nsILocalFile);

        definitionFile.initWithPath(targetPath);
        definitionFile.append("Definition.xml");

        if (!definitionFile.exists()) throw Util.getMessage("collection.specification.is.not.found.in.the.archive");

        var uri = ios.newFileURI(definitionFile);

        var parser = new ShapeDefCollectionParser();
        var collection = parser.parseFile(definitionFile, uri.spec);

        if (collection && collection.id) {
            //check for duplicate of name
            for (i in CollectionManager.shapeDefinition.collections) {
                var existingCollection = CollectionManager.shapeDefinition.collections[i];
                if (existingCollection.id == collection.id) {
                    throw Util.getMessage("collection.named.already.installed", collection.id);
                }
            }
            collection.userDefined = true;
            if (!Util.confirmWithWarning(Util.getMessage("install.the.unsigned.collection.confirm", collection.displayName),
                                         new RichText(Util.getMessage("install.the.unsigned.collection.discription")), Util.getMessage("button.install.label"))) {
                extractedDir.remove(true);
                return;
            }

            CollectionManager.setCollectionVisible(collection, true);
            CollectionManager.setCollectionCollapsed(collection, false);

            CollectionManager.addShapeDefCollection(collection);
            CollectionManager.loadStencils();
        } else {
            throw Util.getMessage("collection.specification.is.not.found.in.the.archive");
        }
    } catch (e) {
        Util.error(Util.getMessage("error.installing.collection"), e.message, Util.getMessage("button.close.label"));
        //removing the extracted dir
        extractedDir.remove(true);
        return;
    }
};
CollectionManager.installCollectionFromFilePath = function (filePath, callback) {
    var file = {
        path: filePath,
        name: path.basename(filePath)
    };
    CollectionManager.installCollectionFromFile(file, callback);

    /*
    var file = Components.classes["@mozilla.org/file/local;1"]
                   .createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(filePath);

    CollectionManager.installCollectionFromFile(file);
    */
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
        verbose: true
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

        CollectionManager.installCollectionFromFilePath(filepath, () => {
            NotificationPopup.show("Collection installed successful.");
            callback();
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
CollectionManager.setCollectionUsage = function (collection, value) {
    collection.usage = value;
    Config.set("Collection." + collection.id + ".usage", value);
};
CollectionManager.getCollectionUsage = function (collection) {
    collection.usage = value;
    var value = Config.get("Collection." + collection.id + ".usage");
    if (value) return parseInt(value, 10);
    return 0;
};
CollectionManager.setLastUsedCollection = function (collection) {
    Config.set("Collection.lastUsedCollection.id", collection.id);
};
CollectionManager.getLastUsedCollection = function () {
    return Config.get("Collection.lastUsedCollection.id");
};

CollectionManager.removeCollectionDir = function (targetDir, onRemoved) {
    var deleteFolderRecursive = function(path) {
        if( fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function (file, index) {
                var curPath = path + "/" + file;
                if(fs.lstatSync(curPath).isDirectory()) { // recurse
                    deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);

            if (onRemoved) onRemoved();
        }
    };

    deleteFolderRecursive(targetDir);
};
CollectionManager.uninstallCollection = function (collection) {
    if (!collection.installDirPath || !collection.userDefined) return;
    ApplicationPane._instance.busy();
    CollectionManager.removeCollectionDir(collection.installDirPath, function () {
        CollectionManager.loadStencils();
        ApplicationPane._instance.unbusy();
    });

    /*
    if (!collection.installDirPath || !collection.userDefined) return;
    if (!Util.confirm(Util.getMessage("uninstall.the.collection.confirm", collection.displayName),
                      Util.getMessage("uninstall.the.collection.discription", collection.displayName))) return;
    var dir = Components.classes["@mozilla.org/file/local;1"]
                   .createInstance(Components.interfaces.nsILocalFile);
    dir.initWithPath(collection.installDirPath);

    dir.remove(true);
    CollectionManager.loadStencils();
    */
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
    CollectionManager.loadStencils();
    NotificationPopup.show("Developer stencil is unloaded.");
};
