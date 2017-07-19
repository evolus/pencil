function FileToolbar() {
    ToolBar.call(this);
}
__extend(ToolBar, FileToolbar);

FileToolbar.prototype.registerCommands = function () {
    UICommandManager.register({
        key: "newDocumentCommand",
        label: "New Document",
        icon: "note_add",
        isValid: function () { return true; },
        run: function () {
            Pencil.documentHandler.newDocument();
            // Pencil.controller.newDocument();
        },
        shortcut: "Ctrl+N"
    });
    UICommandManager.register({
        key: "openDocumentCommand",
        label: "Open...",
        icon: "open_in_browser",
        isValid: function () { return true; },
        run: function () {
            Pencil.documentHandler.openDocument();
            // Pencil.controller.openDocument();
        },
        shortcut: "Ctrl+O"
    });
    UICommandManager.register({
        key: "saveDocumentCommand",
        label: "Save",
        icon: "save",
        isValid: function () { return Pencil.controller.doc; },
        run: function () {
            Pencil.documentHandler.saveDocument();
        },
        shortcut: "Ctrl+S"
    });
    UICommandManager.register({
        key: "closeDocumentCommand",
        label: "Close",
        icon: "close",
        isValid: function () { return Pencil.controller.doc; },
        run: function () {
            Pencil.controller.confirmAndclose(function () {
                ApplicationPane._instance.showStartupPane();
            });
        },
        shortcut: "Ctrl+Shift+W"
    });
    UICommandManager.register({
        key: "saveAsDocumentCommand",
        label: "Save As...",
        isValid: function () { return Pencil.controller.doc && Pencil.controller.documentPath; },
        run: function () {
            Pencil.documentHandler.saveAsDocument();
            // Pencil.controller.saveAsDocument();
        },
        shortcut: "Ctrl+Shift+S"
    });

    UICommandManager.register({
        key: "exportDocumentCommand",
        label: "Export...",
        icon: "file_download",
        isValid: function () { return Pencil.controller.doc; },
        run: function () {
            Pencil.controller.exportCurrentDocument();
        },
        shortcut: "Ctrl+Shift+E"
    });
    UICommandManager.register({
        key: "printDocumentCommand",
        label: "Print...",
        icon: "print",
        isValid: function () { return Pencil.controller.doc; },
        run: function () {
            Pencil.controller.printCurrentDocument();
        },
        shortcut: "Ctrl+P"
    });


    UICommandManager.register({
        key: "exportPageAsPNGButton",
        label: "Export page as PNG...",
        isValid: function () { return true; },
        run: function () {
            if (this.page) {
                Pencil.controller.rasterizeCurrentPage(this.page);
            }
        },
        shortcut: "Ctrl+E"
    });

    UICommandManager.register({
        key: "copyPageBitmapCommand",
        label: "Copy Page Bitmap",
        isValid: function () { return true; },
        run: function () {
            Pencil.controller.copyPageBitmap(Pencil.controller.activePage);
        },
        shortcut: "Ctrl+Shift+C"
    });

    UICommandManager.register({
        key: "exportSelectionAsPNGButton",
        label: "Export selection as PNG...",
        run: function () {
            Pencil.controller.rasterizeSelection();
        },
        shortcut: "Ctrl+Alt+E"
    });


};
