function SharedCommand() {
    BaseTemplatedWidget.call(this);
    Pencil.registerSharedEditor(this);
}
__extend(BaseTemplatedWidget, SharedCommand);

SharedCommand.prototype.setup = function() {
    var thiz = this;
    this.addEventListener("click", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("command");
        });

        if (!node) return;
        var command = node.getAttribute("command");
        if (!command || !Pencil[command] || !Pencil[command].handleAction) return;
        Pencil[command].handleAction();

    }, false);
    if (this.setupCommand) this.setupCommand();
}

SharedCommand.prototype.attach = function(target) {
    if (!target || !this.commandContainer) return;
    Dom.doOnAllChildRecursively(this.commandContainer, function (n) {
        if (!n.getAttribute || !n.getAttribute("command")) return;
        var command = n.getAttribute("command");
        if (!command || !Pencil[command]) return;
        if (!Pencil[command].isEnabled || Pencil[command].isEnabled()) {
            n.removeAttribute("disabled");
        }
    });
}

SharedCommand.prototype.detach = function() {
    if (!this.commandContainer) return;
    Dom.doOnAllChildRecursively(this.commandContainer, function (n) {
        if (!n.getAttribute || !n.getAttribute("command")) return;
        if (n.getAttribute && n.getAttribute("isEnabled") == "true") return;
        n.setAttribute("disabled", "true");
    });

}
