function DocumentExportManager() {
}
DocumentExportManager.parser = new DOMParser();
DocumentExportManager.prototype.printDocument = function (doc) {
    this.exportDocument(doc, "PrintingExporter");
}
DocumentExportManager.prototype.exportDocument = function (doc, forcedExporterId) {
    new ExportDialog().callback(function (params) {
        this.lastParamsDoc = doc;
        this.lastParams = params;
        this.exportDocumentWithParams(doc, forcedExporterId, params);
    }.bind(this)).open({
        forcedExporterId: forcedExporterId,
        lastParams: doc == this.lastParamsDoc ? this.lastParams : null
    });
};
DocumentExportManager.prototype.exportDocumentWithParams = function (doc, forcedExporterId, params) {
    if (!params) return;

    try {
        this._exportDocumentWithParamsImpl(doc, forcedExporterId, params);
    } catch (e) {
        console.error(e);
    }
};
DocumentExportManager.prototype.generateFriendlyId = function (page, usedFriendlyIds) {
    var baseName = page.name.replace(/[^a-z0-9 ]+/gi, "").replace(/[ ]+/g, "_").toLowerCase();
    var name = baseName;
    var seed = 1;

    while (usedFriendlyIds.indexOf(name) >= 0) {
        name = baseName + "_" + (seed ++);
    }

    usedFriendlyIds.push(name);
    return name;
};
DocumentExportManager.prototype._exportDocumentWithParamsImpl = function (doc, forcedExporterId, params) {
    var exporter = Pencil.getDocumentExporterById(params.exporterId);
    if (!exporter) return;

    //Select target dir
    var pageIndex = -1;

    if (params.targetPath) {
        if (exporter.getOutputType() == BaseExporter.OUTPUT_TYPE_DIRECTORY) {
            try {
                fs.statSync(params.targetPath);
            } catch (e) {
                fs.mkdirSync(params.targetPath);
            }
        }
    }
    var destFile = params.targetPath;

    var pagesDir = null;

    var requireRasterizedData = exporter.requireRasterizedData(params);
    if (requireRasterizedData) {
        pagesDir = exporter.getRasterizedPageDestination(destFile);

        if (!fsExistSync(pagesDir)) {
            fs.mkdirSync(pagesDir);
        }
    }

    //populating friendly-id. WARN: side-effect!
    var usedFriendlyIds = [];
    for (var i = 0; i < doc.pages.length; i ++) {
        var p = doc.pages[i];
        var fid = this.generateFriendlyId(p, usedFriendlyIds);
        p.fid = fid;
    }

    var pages = params.pages;

    var thiz = this;
    var starter = null;

    var pageExtraInfos = {};
    if (requireRasterizedData) {
        starter = function (listener) {
            var rasterizeNext = function () {
                try {
                    pageIndex ++;
                    if (pageIndex >= pages.length) {
                        thiz._exportDocumentToXML(doc, pages, pageExtraInfos, destFile, params, function () {
                            listener.onTaskDone();
                            NotificationPopup.show(Util.getMessage("document.has.been.exported", destFile), "View", function () {
                                shell.openItem(destFile);
                            });
                        });
                        return;
                    }
                    var page = pages[pageIndex];

                    //signal progress
                    var task = Util.getMessage("exporting.page.no.prefix", page.name);
                    listener.onProgressUpdated(task, pageIndex + 1, pages.length);

                    var friendlyId = page.fid;

                    var fileName = friendlyId + ".png";
                    var pagePath = path.join(pagesDir, fileName);
                    debug("File path: " + pagePath);

                    var pageExtraInfo = {
                        rasterizedPath: pagePath
                    };
                    pageExtraInfos[page.id] = pageExtraInfo;

                    Pencil.rasterizer.rasterizePageToFile(page, pagePath, function (data) {
                        pageExtraInfo.objectsWithLinking = data.objectsWithLinking;
                        window.setTimeout(rasterizeNext, 100);
                    }, 1, "parseLinks");
                } catch (e2) {
                    listener.onTaskDone();
                    Util.error(Util.getMessage("error.title"), e2.message, Util.getMessage("button.cancel.close"));
                    throw e2;
                }
            };
            rasterizeNext();
        };
    } else {
        starter = function (listener) {
            try {
                thiz._exportDocumentToXML(doc, pages, pageExtraInfos, destFile, params, function () {
                    listener.onTaskDone();
                    if (destFile) {
                        NotificationPopup.show(Util.getMessage("document.has.been.exported", destFile), "View", function () {
                            shell.openItem(destFile);
                        });
                    } else {
                        NotificationPopup.show("Document has been exported.");
                    }
                });
            } catch (ex) {
                listener.onTaskDone();
                Util.error(Util.getMessage("error.title"), ex.message, Util.getMessage("button.cancel.close"));
            }
        };
    }

    // var fakeListener = {
    //     onTaskDone: function () { console.log("DONE");},
    //     onProgressUpdated: function (status, complete, total) { console.log(" >> Progress: " + status + " " + complete + "/" + total);}
    // };
    //
    // starter(fakeListener);

    //take a shower, doit together!!!
    Util.beginProgressJob(Util.getMessage("export.documents"), starter);
};
DocumentExportManager.prototype._getPageLinks = function (page, pageExtraInfos, includeBackground) {
    var bgLinks = [];

    if (page.backgroundPage && includeBackground) {
        var bgPage = page.backgroundPage;
        if (bgPage) {
            bgLinks = this._getPageLinks(bgPage, pageExtraInfos, true);
        }
    }

    var extra = null;

    if (pageExtraInfos[page.id]) {

        extra = pageExtraInfos[page.id];

    } else {
        // the current page is not processed for linking
        // this may because it is not included in exporting
        // so, do this manually here

        //TODO: fix this

        // page._view.canvas.zoomTo(1);
        //
        // var node = page._view.canvas.drawingLayer;
        // extra = {};
        // var processor = new LinkingGeometryPreprocessor(extra);
        // processor.process(node);
        //
        // pageExtraInfos[page.properties.id] = extra;
    }

    var thisPageLinks = extra ? (extra.objectsWithLinking || []) : [];

    var links = [];

    for (var j = 0; j < thisPageLinks.length; j ++) {
        links.push(thisPageLinks[j]);
    }

    for (var j = 0; j < bgLinks.length; j ++) {
        links.push(bgLinks[j]);
    }


    var validLinks = [];
    for (var j = 0; j < links.length; j ++) {
        var targetPage = Pencil.controller.findPageById(links[j].pageId);
        if (targetPage) validLinks.push(links[j]);
    }

    //debug("Returning links for page: " + page.properties.fid + ", total: " + validLinks.length);

    return validLinks;
};
DocumentExportManager.prototype._exportDocumentToXML = function (doc, pages, pageExtraInfos, destFile, exportSelection, callback) {
    var exporter = Pencil.getDocumentExporterById(exportSelection.exporterId);

    var dom = Dom.parseDocument("<Document xmlns=\"" + PencilNamespaces.p + "\"></Document>", "text/xml");

    //properties
    var propertyContainerNode = dom.createElementNS(PencilNamespaces.p, "Properties");
    dom.documentElement.appendChild(propertyContainerNode);

    var docProperties = {};

    for (var name in doc.properties) {
        docProperties[name] = doc.properties[name];
    }

    //enriching with additional properties
    var d = new Date();
    docProperties["exportTime"] = d;
    docProperties["exportTimeShort"] = "" + d.getFullYear() + (d.getMonth() + 1) + d.getDate();

    docProperties["fileName"] = doc.name;
    docProperties["friendlyName"] = doc.name;

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
        var pageNode = Controller.serializePageToDom(page, requireRasterizedData).documentElement;
        pageNode = dom.importNode(pageNode, true);
        pageNode.setAttribute("id", page.id);

        if (!requireRasterizedData) {
            var bgPageNode = dom.createElementNS(PencilNamespaces.p, "BackgroundPages");
            var bgPage = page.backgroundPage;
            while (bgPage) {
                var node = Controller.serializePageToDom(bgPage).documentElement;
                if (bgPageNode.firstChild) {
                    bgPageNode.insertBefore(node, bgPageNode.firstChild);
                } else {
                    bgPageNode.appendChild(node);
                }

                bgPage = bgPage.backgroundPage;
            }

            if (bgPageNode.firstChild) {
                pageNode.appendChild(bgPageNode);
            }
        }

        var backgroundColor = page.backgroundColor;
        if (!backgroundColor) {
            backgroundColor = "rgba(255, 255, 255, 0)";
        } else {
            backgroundColor = Color.fromString(backgroundColor.toString()).toRGBAString();
        }

        var propertyNode = pageNode.ownerDocument.createElementNS(PencilNamespaces.p, "p:Property");
        Dom.getSingle("./p:Properties", pageNode).appendChild(propertyNode);

        propertyNode.setAttribute("name", "backgroundColorRGBA");
        propertyNode.appendChild(dom.createTextNode(backgroundColor));

        //ugly walkarround for Gecko d-o-e bug (https://bugzilla.mozilla.org/show_bug.cgi?id=98168)
        //we have to reparse the provided notes as XHTML and append it directly to the dom
        if (page.note) {
            var xhtml = "<div xmlns=\"http://www.w3.org/1999/xhtml\">" + page.note + "</div>";
            var node = Dom.parseToNode(xhtml, dom);

            this._populateLinkTargetsInNote(node);

            var noteNode = dom.createElementNS(PencilNamespaces.p, "Note");
            noteNode.appendChild(node);
            pageNode.appendChild(noteNode);
        }

        pageContainerNode.appendChild(pageNode);

        if (!pageExtraInfos[page.id]) continue;
        var extra = pageExtraInfos[page.id];
        pageNode.setAttribute("rasterized", extra.rasterizedPath);

        var linkingContainerNode = dom.createElementNS(PencilNamespaces.p, "Links");
        pageNode.appendChild(linkingContainerNode);

        var linkings = this._getPageLinks(page, pageExtraInfos,
                            !exportSelection || !exportSelection.options || exportSelection.options.copyBGLinks);
        for (var j = 0; j < linkings.length; j ++) {
            var linking = linkings[j];

            //debug("Validating: " + page.properties.name + " to: " + linking.pageId);

            var targetPage = Pencil.controller.findPageById(linking.pageId);
            if (!targetPage) {
                debug("targetPage not found");
                continue;
            }

            var linkNode = dom.createElementNS(PencilNamespaces.p, "Link");
            linkNode.setAttribute("target", linking.pageId);
            linkNode.setAttribute("targetName", targetPage.name);
            linkNode.setAttribute("targetFid", targetPage.fid);

            linkNode.setAttribute("x", linking.geo.x);
            linkNode.setAttribute("y", linking.geo.y);
            linkNode.setAttribute("w", linking.geo.w);
            linkNode.setAttribute("h", linking.geo.h);

            linkingContainerNode.appendChild(linkNode);

            //debug("Created link from: " + page.properties.name + " to: " + targetPage.properties.name);
        }
    }

    var xmlFile = tmp.fileSync({postfix: ".xml", keep: false});
    Dom.serializeNodeToFile(dom, xmlFile.name);

    var exporter = Pencil.getDocumentExporterById(exportSelection.exporterId);

    try {
        exporter.export(this.doc, exportSelection, destFile, xmlFile.name, function () {
            xmlFile.removeCallback();
            callback();
        });
    } catch (e) {
        Console.dumpError(e);
        throw e;
    }
};

