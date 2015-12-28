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

    this.register(function () {
        if (thiz.canvas.contextMenuEditor) {
            return thiz.canvas.contextMenuEditor.generateMenuItems();
        } else {
            return [];
        }
    });


    this.register({
        label: "Cut",
        icon: "content_cut",
        shortcut: "Ctrl+X",
        isEnabled: function () { return thiz.canvas.currentController; },
        handleAction: function () {
            thiz.canvas.doCopy();
            thiz.canvas.deleteSelected();
        }
    });
    this.register({
        label: "Copy",
        icon: "content_copy",
        shortcut: "Ctrl+C",
        isEnabled: function () { return thiz.canvas.currentController; },
        handleAction: function () {
            thiz.canvas.doCopy();
        }
    });
    this.register({
        label: "Paste",
        icon: "content_paste",
        shortcut: "Ctrl+V",
        isEnabled: function () { return true; /*FIXME: check for clipboard content*/ },
        handleAction: function () {
            thiz.canvas.doPaste();
        }
    });
    this.register({
        label: "Delete",
        icon: "delete",
        shortcut: "Del",
        isEnabled: function () { return thiz.canvas.currentController; },
        handleAction: function () {
            thiz.canvas.deleteSelected();
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
};
