var PrivateCollectionManager = {};

PrivateCollectionManager.privateShapeDef = {};
PrivateCollectionManager.privateShapeDef.shapeDefMap = {};
PrivateCollectionManager.privateShapeDef.collections = [];

PrivateCollectionManager.loadPrivateCollections = function () {

    try {
        var privateCollectionXmlLocation = path.join(PrivateCollectionManager.getPrivateCollectionDirectory(), "PrivateCollection.xml");
        debug("loading private collections: " + privateCollectionXmlLocation.path);

        // privateCollectionXmlLocation.append("PrivateCollection.xml");
        var stat = fs.statSync(privateCollectionXmlLocation);
        if (!stat) return;

        // var fileContents = FileIO.read(privateCollectionXmlLocation, ShapeDefCollectionParser.CHARSET);
        var fileContents = fs.readFileSync(privateCollectionXmlLocation, ShapeDefCollectionParser.CHARSET);
        var domParser = new DOMParser();

        var dom = domParser.parseFromString(fileContents, "text/xml");
        if (dom != null) {
            PrivateCollectionManager.privateShapeDef.collections = [];
            var dom = dom.documentElement;
            var parser = new PrivateShapeDefParser();
            Dom.workOn("./p:Collection", dom, function (node) {
                PrivateCollectionManager.addShapeCollection(parser.parseNode(node), true);
            });
        }
        console.log("loadPrivateCollections:", PrivateCollectionManager.privateShapeDef.collections);
    } catch (ex) {
        Console.dumpError(ex);
    }
};

PrivateCollectionManager.savePrivateCollections = function () {
    console.log("savePrivateCollections");
    try {
        debug("saving private collections...");
        var xml = '<?xml version="1.0"?>\n' +
                    '<p:Collections xmlns="http://www.w3.org/2000/svg"\n' +
                      '\txmlns:xul="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"\n' +
                      '\txmlns:html="http://www.w3.org/1999/xhtml"\n' +
                      '\txmlns:svg="http://www.w3.org/2000/svg"\n' +
                      '\txmlns:xlink="http://www.w3.org/1999/xlink"\n' +
                      '\txmlns:p="http://www.evolus.vn/Namespace/Pencil">\n';

        for (var i = 0; i < PrivateCollectionManager.privateShapeDef.collections.length; i++) {
            xml += PrivateCollectionManager.privateShapeDef.collections[i].toXMLDom();
        }

        xml += '</p:Collections>';
        //debug(xml);

        // var f = FileIO.open(PrivateCollectionManager.getPrivateCollectionFile());
        // FileIO.create(f);
        // FileIO.write(f, xml);
        var privateCollectionFile = PrivateCollectionManager.getPrivateCollectionFile();
        var ws = fs.createWriteStream(privateCollectionFile);
        ws.write(xml, ShapeDefCollectionParser.CHARSET);
        // fs.writeFileSync(privateCollectionFile, xml, ShapeDefCollectionParser.CHARSET);
    } catch (ex) {
        Console.dumpError(ex);
    }
};

PrivateCollectionManager.addShapeCollection = function (collection, dontUpdate) {
    collection.collapsed = CollectionManager.isCollectionCollapsed(collection);
    PrivateCollectionManager.privateShapeDef.collections.push(collection);
    for (var item in collection.shapeDefs) {
        var shapeDef = collection.shapeDefs[item];
        shapeDef.collection = collection;
        PrivateCollectionManager.privateShapeDef.shapeDefMap[shapeDef.id] = shapeDef;
    }
    if (!dontUpdate) {
        PrivateCollectionManager.savePrivateCollections();
        PrivateCollectionManager.reloadCollectionPane();
    }
};
PrivateCollectionManager.getPrivateCollectionFile = function () {
    var privateDir = PrivateCollectionManager.getPrivateCollectionDirectory();
    try {
        fs.statSync(privateDir);
    } catch (e) {
        fs.mkdirSync(privateDir);
    }
    return path.join(PrivateCollectionManager.getPrivateCollectionDirectory(), "PrivateCollection.xml");
};
PrivateCollectionManager.getPrivateCollectionDirectory = function () {
    // var properties = Components.classes["@mozilla.org/file/directory_service;1"]
    //                  .getService(Components.interfaces.nsIProperties);
    //
    // var stencilDir = properties.get("ProfD", Components.interfaces.nsIFile);

    // stencilDir.append("Pencil");
    // stencilDir.append("PrivateCollection");

    return Config.getDataFilePath(Config.PRIVATE_STENCILS_DIR_NAME);
};

