function NotificationPopup() {
    Popup.call(this);

    this.skipStack = true;

    this.bind("click", function () {
        if (this.actionHandler) this.actionHandler();
        window.setTimeout(function () {
            if (!this.hidden) this.close();
        }.bind(this), 200);
    }, this.actionButton);
}
__extend(Popup, NotificationPopup);

NotificationPopup.prototype.setup = function (message, actionTitle, actionHandler) {
    this.messagePane.innerHTML = Dom.htmlEncode(message);
    Dom.toggleClass(this.node(), "WithAction", actionTitle)

    if (actionTitle) {
        Dom.show(this.footer);
        this.actionButton.innerHTML = Dom.htmlEncode(actionTitle);
        this.actionHandler = actionHandler;
    } else {
        this.footer.style.display = "none";
    }
};

NotificationPopup.prototype._setPosition = function (x, y) {
    this.popupContainer.style.left = x + "px";
    this.popupContainer.style.top = y + "px";
    this.popupContainer.style.transition = "";

    window.setTimeout(function () {
        this.popupContainer.style.left = x + "px";
        this.popupContainer.style.top = (y - 100) + "px";
        this.popupContainer.style.opacity = "0";
        window.setTimeout(function () {
            this.popupContainer.style.top = y + "px";
            this.popupContainer.style.opacity = "0.85";
            this.popupContainer.style.transition = "opacity 0.2s ease, top 0.2s ease";
            this.popupContainer._y = y;
        }.bind(this), 10);
    }.bind(this), 0);

};

NotificationPopup.prototype.hide = function (silent) {
    this.popupContainer.style.top = (this.popupContainer._y - 100) + "px";
    this.popupContainer.style.opacity = 0;
    window.setTimeout(function () {
        this.popupContainer.style.visibility = "hidden";
        if (!silent) Dom.emitEvent("p:PopupHidden", this.node());
        if (this.onHide) this.onHide();
        if (this.e(this.shouldDetach)) this.detach();
    }.bind(this), 300);

    this.visible = false;
}

NotificationPopup.queueHandler = new QueueHandler();

NotificationPopup.show = function (message, actionTitle, actionHandler) {
    var task = function (__callback) {
        var popup = new NotificationPopup();
        popup.onHide = function () {
            popup.hidden = true;
            __callback();
        };
        popup.setup(message, actionTitle, actionHandler);
        popup.show(ApplicationPane._instance.node(), "right-inside", "top-inside", 20, 20);
        window.setTimeout(function () {
             if (!popup.hidden) popup.close();
        }, actionTitle ? 4000 : 2500);
    };

    NotificationPopup.queueHandler.submit(task);
};
