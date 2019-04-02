
window.onerrorx = function (message, url, code) {
    //Console.dumpError(message);
    error("SYSTEM ERROR!\n\t* " + message + "\n\t* at: " + url + ":" + code);
    Util.showStatusBarError("SYSTEM ERROR! * " + message + " at: " + url + ":" + code, true);
    return false;
};

var Pencil = {};

pencilSandbox.Pencil = Pencil;

Pencil.SNAP = 10;
Pencil.UNSNAP = 10;
Pencil.editorClasses = [];
Pencil.registerEditor = function (editorClass) {
    Pencil.editorClasses.push(editorClass);
};
Pencil.sharedEditors = [];

Pencil.registerSharedEditor = function (sharedEditor) {
    Pencil.sharedEditors.push(sharedEditor);
}

Pencil.xferHelperClasses = [];
Pencil.registerXferHelper = function (helperClass) {
    Pencil.xferHelperClasses.push(helperClass);
};

Pencil.behaviors = {};

Pencil.documentExporters = [];
Pencil.defaultDocumentExporter = null;
Pencil.registerDocumentExporter = function (exporter, defaultExporter) {
    Pencil.documentExporters.push(exporter);
    if (defaultExporter) Pencil.defaultDocumentExporter = exporter;
};
Pencil.getDocumentExporterById = function (id) {
    for (var i = 0; i < Pencil.documentExporters.length; i ++) {
        if (Pencil.documentExporters[i].id == id) {
            return Pencil.documentExporters[i];
        }
    }
    return null;
};

Pencil.toggleHeartBeat = function () {
    if (Pencil.window.hasAttribute("class")) {
        Pencil.window.removeAttribute("class");
    } else {
        Pencil.window.setAttribute("class", "Beat");
    }
    window.setTimeout(Pencil.toggleHeartBeat, 200);
};

