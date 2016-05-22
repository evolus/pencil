var PropertyDialog = {};

function setup() {
    PropertyDialog.setupReally();
}
function clean() {
    try {
        PropertyDialog.clean();
    } catch (e) {
        Console.dumpError(e);
    }
}
PropertyDialog.setupReally = function () {
    try {
        var editor = PropertyDialog.editor;

        if (editor.usingQuickMode()) {
            document.documentElement.getButton("accept").setAttribute("label", Util.getMessage("button.save.label"));
        }

        var tabs = document.getElementById("tabs");
        var tabPanels = document.getElementById("tabPanels");

        PropertyDialog.propertyMap = {};
        //creating tabs
        var lastLabel = null;
        for (var i in editor.groups) {
            var group = editor.groups[i];

            //create a tab for this group
            var tab = document.createElementNS(PencilNamespaces.xul, "tab");
            tab.setAttribute("label", group.name + (group.name == lastLabel ? " (cont.)" : ""));
            lastLabel = group.name;
            tabs.appendChild(tab);

            var tabPanel = document.createElementNS(PencilNamespaces.xul, "tabpanel");
            tabPanel.setAttribute("id", "tab" + new Date().getTime());
            tabPanels.appendChild(tabPanel);

            var vbox = document.createElementNS(PencilNamespaces.xul, "vbox");
            vbox.setAttribute("flex", "1");
            tabPanel.appendChild(vbox);

            for (var j in group.properties) {
                var property = group.properties[j];

                var separator = document.createElementNS(PencilNamespaces.xul, "separator");
                separator.setAttribute("class", "groove");
                if (j > 0) vbox.appendChild(separator);

                var tagName = TypeEditorRegistry.getTypeEditor(property.type);
                var editorWrapper = document.createElementNS(PencilNamespaces.xul, "peditorwrapper");

                editorWrapper._property = property;
                editorWrapper.setAttribute("editor", tagName);
                editorWrapper.setAttribute("name", property.displayName);
                var value = editor.properties[property.name];
                if (value){
                    editorWrapper.setAttribute("value", value.toString());
                } else {
                    value = editor.getPropertyValue(property.name);
                    if (value) {
                        editorWrapper.setAttribute("initial-value", value.toString());
                    }
                }

                vbox.appendChild(editorWrapper);

                PropertyDialog.propertyMap[property.name] = editorWrapper;
            }
        }
        if (tabs.parentNode.selectedIndex < 0) tabs.parentNode.selectedIndex = 0;
        document.title =  Util.getMessage("tab.properties", editor.getTargetObjectName());

        window.sizeToContent();
    } catch (e) {
        Console.dumpError(e);
    }

};

PropertyDialog.clean = function () {
    var tabs = document.getElementById("tabs");
    var tabPanels = document.getElementById("tabPanels");

    while (tabs.hasChildNodes()) tabs.removeChild(tabs.firstChild);
    while (tabPanels.hasChildNodes()) tabPanels.removeChild(tabPanels.firstChild);

    //window.sizeToContent();

    document.title = Util.getMessage("page.properties");
};

PropertyDialog.doApply = function () {
    for (name in PropertyDialog.propertyMap) {
        var editor = PropertyDialog.propertyMap[name];

        //apply change to only modified properties
        if (editor.isModified()) {
            var value = editor.getValue(true);
            PropertyDialog.editor.setPropertyValue(name, value);
        }
    }
    return PropertyDialog.editor.usingQuickMode();
};
PropertyDialog.doCancel = function () {
    return true;
};

window.addEventListener("DOMContentLoaded", function(event) {
}, false);

window.addEventListener("beforeunload", function(event) {
    if (PropertyDialog.editor) {
        PropertyDialog.editor.propertyWindow = null;
        PropertyDialog.editor.dialogShown = false;
    }
}, false);

window.addEventListener("load", function (event) {
    var editor = window.arguments[0];
    PropertyDialog.editor = editor;
    PropertyDialog.editor.onDialogShown();
}, false);
