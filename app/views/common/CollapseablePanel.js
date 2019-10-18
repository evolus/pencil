function CollapseablePanel() {
    BaseTemplatedWidget.call(this);

    CollapseablePanel.ensureGlobalHandlers();

    this.setAttribute("closed", "true");
    this.lastActiveId = null;

    var thiz = this;
    this.titleContainer.addEventListener("click", function(ev) {
        var title = Dom.findUpwardForNodeWithData(ev.target, "_child");
        if (!title) return;

        var closing = (title._child.getAttribute("active") == "true");

        for (var i = 0; i < thiz.children.length; i ++) {
            var active = closing ? "false" : (thiz.children[i] == title._child ? "true" : "false");
            thiz.children[i].setAttribute("active", active);
            thiz.children[i]["p:title"].setAttribute("active", active);
            if (thiz.children[i].onSizeChanged) thiz.children[i].onSizeChanged();

            if (active == "true") thiz.lastActiveId = thiz.children[i]._anonId;
        }

        thiz.setAttribute("closed", closing);

        var activeId = closing ? "" : title._child._anonId;
        Config.set(thiz.activeIdConfigName, activeId);
    });

    this.contentContainer.addEventListener("p:TitleChanged", function(event) {
        var widget = event.target.__widget;
        if (!widget) return;
        //find correspondent title
        var title = widget["p:title"];
        if (!title) return;
        thiz.updateTitle(title);
    }, false);

    this.bind("mousedown", this.handleSplitterMouseDown, this.splitter);
    this.bind("click", function () {
        if (this.node().getAttribute("float") == "true") {
            this.node().removeAttribute("float");
            Config.set(this.floatConfigName, "false");
        } else {
            this.node().setAttribute("float", "true");
            Config.set(this.floatConfigName, "true");
        }
    }, this.pinButton);
}
__extend(BaseTemplatedWidget, CollapseablePanel);

CollapseablePanel.globalSplitterMoveListener = function (event) {
    if (!CollapseablePanel.heldInstance) return;

    Dom.cancelEvent(event);

    var dx = event.screenX - CollapseablePanel._originalScreenX;
    var dy = event.screenY - CollapseablePanel._originalScreenY;

    var horizontal = CollapseablePanel.heldInstance.getAttribute("orient") == "horizontal";
    var parentFirstChild = null;
    for (var i = 0; i < CollapseablePanel.heldInstance.node().parentNode.childNodes.length; i ++) {
        var node = CollapseablePanel.heldInstance.node().parentNode.childNodes[i];
        if (node.nodeType == Node.ELEMENT_NODE) {
            parentFirstChild = node;
            break;
        }
    }
    var first = CollapseablePanel.heldInstance.node() == parentFirstChild;
    if (horizontal) {
        var w = CollapseablePanel._originalWidth + (first ? 1 : -1) * dx;
        w = Math.max(80, w);
        w = Math.min(window.innerWidth / 2, w);
        CollapseablePanel.heldInstance.setWidth(w);
    }

    BaseWidget.signalOnSizeChangedRecursively(CollapseablePanel.heldInstance.node());
};

CollapseablePanel.ensureGlobalHandlers = function () {
    if (CollapseablePanel.globalHandlersRegistered) return;

    document.addEventListener("mousemove", CollapseablePanel.globalSplitterMoveListener, false);
    document.addEventListener("mouseup", function (event) {
        if (!CollapseablePanel.heldInstance) return;
        Config.set(CollapseablePanel.heldInstance.sizeConfigName, CollapseablePanel.heldInstance.width);
        CollapseablePanel.heldInstance = null;
    }, false);

    CollapseablePanel.globalHandlersRegistered = true;
};
CollapseablePanel.prototype.onAttached = function () {
    var baseConfigName = "ui.collapsable_pane." + this.node().getAttribute("name");

    this.sizeConfigName = baseConfigName + ".size";
    var w = Config.get(this.sizeConfigName, 250);
    this.setWidth(w);

    this.activeIdConfigName = baseConfigName + ".active_id";
    var activeId = Config.get(this.activeIdConfigName, "");

    var found = false;
    for (var i = 0; i < this.children.length; i ++) {
        var active = this.children[i]._anonId == activeId ? "true" : "false";
        this.children[i].setAttribute("active", active);
        this.children[i]["p:title"].setAttribute("active", active);
        if (this.children[i].onSizeChanged) this.children[i].onSizeChanged();

        if (active == "true") {
            found = true;
            this.lastActiveId = activeId;
        }
    }

    this.setAttribute("closed", found ? "false" : "true");

    this.floatConfigName = baseConfigName + ".float";
    var float = Config.get(this.floatConfigName, "false") == "true";
    this.setAttribute("float", float ? "true" : "false");

    //handle blur - to - collapse
    this.node().parentNode.addEventListener("click", function (event) {
        if (this.node().getAttribute("float") != "true") return;
        if (this.node().getAttribute("closed") == "true") return;

        var inside = this.node().contains(event.target);
        if (inside) return;
        this.collapseAll();
    }.bind(this), false);
    
    if (float) this.collapseAll();
};

