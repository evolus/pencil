function CanvasMenu(canvas) {
    Menu.call(this);
    this.canvas = canvas;

    this.setup();
}
__extend(Menu, CanvasMenu);

CanvasMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "Menu.xhtml";
};

CanvasMenu.prototype.setup = function () {
    var thiz = this;

    UICommandManager.register({
        key: "undoCommand",
        getLabel: function () { return "Undo: " + thiz.canvas.careTaker.getCurrentAction(); },
        icon: "undo",
        shortcut: "Ctrl+Z",
        isValid: function () { return thiz.canvas.careTaker.canUndo(); },
        applyWhenClass: "Canvas",
        run: function () {
            thiz.canvas.careTaker.undo();
        }
    });
    UICommandManager.register({
        key: "redoCommand",
        getLabel: function () { return "Redo: " + thiz.canvas.careTaker.getPrevAction(); },
        icon: "redo",
        shortcut: "Ctrl+Y",
        isValid: function () { return thiz.canvas.careTaker.canRedo(); },
        applyWhenClass: "Canvas",
        run: function () {
            thiz.canvas.careTaker.redo();
        }
    });

    UICommandManager.register({
        key: "bringToFrontCommand",
        label: "Bring to Front",
        shortcut: "Shift+PAGE_UP",
        isValid: function () { return thiz.canvas.currentController && thiz.canvas.currentController.bringToFront},
        applyWhenClass: "Canvas",
        run: function () {
            Pencil.activeCanvas.currentController.bringToFront();
        }
    });
    UICommandManager.register({
        key: "bringForwardCommand",
        label: "Bring Forward",
        shortcut: "PAGE_UP",
        isValid: function () { return thiz.canvas.currentController && thiz.canvas.currentController.bringForward; },
        applyWhenClass: "Canvas",
        run: function () {
            Pencil.activeCanvas.currentController.bringForward();
        }
    });
    UICommandManager.register({
        key: "sendBackwardCommand",
        label: "Send Backward",
        shortcut: "PAGE_DOWN",
        isValid: function () { return thiz.canvas.currentController && thiz.canvas.currentController.sendBackward; },
        applyWhenClass: "Canvas",
        run: function () {
            Pencil.activeCanvas.currentController.sendBackward();
        }
    });
    UICommandManager.register({
        key: "sendToBackCommand",
        label: "Send to Back",
        shortcut: "Shift+PAGE_DOWN",
        isValid: function () { return thiz.canvas.currentController && thiz.canvas.currentController.sendToBack; },
        applyWhenClass: "Canvas",
        run: function () {
            Pencil.activeCanvas.currentController.sendToBack();
        }
    });
    UICommandManager.register({
        key: "lockCommand",
        type: "Toggle",
        label: "Locked",
        isAvailable: function () { return thiz.canvas.currentController},
        isChecked: function () {
            return thiz.canvas.lockingStatus && thiz.canvas.lockingStatus.node && thiz.canvas.isShapeLocked(thiz.canvas.lockingStatus.node);
        },
        run: function (checked) {
            thiz.canvas.toggleLocking(); // FIXME: bug
        }
    });
    UICommandManager.register({
        key: "groupCommand",
        label: "Group",
        shortcut: "Ctrl+G",
        isAvailable: function () {
            return thiz.canvas.currentController &&
            (thiz.canvas.currentController instanceof TargetSet);
        },
        isValid: function () { return thiz.canvas.currentController; },
        applyWhenClass: "Canvas",
        run: function () {
            Pencil.activeCanvas.doGroup();
        }
    });
    UICommandManager.register({
      key: "unGroupCommand",
        label: "Ungroup",
        shortcut: "Ctrl+Alt+G",
        isAvailable: function () {
            return thiz.canvas.currentController &&
            (thiz.canvas.currentController instanceof Group);
        },
        isValid: function () { return thiz.canvas.currentController; },
        applyWhenClass: "Canvas",
        run: function () {
            Pencil.activeCanvas.doUnGroup();
        }
    });
    UICommandManager.register({
        key: "deleteSelectedCommand",
        label: "Delete",
        icon: "delete",
        shortcut: "DELETE",
        isAvailable: function () {
            return thiz.canvas.currentController &&
            (thiz.canvas.currentController instanceof Shape || thiz.canvas.currentController instanceof Group || thiz.canvas.currentController instanceof TargetSet);
        },
        isValid: function () { return thiz.canvas.currentController; },
        applyWhenClass: "Canvas",
        run: function () {
            thiz.canvas.deleteSelected();
            ApplicationPane._instance.invalidatePropertyEditor();
        }
    });
    UICommandManager.register({
        key: "addSelectedToMyCollectionsCommand",
        label: "Add to My Collections",
        isAvailable: function () {
            return thiz.canvas.currentController &&
            (thiz.canvas.currentController instanceof Shape || thiz.canvas.currentController instanceof Group);
        },
        isValid: function () { return thiz.canvas.currentController; },
        run: function () {
           if (!thiz.canvas.currentController) { return;}

           thiz.canvas.addSelectedToMyCollection();
        }
    });
    UICommandManager.register({
      key: "cutCommand",
        label: "Cut",
        icon: "content_cut",
        shortcut: "Ctrl+X",
        isValid: function () { return Pencil.activeCanvas.currentController; },
        applyWhenClass: "Canvas",
        run: function () {
            Pencil.activeCanvas.doCopy();
            Pencil.activeCanvas.deleteSelected();
        }
    });
    UICommandManager.register({
      key: "copyCommand",
        label: "Copy",
        icon: "content_copy",
        shortcut: "Ctrl+C",
        isValid: function () { return Pencil.activeCanvas.currentController; },
        applyWhenClass: "Canvas",
        run: function () {
            Pencil.activeCanvas.doCopy();
        }
    });
    UICommandManager.register({
      key: "pasteCommand",
        label: "Paste",
        icon: "content_paste",
        shortcut: "Ctrl+V",
        isValid: function () { return true; /*FIXME: check for clipboard content*/ },
        applyWhenClass: "Canvas",
        run: function () {
            Pencil.activeCanvas.doPaste();
        }
    });
    UICommandManager.register({
      key: "selectAllCommand",
        label: "Select All",
        icon: "select_all",
        shortcut: "Ctrl+A",
        isValid: function () { return true; },
        applyWhenClass: "Canvas",
        run: function () {
            Pencil.activeCanvas.selectAll();
        }
    });
    UICommandManager.register({
      key: "fitContentCommand",
        label: "Fit Content",
        run: function () {
            Pencil.controller.sizeToContent(null, false); // FIXME: bug
        }
    });
    UICommandManager.register({
      key: "fitwithPaddingCommand",
        label: "Fit with Padding",
        run: function () {
            Pencil.controller.sizeToContent(null, true); // FIXME: bug
        }
    });
    UICommandManager.register({
      key: "fitScreenCommand",
        label: "Fit Screen",
        run: function () {
            Pencil.controller.sizeToBestFit(); // FIXME: bug
        }
    });
    UICommandManager.register({
      key: "sizingPolicyCommand",
        label: "Sizing Policy...",
        isAvailable: function () {
            return thiz.canvas.currentController &&
            (thiz.canvas.currentController instanceof Shape || thiz.canvas.currentController instanceof Group);
        },
        isValid: function () { return true; },
        run: function () {
            Group.openSizingPolicyDialog(Pencil.activeCanvas.currentController); // FIXME: bug
        }
    });

    this.register(UICommandManager.getCommand("undoCommand"));
    this.register(UICommandManager.getCommand("redoCommand"));

    this.separator();

    this.register({
        label: "Arrangement",
        isAvailable: function () {
            return thiz.canvas.currentController &&
            (thiz.canvas.currentController instanceof Shape || thiz.canvas.currentController instanceof TargetSet || thiz.canvas.currentController instanceof Group);
        },
        type: "SubMenu",
        subItems: [UICommandManager.getCommand("bringToFrontCommand"),
                    UICommandManager.getCommand("bringForwardCommand"),
                    UICommandManager.getCommand("sendBackwardCommand"),
                    UICommandManager.getCommand("sendToBackCommand")]
    });


    this.separator();

    this.register(function () {
        if (thiz.canvas.contextMenuEditor) {
            return thiz.canvas.contextMenuEditor.generateMenuItems();
        } else {
            return [];
        }
    });

    this.separator();

    this.register(UICommandManager.getCommand("lockCommand"));
    this.register(UICommandManager.getCommand("groupCommand"));
    this.register(UICommandManager.getCommand("unGroupCommand"));
    this.register(UICommandManager.getCommand("deleteSelectedCommand"));
    this.register(UICommandManager.getCommand("addSelectedToMyCollectionsCommand"));

    this.separator();

    this.register(UICommandManager.getCommand("cutCommand"));
    this.register(UICommandManager.getCommand("copyCommand"));
    this.register(UICommandManager.getCommand("pasteCommand"));
    this.register(UICommandManager.getCommand("selectAllCommand"));

    UICommandManager.getCommand("exportSelectionAsPNGButton").isAvailable = function () {
        var target = thiz.canvas.currentController;
        if (!target || !target.getGeometry) return false;
        return true;

    };
    this.register(UICommandManager.getCommand("exportSelectionAsPNGButton"));

    this.separator();

    this.register({
        label: "Resize Canvas",
        type: "SubMenu",
        subItems: [UICommandManager.getCommand("fitContentCommand"),
                    UICommandManager.getCommand("fitwithPaddingCommand"),
                    UICommandManager.getCommand("fitScreenCommand")]
    });

    this.separator();
    this.register(UICommandManager.getCommand("sizingPolicyCommand"));
    // <menuseparator/>

    // this.register({
    //     label: "Properties...",
    //     isEnabled: function () { return true; },
    //     handleAction: function () {
    //         // show properties...
    //     }
    // });

};