PrivateCollectionManager.locateShapeDefinition = function (defId) {
    return PrivateCollectionManager.privateShapeDef.shapeDefMap[defId];
};
PrivateCollectionManager.addShapeToCollection = function (collection, shapeDef, dontUpdate) {
    shapeDef.collection = collection;
    collection.shapeDefs.push(shapeDef);
    PrivateCollectionManager.privateShapeDef.shapeDefMap[shapeDef.id] = shapeDef;
    if (!dontUpdate) {
        PrivateCollectionManager.savePrivateCollections();
        PrivateCollectionManager.reloadCollectionPane();
    }
};
PrivateCollectionManager.reloadCollectionPane = function () {
    Pencil.privateCollectionPane.reload();
};
PrivateCollectionManager.deleteShape = function (collection, shapeDef) {
    Dialog.confirm("Are you sure you want to delete '" + shapeDef.displayName + "'?",
    "Warning: deleting a shape makes shapes created by that shape uneditable.",
    "OK", function () {
        for (var i = 0; i < PrivateCollectionManager.privateShapeDef.collections.length; i++) {
            if (PrivateCollectionManager.privateShapeDef.collections[i].id == collection.id) {
                PrivateCollectionManager.privateShapeDef.collections[i].deleteShape(shapeDef);
                PrivateCollectionManager.savePrivateCollections();
                PrivateCollectionManager.reloadCollectionPane();
                return;
            }
        }
    }, "Cancel", function () {});

};
PrivateCollectionManager.deleteCollection = function (collection) {
    Dialog.confirm("Are you sure you want to delete '" + collection.displayName + "'?",
    "Warning: deleting a collection makes shapes created by that collection uneditable.",
    "OK", function () {
        for (var i = 0; i < PrivateCollectionManager.privateShapeDef.collections.length; i++) {
            if (PrivateCollectionManager.privateShapeDef.collections[i].id == collection.id) {
                PrivateCollectionManager.privateShapeDef.collections.splice(i, 1);
                PrivateCollectionManager.savePrivateCollections();
                PrivateCollectionManager.reloadCollectionPane();
                return;
            }
        }
    }, "Cancel", function () {});

};
PrivateCollectionManager.deleteAllCollection = function () {
    Dialog.confirm("Are you sure you want to delete all private collections?",
    "Warning: deleting a collection makes shapes created by that collection uneditable.",
    "OK", function () {
        PrivateCollectionManager.privateShapeDef.collections = [];
        PrivateCollectionManager.savePrivateCollections();
        PrivateCollectionManager.reloadCollectionPane();
    }, "Cancel", function () {});
};
PrivateCollectionManager.exportCollection = function (collection) {
    try {
        debug("exporting collection " + collection.displayName);
        var fileName = collection.displayName + ".zip";
        var xml = '<?xml version="1.0"?>\n' +
                    '<p:Collections xmlns="http://www.w3.org/2000/svg"\n' +
                      '\txmlns:xul="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"\n' +
                      '\txmlns:html="http://www.w3.org/1999/xhtml"\n' +
                      '\txmlns:svg="http://www.w3.org/2000/svg"\n' +
                      '\txmlns:xlink="http://www.w3.org/1999/xlink"\n' +
                      '\txmlns:p="http://www.evolus.vn/Namespace/Pencil">\n' + collection.toXMLDom() + "</p:Collections>";

        // var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
        //                             .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        // converter.charset = "UTF-8";
        // var stream = converter.convertToInputStream(xml);
        //
        // var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
        // var zipW = new zipWriter();
        //
        // zipW.open(fp.file, 0x04 | 0x08 | 0x20 /*PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE*/);
        // zipW.comment = "Private collection";
        // zipW.addEntryStream("Definition.xml", new Date(), Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, stream, false);
        // if (stream) {
        //     stream.close();
        // }
        // zipW.close();
        // Util.info(Util.getMessage("info.title"), Util.getMessage("collection.has.been.exported", collection.displayName), Util.getMessage("button.cancel.close"));
        dialog.showSaveDialog({
            title: "Save as",
            defaultPath: path.join(os.homedir(), fileName),
            filters: [
                { name: "Pencil Documents", extensions: ["zip"] }
            ]
        }, function (filePath) {
            if (!filePath) return;
            ApplicationPane._instance.busy();
            console.log("filePath:", filePath);
            function archiveFile (dirName, onSaved) {
                console.log("archiveFile");
                var archiver = require("archiver");
                var archive = archiver("zip");
                var output = fs.createWriteStream(filePath);
                output.on("close", function () {
                    console.log("on close");
                    ApplicationPane._instance.unbusy();
                    if (onSaved) onSaved();
                });
                archive.pipe(output);
                archive.directory(dirName, "/", {});
                archive.finalize();
            }

            var tempDir = tmp.dirSync({ keep: false, unsafeCleanup: true });
            try {
                var tempFilePath = path.join(tempDir.name, "Definition.xml");
                console.log("tempFilePath:", tempFilePath);
                var ws = fs.createWriteStream(tempFilePath);

                ws.write(xml);
                ws.end();
                ws.on("finish", function () {
                    console.log("onfinish");
                    archiveFile(tempDir.name, function () {
                        tempDir.removeCallback();
                    });
                });
            } catch (e) {
                tempDir.removeCallback();
            }
        });
    } catch (e) {
        Console.dumpError(e);
    }
};
PrivateCollectionManager.importNewCollection = function () {
    var files = dialog.showOpenDialog({
        title: "Install from",
        defaultPath: os.homedir(),
        filters: [
            { name: "Pencil Collection Archives (*.epc; *.zip)", extensions: ["zip", "epc"] }
        ]

    }, function (filenames) {
        if (!filenames || filenames.length <= 0) return;
        var file = {
            path: filenames[0],
            name: path.basename(filenames[0])
        };
        PrivateCollectionManager.installCollectionFromFile(file);
    });
};
PrivateCollectionManager.installCollectionFromFile = function (file) {
    console.log("installCollectionFromFile:", file);
    var filePath = file.path;
    var fileName = file.name.replace(/\.[^\.]+$/, "") + "_" + Math.ceil(Math.random() * 1000) + "_" + (new Date().getTime());

    var tempDir = tmp.dirSync({ keep: false, unsafeCleanup: true });
    var targetDir = path.join(tempDir.name, fileName);
    console.log("targetPath:", targetDir);

    var extractor = unzip.Extract({ path: targetDir });
    extractor.on("close", function () {

        console.log("onClose");
        //try loading the collection
        try {
            var definitionFile = path.join(targetDir, "Definition.xml");
            if (!fs.existsSync(definitionFile)) throw Util.getMessage("collection.specification.is.not.found.in.the.archive");

            var fileContents = fs.readFileSync(definitionFile, ShapeDefCollectionParser.CHARSET);
            console.log("fileContents:", fileContents);
            var domParser = new DOMParser();

            var collection = null;
            var dom = domParser.parseFromString(fileContents, "text/xml");
            console.log("dom:", dom);
            if (dom != null) {
                var dom = dom.documentElement;
                var parser = new PrivateShapeDefParser();
                Dom.workOn("./p:Collection", dom, function (node) {
                    collection = parser.parseNode(node);
                });
            };

            console.log("collection:", collection);

            if (collection && collection.id) {
                //check for duplicate of name
                for (i in PrivateCollectionManager.privateShapeDef.collections) {
                    var existingCollection = PrivateCollectionManager.privateShapeDef.collections[i];
                    if (existingCollection.id == collection.id) {
                        throw Util.getMessage("collection.named.already.installed", collection.id);
                    }
                }

                Dialog.confirm("Are you sure you want to install the unsigned collection: " + collection.displayName + "?",
                    "Since a collection may contain execution code that could harm your machine. It is hightly recommanded that you should only install collections from authors whom you trust.",
                    "Install", function () {
                        CollectionManager.setCollectionCollapsed(collection, false);
                        PrivateCollectionManager.addShapeCollection(collection);
                        tempDir.removeCallback();
                    }, "Cancel", function () {
                        tempDir.removeCallback();
                    }
                );

                // if (Util.confirmWithWarning(Util.getMessage("install.the.unsigned.collection.confirm", collection.displayName),
                //                              new RichText(Util.getMessage("install.the.unsigned.collection.discription")), Util.getMessage("button.install.label"))) {
                    // CollectionManager.setCollectionCollapsed(collection, false);
                    // PrivateCollectionManager.addShapeCollection(collection);
                // }
            } else {
                throw Util.getMessage("collection.specification.is.not.found.in.the.archive");
            }
        } catch (e) {
            console.log("error:", e.message);
            Dialog.error(e.message);
            Util.error(Util.getMessage("error.installing.collection"), e.message, Util.getMessage("button.close.label"));
        } finally {
            tempDir.removeCallback();
        }
    }).on("error", function (error) {
        console.log("error:", error);
    });

    fs.createReadStream(filePath).pipe(extractor);
};
PrivateCollectionManager.setLastUsedCollection = function (collection) {
    Config.set("PrivateCollection.lastUsedCollection.id", collection.id);
};
PrivateCollectionManager.getLastUsedCollection = function () {
    return Config.get("PrivateCollection.lastUsedCollection.id");
};
