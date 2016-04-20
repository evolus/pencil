function Controller(win) {
    this.doc = null;
    this.modified = false;

}
Controller.PAGES_SUBFOLDER_NAME = "pages";
Controller.prototype._movePage = function (index, forward) {
    debug("Moving: " + [index, forward]);
    try {
        if (index < 0 || index >= this.doc.pages.length) return;
        var otherIndex = index + (forward ? 1 : -1);
        if (otherIndex < 0 || otherIndex >= this.doc.pages.length) return;

        var page = this.doc.pages[index];
        var otherPage = this.doc.pages[otherIndex];

        if (!page || !otherPage) return;

        debug("swapping: " + [index, otherIndex]);

        this.doc.pages[index] = otherPage;
        this.doc.pages[otherIndex] = page;

        this._updatePageFromView();
        this._clearView();
        this._pageSetupCount = 0;
        var thiz = this;

        this.markDocumentModified();

        for (p in this.doc.pages) {
            this._createPageView(this.doc.pages[p], function () {
                thiz._pageSetupCount ++;
                if (thiz._pageSetupCount == thiz.doc.pages.length) {
                    thiz._ensureAllBackgrounds(function () {});
                }
            });
            this._setSelectedPageIndex(otherIndex);
        }
    } catch (e) {
        Console.dumpError(e);
    }
};
Controller.prototype._findPageToEditIndex = function () {
    for (var i = 0; i < this.doc.pages.length; i ++) {
        if (this._pageToEdit == this.doc.pages[i]) {
            return i;
            break;
        }
    }
    return -1;
}
Controller.prototype.pageMoveRight = function () {
    var pageIndex = this._findPageToEditIndex();
    if (pageIndex < 0) return;
    this._movePage(pageIndex, true);
}
Controller.prototype.pageMoveLeft = function () {
    var pageIndex = this._findPageToEditIndex();
    if (pageIndex < 0) return;
    this._movePage(pageIndex, false);
}
Controller.prototype.gotoPage = function (page) {
    var tab = page._view.header;
    this.mainView.selectedTab = tab;
    this.tabScrollBox.ensureElementIsVisible(tab);
}
Controller.prototype.markDocumentModified = function () {
    this.modified = true;
    this._setupTitle();
}
Controller.prototype.markDocumentSaved = function () {
    this.modified = false;
    this._setupTitle();
}
Controller.prototype._setupTitle = function () {
    var path = this.filePath ? this.filePath : Util.getMessage("untitled.document");
    var title = this.modified ? (path + "*") : path;

    Pencil.setTitle(title);
};
Controller.prototype.hasDoc = function () {
    return this.doc ? true : false;
};
Controller.prototype.getCurrentPage = function () {
    if (!this.doc) throw Util.getMessage("no.active.document");

    return this.doc.pages[this.mainView.selectedIndex];
};
Controller.prototype.isBoundToFile = function () {
    if (!this.doc) throw Util.getMessage("no.document.is.attached.to.this.controller");

    return this.filePath != null;
};
var SIZE_RE = /^([0-9]+)x([0-9]+)$/;
Controller.prototype.parseSizeText = function (text) {
    if (!text.match(SIZE_RE)) {
        return null;
    }
    return {
        width: parseInt(RegExp.$1, 10),
        height: parseInt(RegExp.$2, 10)
    };
};
Controller.prototype.newDocument = function () {
    if (this.modified) {
        if (!this._confirmAndSaveDocument()) return;
    }
    this._clearView();

    //TODO: asking for params
    this.doc = new PencilDocument();

    var size = null;
    var lastSize = Config.get("lastSize");
    debug("lastSize: " + lastSize);
    if (lastSize) {
        size = this.parseSizeText(lastSize);
    }

    debug("lastSize: " + Pencil.getBestFitSize());
    if (size == null) {
    	size = this.parseSizeText(Pencil.getBestFitSize());
    }

    this._addPage(Util.getMessage("untitled.page"), this._generateId(), size.width, size.height);

    this._setSelectedPageIndex(0);
    this.filePath = null;
    this.modified = false;
    this._setupTitle();
};
Controller.prototype.duplicatePage = function () {

    var page = this.getCurrentPage();

    var name = page.properties.name;
    var width = page.properties.width;
    var height = page.properties.height;
    var background = page.properties.background;
    var dimBackground = page.properties.dimBackground;
    var backgroundColor = page.properties.backgroundColor;
    var transparentBackground = page.properties.transparentBackground;

    var id = this._generateId();

    this._addPage(name, id, width, height, background, dimBackground, backgroundColor, transparentBackground);
    this._setSelectedPageIndex(this.doc.pages.length - 1);

    var newPage = this.doc.pages[this.doc.pages.length-1];

    for (var i = 0; i < page._view.canvas.drawingLayer.childNodes.length; i ++) {
        var node = page._view.canvas.drawingLayer.childNodes[i];
        newPage._view.canvas.drawingLayer.appendChild(newPage._view.canvas.ownerDocument.importNode(node, true));
        Dom.renewId(node);
    }

    this.markDocumentModified();
};
Controller.prototype.newPage = function () {
    var returnValueHolder = {};
    var dialog = window.openDialog("chrome://pencil/content/pageDetailDialog.xul", "pageDetailDialog", "modal,centerscreen",
                                    null,
                                    this.doc.pages,
                                    returnValueHolder);

    if (!returnValueHolder.ok)  return;

    var name = returnValueHolder.data.title;
    var width = returnValueHolder.data.width;
    var height = returnValueHolder.data.height;
    var background = returnValueHolder.data.background ? returnValueHolder.data.background : null;
    var dimBackground = returnValueHolder.data.dimBackground ? true : false;
    var backgroundColor = returnValueHolder.data.backgroundColor ? returnValueHolder.data.backgroundColor : "#ffffff";
    var transparentBackground = returnValueHolder.data.transparentBackground == "false" ? "false" : "true";

    var id = this._generateId();

    this._addPage(name, id, width, height, background, dimBackground, backgroundColor, transparentBackground);
    this._setSelectedPageIndex(this.doc.pages.length - 1);
    this.markDocumentModified();
};
Controller.prototype.saveDocumentAs = function () {
    this.saveDocument(true);
}
Controller.prototype.saveDocument = function (saveAsArg) {
    var currentPath = this.filePath ? this.filePath : null;
    var saveAs = saveAsArg ? saveAsArg : false;
    try {
        this._updatePageFromView();

        if (!this.isBoundToFile() || saveAs) {
            var nsIFilePicker = Components.interfaces.nsIFilePicker;
            var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
            fp.init(window, Util.getMessage("filepicker.save.document.as"), nsIFilePicker.modeSave);
            fp.appendFilter(Util.getMessage("filepicker.pencil.documents"), "*.ep; *.epz");
            fp.appendFilter(Util.getMessage("filepicker.all.files"), "*");

            if (fp.show() == nsIFilePicker.returnCancel) return false;

            this.filePath = fp.file.path;
            if (!this.filePath.match(/\.ep[z]?$/)) {
                this.filePath += ".ep";

                //FIXME: check existing once again
            }
            try {
                //new file was saved, update recent file list
                var files = Config.get("recent-documents");
                if (!files) {
                    files = [this.filePath];
                } else {
                    for (var i = 0; i < files.length; i ++) {
                        if (files[i] == this.filePath) {
                            //remove it
                            files.splice(i, 1);
                            break;
                        }
                    }
                    files.unshift(this.filePath);
                    if (files.length > 10) {
                        files.splice(files.length - 1, 1);
                    }
                }

                Config.set("recent-documents", files);
                Pencil.buildRecentFileMenu();
            } catch (e) {
                Console.dumpError(e, true);
            }
        }

        XMLDocumentPersister.save(this.doc, this.filePath);
        Pencil.setTitle(this.filePath);

        this.markDocumentSaved();
    } catch (e) {
        Util.info(Util.getMessage("error.saving.file"), "" + e);
        this.filePath = currentPath;
        return false;
    }

    return true;
};
Controller.prototype.loadDocument = function (uri) {
    if (this.modified) {
        if (!this._confirmAndSaveDocument()) return;
    }
    var file = null;
    if (!uri) {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, Util.getMessage("filepicker.open.document"), nsIFilePicker.modeOpen);
        fp.appendFilter(Util.getMessage("filepicker.pencil.documents"), "*.ep; *.epz");
        fp.appendFilter(Util.getMessage("filepicker.all.files"), "*");

        if (fp.show() != nsIFilePicker.returnOK) return;

        file = fp.file;
    } else {
        try {
            if (uri.indexOf("-") == 0) return;
            //assume uri is a nsILocalFile
            file = uri.QueryInterface(Components.interfaces.nsILocalFile);
        } catch (e1) {
            try {//
                //assume uri is an absolute path
                file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
                file.initWithPath("" + uri);

            } catch (e){
                try {
                    //assume uri is a real uri
                    file = fileHandler.getFileFromURLSpec(uri).QueryInterface(Components.interfaces.nsILocalFile);
                } catch(e) {
                    Console.dumpError(e);
                }
            }
        }
        if (!file.exists()) {
            Util.error(Util.getMessage("error.title"), Util.getMessage("file.not.exist", file.path), Util.getMessage("button.cancel.close"));
            //alert("The file '" + file.path + "' does not exist");
            return;
        }
    }
    var path = file.path;

    try {
        //new file was loaded, update recent file list
        var files = Config.get("recent-documents");
        if (!files) {
            files = [path];
        } else {
            for (var i = 0; i < files.length; i ++) {
                if (files[i] == path) {
                    //remove it
                    files.splice(i, 1);
                    break;
                }
            }
            files.unshift(path);
            if (files.length > 10) {
                files.splice(files.length - 1, 1);
            }
        }

        Config.set("recent-documents", files);
        Pencil.buildRecentFileMenu();
    } catch (e) {
        Console.dumpError(e, true);
    }

    this._loadDocumentImpl(file, path);
}
Controller.prototype._loadDocumentImpl = function (file, path) {
    var thiz = this;
    var starter = function (listener) {
        thiz._clearView();
        document.documentElement.setAttribute("wait-cursor", true);

        try {
            thiz.doc = XMLDocumentPersister.load(file);
        } catch (e) {
            Console.dumpError(e);
            document.documentElement.removeAttribute("wait-cursor");
            Util.error(Util.getMessage("could.not.load.document"), e.message, Util.getMessage("button.cancel.close"));
            return;
        }
        thiz._pageSetupCount = 0;
        var p = -1;

        function loadPage() {
            p++;
            try {
    	        listener.onProgressUpdated(Util.getMessage("loading.page", thiz.doc.pages[p].properties.name), thiz._pageSetupCount + 1, thiz.doc.pages.length);
        	    thiz._createPageView(thiz.doc.pages[p], function () {
            	    thiz._pageSetupCount ++;
                	if (thiz._pageSetupCount == thiz.doc.pages.length) {
                        listener.onProgressUpdated(Util.getMessage("loading.background"), thiz._pageSetupCount + 1, thiz.doc.pages.length);
                    	thiz._ensureAllBackgrounds(function () {
                        	thiz._setSelectedPageIndex(0);

                            thiz.filePath = path;
                            Pencil.setTitle(thiz.filePath);

                            thiz.markDocumentSaved();
                            document.documentElement.removeAttribute("wait-cursor");

                            listener.onTaskDone();
                        });

                        return true;
                    }
                    window.setTimeout(loadPage, 10);
                });
            } catch (ex) {
                document.documentElement.removeAttribute("wait-cursor");
                listener.onTaskDone();
                Util.error(Util.getMessage("error.title"), ex.message, Util.getMessage("button.cancel.close"));
            }
        }
        loadPage();
    }
    Util.beginProgressJob(Util.getMessage("loading.document"), starter);
};
//---------------------- privates -----
Controller.prototype._ensureAllBackgrounds = function (callback) {
    this._ensureBackground(0, callback);
};
Controller.prototype._ensureBackground = function (index, callback) {
    if (index >= this.doc.pages.length) {
        if (callback) callback();
        return;
    }
    var page = this.doc.pages[index];
    var thiz = this;
    page.ensureBackground(function () {
        thiz._ensureBackground(index + 1, callback);
    });
}
Controller.prototype._updatePageFromView = function () {
    if (!this.doc) throw Util.getMessage("no.active.document");

    for (p in this.doc.pages) {
        var page = this.doc.pages[p];
        var drawingLayer = page._view.canvas.drawingLayer;

        page.contentNode = drawingLayer;
    }
}
Controller.prototype._generateId = function () {
    return (new Date().getTime()) + "_" + Math.round(Math.random() * 10000);
};
Controller.prototype._addPage = function (name, id, width, height, background, dimBackground, backgroundColor, transparentBackground, note) {
    var page = new Page(this.doc);
    page.properties.name = name;
    page.properties.id = id;
    page.properties.width = width;
    page.properties.height = height;
    page.properties.dimBackground = false;
    page.properties.transparentBackground = transparentBackground;

    if (backgroundColor) {
        page.properties.backgroundColor = backgroundColor;
    } else {
        page.properties.backgroundColor = "#ffffff";
    }

    if (background) {
        page.properties.background = background;
        page.properties.dimBackground = dimBackground;
    }
    if(note) {
        page.properties.note = note;
    }
    this.doc.addPage(page);
    page._doc = this.doc;

    this._createPageView(page, function () {
        page.ensureBackground();
    });
};
Controller.prototype._createPageView = function (page, callback) {
    var tab = this.window.ownerDocument.createElementNS(PencilNamespaces.xul, "tab");
    this.mainViewHeader.appendChild(tab);
    tab._page = page;

    tab.setAttribute("label", page.properties.name);

    var tabpanel = this.window.ownerDocument.createElementNS(PencilNamespaces.xul, "tabpanel");
    this.mainViewPanel.appendChild(tabpanel);
    var vbox = this.window.ownerDocument.createElementNS(PencilNamespaces.xul, "vbox");
    tabpanel.appendChild(vbox);

    var canvas = this.window.ownerDocument.createElementNS(PencilNamespaces.xul, "pcanvas");
    canvas.setAttribute("flex", 1);
    canvas.setAttribute("width", parseInt(page.properties.width, 10));
    canvas.setAttribute("height", parseInt(page.properties.height, 10));

    vbox.appendChild(canvas);

    var view = {header: tab, body: tabpanel, canvas: canvas};
    page._view = view;
    tabpanel._canvas = canvas;

    window.setTimeout(function () {
        Pencil.installEditors(canvas);
        Pencil.installXferHelpers(canvas);
        Pencil.installDragObservers(canvas);
        if (page.contentNode) {
            for (var i = 0; i < page.contentNode.childNodes.length; i ++) {
                var node = page.contentNode.childNodes[i];
                canvas.drawingLayer.appendChild(canvas.ownerDocument.importNode(node, true));
            }
        }
        canvas.careTaker.reset();

        canvas.addEventListener("p:ContentModified", function (event) {
            page.rasterizeDataCache = null;
        }, false);

        if (page.properties.transparentBackground == "true" || page.properties.background) {
            canvas.setBackgroundColor(Color.fromString("#ffffffff"));
        } else {
            canvas.setBackgroundColor(Color.fromString(page.properties.backgroundColor));
        }
        canvas.snappingHelper.rebuildSnappingGuide();
        if (callback) callback();
    }, 200);
};
Controller.prototype._setSelectedPageIndex = function (index) {
    this.mainView.selectedIndex = index;
};
Controller.prototype._clearView = function () {
    if (this.doc) {
        for (p in this.doc.pages) {
            var page = this.doc.pages[p];
            page._view.canvas.passivateEditors();
        }
    }
    Dom.empty(this.mainViewHeader);
    Dom.empty(this.mainViewPanel);
};
Controller.prototype._handleContextMenuShow = function (event) {
    var tab = Dom.findTop(event.originalTarget, function (node) {
        return node.localName == "tab";
    });

    Dom.workOn("./xul:menuseparator", this.tabPopupMenu, function (sep) {
        sep.style.display = "";
    });

    if (tab) {
        this.pagePropertiesMenuItem.style.display = "";
        this.pageNoteMenuItem.style.display = "";
        this.deletePageMenuItem.style.display = "";
        this.pageDuplicateMenuItem.style.display = "";
        this.pageMoveLeftMenuItem.style.display = "";
        this.pageMoveRightMenuItem.style.display = "";

        this._pageToEdit = tab._page;

        var index = this._findPageToEditIndex(this._pageToEdit);
        Pencil._enableCommand("moveLeftCommand", index > 0);
        Pencil._enableCommand("moveRightCommand", index < this.doc.pages.length - 1);
    } else {
        this.pagePropertiesMenuItem.style.display = "none";
        this.pageNoteMenuItem.style.display = "none";
        this.deletePageMenuItem.style.display = "none";
        this.pageDuplicateMenuItem.style.display = "none";
        this.pageMoveLeftMenuItem.style.display = "none";
        this.pageMoveRightMenuItem.style.display = "none";
        this._pageToEdit = null;
    }

    //setup goto tab menu
    var popup = this.gotoTabMenu.firstChild;
    Dom.empty(popup);
    if (this.doc.pages.length < 2) {
        this.gotoTabMenu.disabled = true;
    } else {
        this.gotoTabMenu.disabled = false;
        for (var i = 0; i < this.doc.pages.length; i ++) {
            var page = this.doc.pages[i];
            var item = popup.ownerDocument.createElementNS(PencilNamespaces.xul, "menuitem");
            item.setAttribute("label", page.properties.name);
            item._page = page;
            popup.appendChild(item);
        }
    }

    var childs = this.tabPopupMenu.childNodes;
    var shouldHideNextSeparator = true;

    for (var i = 0; i < childs.length; i ++) {
        var child = childs[i];
        if (child.localName == "menuseparator") {
            if (shouldHideNextSeparator) {
                child.style.display = "none";
            } else {
                shouldHideNextSeparator = true;
            }
        } else {
            if (child.style.display != "none") {
                shouldHideNextSeparator = false;
            }
        }
    }

    for (var i = childs.length - 1; i >= 0; i --) {
        var child = childs[i];
        if (child.localName != "menuseparator" && child.style.display != "none") {
            break;
        }
        child.style.display = "none";
    }
};
Controller.prototype._modifyPageProperties = function (page, data) {
    if (!page._view) return;

    page.properties.name = data.title;
    page.properties.width = data.width;
    page.properties.height = data.height;
    page.properties.dimBackground = data.dimBackground;
    page.properties.backgroundColor = data.backgroundColor;
    page.properties.transparentBackground = data.transparentBackground;

    if (data.background) {
        page.properties.background = data.background;
    } else {
        try {
            delete page.properties.background;
        } catch (e) {}
    }

    page._view.header.setAttribute("label", data.title);

    try {
        this.mainViewPanel.setAttributeNS(PencilNamespaces.p, "p:resizing", "true");
        page._view.canvas.setSize(data.width, data.height);
        if (page.properties.transparentBackground == "true" || page.properties.background) {
            page._view.canvas.setBackgroundColor(Color.fromString("#ffffffff"));
        } else {
            page._view.canvas.setBackgroundColor(Color.fromString(page.properties.backgroundColor));
        }

        this.mainViewPanel.removeAttributeNS(PencilNamespaces.p, "resizing");

    } catch (e) {
        Console.dumpError(e, "Error");
    }
    page.rasterizeDataCache = null;
    this.markDocumentModified();
};
Controller.prototype._deletePage = function (page) {
    //find page in the list
    var currentIndex = this.mainView.selectedIndex;
    var index = -1;
    for (var i = 0; i < this.doc.pages.length; i ++) {
        if (this.doc.pages[i].properties.id == page.properties.id) {
            index = i;
            break;
        }
    }
    if (index < 0) return;

    //remove UI
    page._view.header.parentNode.removeChild(page._view.header);
    page._view.body.parentNode.removeChild(page._view.body);

    //remove the page
    delete this.doc.pages[index];
    for (var i = index; i < this.doc.pages.length - 1; i ++) {
        this.doc.pages[i] = this.doc.pages[i + 1];
    }
    this.doc.pages.length --;
    for (var i in this.doc.pages) {
        var page = this.doc.pages[i];
        if (page.properties.background && !page.getBackgroundPage()) {
            delete page.properties.background;
        }
    }
    this._ensureAllBackgrounds();

    if (index == currentIndex && this.doc.pages.length > 0) {
        this._setSelectedPageIndex(Math.min(index, this.doc.pages.length - 1));
    } else if (index < currentIndex) {
        this._setSelectedPageIndex(currentIndex - 1);
    }

};
Controller.prototype._confirmAndSaveDocument = function () {
    var result = Util.confirmExtra(Util.getMessage("save.changes.to.document.before.closing"),
                                    Util.getMessage("changes.will.be.permanently.lost"),
                                    Util.getMessage("button.save.label"), Util.getMessage("button.discard.changes"), Util.getMessage("button.cancel.label"));
    if (result.extra) return true;
    if (result.cancel) return false;

    return this.saveDocument();

};
Controller.prototype.editPageProperties = function (page) {
    if (!page) return;
    var returnValueHolder = {};
    var possibleBackgroundPages = [];
    for (var i in this.doc.pages) {
        var bgPage = this.doc.pages[i];
        if (page.canSetBackgroundTo(bgPage)) {
            possibleBackgroundPages.push(bgPage);
        }
    }
    var currentData = {title: page.properties.name,
                         id: page.properties.id,
                         width: page.properties.width,
                         height: page.properties.height,
                         backgroundColor: page.properties.backgroundColor ? page.properties.backgroundColor : null,
                         transparentBackground: page.properties.transparentBackground == "false" ? "false" : "true",
                         background: page.properties.background ? page.properties.background : null,
                         dimBackground: page.properties.dimBackground};
    var dialog = window.openDialog("chrome://pencil/content/pageDetailDialog.xul",
                                    "pageDetailDialog" + Util.getInstanceToken(),
                                    "modal,centerscreen",
                                    currentData, possibleBackgroundPages, returnValueHolder);

    if (!returnValueHolder.ok)  return;

    //change page now:
    try {
        this._modifyPageProperties(page, returnValueHolder.data);
        this._ensureAllBackgrounds(null);
    } catch (e) {
        Console.dumpError(e);
    }
};
Controller.prototype.editPageNote = function (page) {
    var returnValueHolder = {};
    var currentData = {value : page.properties.note ? page.properties.note : ""};
    var returnValueHolder = {};
    var dialog = window.openDialog("chrome://pencil/content/pageNoteDialog.xul", "PageNoteDialog" + Util.getInstanceToken(), "dialog=no,centerscreen,resizable,minimizable=yes,maximizable=yes,dependent, modal", currentData, returnValueHolder, page.properties.name);
    if (returnValueHolder.ok) {
        if (!page._view) return;
        page.properties.note = RichText.fromString(returnValueHolder.html);
        //debug("html " + returnValueHolder.html);
        //debug("RichText " + page.properties.note);
        this.markDocumentModified();
    }
};
Controller.prototype.rasterizeDocument = function () {
    try {
    var currentDir = null;
        if (this.isBoundToFile()) {
            var file = Components.classes["@mozilla.org/file/local;1"]
                                 .createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(this.filePath);

            currentDir = file.parent;
        }

        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        if (currentDir) fp.displayDirectory = currentDir;
        fp.init(window, Util.getMessage("filepicker.export.all.pages.into"), nsIFilePicker.modeGetFolder);
        fp.appendFilter(Util.getMessage("filepicker.all.files"), "*");

        if (fp.show() == nsIFilePicker.returnCancel) return false;

        var pageIndex = -1;
        var dir = fp.file;
        debug("Selected folder: " + dir.path);

        var thiz = this;
        var starter = function (listener) {
            var rasterizeNext = function () {
                try {
                    pageIndex ++;
                    if (pageIndex >= thiz.doc.pages.length) {
                        listener.onTaskDone();
                        //Util.info("Document has been exported", "Location: " + dir.parent.path);
                        return;
                    }
                    var page = thiz.doc.pages[pageIndex];

                    if (Config.get("document.SaveWithPrefixNumber") == null){
                        Config.set("document.SaveWithPrefixNumber", false);
                    }
                    //signal progress
                    var withPrefix = Config.get("document.SaveWithPrefixNumber");
                    var task = "";
                    if (withPrefix) {
                        task = Util.getMessage("exporting.page.with.prefix", pageIndex + 1, page.properties.name);
                    } else {
                        task = Util.getMessage("exporting.page.no.prefix", page.properties.name);
                    }

                    listener.onProgressUpdated(task, pageIndex + 1, thiz.doc.pages.length);

                    if (pageIndex > 0) dir = dir.parent;
                    var fileName = "";
                    if (withPrefix) {
                        var fileName = (pageIndex + 1) + "_" + page.properties.name.replace(/[\/!\\'"]/g, "_");
                    } else {
                        var fileName = page.properties.name.replace(/[\/!\\'"]/g, "_");
                    }

                    dir.append(fileName + ".png");

                    var pagePath = dir.path;
                    debug("File path: " + pagePath);

                    thiz._rasterizePage(page, pagePath, function() {
                        window.setTimeout(rasterizeNext, 100);
                    });
                } catch (e2) {
                    Console.dumpError(e2, "stdout");
                }
            };
            rasterizeNext();
        }

        //take a shower, doit together!!!
        Util.beginProgressJob(Util.getMessage("export.document"), starter);
    } catch (e) {
        Console.dumpError(e, "stdout");
    }
};
Controller.prototype.printDocument = function () {
    this.exportDocument("PrintingExporter");
}
Controller.prototype.exportDocument = function (forcedExporterId) {
    var data = {
        lastSelection: this.lastSelection ? this.lastSelection : null,
        forcedExporterId: forcedExporterId ? forcedExporterId : null
    };
    window.openDialog("chrome://pencil/content/exportWizard.xul", "", "chrome,centerscreen,modal", data);

    if (!data.selection) return;

    this.lastSelection = data.selection;

    try {
        var exporter = Pencil.getDocumentExporterById(data.selection.exporterId);
        if (!exporter) return;

        //Select target dir
        var pageIndex = -1;
        var destFile = null;

        if (data.selection.targetPath) {
            destFile = Components.classes["@mozilla.org/file/local;1"]
                                 .createInstance(Components.interfaces.nsILocalFile);
            destFile.initWithPath(data.selection.targetPath);
            if (exporter.getOutputType() == BaseExporter.OUTPUT_TYPE_DIRECTORY) {
                if (!destFile.exists()) {
                    destFile.create(destFile.DIRECTORY_TYPE, 0777);
                }
            }
        }


        var pagesDir = null;

        var requireRasterizedData = exporter.requireRasterizedData(data.selection);
        if (requireRasterizedData) {
            pagesDir = exporter.getRasterizedPageDestination(destFile);

            if (!pagesDir.exists()) {
                pagesDir.create(pagesDir.DIRECTORY_TYPE, 0777);
            }
        }

        //populating friendly-id. WARN: side-effect!
        var usedFriendlyIds = [];
        for (var i = 0; i < this.doc.pages.length; i ++) {
            var p = this.doc.pages[i];
            var fid = p.generateFriendlyId(usedFriendlyIds);
            p.properties.fid = fid;
        }

        this._updatePageFromView();

        var pages = [];

        if (data.selection.pageMode == "only") {
            for (var i = 0; i < this.doc.pages.length; i ++) {
                var p = this.doc.pages[i];
                if (data.selection.pageIds.indexOf(p.properties.id) >= 0) {
                    pages.push(p);
                }
            }
        } else {
            pages = this.doc.pages;
        }

        var thiz = this;
        var starter = null;

        var pageExtraInfos = {};
        if (requireRasterizedData) {
            starter = function (listener) {
                var rasterizeNext = function () {
                    try {
                        pageIndex ++;
                        if (pageIndex >= pages.length) {
                            thiz._exportDocumentToXML(pages, pageExtraInfos, destFile, data.selection, function () {
                                listener.onTaskDone();
                                Util.showStatusBarInfo(Util.getMessage("document.has.been.exported", destFile.path), true);
                                debug("Document has been exported, location: " + destFile.path);
                            });
                            return;
                        }
                        var page = pages[pageIndex];

                        //signal progress
                        var task = Util.getMessage("exporting.page.no.prefix", page.properties.name);
                        listener.onProgressUpdated(task, pageIndex + 1, pages.length);

                        var friendlyId = page.properties.fid;

                        var file = pagesDir.clone();
                        var fileName = friendlyId + ".png";
                        file.append(fileName);

                        var pagePath = file.path;
                        debug("File path: " + pagePath);

                        var pageExtraInfo = {
                            rasterizedPath: pagePath
                        };
                        pageExtraInfos[page.properties.id] = pageExtraInfo;

                        thiz._rasterizePage(page, pagePath, function() {
                            window.setTimeout(rasterizeNext, 100);
                        }, new LinkingGeometryPreprocessor(pageExtraInfo));
                    } catch (e2) {
                        listener.onTaskDone();
                        Util.error(Util.getMessage("error.title"), e2.message, Util.getMessage("button.cancel.close"));
                    }
                };
                rasterizeNext();
            };
        } else {
            starter = function (listener) {
                try {
                    thiz._exportDocumentToXML(pages, pageExtraInfos, destFile, data.selection, function () {
                        listener.onTaskDone();
                        if (destFile) {
                            Util.showStatusBarInfo("Document has been exported, location: " + destFile.path, true);
                        } else {
                            Util.showStatusBarInfo("Document has been exported.", true);
                        }
                    });
                } catch (ex) {
                    listener.onTaskDone();
                    Util.error(Util.getMessage("error.title"), ex.message, Util.getMessage("button.cancel.close"));
                }
            };
        }

        //take a shower, doit together!!!
        Util.beginProgressJob(Util.getMessage("export.documents"), starter);
    } catch (e) {
        Console.dumpError(e, "stdout");
    }
};
Controller.prototype._getPageLinks = function (page, pageExtraInfos, includeBackground) {
    var bgLinks = [];

    if (page.properties.background && includeBackground) {
        var bgPage = this.doc.getPageById(page.properties.background);
        if (bgPage) {
            bgLinks = this._getPageLinks(bgPage, pageExtraInfos, true);
        }
    }

    var extra = null;

    if (pageExtraInfos[page.properties.id]) {

        extra = pageExtraInfos[page.properties.id];

    } else {
        // the current page is not processed for linking
        // this may because it is not included in exporting
        // so, do this manually here

        page._view.canvas.zoomTo(1);

        var node = page._view.canvas.drawingLayer;
        extra = {};
        var processor = new LinkingGeometryPreprocessor(extra);
        processor.process(node);

        pageExtraInfos[page.properties.id] = extra;
    }

    var thisPageLinks = extra.objectsWithLinking;

    var links = [];

    for (var j = 0; j < thisPageLinks.length; j ++) {
        links.push(thisPageLinks[j]);
    }

    for (var j = 0; j < bgLinks.length; j ++) {
        links.push(bgLinks[j]);
    }


    var validLinks = [];
    for (var j = 0; j < links.length; j ++) {
        var targetPage = this.doc.getPageById(links[j].pageId);
        if (targetPage) validLinks.push(links[j]);
    }

    //debug("Returning links for page: " + page.properties.fid + ", total: " + validLinks.length);

    return validLinks;
};
Controller.prototype.getFriendlyDocumentName = function () {
    if (!this.isBoundToFile()) return "Untitled Document";

    var epFile = Components.classes["@mozilla.org/file/local;1"]
                     .createInstance(Components.interfaces.nsILocalFile);

    epFile.initWithPath(this.filePath);
    var name = epFile.leafName;
    name = name.replace(/\.ep$/, "").replace(/([^ A-Z])([A-Z]+)/g, "$1 $2");
    return name;
};
Controller.prototype._exportDocumentToXML = function (pages, pageExtraInfos, destFile, exportSelection, callback) {
    var exporter = Pencil.getDocumentExporterById(exportSelection.exporterId);

    var dom = document.implementation.createDocument(PencilNamespaces.p, "Document", null);

    //properties
    var propertyContainerNode = dom.createElementNS(PencilNamespaces.p, "Properties");
    dom.documentElement.appendChild(propertyContainerNode);

    var docProperties = {};

    for (name in this.doc.properties) {
        docProperties[name] = this.doc.properties[name];
    }

    //enriching with additional properties
    var d = new Date();
    docProperties["exportTime"] = d;
    docProperties["exportTimeShort"] = "" + d.getFullYear() + (d.getMonth() + 1) + d.getDate();

    if (this.isBoundToFile()) {
        docProperties["path"] = this.filePath;

        var epFile = Components.classes["@mozilla.org/file/local;1"]
                             .createInstance(Components.interfaces.nsILocalFile);

        epFile.initWithPath(this.filePath);

        docProperties["fileName"] = epFile.leafName;
    }

    docProperties["friendlyName"] = this.getFriendlyDocumentName();

    for (name in docProperties) {
        var propertyNode = dom.createElementNS(PencilNamespaces.p, "Property");
        propertyContainerNode.appendChild(propertyNode);

        propertyNode.setAttribute("name", name);
        propertyNode.appendChild(dom.createTextNode(docProperties[name].toString()));
    }

    //pages
    var pageContainerNode = dom.createElementNS(PencilNamespaces.p, "Pages");
    dom.documentElement.appendChild(pageContainerNode);

    var requireRasterizedData = exporter.requireRasterizedData(exportSelection);

    for (i in pages) {
        var page = pages[i];
        var pageNode = page.toNode(dom, requireRasterizedData);
        pageNode.setAttribute("id", page.properties.id);

        if (!requireRasterizedData) {
            var bgPageNode = dom.createElementNS(PencilNamespaces.p, "BackgroundPages");
            var bgId = page.properties.background;
            while (bgId) {
                var bgPage = this.doc.getPageById(bgId);
                if (!bgPage) break;
                if (bgPageNode.firstChild) {
                    bgPageNode.insertBefore(bgPage.toNode(dom, false), bgPageNode.firstChild);
                } else {
                    bgPageNode.appendChild(bgPage.toNode(dom, false));
                }

                bgId = bgPage.properties.background;
            }

            if (bgPageNode.firstChild) {
                pageNode.appendChild(bgPageNode);
            }
        }

        //ugly walkarround for Gecko d-o-e bug (https://bugzilla.mozilla.org/show_bug.cgi?id=98168)
        //we have to reparse the provided notes as XHTML and append it directly to the dom
        if (page.properties.note) {
            var xhtml = "<div xmlns=\"http://www.w3.org/1999/xhtml\">" + page.properties.note + "</div>";
            var node = Dom.parseToNode(xhtml, dom);

            this._populateLinkTargetsInNote(node);

            var noteNode = dom.createElementNS(PencilNamespaces.p, "Note");
            noteNode.appendChild(node);
            pageNode.appendChild(noteNode);
        }

        pageContainerNode.appendChild(pageNode);

        if (!pageExtraInfos[page.properties.id]) continue;
        var extra = pageExtraInfos[page.properties.id];
        pageNode.setAttribute("rasterized", extra.rasterizedPath);

        var linkingContainerNode = dom.createElementNS(PencilNamespaces.p, "Links");
        pageNode.appendChild(linkingContainerNode);

        var linkings = this._getPageLinks(page, pageExtraInfos,
                            !exportSelection || !exportSelection.options || exportSelection.options.copyBGLinks);
        for (var j = 0; j < linkings.length; j ++) {
            var linking = linkings[j];

            //debug("Validating: " + page.properties.name + " to: " + linking.pageId);

            var targetPage = this.doc.getPageById(linking.pageId);
            if (!targetPage) {
                debug("targetPage not found");
                continue;
            }

            var linkNode = dom.createElementNS(PencilNamespaces.p, "Link");
            linkNode.setAttribute("target", linking.pageId);
            linkNode.setAttribute("targetName", targetPage.properties.name);
            linkNode.setAttribute("targetFid", targetPage.properties.fid);

            linkNode.setAttribute("x", linking.geo.x);
            linkNode.setAttribute("y", linking.geo.y);
            linkNode.setAttribute("w", linking.geo.w);
            linkNode.setAttribute("h", linking.geo.h);

            linkingContainerNode.appendChild(linkNode);

            //debug("Created link from: " + page.properties.name + " to: " + targetPage.properties.name);
        }
    }

    var xmlFile = Local.newTempFile("pencil-doc", "xml");
    Dom.serializeNodeToFile(dom, xmlFile);

    var exporter = Pencil.getDocumentExporterById(exportSelection.exporterId);

    try {
        exporter.export(this.doc, exportSelection, destFile, xmlFile, function () {
            debug("Finish exporting, DOC XML = " + xmlFile.path);
            //xmlFile.remove(true);
            callback();
        });
    } catch (e) {
        Console.dumpError(e);
        throw e;
    }
};

Controller.prototype._populateLinkTargetsInNote = function (htmlNode) {
    var thiz = this;
    Dom.workOn("//html:a[@page-id or starts-with(@href, '#id:')]", htmlNode, function (link) {
        var id = link.getAttribute("page-id");
        if (!id) {
            id = link.getAttribute("href").substring(4);
        }

        var page = thiz.doc.getPageById(id);

        if (!page) return;
        link.setAttribute("page-name", page.properties.name);
        link.setAttribute("page-fid", page.properties.fid);
    });

    Dom.workOn("//html:a[@page-fid or starts-with(@href, '#fid:')]", htmlNode, function (link) {
        var fid = link.getAttribute("page-fid");
        if (!fid) {
            fid = link.getAttribute("href").substring(5);
        }
        var page = thiz.doc.getPageByFid(fid);

        if (!page) return;
        link.setAttribute("page-name", page.properties.name);
        link.setAttribute("page-id", page.properties.id);
    });

    Dom.workOn("//html:a[@page-name or starts-with(@href, '#name:')]", htmlNode, function (link) {
        var name = link.getAttribute("page-name");
        if (!name) {
            name = link.getAttribute("href").substring(6);
        }
        var page = thiz.doc.getFirstPageByName(name);

        if (!page) return;
        link.setAttribute("page-fid", page.properties.fid);
        link.setAttribute("page-id", page.properties.id);
    });
};

Controller.prototype.rasterizeCurrentPage = function () {
    var page = this.getCurrentPage();
    if (!page) return;

    var fileName = page.properties.name + ".png";

    var currentDir = null;
    if (this.isBoundToFile()) {
        var file = Components.classes["@mozilla.org/file/local;1"]
                             .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(this.filePath);

        currentDir = file.parent;
    }

    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.defaultString = fileName;
    if (currentDir) fp.displayDirectory = currentDir;
    fp.init(window, Util.getMessage("filepicker.export.page.as"), nsIFilePicker.modeSave);
    fp.appendFilter(Util.getMessage("filepicker.png.image"), "*.png");
    fp.appendFilter(Util.getMessage("filepicker.all.files"), "*");

    if (fp.show() == nsIFilePicker.returnCancel) return false;
    try {
        this._rasterizePage(page, fp.file.path, function () {
            Util.showStatusBarInfo(Util.getMessage("page.has.been.exported", page.properties.name), true);
            //Util.info("Page '" + page.properties.name + "' has been exported", "Location: " + fp.file.path);
        });
    } catch (e) {
        Console.dumpError(e);
    }

};
Controller.prototype._rasterizePage = function (page, path, callback, preprocessor) {
    //create a new svg document
    var svg = document.createElementNS(PencilNamespaces.svg, "svg");
    svg.setAttribute("width", "" + page.properties.width  + "px");
    svg.setAttribute("height", "" + page.properties.height  + "px");

    if (page._view.canvas.hasBackgroundImage) {
        var bgImage = page._view.canvas.backgroundImage.cloneNode(true);
        bgImage.removeAttribute("transform");
        bgImage.removeAttribute("id");
        svg.appendChild(bgImage);
    }

    var drawingLayer = page._view.canvas.drawingLayer.cloneNode(true);
    drawingLayer.removeAttribute("transform");
    drawingLayer.removeAttribute("id");
    svg.appendChild(drawingLayer);

    //debug("bgr: " + page.properties.backgroundColor);
    //debug("trans: " + page.properties.transparentBackground);
    Pencil.rasterizer.rasterizeDOM(svg, path, callback, preprocessor,
        (page.properties.transparentBackground == "false" && !page.properties.background) ? page.properties.backgroundColor : null);

};
Controller.prototype.rasterizeSelection = function () {
    var target = Pencil.getCurrentTarget();
    if (!target || !target.getGeometry) return;

    var geo = target.getGeometry();
    if (!geo) {
        //Util.showStatusBarWarning(Util.getMessage("the.selected.objects.cannot.be.exported"), true);
        alert(Util.getMessage("the.selected.objects.cannot.be.exported"));
        return;
    }

    var padding = 2 * Config.get("export.selection.padding", 0);

    //stroke fix?
    var strokeStyle = target.getProperty("strokeStyle");
    if (strokeStyle) {
        padding += strokeStyle.w;
    }

    var w = geo.dim.w + padding;
    var h = geo.dim.h + padding;

    debug("w: " + w);

    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, Util.getMessage("filepicker.export.selection.as"), nsIFilePicker.modeSave);
    fp.appendFilter(Util.getMessage("filepicker.png.image"), "*.png");
    fp.appendFilter(Util.getMessage("filepicker.all.files"), "*");

    if (fp.show() == nsIFilePicker.returnCancel) return;

    var svg = document.createElementNS(PencilNamespaces.svg, "svg");
    svg.setAttribute("width", "" + w  + "px");
    svg.setAttribute("height", "" + h  + "px");

    var content = target.svg.cloneNode(true);
    content.removeAttribute("transform");
    content.removeAttribute("id");

    try  {
        var dx = Math.round((w - geo.dim.w) / 2);
        var dy = Math.round((h - geo.dim.h) / 2);
        content.setAttribute("transform", "translate(" + dx + ", " + dy + ")");
    } catch (e) {
        Console.dumpError(e);
    }
    svg.appendChild(content);

    Pencil.rasterizer.rasterizeDOM(svg, fp.file.path, function () {});
};

Controller.prototype.sizeToContent = function (passedPage, askForPadding) {
    var page = passedPage ? passedPage : this.getCurrentPage();
    var canvas = page._view.canvas;
    if (!canvas) return;

    var padding = 0;
    if (askForPadding) {
        var paddingString = window.prompt(Util.getMessage("please.enter.the.padding"), "0");
        if (!paddingString) return null;
        var padding = parseInt(paddingString, 10);
        if (!padding) padding = 0;
    }

    var newSize = canvas.sizeToContent(padding, padding);
    if (newSize) {
        page.properties.width = newSize.width;
        page.properties.height = newSize.height;
    }
};
Controller.prototype.sizeToBestFit = function (passedPage) {
    var page = passedPage ? passedPage : this.getCurrentPage();
    var canvas = page._view.canvas;
    if (!canvas) return;

    var newSize = Pencil.getBestFitSizeObject();
    if (newSize) {
        canvas.setSize(newSize.width, newSize.height);
        page.properties.width = newSize.width;
        page.properties.height = newSize.height;
        Config.set("lastSize", [newSize.width, newSize.height].join("x"));
    }
};

Controller.prototype._exportAsLayout = function () {
    var page = this.getCurrentPage();
    var container = page._view.canvas.drawingLayer;

    var pw = parseFloat(page.properties.width);
    var ph = parseFloat(page.properties.height);

    var items = [];

    Dom.workOn("//svg:g[@p:type='Shape']", container, function (g) {
            var dx = 0; //rect.left;
            var dy = 0; //rect.top;

            var owner = g.ownerSVGElement;

            if (owner.parentNode && owner.parentNode.getBoundingClientRect) {
                var rect = owner.parentNode.getBoundingClientRect();
                dx = rect.left;
                dy = rect.top;
            }

            debug("dx, dy: " + [dx, dy]);

            rect = g.getBoundingClientRect();
            var refId = g.getAttributeNS(PencilNamespaces.p, "sc");
            if (!refId) {
                refId = g.getAttributeNS(PencilNamespaces.p, "def");
            }

            refId = refId.replace(/^system:ref:/, "");

            var linkingInfo = {
                node: g,
                refId: refId,
                geo: {
                    x: rect.left - dx,
                    y: rect.top - dy,
                    w: rect.width,
                    h: rect.height
                }
            };
//            if (!linkingInfo.refId) return;

            items.push(linkingInfo);
    });

    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, "Select folder", nsIFilePicker.modeGetFolder);
    fp.appendFilter(Util.getMessage("filepicker.all.files"), "*");

    if (fp.show() == nsIFilePicker.returnCancel) return false;

    var dir = fp.file;
    dir.append("Shapes");
    if (!dir.exists()) {
        dir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
    }

    var current = 0;
    var done = function () {
        var html = document.createElementNS(PencilNamespaces.html, "html");

        var body = document.createElementNS(PencilNamespaces.html, "body");
        html.appendChild(body);

        var div = document.createElementNS(PencilNamespaces.html, "div");
        div.setAttribute("style", "position: relative;");
        body.appendChild(div);

        /*
        var canvas = document.createElementNS(PencilNamespaces.html, "canvas");
        canvas.setAttribute("width", pw);
        canvas.setAttribute("height", ph);

        var bg = document.createElementNS(PencilNamespaces.html, "img");
        bg.setAttribute("style", "width: 100%;");
        bg.setAttribute("src", canvas.toDataURL("image/png"));
        div.appendChild(bg);
        */

        for (var i = 0; i < items.length; i ++) {
            var link = items[i];
            var img = document.createElementNS(PencilNamespaces.html, "img");
            img.setAttribute("src", "Shapes/" + link.path);
            img.setAttribute("ref", link.refId);
            img.setAttribute("id", link.refId);
            var css = new CSS();
            css.set("position", "absolute");
            css.set("left", "" + link.geo.x + "px");
            css.set("top", "" + link.geo.y + "px");
            css.set("width", "" + link.geo.w + "px");
            css.set("height", "" + link.geo.h + "px");
            /*
            css.set("left", "" + (100 * link.geo.x / pw) + "%");
            css.set("top", "" + (100 * link.geo.y / ph) + "%");
            css.set("width", "" + (100 * link.geo.w / pw) + "%");
            css.set("height", "" + (100 * link.geo.h / ph) + "%");
            */
            img.setAttribute("style", css.toString());

            div.appendChild(img);
        }

        dir = dir.parent;
        dir.append("Layout.html");
        if (dir.exists()) dir.remove(true);
        Dom.serializeNodeToFile(html, dir, "");
    };

    var next = function  (listener) {
        if (current >= items.length) {
            done();
            listener.onTaskDone();
            return;
        }

        var link = items[current];

        var padding = 2 * Config.get("export.selection.padding", 0);
        var target = page._view.canvas.createControllerFor(link.node);

        var geo = target.getGeometry();

        //stroke fix?
        var strokeStyle = target.getProperty("strokeStyle");
        if (strokeStyle) {
            padding += 2 * strokeStyle.w;
        }

        var w = geo.dim.w + padding;
        var h = geo.dim.h + padding;

        debug("w: " + w);

        var fileName = "" + current + ".png";
        dir.append(fileName);
        var path = dir.path;

        dir = dir.parent;

        var svg = document.createElementNS(PencilNamespaces.svg, "svg");
        svg.setAttribute("width", "" + w  + "px");
        svg.setAttribute("height", "" + h  + "px");

        var content = target.svg.cloneNode(true);
        content.removeAttribute("transform");
        content.removeAttribute("id");

        try  {
            var dx = Math.round((w - geo.dim.w) / 2);
            var dy = Math.round((h - geo.dim.h) / 2);
            content.setAttribute("transform", "translate(" + dx + ", " + dy + ")");
        } catch (e) {
            Console.dumpError(e);
        }
        svg.appendChild(content);

        Pencil.rasterizer.rasterizeDOM(svg, path, function () {
            link.path = fileName;
            current ++;
            listener.onProgressUpdated("Rasterizing", current, items.length);
            next(listener);
        });
    };
    Util.beginProgressJob("Exporting layout", next);
};

function LinkingGeometryPreprocessor(pageExtraInfo) {
    this.pageExtraInfo = pageExtraInfo;
}
LinkingGeometryPreprocessor.prototype.process = function (doc) {
    var objects = Dom.getList(".//svg:g[@p:RelatedPage]", doc);
    objects.reverse();
    debug("Count: " + objects.length);
    this.pageExtraInfo.objectsWithLinking = [];


    for (var i = 0; i < objects.length; i ++) {
        var g = objects[i];

        var dx = 0; //rect.left;
        var dy = 0; //rect.top;

        var owner = g.ownerSVGElement;

        if (owner.parentNode && owner.parentNode.getBoundingClientRect) {
            var rect = owner.parentNode.getBoundingClientRect();
            dx = rect.left;
            dy = rect.top;
        }

        debug("dx, dy: " + [dx, dy]);

        rect = g.getBoundingClientRect();
        var linkingInfo = {
            pageId: g.getAttributeNS(PencilNamespaces.p, "RelatedPage"),
            geo: {
                x: rect.left - dx,
                y: rect.top - dy,
                w: rect.width,
                h: rect.height
            }
        };
        if (!linkingInfo.pageId) continue;

        debug("Linking info: " + linkingInfo.toSource());
        this.pageExtraInfo.objectsWithLinking.push(linkingInfo);
    }
};
