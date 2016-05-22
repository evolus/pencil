function SizingPolicyDialog() {
    Dialog.call(this);
    this.title = "Sizing Policy";

    var thiz = this;
    // this.groupW.addEventListener("click", function(event) {
    //     thiz.validateXPolicySelection();
    // }, false);
    // this.groupH.addEventListener("click", function(event) {
    //     thiz.validateYPolicySelection();
    // }, false);

    this.policyContainer.addEventListener("click", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("group");
        });

        if (!node) return;

        var group = node.getAttribute("group");
        var groupNode = thiz.getGroupNode(group);
        if (!groupNode) return;

        Dom.doOnAllChildren(groupNode, function (b) {
            if (b == node) {
                b.setAttribute("selected", "true");
            } else if (b.getAttribute && b.getAttribute("selected")) {
                b.removeAttribute("selected");
            }
        });

        if (group == "w") {
            thiz.validateXPolicySelection();
        } else if (group == "h") {
            thiz.validateYPolicySelection();
        }

    }, false);

}
__extend(Dialog, SizingPolicyDialog);

SizingPolicyDialog.prototype.getGroupNode = function (name) {
    switch (name) {
        case "x":
            return this.groupX;
        case "y":
            return this.groupY;
        case "w":
            return this.groupW;
        case "h":
            return this.groupH;
    }
    return null;
};

SizingPolicyDialog.prototype.setup = function (options) {
    if (!options) return;
    this.options = options;
    this.handleOnload();
};

SizingPolicyDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        Dialog.ACTION_CANCEL,
        { type: "accept", title: "Apply", run: function () {
            if (thiz.options && thiz.options.callback) {
                thiz.options.callback(thiz.getHolder());
            }
            return true;
        }}
    ]
};

SizingPolicyDialog.prototype.validateXPolicySelection = function () {
	if (this.getPolicyValue(this.groupW) == "start-end") {
		this.setPolicyValue(this.groupX, "start");
		this.disableGroup(this.groupX, true);
	} else {
		this.disableGroup(this.groupX, false);
	}
}
SizingPolicyDialog.prototype.validateYPolicySelection = function () {
	if (this.getPolicyValue(this.groupH) == "start-end") {
		this.setPolicyValue(this.groupY, "start");
		this.disableGroup(this.groupY, true);
	} else {
		this.disableGroup(this.groupY, false);
	}
}
SizingPolicyDialog.prototype.getPolicyValue = function (group) {
	var buttons = group.childNodes;
	for (var i = 0; i < buttons.length; i ++) {
		if (buttons[i].getAttribute && buttons[i].getAttribute("selected") == "true") {
			var value = buttons[i].getAttribute("value");
			value.match(/^[^\-]+\-(.+)$/);
			return RegExp.$1;
		}
	}
};

SizingPolicyDialog.prototype.setPolicyValue = function (group, value) {
    var nodes = group.childNodes;
    for (var i = 0; i < nodes.length; i ++) {
        var node = nodes[i];
        if (!node.getAttribute || !node.getAttribute("value")) continue;
        var v = node.getAttribute("value");
        v.match(/^[^\-]+\-(.+)$/);
        var nodeValue = RegExp.$1;
        if (nodeValue == value) {
            node.setAttribute("selected", "true");
        } else {
            node.removeAttribute("selected");
        }
    }
};

SizingPolicyDialog.prototype.disableGroup = function (group, disabled) {
	var buttons = group.childNodes;
	for (var i = 0; i < buttons.length; i ++) {
		buttons[i].disabled = disabled;
	}

    group.setAttribute("disabled", disabled);
};

SizingPolicyDialog.prototype.handleOnload = function () {
    this.holder = this.options.holder;
    this.setPolicyValue(this.groupW, this.holder.input.wPolicy);
    this.setPolicyValue(this.groupH, this.holder.input.hPolicy);
    this.setPolicyValue(this.groupX, this.holder.input.xPolicy);
    this.setPolicyValue(this.groupY, this.holder.input.yPolicy);

    this.validateXPolicySelection();
    this.validateYPolicySelection();
};
SizingPolicyDialog.prototype.getHolder = function () {
	this.holder.output = {
		xPolicy: this.getPolicyValue(this.groupX),
		yPolicy: this.getPolicyValue(this.groupY),
		wPolicy: this.getPolicyValue(this.groupW),
		hPolicy: this.getPolicyValue(this.groupH)
	};

    return this.holder;
};
