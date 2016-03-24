function FileToolbar() {
    ToolBar.call(this);
}
__extend(ToolBar, FileToolbar);

FileToolbar.prototype.registerCommands = function () {
    // UICommandManager.register({
    //     key: "newDocumentCommand",
    //     label: "new Document",
    //     isValid: function () { return true; },
    //     run: function () {
    //         Pencil.controller.newDocument();
    //     }
    // });
    // UICommandManager.register({
    //     key: "openDocumentCommand",
    //     label: "open Document",
    //     isValid: function () { return true; },
    //     run: function () {
    //         Pencil.controller.openDocument();
    //     }
    // });
    UICommandManager.register({
        key: "saveDocumentCommand",
        label: "save Document",
        isValid: function () { return true; },
        run: function () {
            Pencil.controller.saveDocument();
        }
    });
};
