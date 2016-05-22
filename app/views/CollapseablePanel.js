function CollapseablePanel() {
    BaseTemplatedWidget.call(this);

    CollapseablePanel.ensureGlobalHandlers();

    this.setAttribute("closed", "true");

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
    this.sizeConfigName = "ui.collapsable_pane." + this.node().getAttribute("name") + ".size";
    var w = Config.get(this.sizeConfigName, 250);
    this.setWidth(w);

    this.activeIdConfigName = "ui.collapsable_pane." + this.node().getAttribute("name") + ".active_id";
    var activeId = Config.get(this.activeIdConfigName, "");

    var found = false;
    for (var i = 0; i < this.children.length; i ++) {
        var active = this.children[i]._anonId == activeId ? "true" : "false";
        this.children[i].setAttribute("active", active);
        this.children[i]["p:title"].setAttribute("active", active);
        if (this.children[i].onSizeChanged) this.children[i].onSizeChanged();

        if (active == "true") found = true;
    }

    this.setAttribute("closed", found ? "false" : "true");
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
CollapseablePanel.prototype.updateTitle = function (titleElement) {
    var title = titleElement._child.getTitle();
    if (titleElement._child.getIconName) {
        titleElement._icon.innerHTML = titleElement._child.getIconName();
    }
    Dom.setInnerText(titleElement._textSpan, title);
    window.setTimeout(function () {
        var w = Math.round(titleElement._button.offsetWidth);
        titleElement.style.height = w + "px";
    }, 500);
};

CollapseablePanel.prototype.toogle = function() {
    return;
    this.expanded = !this.expanded;
    if (this.expanded) {
        this.panelTitleSpan.style.display = "block";
        this.contentContainer.style.display = "block";
        Dom.removeClass(this.collapseablePanel, "Collapsed")
        this.toogleButton.childNodes[0].innerHTML = "expand_less";
    } else {
        this.contentContainer.style.display = "none";
        Dom.addClass(this.collapseablePanel, "Collapsed")
        this.toogleButton.childNodes[0].innerHTML = "expand_more";
        this.panelTitleSpan.style.display = "none";
    }
    var children = this.contentContainer.childNodes;

    for(child in children){
        var widget = children[child].__widget;
        if (!widget) continue;
        if (widget.sizeChanged) {
            widget.sizeChanged(this.expanded);
        }
    }

}
