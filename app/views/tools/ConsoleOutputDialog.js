function ConsoleOutputDialog(acceptActionLabel) {
    this.grabWidth = true;
    this.widthMargin = 30 * Util.em();
    this.grabHeight = true;
    this.heightMargin = 5 * Util.em();
    
    Dialog.call(this);
    this.title = "Stencil Deploy";
}
__extend(Dialog, ConsoleOutputDialog);

ConsoleOutputDialog.prototype.setup = function () {
};

ConsoleOutputDialog.prototype.append = function (message, type, important) {
    var div = document.createElement("div");
    if (important) Dom.addClass(div, "Important");
    div.appendChild(document.createTextNode(message));
    div.setAttribute("type", type || "");
    
    this.output.appendChild(div);
    this.output.scrollTop = this.output.scrollHeight;
};

ConsoleOutputDialog.prototype.getDialogActions = function () {
    return [
        Dialog.ACTION_CANCEL
    ];
};
