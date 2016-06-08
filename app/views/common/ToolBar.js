function ToolBar() {
    BaseTemplatedWidget.call(this);
    this.setup();
}
__extend(BaseTemplatedWidget, ToolBar);

ToolBar.prototype.setup = function() {
    if (this.registerCommands) this.registerCommands();
    Dom.doOnAllChildRecursively(this.commandContainer, function (n) {
        if (!n.getAttribute || !n.getAttribute("command")) return;
        var commandKey = n.getAttribute("command");
        UICommandManager.installControl(commandKey, n);
        var command = UICommandManager.getCommand(commandKey);
        if (command) {
            var title = command.label + "   " + (command.shortcutLabel || command.shortcut);
            n.setAttribute("title", title);
        }
    });
};
