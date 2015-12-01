var PrivateCollectionManager = {};

PrivateCollectionManager.privateShapeDef = {};
PrivateCollectionManager.privateShapeDef.shapeDefMap = {};
PrivateCollectionManager.privateShapeDef.collections = [];

PrivateCollectionManager.loadPrivateCollections = function () {

    try {
        var privateCollectionXmlLocation = PrivateCollectionManager.getPrivateCollectionDirectory();
        debug("loading private collections: " + privateCollectionXmlLocation.path);

        privateCollectionXmlLocation.append("PrivateCollection.xml");
        if (!privateCollectionXmlLocation.exists()) return;

        var fileContents = FileIO.read(privateCollectionXmlLocation, ShapeDefCollectionParser.CHARSET);
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

        var f = FileIO.open(PrivateCollectionManager.getPrivateCollectionFile());
        FileIO.create(f);
        FileIO.write(f, xml);
    } catch (ex) {
        Console.dumpError(ex);
    }
};

PrivateCollectionManager.addShapeCollection = function (collection, dontUpdate) {
    collection.collapsed = CollectionManager.isCollectionCollapsed(collection);
    PrivateCollectionManager.privateShapeDef.collections.push(collection);
    for (var item in collection.shapeDefs) {
        var shapeDef = collection.shapeDefs[item];
        PrivateCollectionManager.privateShapeDef.shapeDefMap[shapeDef.id] = shapeDef;
    }
    if (!dontUpdate) {
        PrivateCollectionManager.savePrivateCollections();
        PrivateCollectionManager.reloadCollectionPane();
    }
};
PrivateCollectionManager.getPrivateCollectionFile = function () {
    var privateCollectionXmlLocation = PrivateCollectionManager.getPrivateCollectionDirectory();
    privateCollectionXmlLocation.append("PrivateCollection.xml");
    return privateCollectionXmlLocation.path;
};
PrivateCollectionManager.getPrivateCollectionDirectory = function () {
    var properties = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties);

    var stencilDir = properties.get("ProfD", Components.interfaces.nsIFile);

    stencilDir.append("Pencil");
    stencilDir.append("PrivateCollection");

    return stencilDir;
};

