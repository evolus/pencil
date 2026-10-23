function OffScreenCanvas(svg) {
    this.svg = svg;
}

OffScreenCanvas.prototype = Object.create(Canvas.prototype);

Object.defineProperty(OffScreenCanvas.prototype, "ownerDocument", {
    get: function () {
        return document;
    }
});

OffScreenCanvas.prototype.invalidateAll = function () {
    Dom.workOn(".//svg:g[@p:type='Shape']", this.svg, function (node) {
        try {
            var controller = this.createControllerFor(node);
            if (controller && controller.validateAll) controller.validateAll("offScreen");
        } catch (e) {
            console.error(e);
        }
    }.bind(this));
};
