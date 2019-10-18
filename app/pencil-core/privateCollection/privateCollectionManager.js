var PrivateCollectionManager = {};

PrivateCollectionManager.privateShapeDef = {};
PrivateCollectionManager.privateShapeDef.shapeDefMap = {};
PrivateCollectionManager.privateShapeDef.collections = [];
PrivateCollectionManager.privateShapeDef.builtinCollections = [];

PrivateCollectionManager.loadPrivateCollections = function () {

    try {
        var privateCollectionXmlLocation = path.join(PrivateCollectionManager.getPrivateCollectionDirectory(), "PrivateCollection.xml");

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
    } catch (ex) {
        Console.dumpError(ex);
    }
};

PrivateCollectionManager.savePrivateCollections = function () {
    try {
        debug("saving private collections...");
        var xml = PrivateCollectionManager.getCollectionsExportedXML(PrivateCollectionManager.privateShapeDef.collections);
        
        var privateCollectionFile = PrivateCollectionManager.getPrivateCollectionFile();
        fs.writeFileSync(privateCollectionFile, xml, ShapeDefCollectionParser.CHARSET);
    } catch (ex) {
        Console.dumpError(ex);
    }
};

PrivateCollectionManager.addShapeCollection = function (collection, dontUpdate) {
    // collection.collapsed = CollectionManager.isCollectionCollapsed(collection);
    PrivateCollectionManager.privateShapeDef.collections.push(collection);
    for (var item in collection.shapeDefs) {
        var shapeDef = collection.shapeDefs[item];
        shapeDef.collection = collection;
        PrivateCollectionManager.privateShapeDef.shapeDefMap[shapeDef.id] = shapeDef;
    }
    if (!dontUpdate) {
        PrivateCollectionManager.savePrivateCollections();
        PrivateCollectionManager.reloadCollectionPane(collection.id);
        //PrivateCollectionManager.openCollectionPane(collection);
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
        PrivateCollectionManager.reloadCollectionPane(collection.id);
    }
};
PrivateCollectionManager.reloadCollectionPane = function (collectionId) {
    Pencil.privateCollectionPane.loaded = false;
    if (collectionId) {
        Pencil.privateCollectionPane.openCollectionPane(collectionId);
    } else {
        Pencil.privateCollectionPane.reload();
    }
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
        window.setTimeout(function() {
            ApplicationPane._instance.busy();
        }, 10)
        for (var i = 0; i < PrivateCollectionManager.privateShapeDef.collections.length; i++) {
            if (PrivateCollectionManager.privateShapeDef.collections[i].id == collection.id) {
                PrivateCollectionManager.privateShapeDef.collections.splice(i, 1);
                PrivateCollectionManager.savePrivateCollections();
                PrivateCollectionManager.reloadCollectionPane();
                window.setTimeout(function() {
                    ApplicationPane._instance.unbusy();
                }, 10)
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
PrivateCollectionManager.getCollectionsExportedXML = function (collections) {
    var xml = '<?xml version="1.0"?>\n' +
                '<p:Collections xmlns="http://www.w3.org/2000/svg"\n' +
                  '\txmlns:xul="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"\n' +
                  '\txmlns:html="http://www.w3.org/1999/xhtml"\n' +
                  '\txmlns:svg="http://www.w3.org/2000/svg"\n' +
                  '\txmlns:xlink="http://www.w3.org/1999/xlink"\n' +
                  '\txmlns:p="http://www.evolus.vn/Namespace/Pencil">\n';

    for (var i = 0; i < collections.length; i++) {
        xml += collections[i].toXMLDom();
    }

    xml += '</p:Collections>';
    
    return xml;
};

PrivateCollectionManager.exportCollection = function (collection) {
    try {
        debug("exporting collection " + collection.displayName);
        var fileName = collection.displayName + ".zip";
        var xml = PrivateCollectionManager.getCollectionsExportedXML([collection]);

        dialog.showSaveDialog({
            title: "Save as",
            defaultPath: path.join(os.homedir(), fileName),
            filters: [
                { name: "Pencil Documents", extensions: ["zip"] }
            ]
        }, function (filePath) {
            if (!filePath) return;
            ApplicationPane._instance.busy();
            var tempDir = tmp.dirSync({ keep: false, unsafeCleanup: true });
            try {
                var tempFilePath = path.join(tempDir.name, "Definition.xml");
                fs.writeFileSync(tempFilePath, xml, ShapeDefCollectionParser.CHARSET);

                var archiver = require("archiver");
                var archive = archiver("zip");
                var output = fs.createWriteStream(filePath);
                output.on("close", function () {
                    ApplicationPane._instance.unbusy();
                    Dialog.alert("Collection has been exported.");
                    tempDir.removeCallback();
                });
                archive.pipe(output);
                archive.directory(tempDir.name, "/", {});
                archive.finalize();
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
        defaultPath: Config.get("privateCollection.install.recentlyDirPath", null) || os.homedir(),
        filters: [
            { name: "Pencil Collection Archives (*.epc; *.zip)", extensions: ["zip", "epc"] }
        ]

    }, function (filenames) {
        if (!filenames || filenames.length <= 0) return;
        var file = {
            path: filenames[0],
            name: path.basename(filenames[0])
        };
        Config.set("privateCollection.install.recentlyDirPath", path.dirname(filenames[0]));
        PrivateCollectionManager.installCollectionFromFile(file);
    });
};
PrivateCollectionManager.parseSingleCollectionFile = function (definitionFile) {
    var collection = null;

    var fileContents = fs.readFileSync(definitionFile, ShapeDefCollectionParser.CHARSET);
    var domParser = new DOMParser();
    var dom = domParser.parseFromString(fileContents, "text/xml");
    if (dom != null) {
        var dom = dom.documentElement;
        var parser = new PrivateShapeDefParser();
        Dom.workOn("./p:Collection", dom, function (node) {
            collection = parser.parseNode(node);
        });
    };
    
    return collection;
};
PrivateCollectionManager.installCollectionFromFile = function (file) {
    ApplicationPane._instance.busy();
    var filePath = file.path;
    var fileName = file.name.replace(/\.[^\.]+$/, "") + "_" + Math.ceil(Math.random() * 1000) + "_" + (new Date().getTime());

    var tempDir = tmp.dirSync({ keep: false, unsafeCleanup: true });
    var targetDir = path.join(tempDir.name, fileName);
    console.log("targetPath:", targetDir);

    var admZip = require('adm-zip');

    var zip = new admZip(filePath);
    zip.extractAllToAsync(targetDir, true, function (err) {
        if (err) {
            ApplicationPane._instance.unbusy();
            Dialog.error("Error installing collection.");
            tempDir.removeCallback();
        } else {
            //try loading the collection
            try {
                var definitionFile = path.join(targetDir, "Definition.xml");
                if (!fs.existsSync(definitionFile)) throw Util.getMessage("collection.specification.is.not.found.in.the.archive");

                var collection = PrivateCollectionManager.parseSingleCollectionFile(definitionFile);

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
                            // CollectionManager.setCollectionCollapsed(collection, false);
                            PrivateCollectionManager.addShapeCollection(collection);
                            tempDir.removeCallback();
                        }, "Cancel", function () {
                            tempDir.removeCallback();
                        }
                    );
                } else {
                    throw Util.getMessage("collection.specification.is.not.found.in.the.archive");
                }
            } catch (e) {
                Dialog.error("Error installing collection.");
            } finally {
                ApplicationPane._instance.unbusy();
                tempDir.removeCallback();
            }
        }
    });

    // var extractor = unzip.Extract({ path: targetDir });
    // extractor.on("close", function () {

    //     //try loading the collection
    //     try {
    //         var definitionFile = path.join(targetDir, "Definition.xml");
    //         if (!fs.existsSync(definitionFile)) throw Util.getMessage("collection.specification.is.not.found.in.the.archive");

    //         var fileContents = fs.readFileSync(definitionFile, ShapeDefCollectionParser.CHARSET);

    //         var domParser = new DOMParser();

    //         var collection = null;
    //         var dom = domParser.parseFromString(fileContents, "text/xml");
    //         if (dom != null) {
    //             var dom = dom.documentElement;
    //             var parser = new PrivateShapeDefParser();
    //             Dom.workOn("./p:Collection", dom, function (node) {
    //                 collection = parser.parseNode(node);
    //             });
    //         };

    //         if (collection && collection.id) {
    //             //check for duplicate of name
    //             for (i in PrivateCollectionManager.privateShapeDef.collections) {
    //                 var existingCollection = PrivateCollectionManager.privateShapeDef.collections[i];
    //                 if (existingCollection.id == collection.id) {
    //                     throw Util.getMessage("collection.named.already.installed", collection.id);
    //                 }
    //             }

    //             Dialog.confirm("Are you sure you want to install the unsigned collection: " + collection.displayName + "?",
    //                 "Since a collection may contain execution code that could harm your machine. It is hightly recommanded that you should only install collections from authors whom you trust.",
    //                 "Install", function () {
    //                     // CollectionManager.setCollectionCollapsed(collection, false);
    //                     PrivateCollectionManager.addShapeCollection(collection);
    //                     tempDir.removeCallback();
    //                 }, "Cancel", function () {
    //                     tempDir.removeCallback();
    //                 }
    //             );
    //         } else {
    //             throw Util.getMessage("collection.specification.is.not.found.in.the.archive");
    //         }
    //     } catch (e) {
    //         Dialog.error("Error installing collection.");
    //     } finally {
    //         ApplicationPane._instance.unbusy();
    //         tempDir.removeCallback();
    //     }
    // }).on("error", function (error) {
    //     ApplicationPane._instance.unbusy();
    //     Dialog.error("Error installing collection.");
    //     tempDir.removeCallback();
    // });

    // fs.createReadStream(filePath).pipe(extractor);
};
PrivateCollectionManager.setLastUsedCollection = function (collection) {
    Config.set("PrivateCollection.lastUsedCollection.id", collection.id);
};
PrivateCollectionManager.getLastUsedCollection = function () {
    return Config.get("PrivateCollection.lastUsedCollection.id");
};
