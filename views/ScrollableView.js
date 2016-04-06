function ScrollableView () {
    BaseTemplatedWidget.call(this);
    this.offset = 0;

    this.invalidate();

    const STEP = 50;

    this.bind("click", function () {
        this.offset += STEP;
        this.invalidate();
    }, this.previousButton);
    this.bind("click", function () {
        this.offset -= STEP;
        this.invalidate();
    }, this.nextButton);

    this.bind("wheel", function (event) {
        console.log(event.deltaY);
        this.offset -= event.deltaY;
        this.invalidate();
    }, this.node());
}

__extend(BaseTemplatedWidget, ScrollableView);

ScrollableView.prototype.setContentFragment = function (fragment) {
    this.content.appendChild(fragment);
    window.setTimeout(this.invalidate.bind(this), 10);
};
ScrollableView.prototype.onAttached = function () {
    window.setTimeout(this.invalidate.bind(this), 100);
};

ScrollableView.prototype.invalidate = function () {
    var contentSize = this.content.offsetWidth;
    var size = this.node().offsetWidth;
    var buttonSize = this.previousButton.offsetWidth + 5;

    this.node().style.height = (this.content.offsetHeight) + "px";

    if (contentSize <= size) {
        this.offset = 0;
        this.previousButton.style.visibility = "hidden";
        this.nextButton.style.visibility = "hidden";

        this.content.style.left = "0px";
    } else {
        this.previousButton.style.visibility = "inherit";
        this.nextButton.style.visibility = "inherit";

        var min = size - 2 * buttonSize - contentSize;
        this.offset = Math.min(Math.max(this.offset, min), 0);

        this.previousButton.disabled = (this.offset >= 0);
        this.nextButton.disabled = (this.offset <= min);

        this.content.style.left = (buttonSize + this.offset) + "px";
    }
};
