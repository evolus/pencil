function FileToolbar() {
    ToolBar.call(this);
}
__extend(ToolBar, FileToolbar);

FileToolbar.prototype.registerCommands = function () {
    UICommandManager.register({
        key: "newDocumentCommand",
        label: "New Document",
        isValid: function () { return true; },
        run: function () {
            Pencil.controller.newDocument();
        },
        shortcut: "Ctrl+N"
    });
    UICommandManager.register({
        key: "openDocumentCommand",
        label: "Open Document...",
        isValid: function () { return true; },
        run: function () {
            Pencil.controller.openDocument();
        },
        shortcut: "Ctrl+O"
    });
    UICommandManager.register({
        key: "saveDocumentCommand",
        label: "Save Document",
        isValid: function () { return true; },
        run: function () {
            Pencil.controller.saveDocument();
        },
        shortcut: "Ctrl+S"
    });
    UICommandManager.register({
        key: "saveAsDocumentCommand",
        label: "Save As Document...",
        isValid: function () { return true; },
        run: function () {
            Pencil.controller.saveAsDocument();
        },
        shortcut: "Ctrl+Shift+S"
    });
    UICommandManager.register({
        key: "exportPageAsPNGButton",
        label: "Export page as PNG...",
        isValid: function () { return true; },
        run: function () {
            Pencil.controller.rasterizeCurrentPage();
        },
        shortcut: "Ctrl+E"
    });
    UICommandManager.register({
        key: "exportSelectionAsPNGButton",
        label: "Export selection as PNG...",
        isValid: function () { return true; },
        run: function () {
            Pencil.controller.rasterizeSelection();
        },
        shortcut: "Ctrl+Alt+E"
    });

};
