function GestureModeToolbar() {
    ToolBar.call(this);

    var thiz = this;
    this.bind("click", this.handleClick, this.buttonContainer);
    document.documentElement.addEventListener("p:CanvasActived", function () {
        thiz.invalidateModeUI();
    }, false);
    this.init();
}
__extend(ToolBar, GestureModeToolbar);

GestureModeToolbar.prototype.handleClick = function (event) {
    var button = Dom.findUpwardForNodeWithData(event.target, "_mode");
    if (!button) return;
    if (!Pencil.activeCanvas) return;
    GestureHelper.fromCanvas(Pencil.activeCanvas).setActiveModeId(button._mode.id);
    this.invalidateModeUI();
};
GestureModeToolbar.prototype.init = function () {
    var thiz = this;
    GestureHelper.MODES.forEach(function (mode) {
        var button = Dom.newDOMElement({
            _name: "button",
            mode: "icon",
            checked: "false",
            _children: [
                { _name: "i", _text: mode.uiIconName }
            ]
        });

        button._mode = mode;
        thiz.buttonContainer.appendChild(button);
    });

    this.invalidateModeUI();
};
GestureModeToolbar.prototype.invalidateModeUI = function () {
    console.log("invalidate mode ui");
    if (!Pencil.activeCanvas) return;
    var activeMode = GestureHelper.fromCanvas(Pencil.activeCanvas).getActiveMode();

    Dom.doOnAllChildren(this.buttonContainer, function (button) {
        if (!button._mode) return;
        var selected = button._mode.id == activeMode.id;;
        button.setAttribute("checked", selected);
    });
};
