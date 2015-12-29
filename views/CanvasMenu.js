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
    var target = this.canvas.currentController;
    this.register({
        getLabel: function () { return "Undo: " + thiz.canvas.careTaker.getCurrentAction(); },
        icon: "undo",
        shortcut: "Ctrl+Z",
        isEnabled: function () { return thiz.canvas.careTaker.canUndo(); },
        handleAction: function () {
            thiz.canvas.careTaker.undo();
        }
    });
    this.register({
        getLabel: function () { return "Redo: " + thiz.canvas.careTaker.getPrevAction(); },
        icon: "redo",
        shortcut: "Ctrl+Y",
        isEnabled: function () { return thiz.canvas.careTaker.canRedo(); },
        handleAction: function () {
            thiz.canvas.careTaker.redo();
        }
    });

    this.register({
        label: "Arrangement",
        isAvailable: function () {
            return target &&
            (target instanceof Shape || target instanceof TargetSet || target instanceof Group);
        },
        type: "SubMenu",
        subItems: [
            {
                label: "Bring to Front",
                shortcut: "Shiff+Page Up",
                isEnabled: function () { return target && target.bringToFront},
                handleAction: function () {
                    Pencil.activeCanvas.currentController.bringToFront();
                }
            },
            {
                label: "Bring Forward",
                shortcut: "Page Up",
                isEnabled: function () { return target && target.bringForward; },
                handleAction: function () {
                    Pencil.activeCanvas.currentController.bringForward();
                }
            },
            {
                label: "Send Backward",
                shortcut: "Page Down",
                isEnabled: function () { return target && target.sendBackward; },
                handleAction: function () {
                    Pencil.activeCanvas.currentController.sendBackward();
                }
            },
            {
                label: "Send to Back",
                shortcut: "Shiff+Page Down",
                isEnabled: function () { return target && target.sendToBack; },
                handleAction: function () {
                    Pencil.activeCanvas.currentController.sendToBack();
                }
            }
        ]
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


    this.register({
        type: "Toggle",
        label: "Locked",
        handleAction: function (checked) {
            thiz.canvas.toggleLocking(); // FIXME: bug
        }
    });

    this.register({
        label: "Group",
        shortcut: "Ctrl+G",
        isAvailable: function () {
            return target &&
            (target instanceof TargetSet);
        },
        isEnabled: function () { return target; },
        handleAction: function () {
            Pencil.activeCanvas.doGroup();
        }
    });

    this.register({
        label: "Ungroup",
        shortcut: "Ctrl+Alt+G",
        isAvailable: function () {
            return target &&
            (target instanceof Group);
        },
        isEnabled: function () { return target; },
        handleAction: function () {
            Pencil.activeCanvas.doUnGroup();
        }
    });

    this.register({
        label: "Delete",
        icon: "delete",
        shortcut: "Del",
        isAvailable: function () {
            return target &&
            (target instanceof Shape || target instanceof Group || target instanceof TargetSet);
        },
        isEnabled: function () { return target; },
        handleAction: function () {
            thiz.canvas.deleteSelected();
        }
    });

    this.register({
        label: "Add to My Collections",
        isAvailable: function () {
            return target &&
            (target instanceof Shape || target instanceof Group);
        },
        isEnabled: function () { return target; },
        handleAction: function () {
            thiz.canvas.addSelectedToMyCollection();
        }
    });

    // <menuseparator/>

    this.register({
        label: "Cut",
        icon: "content_cut",
        shortcut: "Ctrl+X",
        isEnabled: function () { return thiz.canvas && thiz.canvas.doCopy && target; },
        handleAction: function () {
            thiz.canvas.doCopy();
            thiz.canvas.deleteSelected();
        }
    });
    this.register({
        label: "Copy",
        icon: "content_copy",
        shortcut: "Ctrl+C",
        isEnabled: function () { return thiz.canvas && thiz.canvas.doCopy && target; },
        handleAction: function () {
            thiz.canvas.doCopy();
        }
    });
    this.register({
        label: "Paste",
        icon: "content_paste",
        shortcut: "Ctrl+V",
        isEnabled: function () { return thiz.canvas && thiz.canvas.doPaste; /*FIXME: check for clipboard content*/ },
        handleAction: function () {
            thiz.canvas.doPaste();
        }
    });

    this.register({
        label: "Select All",
        icon: "select_all",
        shortcut: "Ctrl+A",
        isEnabled: function () { return true; },
        handleAction: function () {
            thiz.canvas.selectAll();
        }
    });


    // <menuseparator/>

    this.register({
        label: "Resize Canvas",
        type: "SubMenu",
        subItems: [
            {
                label: "Fit Content",
                handleAction: function () {
                    // Pencil.controller.sizeToContent(null, false); // FIXME: bug
                }
            },
            {
                label: "Fit with Padding",
                handleAction: function () {
                    Pencil.controller.sizeToContent(null, true); // FIXME: bug
                }
            },
            {
                label: "Fit Screen",
                handleAction: function () {
                    Pencil.controller.sizeToBestFit(); // FIXME: bug
                }
            },
            {
                type: "SubMenu",
                label: "test",
                subItems: [
                    {
                        label: "Fit Screen",
                        handleAction: function () {
                            Pencil.controller.sizeToBestFit(); // FIXME: bug
                        }
                    }
                ]
            }
        ]
    });

    // <menuseparator/>

    this.register({
        label: "Sizing Policy...",
        isAvailable: function () {
            return target &&
            (target instanceof Shape || target instanceof Group);
        },
        isEnabled: function () { return true; },
        handleAction: function () {
            Group.openSizingPolicyDialog(Pencil.activeCanvas.currentController); // FIXME: bug
        }
    });

    // <menuseparator/>

    // this.register({
    //     label: "Properties...",
    //     isEnabled: function () { return true; },
    //     handleAction: function () {
    //         // show properties...
    //     }
    // });

};
