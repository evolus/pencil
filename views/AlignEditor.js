function AlignEditor() {
    BaseTemplatedWidget.call(this);
    this.setup();
}
__extend(BaseTemplatedWidget, AlignEditor);

AlignEditor.prototype.setup = function () {
    var groupId = "align" + (new Date().getTime()) + Math.round(1000 * Math.random());
    this.buttons = [];

    var j = 0;
    for (var i = 0; i < this.container.childNodes.length; i ++) {
        if (this.container.childNodes[i].tagName != "button") continue;
        var button = this.container.childNodes[i];
        this.buttons[j] = button;

        button.setAttribute("group", groupId);
        button._h = parseInt(button.getAttribute("horz"), 10);
        button._v = parseInt(button.getAttribute("vert"), 10);

        j ++;
    }

    var thiz = this;
    this.container.addEventListener("click", function(event) {
        var checkedButton = Dom.findUpward(event.target, function (n) {
            return n.hasAttribute("vert") && n.hasAttribute("horz");
        });
        if (!checkedButton) return;

        var alignment = new Alignment(checkedButton._h, checkedButton._v);
        thiz.setValue(alignment);
    }, false);

    if (this.hasAttribute("value")) this.setValue(Alignment.fromString(this.getAttribute("value")));
};
AlignEditor.prototype.setValue = function (alignment) {
    var checkedButton = null;
    for (var i in this.buttons) {
        var button = this.buttons[i];
        if (alignment.h == button._h && alignment.v == button._v) {
            button.setAttribute("checked", "true");
            checkedButton = button;
        } else {
            button.removeAttribute("checked");
        }
    }
    if (!checkedButton) {
        this.buttons[0].setAttribute("checked", "true");
    }
};
AlignEditor.prototype.getValue = function () {
    var checkedButton = null;
    for (var i in this.buttons) {
        if (this.buttons[i].hasAttribute("checked") && this.buttons[i].getAttribute("checked") == "true") {
            checkedButton = this.buttons[i];
            break;
        }
    }

    if (checkedButton) {
        return new Alignment(checkedButton._h, checkedButton._v);
    } else return null;
};