Pencil.installEditors = function (canvas) {
    for (var factory in Pencil.editorClasses) {
        var constructorFunction = Pencil.editorClasses[factory];
        var editor = new constructorFunction();
        editor.install(canvas);
    }
};
Pencil.installXferHelpers = function (canvas) {
    for (var factory in Pencil.xferHelperClasses) {
        var constructorFunction = Pencil.xferHelperClasses[factory];
        var helper = new constructorFunction(canvas);
        canvas.xferHelpers.push(helper);
    }
};
Pencil.fixUI = function () {
    Dom.workOn(".//xul:*[@image]", Pencil.window, function (node) {
        var image = node.getAttribute("image");
        if (image.match(/^moz\-icon:\/\/([^\?]+)\?size=([a-z]+)$/)) {
            var src = "Icons/MozIcons/" + RegExp.$1 + "-" + RegExp.$2 + ".png";
            node.setAttribute("image", src);
        }
    });
};
Pencil.boot = function (event) {
    try {
        if (Pencil.booted) return;
        debug("BOOT: Initializing Pencil core");

        Pencil.app = require('electron').remote.app;

        Pencil.booted = true;
        Pencil.window = document.documentElement;
        Pencil.rasterizer = new Rasterizer("image/png");

        debug("BOOT:   Loading stencils");
        CollectionManager.loadStencils();
        debug("BOOT:   Loading export templates");
        ExportTemplateManager.loadTemplates();
        debug("BOOT:   Configuring export manager");
        Pencil.documentExportManager = new DocumentExportManager();

        Pencil.activeCanvas = null;
        debug("BOOT:   Setting up UI commands");
        Pencil.setupCommands();

        Pencil.undoMenuItem = document.getElementById("editUndoMenu");
        Pencil.redoMenuItem = document.getElementById("editRedoMenu");

        Pencil.sideBoxFloat = document.getElementById("sideBoxFloat");
        var collectionPaneSizeGrip = document.getElementById("collectionPaneSizeGrip");

        debug("BOOT:   Registering global event handlers");
        debug("BOOT:     - Collection pane collapsing event");
        window.addEventListener("mousedown", function (event) {
            var target = event.target;
            if (target.className && target.className == "CollectionPane") {
                if (Pencil.hideCollectionPaneTimer) {
                    clearTimeout(Pencil.hideCollectionPaneTimer);
                    Pencil.hideCollectionPaneTimer = null;
                }

                if (target.id == "collectionPaneSizeGrip") {
                    collectionPaneSizeGrip._oX = event.clientX;
                    collectionPaneSizeGrip._oY = event.clientY;

                    collectionPaneSizeGrip._width = Pencil.sideBoxFloat.getBoundingClientRect().width;
                    collectionPaneSizeGrip._height = Pencil.sideBoxFloat.getBoundingClientRect().height;

                    collectionPaneSizeGrip._hold = true;
                }
            } else {
                if (Pencil.isCollectionPaneVisibled()) {
                    Pencil.hideCollectionPane();
                }
            }
        }, true);

        // document.body.onscroll = function (event) {
        //     if (document.body.scrollTop != 0) {
        //         document.body.scrollTop = 0;
        //     }
        // };

        debug("BOOT:     - Global scroll event");
        document.addEventListener("scroll", function (event) {
            if (document.body.scrollTop != 0 && event.target === document) {
                document.body.scrollTop = 0;
            }
        }, false);

        debug("BOOT:     - Booting shared editors.");
        //booting shared editors
        for (var i in Pencil.sharedEditors) {
            try {
                debug("BOOT:         " + Pencil.sharedEditors[i].constructor.name);
                Pencil.sharedEditors[i].setup();
            } catch (e) {
                Console.dumpError(e, "stdout");
            }
        }

        debug("BOOT:     - p:CanvasChanged event.");
        document.documentElement.addEventListener("p:CanvasChanged", Pencil.handleCanvasChange, false);
        debug("BOOT:     - p:TargetChanged event.");
        document.documentElement.addEventListener("p:TargetChanged", Pencil.handleTargetChange, false);

        debug("BOOT:     - p:ContentModified event.");
        document.documentElement.addEventListener("p:ContentModified", Pencil._setupUndoRedoCommand, false);
        debug("BOOT:     - p:UserFontLoaded event.");
        document.documentElement.addEventListener("p:UserFontLoaded", function () {
            if (ApplicationPane._instance) ApplicationPane._instance.sharedFontEditor.reloadFontItems();
        }, false);

        debug("BOOT:     - Fallback scroll event.");
        document.body.onscroll = function (event) {
            if (document.body.scrollTop != 0) {
                document.body.scrollTop = 0;
            }
        };
        debug("BOOT:   Done initializing Pencil core.");
    } catch (e) {
        console.error(e);
    }
};
Pencil.handleArguments = function() {
	var remote = require('electron').remote;
	var appArguments = remote.getGlobal('sharedObject').appArguments;
	if (appArguments && appArguments.length > 1) {
        var arg = appArguments[1];
        if (arg != "app") {
            Pencil.documentHandler.loadDocumentFromArguments(arg);
        }
	}
};
Pencil.setTitle = function (s) {
    document.title = s + " - Pencil";
};

