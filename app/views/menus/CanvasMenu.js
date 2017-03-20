function CanvasMenu() {
    Menu.call(this);
    this.setup();
}
__extend(Menu, CanvasMenu);

CanvasMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "menus/Menu.xhtml";
};

CanvasMenu.prototype.setup = function () {
    var thiz = this;

    UICommandManager.register({
        key: "undoCommand",
        shortcut: "Ctrl+Z",
        getLabel: function () { return "Undo" + Pencil.activeCanvas.careTaker.getCurrentAction(); },
        icon: "undo",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.careTaker.canUndo(); },
        applyWhenClass: "CanvasScrollPane",
        run: function () {
            Pencil.activeCanvas.careTaker.undo();
        }
    });
    UICommandManager.register({
        key: "redoCommand",
        shortcut: "Ctrl+Y",
        getLabel: function () { return "Redo" + Pencil.activeCanvas.careTaker.getPrevAction(); },
        icon: "redo",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.careTaker.canRedo(); },
        applyWhenClass: "CanvasScrollPane",
        run: function () {
            Pencil.activeCanvas.careTaker.redo();
        }
    });

    UICommandManager.register({
        key: "bringToFrontCommand",
        label: "Bring to Front",
        shortcut: "Shift+PAGE_UP",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.bringToFront},
        applyWhenClass: "CanvasScrollPane",
        run: function () {
            Pencil.activeCanvas.currentController.bringToFront();
        }
    });
    UICommandManager.register({
        key: "bringForwardCommand",
        label: "Bring Forward",
        shortcut: "PAGE_UP",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.bringForward; },
        applyWhenClass: "CanvasScrollPane",
        run: function () {
            Pencil.activeCanvas.currentController.bringForward();
        }
    });
    UICommandManager.register({
        key: "sendBackwardCommand",
        label: "Send Backward",
        shortcut: "PAGE_DOWN",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.sendBackward; },
        applyWhenClass: "CanvasScrollPane",
        run: function () {
            Pencil.activeCanvas.currentController.sendBackward();
        }
    });
    UICommandManager.register({
        key: "sendToBackCommand",
        label: "Send to Back",
        shortcut: "Shift+PAGE_DOWN",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.sendToBack; },
        applyWhenClass: "CanvasScrollPane",
        run: function () {
            Pencil.activeCanvas.currentController.sendToBack();
        }
    });
    UICommandManager.register({
        key: "lockCommand",
        type: "Toggle",
        label: "Locked",
        isAvailable: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController},
        isChecked: function () {
            return Pencil.activeCanvas.lockingStatus && Pencil.activeCanvas.lockingStatus.node && Pencil.activeCanvas.isShapeLocked(Pencil.activeCanvas.lockingStatus.node);
        },
        run: function (checked) {
            Pencil.activeCanvas.toggleLocking(); // FIXME: bug
        }
    });
    UICommandManager.register({
        key: "groupCommand",
        label: "Group",
        shortcut: "Ctrl+G",
        isAvailable: function () {
            return Pencil.activeCanvas && Pencil.activeCanvas.currentController &&
            (Pencil.activeCanvas.currentController instanceof TargetSet);
        },
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController; },
        applyWhenClass: "CanvasScrollPane",
        run: function () {
            Pencil.activeCanvas.doGroup();
        }
    });
    UICommandManager.register({
      key: "unGroupCommand",
        label: "Ungroup",
        shortcut: "Ctrl+Shift+G",
        isAvailable: function () {
            return Pencil.activeCanvas && Pencil.activeCanvas.currentController &&
            (Pencil.activeCanvas.currentController instanceof Group);
        },
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController; },
        applyWhenClass: "CanvasScrollPane",
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
            return Pencil.activeCanvas && Pencil.activeCanvas.currentController &&
            (Pencil.activeCanvas.currentController instanceof Shape || Pencil.activeCanvas.currentController instanceof Group || Pencil.activeCanvas.currentController instanceof TargetSet);
        },
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController; },
        applyWhenClass: "CanvasScrollPane",
        run: function () {
            Pencil.activeCanvas.deleteSelected();
            ApplicationPane._instance.invalidatePropertyEditor();
        }
    });
    UICommandManager.register({
        key: "addSelectedToMyCollectionsCommand",
        label: "Add to My Collections...",
        isAvailable: function () {
            return Pencil.activeCanvas && Pencil.activeCanvas.currentController &&
            (Pencil.activeCanvas.currentController instanceof Shape || Pencil.activeCanvas.currentController instanceof Group);
        },
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController; },
        run: function () {
           if (!Pencil.activeCanvas.currentController) { return;}

           Pencil.activeCanvas.addSelectedToMyCollection();
        }
    });
    UICommandManager.register({
      key: "cutCommand",
        label: "Cut",
        icon: "content_cut",
        shortcut: "Ctrl+X",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController; },
        applyWhenClass: "CanvasScrollPane",
        run: function (event) {
            Pencil.activeCanvas.doCopy();
            Pencil.activeCanvas.deleteSelected();
        }
    });
    UICommandManager.register({
      key: "copyCommand",
        label: "Copy",
        icon: "content_copy",
        shortcut: "Ctrl+C",
        isValid: function () {
            return Pencil.activeCanvas && Pencil.activeCanvas.currentController;
        },
        applyWhenClass: "CanvasScrollPane",
        run: function (event) {
            Pencil.activeCanvas.doCopy();
        }
    });
    UICommandManager.register({
      key: "pasteCommand",
        label: "Paste",
        icon: "content_paste",
        shortcut: "Ctrl+V",
        isValid: function () { return Pencil.activeCanvas; /*FIXME: check for clipboard content*/ },
        applyWhenClass: "CanvasScrollPane",
        run: function () {
            Pencil.activeCanvas.doPaste();
        }
    });
    UICommandManager.register({
      key: "pasteCommand2",
        label: "Paste",
        icon: "content_paste",
        shortcut: "Ctrl+Shift+V",
        isValid: function () { return Pencil.activeCanvas; /*FIXME: check for clipboard content*/ },
        applyWhenClass: "CanvasScrollPane",
        run: function () {
            Pencil.activeCanvas.doPaste("withAlternative");
        }
    });
    UICommandManager.register({
      key: "selectAllCommand",
        label: "Select All",
        icon: "select_all",
        shortcut: "Ctrl+A",
        isValid: function () { return Pencil.activeCanvas; },
        applyWhenClass: "CanvasScrollPane",
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
      key: "fitContentwithPaddingCommand",
        label: "Fit Content with Padding...",
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
            return Pencil.activeCanvas && Pencil.activeCanvas.currentController &&
            (Pencil.activeCanvas.currentController instanceof Shape || Pencil.activeCanvas.currentController instanceof Group);
        },
        isValid: function () { return Pencil.activeCanvas; },
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
            return Pencil.activeCanvas && Pencil.activeCanvas.currentController &&
            (Pencil.activeCanvas.currentController instanceof Shape || Pencil.activeCanvas.currentController instanceof TargetSet || Pencil.activeCanvas.currentController instanceof Group);
        },
        type: "SubMenu",
        subItems: [UICommandManager.getCommand("bringToFrontCommand"),
                    UICommandManager.getCommand("bringForwardCommand"),
                    UICommandManager.getCommand("sendBackwardCommand"),
                    UICommandManager.getCommand("sendToBackCommand")]
    });


    this.separator();

    this.register(function () {
        if (Pencil.activeCanvas && Pencil.activeCanvas.contextMenuEditor) {
            return Pencil.activeCanvas.contextMenuEditor.generateMenuItems();
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
        var target = Pencil.activeCanvas && Pencil.activeCanvas.currentController;
        if (!target || !target.getGeometry) return false;
        return true;

    };
    this.register(UICommandManager.getCommand("exportSelectionAsPNGButton"));

    this.separator();

    this.register({
        label: "Resize Canvas",
        type: "SubMenu",
        subItems: [UICommandManager.getCommand("fitContentCommand"),
                    UICommandManager.getCommand("fitContentwithPaddingCommand"),
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
