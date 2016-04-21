function ScrollableView () {
    BaseTemplatedWidget.call(this);
    this.offset = 0;

    this.invalidate();

    this.bind("click", function () {
        this.offset += this.getStep();
        this.invalidate();
    }, this.previousButton);
    this.bind("click", function () {
        this.offset -= this.getStep();
        this.invalidate();
    }, this.nextButton);

    this.bind("wheel", function (event) {
        this.offset -= event.deltaY;
        this.invalidate();
    }, this.node());
}

__extend(BaseTemplatedWidget, ScrollableView);

ScrollableView.prototype.getStep = function () {
    return 80;
};

ScrollableView.prototype.setContentFragment = function (fragment) {
    this.content.appendChild(fragment);
    window.setTimeout(this.invalidate.bind(this), 10);
};
ScrollableView.prototype.onAttached = function () {
    window.setTimeout(this.invalidate.bind(this), 100);
};

function logSizing(name, node) {
    console.log(name, {
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth,
        offsetWidth: node.offsetWidth,
        rect: node.getBoundingClientRect()
    })
}
ScrollableView.prototype.invalidate = function () {
    var contentSize = this.content.scrollWidth;

    var size = this.node().clientWidth;
    var borderWidth = Math.round((this.node().offsetWidth - size) / 2);
    var buttonSize = this.previousButton.offsetWidth;

    this.node().style.height = (this.content.offsetHeight) + "px";

    if (contentSize <= size) {
        this.offset = 0;
        this.previousButton.style.visibility = "hidden";
        this.nextButton.style.visibility = "hidden";

        this.content.style.left = "0px";
    } else {
        this.previousButton.style.visibility = "inherit";
        this.nextButton.style.visibility = "inherit";

        var min = size - contentSize;
        this.offset = Math.min(Math.max(this.offset, min), 0);

        this.previousButton.disabled = (this.offset >= 0);
        this.nextButton.disabled = (this.offset <= min);

        this.content.style.left = (this.offset - borderWidth) + "px";
    }
};
