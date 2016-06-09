function ZoomToolbar() {
    ToolBar.call(this);
}
__extend(ToolBar, ZoomToolbar);

ZoomToolbar.prototype.registerCommands = function () {
    UICommandManager.register({
        key: "zoomInCommand",
        label: "Zoom in",
        icon: "zoom_in",
        shortcut: "Ctrl+EQUALS",
        shortcutLabel: "Ctrl+=",
        run: function () {
            Pencil.activeCanvas.zoomTo(Pencil.activeCanvas.zoom * 1.25);
        }
    });
    UICommandManager.register({
        key: "zoomOutCommand",
        shortcut: "Ctrl+SUBTRACT",
        shortcutLabel: "Ctrl+-",
        label: "Zoom out",
        icon: "zoom_out",
        run: function () {
            Pencil.activeCanvas.zoomTo(Pencil.activeCanvas.zoom / 1.25);
        }
    });
    UICommandManager.register({
        key: "zoom1Command",
        shortcut: "Ctrl+1",
        label: "Actual size",
        icon: "fullscreen",
        run: function () {
            Pencil.activeCanvas.zoomTo(1);
        }
    });
    UICommandManager.register({
        key: "toggleScreenCommand",
        shortcut: "F11",
        label: "Toggle fullscreen mode",
        run: function () {
            ApplicationPane._instance.toggleFullscreen();
        }
    });
    UICommandManager.register({
        key: "toggleLeftPaneCommand",
        shortcut: "BACK_QUOTE",
        label: "Toggle left pane",
        run: function () {
            ApplicationPane._instance.toggleLeftPane();
        }
    });
};
