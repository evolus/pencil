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
        run: function () {
            Pencil.activeCanvas.zoomTo(Pencil.activeCanvas.zoom * 1.25);
        }
    });
    UICommandManager.register({
        key: "zoomOutCommand",
        shortcut: "Ctrl+SUBTRACT",
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
};