Pencil.handleCanvasChange = function (event) {
    Pencil.activeCanvas = event.canvas;
    Pencil.setupCommands();
    Pencil.invalidateSharedEditor();
};
Pencil.handleTargetChange = function (event) {
    Pencil.setupCommands();
    Pencil.invalidateSharedEditor();
};
Pencil.invalidateSharedEditor = function() {
    var canvas = Pencil.activeCanvas;
    var target = canvas ? canvas.currentController : null;

    if (!target) {
        for (var i in Pencil.sharedEditors) {
            try {
                Pencil.sharedEditors[i].detach();
            } catch (e) {
                Console.dumpError(e, "stdout");
            }
        }
        return;
    }
    for (var i in Pencil.sharedEditors) {
        try {
            Pencil.sharedEditors[i].attach(target);
        } catch (e) {
            Console.dumpError(e, "stdout");
        }
    }
};
Pencil.setPainterCommandChecked = function (v) {
    var painterButton = Pencil.formatPainterButton;
    if (painterButton) {
        // painterCommand.checked = v;

        if (!v) {
            document.body.removeAttribute("format-painter");
            // var canvasList = Pencil.getCanvasList();
            // for (var i = 0; i < canvasList.length; i++) {
            //     Dom.removeClass(canvasList[i], "Painter");
            // }
            painterButton.removeAttribute("checked");
        } else {
            painterButton.setAttribute("checked", "true");
        }
    }
};
Pencil.getCanvasList = function () {
    var r = [];
    Dom.workOn("//xul:pcanvas", document.documentElement, function (node) {
        r.push(node);
    });
    return r;
};
Pencil.setupCommands = function () {

    // Pencil.uiCommandManager = new UICommandManager();

    // Pencil.cutCommand = {
    //     label: "Cut",
    //     icon: "content_cut",
    //     shortcut: "Ctrl+X",
    //     isEnabled: function () { return Pencil.activeCanvas.currentController; },
    //     handleAction: function () {
    //         Pencil.activeCanvas.doCopy();
    //         Pencil.activeCanvas.deleteSelected();
    //     }
    // };
    //
    // Pencil.copyCommand = {
    //     label: "Copy",
    //     icon: "content_copy",
    //     shortcut: "Ctrl+C",
    //     isEnabled: function () { return Pencil.activeCanvas.currentController; },
    //     handleAction: function () {
    //         Pencil.activeCanvas.doCopy();
    //     }
    // };
    //
    // Pencil.pasteCommand = {
    //     label: "Paste",
    //     icon: "content_paste",
    //     shortcut: "Ctrl+V",
    //     isEnabled: function () { return true; /*FIXME: check for clipboard content*/ },
    //     handleAction: function () {
    //         Pencil.activeCanvas.doPaste();
    //     }
    // };
    //
    // Pencil.selectAllCommand = {
    //     label: "Select All",
    //     icon: "select_all",
    //     shortcut: "Ctrl+A",
    //     isEnabled: function () { return true; },
    //     handleAction: function () {
    //         Pencil.activeCanvas.selectAll();
    //     }
    // };
    //
    // Pencil.undoCommand = {
    //     getLabel: function () { return "Undo: " + Pencil.activeCanvas.careTaker.getCurrentAction(); },
    //     icon: "undo",
    //     shortcut: "Ctrl+Z",
    //     isEnabled: function () { return Pencil.activeCanvas.careTaker.canUndo(); },
    //     handleAction: function () {
    //         Pencil.activeCanvas.careTaker.undo();
    //     }
    // };
    //
    // Pencil.redoCommand = {
    //     getLabel: function () { return "Redo: " + Pencil.activeCanvas.careTaker.getPrevAction(); },
    //     icon: "redo",
    //     shortcut: "Ctrl+Y",
    //     isEnabled: function () { return Pencil.activeCanvas.careTaker.canRedo(); },
    //     handleAction: function () {
    //         Pencil.activeCanvas.careTaker.redo();
    //     }
    // };
    //
    // Pencil.bringToFrontCommand = {
    //     label: "Bring to Front",
    //     shortcut: "Shiff+Page Up",
    //     isEnabled: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.bringToFront},
    //     handleAction: function () {
    //         Pencil.activeCanvas.currentController.bringToFront();
    //     }
    // };
    //
    // Pencil.bringForwardCommand = {
    //     label: "Bring Forward",
    //     shortcut: "Page Up",
    //     isEnabled: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.bringForward; },
    //     handleAction: function () {
    //         Pencil.activeCanvas.currentController.bringForward();
    //     }
    // };
    //
    // Pencil.bringToFrontCommand = {
    //     label: "Bring to Front",
    //     shortcut: "Shiff+Page Up",
    //     isEnabled: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.bringToFront},
    //     handleAction: function () {
    //         Pencil.activeCanvas.currentController.bringToFront();
    //     }
    // };
    //
    // Pencil.sendBackwardCommand = {
    //     label: "Send Backward",
    //     shortcut: "Page Down",
    //     isEnabled: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.sendBackward; },
    //     handleAction: function () {
    //         Pencil.activeCanvas.currentController.sendBackward();
    //     }
    // };
    //
    // Pencil.sendToBackCommand = {
    //     label: "Send to Back",
    //     shortcut: "Shiff+Page Down",
    //     isEnabled: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.sendToBack; },
    //     handleAction: function () {
    //         Pencil.activeCanvas.currentController.sendToBack();
    //     }
    // };
    //
    // Pencil.groupCommand = {
    //     label: "Group",
    //     shortcut: "Ctrl+G",
    //     isAvailable: function () {
    //         return Pencil.activeCanvas.currentController &&
    //         (Pencil.activeCanvas.currentController instanceof TargetSet);
    //     },
    //     isEnabled: function () { return Pencil.activeCanvas.currentController; },
    //     handleAction: function () {
    //         Pencil.activeCanvas.doGroup();
    //     }
    // };
    //
    // Pencil.unGroupCommand = {
    //     label: "Ungroup",
    //     shortcut: "Ctrl+Alt+G",
    //     isAvailable: function () {
    //         return Pencil.activeCanvas.currentController &&
    //         (Pencil.activeCanvas.currentController instanceof Group);
    //     },
    //     isEnabled: function () { return Pencil.activeCanvas.currentController; },
    //     handleAction: function () {
    //         Pencil.activeCanvas.doUnGroup();
    //     }
    // };
    //
    // Pencil.deleteSelectedCommand = {
    //     label: "Delete",
    //     icon: "delete",
    //     shortcut: "Del",
    //     isAvailable: function () {
    //         return Pencil.activeCanvas.currentController &&
    //         (Pencil.activeCanvas.currentController instanceof Shape || Pencil.activeCanvas.currentController instanceof Group || Pencil.activeCanvas.currentController instanceof TargetSet);
    //     },
    //     isEnabled: function () { return Pencil.activeCanvas.currentController; },
    //     handleAction: function () {
    //         Pencil.activeCanvas.deleteSelected();
    //     }
    // };
    //
    // Pencil.addSelectedToMyCollectionsCommand = {
    //     label: "Add to My Collections",
    //     isAvailable: function () {
    //         return Pencil.activeCanvas.currentController &&
    //         (Pencil.activeCanvas.currentController instanceof Shape || Pencil.activeCanvas.currentController instanceof Group);
    //     },
    //     isEnabled: function () { return Pencil.activeCanvas.currentController; },
    //     handleAction: function () {
    //         Pencil.activeCanvas.addSelectedToMyCollection();
    //     }
    // };
    //
    // Pencil.fitContentCommand = {
    //     label: "Fit Content",
    //     handleAction: function () {
    //         Pencil.controller.sizeToContent(null, false); // FIXME: bug
    //     }
    // };
    //
    // Pencil.fitwithPaddingCommand = {
    //     label: "Fit with Padding",
    //     handleAction: function () {
    //         Pencil.controller.sizeToContent(null, true); // FIXME: bug
    //     }
    // };
    // Pencil.fitScreenCommand = {
    //     label: "Fit Screen",
    //     handleAction: function () {
    //         Pencil.controller.sizeToBestFit(); // FIXME: bug
    //     }
    // };
    // Pencil.sizingPolicyCommand = {
    //     label: "Sizing Policy...",
    //     isAvailable: function () {
    //         return Pencil.activeCanvas.currentController &&
    //         (Pencil.activeCanvas.currentController instanceof Shape || Pencil.activeCanvas.currentController instanceof Group);
    //     },
    //     isEnabled: function () { return true; },
    //     handleAction: function () {
    //         Group.openSizingPolicyDialog(Pencil.activeCanvas.currentController); // FIXME: bug
    //     }
    // };





    // var canvas = Pencil.activeCanvas;
    // var target = canvas ? canvas.currentController : null;
    //
    // Pencil._enableCommand("rasterizeSelectionCommand", target && target.getGeometry);
    // Pencil._enableCommand("rasterizeCommand", canvas != null);
    //
    // Pencil._enableCommand("zoomInCommand", canvas != null);
    // Pencil._enableCommand("zoom1Command", canvas != null);
    // Pencil._enableCommand("zoomOutCommand", canvas != null);
    //
    // Pencil._enableCommand("moveLeftCommand", canvas != null);
    // Pencil._enableCommand("moveRightCommand", canvas != null);
    //
    // Pencil._enableCommand("makeSameHorizontalSpaceCommand", target && target.makeSameHorizontalSpace);
    // Pencil._enableCommand("makeSameVerticalSpaceCommand", target && target.makeSameVerticalSpace);
    //
    // Pencil._enableCommand("alignLeftCommand", target && target.alignLeft);
    // Pencil._enableCommand("alignCenterCommand", target && target.alignCenter);
    // Pencil._enableCommand("alignRightCommand", target && target.alignRight);
    // Pencil._enableCommand("alignTopCommand", target && target.alignTop);
    // Pencil._enableCommand("alignMiddleCommand", target && target.alignMiddle);
    // Pencil._enableCommand("alignBottomCommand", target && target.alignBottom);
    //
    // Pencil._enableCommand("makeSameWidthCommand", target && target.makeSameWidth);
    // Pencil._enableCommand("makeSameHeightCommand", target && target.makeSameHeight);
    // Pencil._enableCommand("makeSameMinWidthCommand", target && target.makeSameMinWidth);
    // Pencil._enableCommand("makeSameMinHeightCommand", target && target.makeSameMinHeight);
    //
    // Pencil._enableCommand("bringToFrontCommand", target && target.bringToFront);
    // Pencil._enableCommand("bringForwardCommand", target && target.bringForward);
    // Pencil._enableCommand("sendBackwardCommand", target && target.sendBackward);
    // Pencil._enableCommand("sendToBackCommand", target && target.sendToBack);
    //
    // Pencil._enableCommand("formatPainterCommand", canvas && canvas.beginFormatPainter && target && (target.constructor == Group || target.constructor == Shape));
    //
    // Pencil._enableCommand("copyCommand", canvas && canvas.doCopy && target);
    // Pencil._enableCommand("cutCommand", canvas && canvas.doCopy && target);
    // Pencil._enableCommand("pasteCommand", canvas && canvas.doPaste);
    // Pencil._enableCommand("deleteSelectedCommand", target != null);
    //
    // Pencil._enableCommand("groupCommand", target && target.constructor == TargetSet);
    // Pencil._enableCommand("unGroupCommand", target && target.constructor == Group);
    //
    // Pencil._setupUndoRedoCommand();


};
Pencil._setupUndoRedoCommand = function () {
    var canvas = Pencil.activeCanvas;

    Pencil._enableCommand("undoCommand", canvas && canvas.careTaker && canvas.careTaker.canUndo());
    Pencil._enableCommand("redoCommand", canvas && canvas.careTaker && canvas.careTaker.canRedo());

    if (canvas && canvas.careTaker) {
        var currentAction = canvas.careTaker.getCurrentAction();
        var prevAction = canvas.careTaker.getPrevAction();
        if (canvas.careTaker.canUndo() && canvas.careTaker.canRedo()) {
            Pencil.updateUndoRedoMenu(currentAction, prevAction);
        } else if (canvas.careTaker.canUndo()) {
            Pencil.updateUndoRedoMenu(currentAction, "");
        } else {
            Pencil.updateUndoRedoMenu("", prevAction);
        }
    }
};
Pencil._enableCommand = function (name, condition) {
    var command = document.getElementById(name);
    if (command) {
        if (condition) {
            command.removeAttribute("disabled");
        } else {
            command.setAttribute("disabled", true);
        }
    }
};

