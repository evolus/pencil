function OnMenuEditor() {
}
OnMenuEditor.typeEditorMap = [];
OnMenuEditor.registerTypeEditor = function (type, editorClass) {
    OnMenuEditor.typeEditorMap[type.name] = editorClass;
};
OnMenuEditor.getTypeEditor = function (type) {
    var editorClass = OnMenuEditor.typeEditorMap[type.name];
    if (!editorClass) return null;
    return editorClass;
};




OnMenuEditor.prototype.install = function (canvas) {
    this.canvas = canvas;
    this.canvas.contextMenuEditor = this;
};
OnMenuEditor.prototype.attach = function (targetObject) {
    this.targetObject = targetObject;

    var definedGroups = this.targetObject.getPropertyGroups();

    for (var i in definedGroups) {
        var group = definedGroups[i];
        for (var j in group.properties) {
            var property = group.properties[j];
            var editorClass = OnMenuEditor.getTypeEditor(property.type);
            if (!editorClass) continue;

            var editor = new editorClass(property, this.targetObject.getProperty(property.name), this.targetObject);
            var menuitem = editor.createMenuItem(this.canvas.ownerDocument);

            this.canvas.insertEditorContextMenuItem(menuitem);
        }
    }

    var thiz = this;
    var doc = this.canvas.ownerDocument;

    //actions
    if (targetObject.def && targetObject.performAction) {
        var menu = doc.createElementNS(PencilNamespaces.xul, "menu");
        menu.setAttribute("label", Util.getMessage("menu.actions.label"));

        var popup = doc.createElementNS(PencilNamespaces.xul, "menupopup");
        menu.appendChild(popup);
        var hasAction = false;
        for (var i in targetObject.def.actions) {
            var action = targetObject.def.actions[i];
            if (action.displayName) {
                hasAction = true;
                var item = doc.createElementNS(PencilNamespaces.xul, "menuitem");
                item.setAttribute("label", action.displayName);
                item._actionId = action.id;

                popup.appendChild(item);
            } else {
                debug("system action: " + action.id);
            }
        }
        if (hasAction) {
            this.canvas.insertEditorContextMenuItem(menu);

            menu.addEventListener("command", function (event) {
                if (event.originalTarget._actionId) {
                    targetObject.performAction(event.originalTarget._actionId);
                    thiz.canvas.invalidateEditors();
                }
            }, false);
        }
    }

    //linking
    //TODO: Refactor to p:Href="page://<pageId>"
    //      to allow further extending (link to other resource types)
    if (Pencil.controller.hasDoc() && Pencil.controller.doc.pages.length > 1
             && targetObject.setMetadata && targetObject.getMetadata) {
        var menu = doc.createElementNS(PencilNamespaces.xul, "menu");
        menu.setAttribute("label", Util.getMessage("menu.link.to.label"));

        var popup = doc.createElementNS(PencilNamespaces.xul, "menupopup");
        menu.appendChild(popup);

        var targetPageId = targetObject.getMetadata("RelatedPage");

        var currentPage = Pencil.controller.getCurrentPage();
        var pages = Pencil.controller.doc.pages;
        for (var i = 0; i < pages.length; i ++) {
            var page = pages[i];

            var item = doc.createElementNS(PencilNamespaces.xul, "menuitem");
            item.setAttribute("label", page.properties.name);
            item.setAttribute("type", "radio");
            item._pageId = page.properties.id;

            if (page.properties.id == currentPage.properties.id) {
                    item.setAttribute("disabled", true);
                }

            if (page.properties.id == targetPageId) {
                item.setAttribute("checked", true);
            }

            popup.appendChild(item);
        }
        popup.appendChild(doc.createElementNS(PencilNamespaces.xul, "menuseparator"));

        var item = doc.createElementNS(PencilNamespaces.xul, "menuitem");
        item.setAttribute("label", Util.getMessage("menu.nothing.label"));
        item.setAttribute("type", "radio");
        item._pageId = "";

        if (!targetPageId) {
            item.setAttribute("checked", true);
        }

        popup.appendChild(item);

        popup.addEventListener("command", function (event) {
                var menuitem = Dom.findUpward(event.originalTarget, function (node) {
                        return node.localName == "menuitem";
                    });
                if (!menuitem) return;

                thiz.targetObject.setMetadata("RelatedPage", menuitem._pageId ? menuitem._pageId : "");
            }, false);

        this.canvas.insertEditorContextMenuItem(doc.createElementNS(PencilNamespaces.xul, "menuseparator"));
        this.canvas.insertEditorContextMenuItem(menu);
    }

};
OnMenuEditor.prototype.invalidate = function () {
};
OnMenuEditor.prototype.dettach = function () {
};


Pencil.registerEditor(OnMenuEditor);