PrivateCollectionManager.locateShapeDefinition = function (defId) {
    return PrivateCollectionManager.privateShapeDef.shapeDefMap[defId];
};
PrivateCollectionManager.addShapeToCollection = function (collection, shapeDef, dontUpdate) {
    collection.shapeDefs.push(shapeDef);
    PrivateCollectionManager.privateShapeDef.shapeDefMap[shapeDef.id] = shapeDef;
    if (!dontUpdate) {
        PrivateCollectionManager.savePrivateCollections();
        PrivateCollectionManager.reloadCollectionPane();
    }
};
PrivateCollectionManager.reloadCollectionPane = function () {
    Pencil.privateCollectionPane.reloadCollections();
};
PrivateCollectionManager.deleteShape = function (collection, shapeDef) {
    if (!Util.confirm(Util.getMessage("delete.private.shape.confirm", shapeDef.displayName),
                      Util.getMessage("delete.private.shape.discription"))) return;
    for (var i = 0; i < PrivateCollectionManager.privateShapeDef.collections.length; i++) {
        if (PrivateCollectionManager.privateShapeDef.collections[i].id == collection.id) {
            PrivateCollectionManager.privateShapeDef.collections[i].deleteShape(shapeDef);
            PrivateCollectionManager.savePrivateCollections();
            PrivateCollectionManager.reloadCollectionPane();
            return;
        }
    }
};
PrivateCollectionManager.deleteCollection = function (collection) {
    if (!Util.confirm(Util.getMessage("delete.private.collection.confirm", collection.displayName),
                      Util.getMessage("delete.private.collection.discription"))) return;
    for (var i = 0; i < PrivateCollectionManager.privateShapeDef.collections.length; i++) {
        if (PrivateCollectionManager.privateShapeDef.collections[i].id == collection.id) {
            PrivateCollectionManager.privateShapeDef.collections.splice(i, 1);
            PrivateCollectionManager.savePrivateCollections();
            PrivateCollectionManager.reloadCollectionPane();
            return;
        }
    }
};
PrivateCollectionManager.deleteAllCollection = function () {
    if (!Util.confirm(Util.getMessage("delete.all.private.collections.confirm"),
                      Util.getMessage("delete.all.private.collections.discription"))) return;

    PrivateCollectionManager.privateShapeDef.collections = [];
    PrivateCollectionManager.savePrivateCollections();
    PrivateCollectionManager.reloadCollectionPane();
};
PrivateCollectionManager.exportCollection = function (collection) {
    try {
        debug("exporting collection " + collection.displayName);


        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, Util.getMessage("select.a.file"), nsIFilePicker.modeSave);
        fp.appendFilters(nsIFilePicker.filterAll);
        fp.defaultExtension = "zip";
        fp.defaultString = collection.displayName + ".zip";
        if (fp.show() == nsIFilePicker.returnCancel) return false;

        var xml = '<?xml version="1.0"?>\n' +
                    '<p:Collections xmlns="http://www.w3.org/2000/svg"\n' +
                      '\txmlns:xul="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"\n' +
                      '\txmlns:html="http://www.w3.org/1999/xhtml"\n' +
                      '\txmlns:svg="http://www.w3.org/2000/svg"\n' +
                      '\txmlns:xlink="http://www.w3.org/1999/xlink"\n' +
                      '\txmlns:p="http://www.evolus.vn/Namespace/Pencil">\n' + collection.toXMLDom() + "</p:Collections>";

        var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                    .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        var stream = converter.convertToInputStream(xml);

        var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
        var zipW = new zipWriter();

        zipW.open(fp.file, 0x04 | 0x08 | 0x20 /*PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE*/);
        zipW.comment = "Private collection";
        zipW.addEntryStream("Definition.xml", new Date(), Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, stream, false);
        if (stream) {
            stream.close();
        }
        zipW.close();
        Util.info(Util.getMessage("info.title"), Util.getMessage("collection.has.been.exported", collection.displayName), Util.getMessage("button.cancel.close"));
    } catch (e) {
        Console.dumpError(e);
    }
};
PrivateCollectionManager.importNewCollection = function () {
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, Util.getMessage("filepicker.open.document"), nsIFilePicker.modeOpen);
    fp.appendFilter(Util.getMessage("filepicker.pencil.collection.archives"), "*.epc; *.zip");
    fp.appendFilter(Util.getMessage("filepicker.all.files"), "*");

    if (fp.show() != nsIFilePicker.returnOK) return;

    PrivateCollectionManager.installCollectionFromFile(fp.file);
};
PrivateCollectionManager.installCollectionFromFile = function (file) {
    var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
                   .createInstance(Components.interfaces.nsIZipReader);
    zipReader.open(file);

    var properties = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties);

    var tempDir = null;
    tempDir = properties.get("TmpD", Components.interfaces.nsIFile);
    tempDir.append(file.leafName.replace(/\.[^\.]+$/, "") + "_" + Math.ceil(Math.random() * 1000) + "_" + (new Date().getTime()));

    var targetPath = tempDir.path;

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

        var fileContents = FileIO.read(definitionFile, ShapeDefCollectionParser.CHARSET);
        var domParser = new DOMParser();

        var collection = null;
        var dom = domParser.parseFromString(fileContents, "text/xml");
        if (dom != null) {
            var dom = dom.documentElement;
            var parser = new PrivateShapeDefParser();
            Dom.workOn("./p:Collection", dom, function (node) {
                collection = parser.parseNode(node);
            });
        };

        if (collection && collection.id) {
            //check for duplicate of name
            for (i in PrivateCollectionManager.privateShapeDef.collections) {
                var existingCollection = PrivateCollectionManager.privateShapeDef.collections[i];
                if (existingCollection.id == collection.id) {
                    throw Util.getMessage("collection.named.already.installed", collection.id);
                }
            }
            if (Util.confirmWithWarning(Util.getMessage("install.the.unsigned.collection.confirm", collection.displayName),
                                         new RichText(Util.getMessage("install.the.unsigned.collection.discription")), Util.getMessage("button.install.label"))) {
                CollectionManager.setCollectionCollapsed(collection, false);
                PrivateCollectionManager.addShapeCollection(collection);
            }
        } else {
            throw Util.getMessage("collection.specification.is.not.found.in.the.archive");
        }
    } catch (e) {
        Util.error(Util.getMessage("error.installing.collection"), e.message, Util.getMessage("button.close.label"));
    } finally {
        extractedDir.remove(true);
        return;
    }
};
