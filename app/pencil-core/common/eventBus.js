function EventBus() {
    this.node = document.createElement("div");
    this.node.style.display = "none";
    document.body.appendChild(this.node);
}

EventBus.prototype.broadcast = function (eventName, data) {
    Dom.emitEvent(eventName, this.node, {busData: data});
};
EventBus.prototype.listen = function (eventName, hander) {
    this.node.addEventListener(eventName, function (event) {
        hander(event.busData);
    }, false);
};

window.addEventListener("load", function () {
    window.globalEventBus = new EventBus();
}, false);
