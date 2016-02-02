function ToolBar() {
    BaseTemplatedWidget.call(this);
    // Pencil.registerSharedEditor(this);
    this.setup();
}
__extend(BaseTemplatedWidget, ToolBar);

ToolBar.prototype.setup = function() {
    console.log("toolbar set up:", UICommandManager.map);
    if (this.registerCommands) this.registerCommands();
    Dom.doOnAllChildren(this.commandContainer, function (n) {
        if (!n.getAttribute || !n.getAttribute("command")) return;
        var command = n.getAttribute("command");
        UICommandManager.installControl(command, n);
    });
};
