function WizardDialog() {
    Dialog.call(this);
    Dom.addClass(this.wizardContent, "WizardContent");
    this.wizardPanes = [];
    this.nextable = true;
    for (var i = 0; i < this.wizardContent.childNodes.length; i ++) {
        var node = this.wizardContent.childNodes[i];
        if (!node.nodeName || !node.getAttribute) continue;
        this.addWizardPane(node);
    }
}
__extend(Dialog, WizardDialog);
WizardDialog.prototype.setup = function (options) {
    if (this.setupUI) this.setupUI(options);
    this.invalidateWizardPane();
};
WizardDialog.prototype.invalidateWizardPane = function () {
    this.activeWizardPane(this.wizardPanes[0]);
    this.nextable = false;
    if(this.wizardPanes.length > 1) {
        this.nextable = true;
    }
    this.invalidateElements();
    var thiz = this;
    window.setTimeout(function () {
        thiz.ensureSizing();
    }, 100);
};
WizardDialog.prototype.addWizardPane = function (node) {
    Dom.addClass(node, "WizardPane");
    this.wizardPanes.push(node);
};
WizardDialog.prototype.activeWizardPane = function (pane) {
    this.activePane = pane;
    for (var i = 0; i < this.wizardPanes.length; i ++) {
        var p = this.wizardPanes[i];
        if (p == pane) {
            Dom.addClass(p, "ActiveWizardPane");
        } else {
            Dom.removeClass(p, "ActiveWizardPane");
        }
    }
    Dom.emitEvent("e:WizardPaneChange", this.node());
};
WizardDialog.prototype.onBack = function () {
    if(!this.invalidateSelection()) return;
    var index = this.wizardPanes.indexOf(this.activePane);
    index --;
    index = Math.max(index, 0);
    this.activeWizardPane(this.wizardPanes[index]);
    this.nextable = true;

    this.invalidateElements();
    this.onSelectionChanged(this.activePane);
};
WizardDialog.prototype.onNext = function () {
    if(!this.invalidateSelection()) return;
    var index = this.wizardPanes.indexOf(this.activePane);
    index ++;
    index = Math.min(index, this.wizardPanes.length - 1);
    this.activeWizardPane(this.wizardPanes[index]);

    if (index == this.wizardPanes.length - 1) {
        this.nextable = false;
    }

    this.invalidateElements();
    this.onSelectionChanged(this.activePane);
};
WizardDialog.prototype.onFinish = function () {
};
WizardDialog.prototype.invalidateSelection = function () {
    return true;
};

WizardDialog.prototype.invalidateFinish = function () {
    return true;
};
WizardDialog.prototype.onSelectionChanged = function (activePane) {
};
WizardDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        Dialog.ACTION_CANCEL,
        {   type: "accept",
            title: this.nextable ? "Next" : "Finish",
            run: function () {
                if (this.nextable) {
                    this.onNext();
                    return false;
                }
                if(!this.invalidateFinish()) {
                    return false;
                }
                this.onFinish();
                return true;
            }.bind(this)
        },
        {   type: "extra1", title: "Back", order: 5,
            run: function () {
                this.onBack();
                return false;
            }.bind(this),
            isApplicable: function () {
                return this.wizardPanes && this.activePane != this.wizardPanes[0];
            }.bind(this)
        }
    ]
};
WizardDialog.prototype.ensureSizing = function () {
    var w = Dom.getOffsetWidth(this.node()) - 2;
    var h = 0;

    for (var i = 0; i < this.wizardPanes.length; i ++) {
        var contentNode = this.wizardPanes[i];
        Dom.removeClass(contentNode, "Measured");
        var cw = Dom.getOffsetWidth(contentNode);
        var ch = Dom.getOffsetHeight(contentNode);

        w = Math.max(w, cw);
        h = Math.max(h, ch);
    }

    this.wizardContent.style.width = w + "px";
    this.wizardContent.style.height = h + "px";

    for (var i = 0; i < this.wizardPanes.length; i ++) {
        var contentNode = this.wizardPanes[i];
        Dom.addClass(contentNode, "Measured");
    }
};
