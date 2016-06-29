function EditToolbar() {
    ToolBar.call(this);
}
__extend(ToolBar, EditToolbar);

EditToolbar.prototype.registerCommands = function () {
    UICommandManager.register({
        key: "cutCommand",
        watchEvents: "p:TargetChanged",
        label: "Cut",
        icon: "content_cut",
        shortcut: "Ctrl+X",
        applyWhenClass: "CanvasScrollPane",
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
        applyWhenClass: "CanvasScrollPane",
        run: function () {
            Pencil.activeCanvas.doCopy();
        }
    });
    UICommandManager.register({
        key: "pasteCommand",
        watchEvents: "p:CanvasActived",
        label: "Paste",
        icon: "content_paste",
        applyWhenClass: "CanvasScrollPane",
        shortcut: "Ctrl+V",
        isValid: function () { return Pencil.activeCanvas && clipboard.availableFormats() ; /*FIXED: check for clipboard content*/ },
        run: function () {
            Pencil.activeCanvas.doPaste();
        }
    });
};