CollapseablePanel.prototype.handleSplitterMouseDown = function (event) {
    Dom.cancelEvent(event);
    CollapseablePanel.heldInstance = this;
    CollapseablePanel._originalScreenX = event.screenX;
    CollapseablePanel._originalScreenY = event.screenY;
    CollapseablePanel._originalWidth = this.width;
};

CollapseablePanel.prototype.setWidth = function (width) {
    this.contentContainer.style.width = width + "px";
    this.width = width;
};

CollapseablePanel.prototype.setContentFragment = function (fragment) {
    //assuming that the child fragment contains CollapsibleChild elements

    this.children = [];
    for (var i = 0; i < fragment.childNodes.length; i ++) {
        var node = fragment.childNodes[i];
        if (!node.__widget) continue;
        this.children.push(node.__widget);


        var ids = {};
        var title = widget.Util._toTemplateNode("", "<div class='TitleElement'><button anon-id='button'><i anon-id='icon'></i><span anon-id='textSpan'></span></button></div>", ids);
        title._child = node.__widget;
        node.__widget["p:title"] = title;

        title._textSpan = ids.textSpan;
        title._icon = ids.icon;
        title._button = ids.button;

        this.titleContainer.appendChild(title);

        this.contentContainer.appendChild(node);
        this.updateTitle(title);
    }
};
CollapseablePanel.prototype.recalculateButtonSizes = function () {
    for (var i = 0; i < this.titleContainer.childNodes.length; i ++) {
        var title = this.titleContainer.childNodes[i];
        if (title._button) this.updateTitle(title);
    }
};
CollapseablePanel.prototype.updateTitle = function (titleElement) {
    var title = titleElement._child.getTitle();
    if (titleElement._child.getIconName) {
        titleElement._icon.innerHTML = titleElement._child.getIconName();
    }
    Dom.setInnerText(titleElement._textSpan, title);
    window.setTimeout(function () {
        var w = Math.round(titleElement._button.offsetWidth);
        titleElement.style.height = w + "px";
        titleElement._button.style.transform = "rotate(-90deg) translate(-" + w + "px, 0px)";
    }, 500);
};

CollapseablePanel.prototype.collapseAll = function() {
    for (var i = 0; i < this.children.length; i ++) {
        this.children[i].setAttribute("active", "false");
        this.children[i]["p:title"].setAttribute("active", "false");
        if (this.children[i].onSizeChanged) this.children[i].onSizeChanged();
    }
    this.setAttribute("closed", "true");
    if (this.getAttribute("controls-location") == "top") {
        this.recalculateButtonSizes();
    }
};
CollapseablePanel.prototype.open = function(activeId) {
    var found = false;
    for (var i = 0; i < this.children.length; i ++) {
        var active = this.children[i]._anonId == activeId ? "true" : "false";
        this.children[i].setAttribute("active", active);
        this.children[i]["p:title"].setAttribute("active", active);
        if (this.children[i].onSizeChanged) this.children[i].onSizeChanged();

        if (active == "true") {
            found = true;
            this.lastActiveId = activeId;
        }
    }

    this.setAttribute("closed", found ? "false" : "true");
};
CollapseablePanel.prototype.openLast = function() {
    if (this.lastActiveId) this.open(this.lastActiveId);
};
CollapseablePanel.prototype.isOpen = function () {
    return this.getAttribute("closed") == "false";
};
