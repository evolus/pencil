var XMLDocumentPersister = {};

XMLDocumentPersister.CHARSET = "UTF-8";

XMLDocumentPersister.hooks = [];
XMLDocumentPersister.currentFile = null;

XMLDocumentPersister.load = function (file) {
    XMLDocumentPersister.currentFile = file;
    var fileContents = FileIO.read(file, XMLDocumentPersister.CHARSET);
    var domParser = new DOMParser();

    var dom = domParser.parseFromString(fileContents, "text/xml");

    return XMLDocumentPersister.parse(dom);
};

XMLDocumentPersister.parse = function (dom) {
    var doc = new PencilDocument();
    Dom.workOn("./p:Properties/p:Property", dom.documentElement, function (propNode) {
        doc.properties[propNode.getAttribute("name")] = propNode.textContent;
    });
    Dom.workOn("./p:Pages/p:Page", dom.documentElement, function (pageNode) {
        var page = XMLDocumentPersister.parsePage(pageNode, doc);

        for (i in XMLDocumentPersister.hooks) {
            var hook = XMLDocumentPersister.hooks[i];
            if (hook.onPageLoad) {
                try {
                    hook.onPageLoad(page, doc);
                } catch (e) {
                    Console.dumpError(e);
                }
            }
        }

        doc.addPage(page);
        try {
            page.validateBackgroundSetting();
        } catch (e) {
            Util.info(Util.getMessage("page.has.an.invalid.background", page.properties.name));
            page.properties.background = null;
        }
    });

    for (i in XMLDocumentPersister.hooks) {
        var hook = XMLDocumentPersister.hooks[i];
        if (hook.onLoad) {
            try {
                hook.onLoad(doc);
            } catch (e) {
                Console.dumpError(e);
            }
        }
    }


    return doc;
};

XMLDocumentPersister.parsePage = function (pageNode, doc) {
    var page = new Page(doc);
    Dom.workOn("./p:Properties/p:Property", pageNode, function (propNode) {
        page.properties[propNode.getAttribute("name")] = propNode.textContent;
    });
    var contentNode = Dom.getSingle("./p:Content", pageNode);
    if (contentNode) {
        page.contentNode = document.importNode(contentNode, true);
    } else page.contentNode = null;

    page.validateLoadedData();

    return page;
};

XMLDocumentPersister.save = function (doc, filePath) {

    var file = Components.classes["@mozilla.org/file/local;1"]
                         .createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(filePath);

    XMLDocumentPersister.currentFile = file;


    for (i in XMLDocumentPersister.hooks) {
        var hook = XMLDocumentPersister.hooks[i];
        if (hook.onSave) {
            try {
                hook.onSave(doc);
            } catch (e) {
                Console.dumpError(e);
            }
        }
    }

    var dom = doc.toDom();

    for (i in XMLDocumentPersister.hooks) {
        var hook = XMLDocumentPersister.hooks[i];
        if (hook.onDomSerialization) {
            try {
                hook.onDomSerialization(dom);
            } catch (e) {
                Console.dumpError(e);
            }
        }
    }


    var fos = Components.classes["@mozilla.org/network/file-output-stream;1"]
                             .createInstance(Components.interfaces.nsIFileOutputStream);
    fos.init(file, 0x02 | 0x08 | 0x20, 0666, 0);

    //write the xml processing instruction
    var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                       .createInstance(Components.interfaces.nsIConverterOutputStream);

    // This assumes that fos is the nsIOutputStream you want to write to
    os.init(fos, XMLDocumentPersister.CHARSET, 0, 0x0000);

    os.writeString("<?xml version=\"1.0\"?>\n");

    var serializer = new XMLSerializer();
    serializer.serializeToStream(dom, fos, XMLDocumentPersister.CHARSET);

    fos.close();
};

