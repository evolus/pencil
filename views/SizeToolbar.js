function SizeToolbar() {
    ToolBar.call(this);
}
__extend(ToolBar, SizeToolbar);

SizeToolbar.prototype.registerCommands = function () {
    UICommandManager.register({
        key: "makeSameWidthCommand",
        watchEvents: "p:TargetChanged",
        label: "Make Same Width",
        isValid: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.makeSameWidth; },
        run: function () {
            Pencil.activeCanvas.currentController.makeSameWidth();
        }
    });

    UICommandManager.register({
        key: "makeSameHeightCommand",
        watchEvents: "p:TargetChanged",
        label: "Make Same Height",
        isValid: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.makeSameMinHeight; },
        run: function () {
            Pencil.activeCanvas.currentController.makeSameMinHeight();
        }
    });
    UICommandManager.register({
        key: "makeSameHorizontalSpaceCommand",
        watchEvents: "p:TargetChanged",
        label: "Make Same Horizontal Space",
        isValid: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.alignBomakeSameHorizontalSpacettom; },
        run: function () {
            Pencil.activeCanvas.currentController.makeSameHorizontalSpace();
        }
    });
    UICommandManager.register({
        key: "makeSameVerticalSpaceCommand",
        watchEvents: "p:TargetChanged",
        label: "Make Same Vertical Space",
        isValid: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.makeSameVerticalSpace; },
        run: function () {
            Pencil.activeCanvas.currentController.makeSameVerticalSpace();
        }
    });
};