DocumentExportManager.prototype._populateLinkTargetsInNote = function (htmlNode) {
    var thiz = this;
    Dom.workOn("//html:a[@page-id or starts-with(@href, '#id:')]", htmlNode, function (link) {
        var id = link.getAttribute("page-id");
        if (!id) {
            id = link.getAttribute("href").substring(4);
        }

        var page = Pencil.controller.findPageById(id);

        if (!page) return;
        link.setAttribute("page-name", page.name);
        link.setAttribute("page-fid", page.fid);
    });

    Dom.workOn("//html:a[@page-fid or starts-with(@href, '#fid:')]", htmlNode, function (link) {
        var fid = link.getAttribute("page-fid");
        if (!fid) {
            fid = link.getAttribute("href").substring(5);
        }
        var page = Pencil.controller.findPageByFid(fid);

        if (!page) return;
        link.setAttribute("page-name", page.name);
        link.setAttribute("page-id", page.id);
    });

    Dom.workOn("//html:a[@page-name or starts-with(@href, '#name:')]", htmlNode, function (link) {
        var name = link.getAttribute("page-name");
        if (!name) {
            name = link.getAttribute("href").substring(6);
        }
        var page = Pencil.controller.findPageByName(name);

        if (!page) return;
        link.setAttribute("page-fid", page.fid);
        link.setAttribute("page-id", page.id);
    });
};
