function ScrollableView () {
    BaseTemplatedWidget.call(this);
    this.offset = 0;

    this.invalidate();

    // this.bind("click", function () {
    //     this.offset += this.getStep();
    //     this.invalidate();
    // }, this.previousButton);

    // this.bind("click", function () {
    //     this.offset -= this.getStep();
    //     this.invalidate();
    // }, this.nextButton);

    var thiz = this;
    var startScroll = null;
    var stopScroll = function () {
        if(startScroll) {
            console.log("stopScroll");
            clearInterval(startScroll);
            startScroll = null;
        }
    };
    this.bind("mousedown", function() {
        if(startScroll) stopScroll();
        startScroll = setInterval(function() {
            thiz.offset += thiz.getStep();
            thiz.invalidate();
        } , 50);
    }, this.previousButton);

    this.previousButton.addEventListener("mouseup", function() {
        thiz.previousButton.blur();
    }, false);
    this.previousButton.addEventListener("mouseout", function() {
        thiz.previousButton.blur();
    }, false);
    this.previousButton.addEventListener("focusout", function() {
        stopScroll();
    }, false)

    this.bind("mousedown", function() {
        if(startScroll) stopScroll();
        startScroll = setInterval(function() {
            thiz.offset -= thiz.getStep();
            thiz.invalidate();
        } , 50);
    }, this.nextButton);

    this.nextButton.addEventListener("mouseup", function() {
        thiz.nextButton.blur();
    }, false)
    this.nextButton.addEventListener("mouseout", function() {
        thiz.nextButton.blur();
    }, false);
    this.nextButton.addEventListener("focusout", function() {
        stopScroll();
    }, false)
    window.addEventListener("resize", function(ev){
        thiz.invalidate();
    },false)
    this.wheelAllow = true;
    this.addWheelHandle();
}

__extend(BaseTemplatedWidget, ScrollableView);

ScrollableView.prototype.setWheelAllow = function (value) {
    this.wheelAllow = value;
}

ScrollableView.prototype.addWheelHandle = function() {
    this.wheelHandle = function(ev) {
        if (this.wheelAllow) {
            this.offset -= event.deltaY;
            this.invalidate();
        }
    }
    this.bind("wheel", this.wheelHandle, this.node());
}

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
    if (this.orient == "vertical") {
        this.invalidateVertical();
    } else {
        this.invalidateHorizontal();
    }
};
ScrollableView.prototype.invalidateHorizontal = function () {
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
ScrollableView.prototype.invalidateVertical = function () {
    var contentSize = this.content.scrollHeight;

    var size = this.node().clientHeight;
    var borderHeight = Math.round((this.node().offsetHeight - size) / 2);
    var buttonSize = this.previousButton.offsetHeight;

    this.node().style.width = (this.content.offsetWidth) + "px";

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

        this.content.style.top = (this.offset - borderHeight) + "px";
    }
};
ScrollableView.prototype.moveTo = function (position) {
    this.offset = - position + this.getButtonSize() + this.getBorderSize() + 2 * Util.em();
    this.invalidate();
};
ScrollableView.prototype.getSize = function () {
    return this.orient == "vertical" ? this.node().clientHeight : this.node().clientWidth;
};
ScrollableView.prototype.getButtonSize = function () {
    return this.orient == "vertical" ? this.previousButton.offsetHeight : this.previousButton.offsetWidth;
};
ScrollableView.prototype.getBorderSize = function () {
    return this.orient == "vertical" ? Math.round((this.node().offsetHeight - this.getSize()) / 2) : Math.round((this.node().offsetWidth - this.getSize()) / 2);
};
ScrollableView.prototype.ensuareVisible = function (from, to) {
    var max = Math.abs(this.offset) + this.getSize() - this.getBorderSize() - this.getButtonSize();
    var min = Math.abs(this.offset) + this.getBorderSize() + this.getButtonSize();
    if (min < from && to < max) return;
    this.moveTo(from);
};
