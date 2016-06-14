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
        watchEvents: "p:CanvasActived",
        isValid: function () {return Pencil.activeCanvas},
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
        watchEvents: "p:CanvasActived",
        isValid: function () {return Pencil.activeCanvas},
        run: function () {
            Pencil.activeCanvas.zoomTo(Pencil.activeCanvas.zoom / 1.25);
        }
    });
    UICommandManager.register({
        key: "zoom1Command",
        shortcut: "Ctrl+0",
        label: "Actual size",
        icon: "fullscreen",
        watchEvents: "p:CanvasActived",
        isValid: function () {return Pencil.activeCanvas},
        run: function () {
            Pencil.activeCanvas.zoomTo(1);
        }
    });
    UICommandManager.register({
        key: "toggleScreenCommand",
        shortcut: IS_MAC ? "Ctrl+Cmd+F" : "F11", // use different key for MAC
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
