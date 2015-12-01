Pencil.buildRecentFileMenu = function (files) {
    var menu = document.getElementById("recentDocumentMenu");
    Dom.empty(menu);

    if (!files) {
        files = Config.get("recent-documents");
        if (!files) {
            menu.setAttribute("disabled", true);
            return;
        }
    }
    menu.removeAttribute("disabled");

    for (var i = 0; i < files.length; i ++) {
        var path = files[i];
        var menuItem = document.createElementNS(PencilNamespaces.xul, "menuitem");
        var localFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
        localFile.initWithPath(path);
        menuItem.setAttribute("label", localFile.leafName);
        menuItem.setAttribute("tooltiptext", path);
        menuItem._path = path;
        menu.appendChild(menuItem);
    }
};
Pencil.postBoot = function() {
    try {
        var menu = document.getElementById("recentDocumentMenu");
        menu.addEventListener("command", function (event) {
            var path = event.originalTarget._path;
            if (path) {
                Pencil.controller.loadDocument(path);
            }
        }, false);

        Pencil.buildRecentFileMenu();
        
        var toolBox = document.getElementById("navigator-toolbox");
        toolBox.addEventListener("mouseup", function (event) {
            Pencil.activeCanvas.endFormatPainter();
        }, false);
        invalidateToolbars();

        if (navigator.userAgent.indexOf("Mac OS") != -1) {
        	document.getElementById("toggleFullscreenMenuItem").setAttribute("key", "toggleFullscreenKeyMac");
            var pencilMenu = document.getElementById("pencil-menu");
            pencilMenu.setAttribute("label", "File ▾");
            //var quitSep = document.getElementById("quitMenuSeparator");
            //quitSep.parentNode.removeChild(quitSep);
            //var helpMenu = document.getElementById("help-menu");
            //helpMenu.parentNode.removeChild(helpMenu);
        }

        var loaded = false;
        if (window.arguments) {
            var cmdLine = window.arguments[0];
            if (cmdLine) {
                cmdLine = cmdLine.QueryInterface(Components.interfaces.nsICommandLine);

                var filePath = ""
                var i = 0;
                while (true && i < cmdLine.length) {
                    try {
                        var part = cmdLine.getArgument(i);
                        if (!part) break;
                        if (filePath.length > 0) filePath += " ";
                        if (part.indexOf("application.ini") == -1)
                            filePath += part;
                        i ++;
                    } catch (e) { Console.dumpError(e); break; }
                }
                if (filePath && filePath.indexOf("-") != 0) {
                    window.setTimeout(function () {
                        Pencil.controller.loadDocument(filePath);
                    }, 100);
                } else {
                    window.setTimeout(function() {
                        Pencil.controller.newDocument();
                    }, 100);
                }

                loaded = true;
            }
        }
        if (!loaded) {
            window.setTimeout(function() {
                Pencil.controller.newDocument();
            }, 100);
        }
        Pencil.updateGUIForHeavyElementVisibility();
    } catch (e) {
        Console.dumpError(e);
    }
};
function czInitComponent() {
	try {
		const cid = "@iosart.com/Utils/ColorZilla;1";
		gCZComponent = Components.classes[cid].createInstance();
		gCZComponent = gCZComponent.QueryInterface(Components.interfaces.mozIColorZilla);
	} catch (err) {
		dump("Couldn't get object: " + err + "\n");
		return;
	}
}

function czGetScreenColor(x, y) {
	var col = gCZComponent.GetPixel(x, y);
	return col;
}
Pencil._getCanvasPadding = function () {
    return window.fullScreen ? 10 : 60;
};
Pencil.getBestFitSize = function () {
    var mainViewPanel = document.getElementById("mainViewPanel");
    var zoom = Pencil.activeCanvas ? (1 / Pencil.activeCanvas.zoom) : 1;
    return [zoom * (mainViewPanel.boxObject.width - Pencil._getCanvasPadding()), zoom * (mainViewPanel.boxObject.height - Pencil._getCanvasPadding())].join("x");
};
Pencil.getBestFitSizeObject = function () {
    var mainViewPanel = document.getElementById("mainViewPanel");
    var zoom = Pencil.activeCanvas ? (1 / Pencil.activeCanvas.zoom) : 1;
    return {width: zoom * (mainViewPanel.boxObject.width - Pencil._getCanvasPadding()), height: zoom * (mainViewPanel.boxObject.height - Pencil._getCanvasPadding())};
};
Pencil.toggleShowHeavyElements = function () {
    var show = Config.get("view.showHeavyElements", false);

    Config.set("view.showHeavyElements", !show);

    Pencil.updateGUIForHeavyElementVisibility();
};
Pencil.updateGUIForHeavyElementVisibility = function () {
    var hideHeavyElementsMenuItem = document.getElementById("hideHeavyElementsMenuItem");
    var showHeavyElements = Config.get("view.showHeavyElements", false);

    if (showHeavyElements) {
        hideHeavyElementsMenuItem.removeAttribute("checked");
    } else {
        hideHeavyElementsMenuItem.setAttribute("checked", true);
    }

    document.documentElement.setAttributeNS(PencilNamespaces.p, "p:hide-heavy", showHeavyElements ? "false" : "true");
};
Pencil.insertPNGImage = function (url, w, h, x, y) {
    var imageData = new ImageData(w, h, url);
    var def = CollectionManager.shapeDefinition.locateDefinition(PNGImageXferHelper.SHAPE_DEF_ID);
    if (!def) return;

    var canvas = Pencil.activeCanvas;
    if (!canvas) return;

    canvas.insertShape(def, new Bound(x, y, null, null));
    if (canvas.currentController) {
        var dim = new Dimension(imageData.w, imageData.h);
        canvas.currentController.setProperty("imageData", imageData);
        canvas.currentController.setProperty("box", dim);
        canvas.currentController.setProperty("fillColor", Color.fromString("#ffffff00"));
        canvas.invalidateEditors();
        window.setTimeout(function() {
            canvas.currentController.setProperty("box", dim);
        }, 10);
    }
};

