function OpenClipartPane() {
    BaseTemplatedWidget.call(this);
    var thiz = this;
    this.backend = new OpenClipartSearch();

    function injectSvgInfo (svg) {
        try {
            var g = Dom.parseToNode(svg);
            g.setAttributeNS(PencilNamespaces.p, "p:ImageSource", "OpenClipart.org");
            return Controller.serializer.serializeToString(g);
        } catch (e) {
            Console.dumpError(e);
        }
    }
    this.shapeList.addEventListener("dragstart", function (event) {
        nsDragAndDrop.dragStart(event);
        var n = Dom.findUpwardForNodeWithData(Dom.getTarget(event), "_def");
        var def = n._def;
        if (def._svg) {
            var svg = injectSvgInfo(def._svg);
            event.dataTransfer.setData("image/svg+xml", svg);
            nsDragAndDrop.setData("image/svg+xml", svg);
        } else {
            event.dataTransfer.setData("pencil/png", def.src);
            nsDragAndDrop.setData("pencil/png", def.src);
        }

        event.dataTransfer.setData("text/html", "");
        nsDragAndDrop.setData("text/html", "");
        event.dataTransfer.setDragImage(thiz.dndImage, 8, 8);
        event.target.collection = def;
    });

    this.dndImage = new Image();
    this.dndImage.src = "css/bullet.png";

    this.searchInput.addEventListener("keyup", function (event) {
        if (event.keyCode == DOM_VK_RETURN) {
            thiz.searchOptions.page = 1;
            thiz.search();
        }
    }, false);

    UICommandManager.register({
        key: "searchFocusCommand",
        shortcut: "Ctrl+F",
        run: function () {
            thiz.searchInput.focus();
            thiz.searchInput.select();
        }
    });

    this.bind("click", function (event) {
        Config.set("clipartbrowser.scale", this.scaleImageCheckbox.checked);
    }, this.scaleImageCheckbox);

    this.scaleImageCheckbox.checked = Config.get("clipartbrowser.scale") == true;

    this.bind("click", function () {
        this.searchOptions.page -= 1;
        this.search();
    }, this.goPrevious);

    this.bind("click", function () {
        this.searchOptions.page += 1;
        this.search();
    }, this.goNext);

    this.searchOptions = {
        page: 1,
        limit: 60
    };
    this.rq = [];

    this.goPrevious.disabled = true;
    this.goNext.disabled = true;
}
__extend(BaseTemplatedWidget, OpenClipartPane);

OpenClipartPane.prototype.getTitle = function() {
	return "Clipart";
};

OpenClipartPane.prototype.getIconName = function() {
	return "photo";
};
OpenClipartPane.prototype.search = function () {
    if (this.node().offsetWidth <= 0) return;
    Dom.empty(this.shapeList);

    this.goPrevious.disabled = true;
    this.goNext.disabled = true;

    for (var i = 0; i < this.rq.length; i++) {
        if (this.rq[i]) {
            this.rq[i].abort();
            this.rq[i].onreadystatechange = null;
        }
    }
    this.searchAborted = true;

    var thiz = this;
    this.loader.style.display = "";
    this.backend.search(this.searchInput.value, this.searchOptions, function (result) {
        thiz.renderResult(result);
        thiz.loader.style.display = "none";
    });
};
OpenClipartPane.prototype.renderResult = function (result) {
    console.log("SEARCH RESULT", result);
    this.searchAborted = false;
    var shapeDefs = result;
    for (var i = 0; i < shapeDefs.length; i ++) {
        var def = shapeDefs[i];
        var holder = {};

        var node = Dom.newDOMElement({
            _name: "li",
            "type": "ShapeDef",
            "title": def.name,
            _children: [
                {
                    _name: "div",
                    "class": "Shape",
                    draggable: "true",
                    _children: [
                        {
                            _name: "div",
                            "class": "Icon",
                            _children: [
                                {
                                    _name: "img",
                                    _id: "iconImage",
                                    src: def.thumb
                                }
                            ]
                        },
                        {
                            _name: "span",
                            _text: def.name
                        }
                    ]
                }
            ]
        }, null, holder);

        node._def = def;

        this.shapeList.appendChild(node);

        var thiz = this;
        holder.iconImage.onload = function () {
            if (thiz.searchAborted) return;
        };

        // Util.setupImage(holder.iconImage, def.thumb, "center-inside", null, function () {
        //     return thiz.searchAborted;
        // });
        this.getSVG(node._def);
    }

    this.goPrevious.disabled = (this.searchOptions.page <= 1);
    this.goNext.disabled = (result.length <= 0);
};

OpenClipartPane.prototype.getSVG = function (item) {
    var loaded = 1;
    var thiz = this;
    WebUtil.get(item.src, function(svg) {
        if (!svg || thiz.searchAborted) return;
        try {
            item._svg = svg;
        } catch (e) {
            error(e);
        }

    }, this.rq);
};
