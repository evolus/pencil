function NotificationPopup() {
    Popup.call(this);

    this.skipStack = true;

    this.bind("click", function () {
        if (!this.hidden) this.close();
        if (this.actionHandler) this.actionHandler();
    }, this.actionButton);
}
__extend(Popup, NotificationPopup);

NotificationPopup.prototype.setup = function (message, actionTitle, actionHandler) {
    this.messagePane.innerHTML = Dom.htmlEncode(message);
    if (this.actionTitle) {
        Dom.show(this.footer);
        this.actionButton.innerHTML = Dom.htmlEncode(actionTitle);
        this.actionHandler = actionHandler;
    } else {
        Dom.hide(this.footer);
        this.actionHandler = null;
    }
};

NotificationPopup.prototype._setPosition = function (x, y) {
    this.popupContainer.style.transition = "";
    window.setTimeout(function () {
        this.popupContainer.style.left = x + "px";
        this.popupContainer.style.top = (y - 100) + "px";
        this.popupContainer.style.opacity = "0";
        window.setTimeout(function () {
            this.popupContainer.style.top = y + "px";
            this.popupContainer.style.opacity = "0.85";
            this.popupContainer.style.transition = "opacity 0.2s ease, top 0.2s ease";
        }.bind(this), 10);
    }.bind(this), 10);

};

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
        }, 2000);
    };

    NotificationPopup.queueHandler.submit(task);
};
