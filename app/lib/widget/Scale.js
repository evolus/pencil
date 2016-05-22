widget.Scale = function () {
    function actionBarClickHandler(event) {
        var target = Dom.getTarget(event);
        var button = Dom.findUpward(target, {
            eval: function (n) {
                return n._action;
            }
        });
        
        if (!button) return;
        if (button.disabled) return;
        
        var action = button._action;
        
        action.run();
    }
    
    function handleMouseMove(e) {
        if (!Scale.heldData) return;
        Dom.cancelEvent(e);
        var event = Dom.getEvent(e);
        var x = event.screenX;
        
        var thiz = Scale.heldData.instance;
        var dx = x - Scale.heldData.x;
        var dvalue = Math.round(dx * thiz.max / Dom.getOffsetWidth(thiz.track));
        var value = Scale.heldData.value + dvalue;
        value = Math.max(0, Math.min(thiz.max, value));
        thiz.setValue(value);
        Scale.heldData.changed = true;
    }
    function handleMouseUp(e) {
        if (!Scale.heldData) return;
        var event = Dom.getEvent(e);
        var x = event.screenX;
        var thiz = Scale.heldData.instance;
        
        if (Scale.heldData.changed) {
            if (thiz.options.onValueChangeFinished) {
                thiz.options.onValueChangeFinished(thiz.value);
            }
        }
        
        Scale.heldData = null;
    }
    
    Dom.registerEvent(window, "load", function () {
        Dom.registerEvent(document, "mousemove", handleMouseMove);
        Dom.registerEvent(document, "mouseup", handleMouseUp);
    });
    
    function Scale(container, options) {
        this.container = widget.get(container);
        this.options = options || {};
        
        this.container.style.display = "inline-block";
        this.container.appendChild(Dom.newDOMElement({
            _name: "span",
            _id: "wrapper",
            "class": "Scale",
            _children: [{
                _name: "span",
                "class": "Track",
                _id: "track",
                _children: [{
                    _name: "span",
                    "class": "Total",
                    _id: "total"
                }, {
                    _name: "span",
                    "class": "Finished",
                    _id: "finishedTrack"
                }, {
                    _name: "span",
                    "class": "Thumb",
                    _id: "thumb"
                }]
            }]
        }, document, this));
        
        this.wrapper._scale = this;
        var thiz = this;
        
        Dom.registerEvent(this.thumb, "mousedown", function (e) {
            var event = Dom.getEvent(e);
            Scale.heldData = {
                    instance: thiz,
                    x: event.screenX,
                    value: thiz.value
            };
            Dom.cancelEvent(e);
        }, false);
        var clickHandle = function(e) {
            var event = Dom.getEvent(e);
            Dom.cancelEvent(e);
            var offsetX = event.offsetX || event.layerX;
            var totalWidth = Dom.getOffsetWidth(thiz.total);
            var value = Math.round(offsetX * thiz.max / totalWidth);
            thiz.setValue(value);
            if (thiz.options.onValueChangeFinished) {
                thiz.options.onValueChangeFinished(value);
            }
        };
        
        Dom.registerEvent(this.total, "click", clickHandle , false);
        Dom.registerEvent(this.finishedTrack, "click", clickHandle , false);
        
        this.setMax(100);
        this.setValue(25);
    }
    
    Scale.prototype.register = function (action) {
    };
    
    Scale.prototype.setMax = function (max) {
        this.max = max;
    };
    Scale.prototype.setValue = function (value) {
        this.value = value;
        this.invalidate();
        if (this.options.onValueChanged) {
            this.options.onValueChanged(this.value);
        }
    };
    Scale.prototype.invalidate = function () {
        var px = Math.round(Dom.getOffsetWidth(this.track) * this.value / this.max);
        
        this.currentThumbLeft = px;
        this.thumb.style.left = px + "px";
        this.finishedTrack.style.width = px + "px";
    };
    
    return Scale;
}();

