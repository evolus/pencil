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

    Pencil.undoCommand = {
        getLabel: function () { return "Undo: " + thiz.canvas.careTaker.getCurrentAction(); },
        icon: "undo",
        shortcut: "Ctrl+Z",
        isEnabled: function () { return thiz.canvas.careTaker.canUndo(); },
        handleAction: function () {
            thiz.canvas.careTaker.undo();
        }
    };
    Pencil.redoCommand = {
        getLabel: function () { return "Redo: " + thiz.canvas.careTaker.getPrevAction(); },
        icon: "redo",
        shortcut: "Ctrl+Y",
        isEnabled: function () { return thiz.canvas.careTaker.canRedo(); },
        handleAction: function () {
            thiz.canvas.careTaker.redo();
        }
    };

    Pencil.bringToFrontCommand = {
        label: "Bring to Front",
        shortcut: "Shiff+Page Up",
        isEnabled: function () { return thiz.canvas.currentController && thiz.canvas.currentController.bringToFront},
        handleAction: function () {
            Pencil.activeCanvas.currentController.bringToFront();
        }
    };
    Pencil.bringForwardCommand ={
        label: "Bring Forward",
        shortcut: "Page Up",
        isEnabled: function () { return thiz.canvas.currentController && thiz.canvas.currentController.bringForward; },
        handleAction: function () {
            Pencil.activeCanvas.currentController.bringForward();
        }
    };
    Pencil.sendBackwardCommand = {
        label: "Send Backward",
        shortcut: "Page Down",
        isEnabled: function () { return thiz.canvas.currentController && thiz.canvas.currentController.sendBackward; },
        handleAction: function () {
            Pencil.activeCanvas.currentController.sendBackward();
        }
    };
    Pencil.sendToBackCommand = {
        label: "Send to Back",
        shortcut: "Shiff+Page Down",
        isEnabled: function () { return thiz.canvas.currentController && thiz.canvas.currentController.sendToBack; },
        handleAction: function () {
            Pencil.activeCanvas.currentController.sendToBack();
        }
    };
    Pencil.lockCommand = {
        type: "Toggle",
        label: "Locked",
        isChecked: function () {
            return thiz.canvas.lockingStatus && thiz.canvas.lockingStatus.node && thiz.canvas.isShapeLocked(thiz.canvas.lockingStatus.node);
        },
        handleAction: function (checked) {
            thiz.canvas.toggleLocking(); // FIXME: bug
        }
    };
    Pencil.groupCommand = {
        label: "Group",
        shortcut: "Ctrl+G",
        isAvailable: function () {
            return thiz.canvas.currentController &&
            (thiz.canvas.currentController instanceof TargetSet);
        },
        isEnabled: function () { return thiz.canvas.currentController; },
        handleAction: function () {
            Pencil.activeCanvas.doGroup();
        }
    };
    Pencil.unGroupCommand = {
        label: "Ungroup",
        shortcut: "Ctrl+Alt+G",
        isAvailable: function () {
            return thiz.canvas.currentController &&
            (thiz.canvas.currentController instanceof Group);
        },
        isEnabled: function () { return thiz.canvas.currentController; },
        handleAction: function () {
            Pencil.activeCanvas.doUnGroup();
        }
    };
    Pencil.deleteSelectedCommand = {
        label: "Delete",
        icon: "delete",
        shortcut: "Del",
        isAvailable: function () {
            return thiz.canvas.currentController &&
            (thiz.canvas.currentController instanceof Shape || thiz.canvas.currentController instanceof Group || thiz.canvas.currentController instanceof TargetSet);
        },
        isEnabled: function () { return thiz.canvas.currentController; },
        handleAction: function () {
            thiz.canvas.deleteSelected();
        }
    };
    Pencil.addSelectedToMyCollectionsCommand = {
        label: "Add to My Collections",
        isAvailable: function () {
            return thiz.canvas.currentController &&
            (thiz.canvas.currentController instanceof Shape || thiz.canvas.currentController instanceof Group);
        },
        isEnabled: function () { return thiz.canvas.currentController; },
        handleAction: function () {
            thiz.canvas.addSelectedToMyCollection();
        }
    };
    Pencil.cutCommand = {
        label: "Cut",
        icon: "content_cut",
        shortcut: "Ctrl+X",
        isEnabled: function () { return Pencil.activeCanvas.currentController; },
        handleAction: function () {
            Pencil.activeCanvas.doCopy();
            Pencil.activeCanvas.deleteSelected();
        }
    };
    Pencil.copyCommand = {
        label: "Copy",
        icon: "content_copy",
        shortcut: "Ctrl+C",
        isEnabled: function () { return Pencil.activeCanvas.currentController; },
        handleAction: function () {
            Pencil.activeCanvas.doCopy();
        }
    };
    Pencil.pasteCommand = {
        label: "Paste",
        icon: "content_paste",
        shortcut: "Ctrl+V",
        isEnabled: function () { return true; /*FIXME: check for clipboard content*/ },
        handleAction: function () {
            Pencil.activeCanvas.doPaste();
        }
    };
    Pencil.selectAllCommand = {
        label: "Select All",
        icon: "select_all",
        shortcut: "Ctrl+A",
        isEnabled: function () { return true; },
        handleAction: function () {
            Pencil.activeCanvas.selectAll();
        }
    };
    Pencil.fitContentCommand = {
        label: "Fit Content",
        handleAction: function () {
            Pencil.controller.sizeToContent(null, false); // FIXME: bug
        }
    };
    Pencil.fitwithPaddingCommand = {
        label: "Fit with Padding",
        handleAction: function () {
            Pencil.controller.sizeToContent(null, true); // FIXME: bug
        }
    };
    Pencil.fitScreenCommand = {
        label: "Fit Screen",
        handleAction: function () {
            Pencil.controller.sizeToBestFit(); // FIXME: bug
        }
    };
    Pencil.sizingPolicyCommand = {
        label: "Sizing Policy...",
        isAvailable: function () {
            return thiz.canvas.currentController &&
            (thiz.canvas.currentController instanceof Shape || thiz.canvas.currentController instanceof Group);
        },
        isEnabled: function () { return true; },
        handleAction: function () {
            Group.openSizingPolicyDialog(Pencil.activeCanvas.currentController); // FIXME: bug
        }
    };

    this.register(Pencil.undoCommand);
    this.register(Pencil.redoCommand);

    this.register({
        label: "Arrangement",
        isAvailable: function () {
            return thiz.canvas.currentController &&
            (thiz.canvas.currentController instanceof Shape || thiz.canvas.currentController instanceof TargetSet || thiz.canvas.currentController instanceof Group);
        },
        type: "SubMenu",
        subItems: [Pencil.bringToFrontCommand, Pencil.bringToFrontCommand, Pencil.sendBackwardCommand, Pencil.sendToBackCommand]
    });

    // <menuseparator/>

    this.register(function () {
        if (thiz.canvas.contextMenuEditor) {
            return thiz.canvas.contextMenuEditor.generateMenuItems();
        } else {
            return [];
        }
    });

    // <menuseparator/>

    this.register(Pencil.lockCommand);
    this.register(Pencil.groupCommand);
    this.register(Pencil.unGroupCommand);
    this.register(Pencil.deleteSelectedCommand);
    this.register(Pencil.addSelectedToMyCollectionsCommand);

    // <menuseparator/>

    this.register(Pencil.cutCommand);
    this.register(Pencil.copyCommand);
    this.register(Pencil.pasteCommand);
    this.register(Pencil.selectAllCommand);

    // <menuseparator/>

    this.register({
        label: "Resize Canvas",
        type: "SubMenu",
        subItems: [Pencil.fitContentCommand, Pencil.fitwithPaddingCommand, Pencil.fitScreenCommand]
    });

    // <menuseparator/>
    this.register(Pencil.sizingPolicyCommand);

    // <menuseparator/>

    // this.register({
    //     label: "Properties...",
    //     isEnabled: function () { return true; },
    //     handleAction: function () {
    //         // show properties...
    //     }
    // });

};
