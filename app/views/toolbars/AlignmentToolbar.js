function AlignmentToolbar() {
    ToolBar.call(this);
}
__extend(ToolBar, AlignmentToolbar);

AlignmentToolbar.prototype.registerCommands = function () {
    UICommandManager.register({
        key: "alignLeftCommand",
        watchEvents: "p:TargetChanged",
        label: "Align left",
        shortcut: "L",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.alignLeft; },
        run: function () {
            Pencil.activeCanvas.currentController.alignLeft();
        }
    });
    UICommandManager.register({
        key: "alignCenterCommand",
        watchEvents: "p:TargetChanged",
        shortcut: "C",
        label: "Align center horizontally",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.alignCenter; },
        run: function () {
            Pencil.activeCanvas.currentController.alignCenter();
        }
    });
    UICommandManager.register({
        key: "alignRightCommand",
        watchEvents: "p:TargetChanged",
        label: "Align right",
        shortcut: "R",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.alignRight; },
        run: function () {
            Pencil.activeCanvas.currentController.alignRight();
        }
    });
    UICommandManager.register({
        key: "alignTopCommand",
        watchEvents: "p:TargetChanged",
        label: "Align top",
        shortcut: "T",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.alignTop; },
        run: function () {
            Pencil.activeCanvas.currentController.alignTop();
        }
    });

    UICommandManager.register({
        key: "alignMiddleCommand",
        watchEvents: "p:TargetChanged",
        label: "Align middle vertically",
        shortcut: "M",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.alignMiddle; },
        run: function () {
            Pencil.activeCanvas.currentController.alignMiddle();
        }
    });
    UICommandManager.register({
        key: "alignBottomCommand",
        watchEvents: "p:TargetChanged",
        label: "Align bottom",
        shortcut: "B",
        isValid: function () { return Pencil.activeCanvas && Pencil.activeCanvas.currentController && Pencil.activeCanvas.currentController.alignBottom; },
        run: function () {
            Pencil.activeCanvas.currentController.alignBottom();
        }
    });

};
