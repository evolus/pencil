function ToolBar() {
    BaseTemplatedWidget.call(this);
    this.setup();
}
__extend(BaseTemplatedWidget, ToolBar);

ToolBar.prototype.setup = function() {
    if (this.registerCommands) this.registerCommands();
    Dom.doOnAllChildRecursively(this.commandContainer, function (n) {
        if (!n.getAttribute || !n.getAttribute("command")) return;
        var command = n.getAttribute("command");
        UICommandManager.installControl(command, n);
    });
};
