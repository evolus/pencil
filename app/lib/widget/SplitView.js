widget.SplitView = function () {
    var currentSplitView = null;
    function getSplitView(target) {
        var container = Dom.findParentWithProperty(target, "_splitView");
        if (!container) return null;
        return container._splitView;
    }
    function handleMouseDown(event) {
        Dom.cancelEvent(event);
        var target = Dom.getTarget(event);
        currentSplitView = getSplitView(target);

        if (!currentSplitView) return;
        currentSplitView.ox = event.screenX;
        currentSplitView.originalSplitViewX = currentSplitView.splitViewPos;
        currentSplitView.moved = false;
        Dom.addClass(currentSplitView.container, "SplitViewHeld");
    }

    function handleMouseMove(event) {
        var target = Dom.getTarget(event);
        if (!currentSplitView) return;
        Dom.cancelEvent(event);

        var x = event.screenX;
        var p = currentSplitView.originalSplitViewX + x - currentSplitView.ox;
        var W = Dom.getOffsetWidth(currentSplitView.container);
        var margin = Math.round(W / 10);
        p = Math.min(Math.max(p, margin), W - margin);
        currentSplitView.setSplitViewPosition(p);
        BaseWidget.signalOnSizeChangedRecursively(currentSplitView.node());

        currentSplitView.moved = true;
    }

    function handleMouseUp(event) {
        Dom.cancelEvent(event);
        if (!currentSplitView) return;
        if (!currentSplitView.moved) return;
        currentSplitView.moved = false;
        var r = (currentSplitView.splitViewPos / Dom.getOffsetWidth(currentSplitView.container));
        currentSplitView.ratio = r;
        currentSplitView.updateView();
        Dom.removeClass(currentSplitView.container, "SplitViewHeld");
        currentSplitView = null;
    }

    function SplitView(container, options) {
        this.container = widget.get(container);
        this.container._splitView = this;
        this.options = options || {};

        if (!this.options.initialRatio) this.options.initialRatio = 0.5;
        this.ratio = this.options.initialRatio;

        if (!this.options.initialMode) this.options.initialMode = SplitView.MODE_BOTH;
        this.mode = this.options.initialMode;

        for (var i = 0; i < this.container.childNodes.length; i ++) {
            var node = this.container.childNodes[i];
            if (!node.nodeName || node.nodeName.toLowerCase() != "div") continue;

            if (node.getAttribute("role") == "splitter") {
                this.splitter = node;
            } else {
                if (!this.splitter) {
                    this.left = node;
                } else {
                    this.right = node;
                }
            }
        }

        Dom.registerEvent(this.splitter, "mousedown", handleMouseDown);
        Dom.registerEvent(document, "mousemove", handleMouseMove);
        Dom.registerEvent(document, "mouseup", handleMouseUp);

        Dom.addClass(this.splitter, "SplitViewSplitter");
        this.splitter.innerHTML = "<div></div>";

        this.container.style.position = "relative";

        this.splitter.style.position = "absolute";
        this.splitter.style.zIndex = "3";
        this.splitter.style.top = "0px";
        this.splitter.style.bottom = "0px";
        this.splitter.style.overflow = "hidden";
        this.splitter.style.width = SplitView.HANDLE_WIDTH + "px";

        this.left.style.position = "absolute";
        this.left.style.left = "0px";
        this.left.style.top = "0px";
        this.left.style.bottom = "0px";

        this.right.style.position = "absolute";
        this.right.style.top = "0px";
        this.right.style.bottom = "0px";

        this.updateView();
    }
    SplitView.MODE_LEFT = "LEFT";
    SplitView.MODE_RIGHT = "RIGHT";
    SplitView.MODE_BOTH = "BOTH";
    SplitView.HANDLE_WIDTH = 20;

    SplitView.prototype.setMode = function (mode) {
        this.mode = mode;
        this.updateView();
    };
    SplitView.prototype.setRatio = function (ratio) {
        this.ratio = ratio;
        this.updateView();
    };

    SplitView.prototype.updateView = function () {
        this.container.className = "SplitView";
        Dom.addClass(this.container, "SplitView" + this.mode);
        var w = Dom.getOffsetWidth(this.container);
        if (this.mode == SplitView.MODE_LEFT) {
            this.left.style.left = "0px";
            this.left.style.right = "0px";
            this.left.style.width = w + "px";
            this.left.style.display = "block";

            this.splitter.style.display = "none";
            this.right.style.display = "none";
            this.right.style.width = "0px";

        } else if (this.mode == SplitView.MODE_RIGHT) {

            this.right.style.left = "0px";
            this.right.style.right = "0px";
            this.right.style.width =  w + "px";
            this.right.style.display = "block";

            this.splitter.style.display = "none";
            this.left.style.display = "none";
            this.left.style.width = "0px";
        } else if (this.mode == SplitView.MODE_BOTH) {
            var lw = Math.round(w * this.ratio);
            var rw = w - lw;

            this.left.style.left = "0px";
            this.left.style.right = rw + "px";
            this.left.style.width = lw + "px";

            this.right.style.left = lw + "px";
            this.right.style.right = "0px";
            this.right.style.width = rw + "px";

            this.setSplitViewPosition(lw);

            this.left.style.display = "block";
            this.splitter.style.display = "block";
            this.right.style.display = "block";
            if (this.listener) {
            	this.listener(lw, rw);
            }
        }
    }

    SplitView.prototype.setSplitViewPosition = function (pos) {
        this.splitter.style.left = (pos - SplitView.HANDLE_WIDTH / 2) + "px";
        this.splitViewPos = pos;
    };

    SplitView.prototype.setOnResizeListener = function(listener) {
    	this.listener = listener;
    	return this;
    };

    return SplitView;
}();
