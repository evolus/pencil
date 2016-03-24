function FileToolbar() {
    ToolBar.call(this);
}
__extend(ToolBar, FileToolbar);

FileToolbar.prototype.registerCommands = function () {
    // UICommandManager.register({
    //     key: "makeSameWidthCommand",
    //     watchEvents: "p:TargetChanged",
    //     label: "Make Same Width",
    //     isValid: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.makeSameWidth; },
    //     run: function () {
    //         Pencil.activeCanvas.currentController.makeSameWidth();
    //     }
    // });
    UICommandManager.register({
        key: "saveDocumentCommand",
        label: "Make Same Width",
        isValid: function () { return true; },
        run: function () {
            Pencil.controller.save();
        }
    });
};
