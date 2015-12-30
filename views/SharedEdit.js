function SharedEdit() {
    SharedCommand.call(this);
}
__extend(SharedCommand, SharedEdit);

SharedEdit.prototype.setupCommand = function () {
    this.copyButton.setAttribute("disabled", "true");
    this.cutButton.setAttribute("disabled", "true");
};
