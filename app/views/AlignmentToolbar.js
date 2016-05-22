function AlignmentToolbar() {
    ToolBar.call(this);
}
__extend(ToolBar, AlignmentToolbar);

AlignmentToolbar.prototype.registerCommands = function () {
    UICommandManager.register({
        key: "alignLeftCommand",
        watchEvents: "p:TargetChanged",
        label: "Align Left",
        isValid: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.alignLeft; },
        run: function () {
            Pencil.activeCanvas.currentController.alignLeft();
        }
    });
    UICommandManager.register({
        key: "alignCenterCommand",
        watchEvents: "p:TargetChanged",
        label: "Align Center",
        isValid: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.alignCenter; },
        run: function () {
            Pencil.activeCanvas.currentController.alignCenter();
        }
    });
    UICommandManager.register({
        key: "alignRightCommand",
        watchEvents: "p:TargetChanged",
        label: "Align Right",
        isValid: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.alignRight; },
        run: function () {
            Pencil.activeCanvas.currentController.alignRight();
        }
    });
    UICommandManager.register({
        key: "alignTopCommand",
        watchEvents: "p:TargetChanged",
        label: "Align Top",
        isValid: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.alignTop; },
        run: function () {
            Pencil.activeCanvas.currentController.alignTop();
        }
    });

    UICommandManager.register({
        key: "alignMiddleCommand",
        watchEvents: "p:TargetChanged",
        label: "Align Middle",
        isValid: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.alignMiddle; },
        run: function () {
            Pencil.activeCanvas.currentController.alignMiddle();
        }
    });
    UICommandManager.register({
        key: "alignBottomCommand",
        watchEvents: "p:TargetChanged",
        label: "Align Bottom",
        isValid: function () { return Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.alignBottom; },
        run: function () {
            Pencil.activeCanvas.currentController.alignBottom();
        }
    });
    
};