Pencil.getGridSize = function () {
    var size = Config.get("edit.gridSize");
    if (size == null) {
        size = 5;
        Config.set("edit.gridSize", size);
    }
    return {w: size, h: size};
};

Pencil.getGridStyle = function () {
    var style = Config.get("edit.gridStyle");
    if (style == null) {
        style = "Dotted";
        Config.set("edit.gridStyle", style);
    }
    return style;
};

Pencil.getCurrentTarget = function () {
    var canvas = Pencil.activeCanvas;
    return canvas ? canvas.currentController : null;
};
Pencil.isCollectionPaneVisibled = function () {
    return false;
}
Pencil._hideCollectionPane = function (c) {
    if (c <= 0) {
        Pencil.sideBoxFloat.style.display = "none";
        Pencil.hideCollectionPaneTimer = null;
        Pencil.setUpSizeGrip();
    } else {
        Pencil.sideBoxFloat.style.opacity = c;
        window.setTimeout("Pencil._hideCollectionPane(" + parseFloat(c - 0.5) + ")", 1);
    }
};
Pencil.hideCollectionPane = function () {
    if (!Pencil.hideCollectionPaneTimer) {
        if (Util.platform == "Linux") {
            Pencil.hideCollectionPaneTimer = window.setTimeout("Pencil._hideCollectionPane(0)", 1);
        } else {
            Pencil.hideCollectionPaneTimer = window.setTimeout("Pencil._hideCollectionPane(1)", 300);
        }
    }
}
Pencil.setUpSizeGrip = function () {
    var box = Pencil.sideBoxFloat.getBoundingClientRect();
    var sizeGrip = document.getElementById("collectionPaneSizeGrip");
    sizeGrip.setAttribute("left", (box.width - 15));
    sizeGrip.setAttribute("top", (box.height - 19));
    sizeGrip.style.display = Pencil.isCollectionPaneVisibled() ? '' : "none";
};
Pencil._showCollectionPane = function (c) {
    if (c == 0) {
        Pencil.sideBoxFloat.style.opacity = 0;
        Pencil.sideBoxFloat.style.display = "";
        Pencil.setUpSizeGrip();
    }
    if (c <= 1) {
        Pencil.sideBoxFloat.style.opacity = c;
        window.setTimeout("Pencil._showCollectionPane(" + parseFloat(c + 0.5) + ")", 1);
    }
};
Pencil.showCollectionPane = function () {
    if (Util.platform == "Linux") {
        Pencil.sideBoxFloat.style.opacity = 1;
        Pencil.sideBoxFloat.style.display = "";
        Pencil.setUpSizeGrip();
    } else {
        Pencil._showCollectionPane(0);
    }
};
Pencil.toggleCollectionPane = function (dockable) {
    if (!dockable) {
        if (Config.get("collectionPane.floating") == true) {
            if (Pencil.isCollectionPaneVisibled()) {
                if (Util.platform == "Linux") {
                    Pencil._hideCollectionPane(0);
                } else {
                    Pencil._hideCollectionPane(1);
                }
            } else {
                Pencil.showCollectionPane();
            }
        }
    } else {
        if (!Config.get("collectionPane.floating")) {
            Config.set("collectionPane.floating", true);
            document.getElementById("sideBox").style.display = "none";
            Pencil.collectionPane = document.getElementById("collectionPane");
            Pencil.privateCollectionPane = document.getElementById("privateCollectionPane");
            Pencil.collectionPane.reloadCollections();
            Pencil.privateCollectionPane.reloadCollections();
        } else {
            Pencil._hideCollectionPane(0);
            Config.set("collectionPane.floating", false);
            document.getElementById("sideBox").style.display = "";
            Pencil.collectionPane = document.getElementById("_collectionPane");
            Pencil.privateCollectionPane = document.getElementById("_privateCollectionPane");
            Pencil.collectionPane.reloadCollections();
            Pencil.privateCollectionPane.reloadCollections();
        }

        document.getElementById("floatingCollectionPane").setAttribute("checked", Config.get("collectionPane.floating") == false);
    }
};
Pencil.handlePropertiesCommand = function () {
    if (Pencil.activeCanvas.currentController) {
        Pencil.activeCanvas._showPropertyDialog();
    } else {
        if (!Pencil.controller._pageToEdit) {
            Pencil.controller._pageToEdit = Pencil.controller.getCurrentPage();
        }

        Pencil.controller.editPageProperties(Pencil.controller._pageToEdit);
        Pencil.controller._pageToEdit = null;
    }
};
Pencil.updateUndoRedoMenu = function (currentAction, prevAction) {
//    Pencil.undoMenuItem.setAttribute("label", Util.getMessage("menu.undo.label") + currentAction);
//    Pencil.redoMenuItem.setAttribute("label", Util.getMessage("menu.redo.label") + prevAction);
    Pencil.activeCanvas.updateContextMenu(currentAction, prevAction);
};
Pencil._getCanvasPadding = function () {
    return 10;
};
Object.defineProperty(Pencil, "activeCanvas", {
    set: function (canvas) {
        Canvas.activeCanvas = canvas;
    },
    get: function () {
        return Canvas.activeCanvas;
    }
});
