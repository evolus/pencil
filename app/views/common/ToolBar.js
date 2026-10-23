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

    ToolBar.setupFocusHandling(this.node());
};
ToolBar.setupFocusHandling = function (container) {
    container.addEventListener("click", function (event) {
        var button = Dom.findUpward(event.target, function (n) {
            return n.localName == "button";
        });
        if (button && !button.__is_ComboManager && !button.__is_SharedColorEditor) {
            if (Pencil.activeCanvas) Pencil.activeCanvas.focus();
        }
    }, false);
    container.addEventListener("keypress", function (event) {
        if (event.keyCode != DOM_VK_RETURN
            && event.keyCode != DOM_VK_ENTER
            && event.keyCode != DOM_VK_ESCAPE) return;

        var input = Dom.findUpward(event.target, function (n) {
            return n.localName == "input";
        });
        if (input) {
            if (Pencil.activeCanvas) Pencil.activeCanvas.focus();
        }
    }, false);

    container.addEventListener("p:PopupClosed", function () {
        if (Pencil.activeCanvas) Pencil.activeCanvas.focus();
    });
}
