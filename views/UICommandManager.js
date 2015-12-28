function UICommandManager() {
    this.commands = [];

    var thiz = this;
    document.body.addEventListener("keyup", function (event) {
        thiz.handleKeyEvent(event);
    }, false)
}


UICommandManager.prototype.register = function (command) {
    this.parseShortcut(command);
    this.commands.push(command);
};
UICommandManager.prototype.parseShortcut = function (command) {
    
};
UICommandManager.prototype.handleKeyEvent = function (event) {

};
