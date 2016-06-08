function SizeToolbar() {
    ToolBar.call(this);
}
__extend(ToolBar, SizeToolbar);

SizeToolbar.prototype.registerCommands = function () {
    UICommandManager.register({
        key: "makeSameWidthCommand",
        watchEvents: "p:TargetChanged",
        label: "Make same width",
        shortcut: "W",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.makeSameWidth; },
        run: function () {
            Pencil.activeCanvas.currentController.makeSameWidth();
        }
    });

    UICommandManager.register({
        key: "makeSameHeightCommand",
        watchEvents: "p:TargetChanged",
        label: "Make same height",
        shortcut: "H",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.makeSameHeight; },
        run: function () {
            Pencil.activeCanvas.currentController.makeSameHeight();
        }
    });
    UICommandManager.register({
        key: "makeSameMinWidthCommand",
        watchEvents: "p:TargetChanged",
        label: "Make same min width",
        shortcut: "Ctrl+W",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.makeSameMinWidth; },
        run: function () {
            Pencil.activeCanvas.currentController.makeSameMinWidth();
        }
    });
    UICommandManager.register({
        key: "makeSameMinHeightCommand",
        watchEvents: "p:TargetChanged",
        label: "Make same min height",
        shortcut: "Ctrl+H",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.makeSameMinHeight; },
        run: function () {
            Pencil.activeCanvas.currentController.makeSameMinHeight();
        }
    });
    UICommandManager.register({
        key: "makeSameHorizontalSpaceCommand",
        watchEvents: "p:TargetChanged",
        label: "Make same horizontal gap",
        shortcut: "O",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.makeSameHorizontalSpace; },
        run: function () {
            Pencil.activeCanvas.currentController.makeSameHorizontalSpace();
        }
    });
    UICommandManager.register({
        key: "makeSameVerticalSpaceCommand",
        watchEvents: "p:TargetChanged",
        shortcut: "V",
        label: "Make same vertical gap",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.makeSameVerticalSpace; },
        run: function () {
            Pencil.activeCanvas.currentController.makeSameVerticalSpace();
        }
    });
};