Pencil.toggleFullscreen = function () {
    var isFullscreen = Dom.hasClass(document.documentElement, "Fullscreen");
    if (isFullscreen) {
        Dom.removeClass(document.documentElement, "Fullscreen");
        window.fullScreen = false;
    } else {
        Dom.addClass(document.documentElement, "Fullscreen");
        window.fullScreen = true;
    }

    if (Pencil.activeCanvas) {
        Pencil.activeCanvas.setSize(Pencil.activeCanvas.width, Pencil.activeCanvas.height);
    }
};
Pencil.exitFullscreen = function () {
    var isFullscreen = Dom.hasClass(document.documentElement, "Fullscreen");
    if (isFullscreen) {
        Pencil.toggleFullscreen();
    }
};

Pencil.selectDeveloperStencilDir = function () {
	//alert("Please select the directory that contains the 'Definition.xml' file of your stencil");
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, "Select Developer Stencil 'Definition.xml' file", nsIFilePicker.modeGetFile);
    fp.appendFilter("Definition.xml", "Definition.xml");
    
    if (fp.show() != nsIFilePicker.returnOK) return;
    
    var path = fp.file.parent.path;
    Config.set("dev.stencil.path", path);
    CollectionManager.loadStencils();
};
Pencil.unselectDeveloperStencilDir = function () {
    Config.set("dev.stencil.path", "none");
    CollectionManager.loadStencils();
	alert("Developer stencil is unloaded.");
};

var registeredToolbars = [];
function registerToolbar(info) {
    registeredToolbars.push(info);
}
function isToolbarVisible(id) {
    return Config.get("view.toolbar_" + id, true);
}
function setToolbarVisible(id, visible) {
    Config.set("view.toolbar_" + id, visible);
}
function invalidateToolbars() {
    for (var i = 0; i < registeredToolbars.length; i ++) {
        var info = registeredToolbars[i];
        var toolbar = document.getElementById(info.id + "Toolbar");
        if (isToolbarVisible(info.id)) {
            Dom.addClass(toolbar, "Visible");
            Dom.removeClass(toolbar, "Hidden");
        } else {
            Dom.addClass(toolbar, "Hidden");
            Dom.removeClass(toolbar, "Visible");
        }
    }
};
function setupToolbarContextMenu() {
    var menu = document.getElementById("toolbarContextMenu");
    Dom.empty(menu);
    for (var i = 0; i < registeredToolbars.length; i ++) {
        var info = registeredToolbars[i];
        var menuItem = document.createElementNS(PencilNamespaces.xul, "menuitem");
        menuItem.setAttribute("label", info.name);
        menuItem.setAttribute("toolbar", info.id);
        menuItem.setAttribute("type", "checkbox");
        menuItem.setAttribute("checked", isToolbarVisible(info.id));
        menu.appendChild(menuItem);
        menuItem.addEventListener("command", function (event) {
                var target = event.originalTarget;
                var toolbarId = target.getAttribute("toolbar");
                setToolbarVisible(toolbarId, target.getAttribute("checked") == "true");
                invalidateToolbars();
            }, false);
    }
}

registerToolbar({id: "file", name: "File Toolbar"});
registerToolbar({id: "edit", name: "Edit Toolbar"});
registerToolbar({id: "zoom", name: "Zoom Toolbar"});
registerToolbar({id: "textFormat", name: "Text Format Toolbar"});
registerToolbar({id: "geometry", name: "Geometry Toolbar"});
registerToolbar({id: "alignment", name: "Alignment Toolbar"});
registerToolbar({id: "sizeAndSpacing", name: "Size and Spacing Toolbar"});
registerToolbar({id: "color", name: "Color Toolbar"});
registerToolbar({id: "borderStyle", name: "Line Style Toolbar"});
