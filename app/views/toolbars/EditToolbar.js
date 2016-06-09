function EditToolbar() {
    ToolBar.call(this);
}
__extend(ToolBar, EditToolbar);

EditToolbar.prototype.detach = function () {
    this.pasteButton.disabled = true;
}

EditToolbar.prototype.attach = function () {
    this.pasteButton.disabled = false;
}

EditToolbar.prototype.registerCommands = function () {
    UICommandManager.register({
        key: "cutCommand",
        watchEvents: "p:TargetChanged",
        label: "Cut",
        icon: "content_cut",
        shortcut: "Ctrl+X",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController; },
        run: function () {
            Pencil.activeCanvas.doCopy();
            Pencil.activeCanvas.deleteSelected();
        }
    });
    UICommandManager.register({
        key: "copyCommand",
        watchEvents: "p:TargetChanged",
        label: "Copy",
        icon: "content_copy",
        shortcut: "Ctrl+C",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController; },
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
        run: function () {
            Pencil.activeCanvas.doPaste();
        }
    });
};
