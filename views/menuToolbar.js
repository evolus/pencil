function menuToolbar () {
    Menu.call(this);
    this.setup();
    this.itemRecentFile;
}

__extend(Menu, menuToolbar);

menuToolbar.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "Menu.xhtml";
};

menuToolbar.prototype.setup = function () {
    var thiz = this;

    var createRecentSubMenuElement = function(fileName) {
        var index = fileName.indexOf("/");
        var name = fileName.substring(index);
        var key = "open" + name + "Document" ;
        var element = UICommandManager.register({
            key: key,
            label: name,
            run: function () {
                Pencil.controller.loadDocument(name);
                thiz.hideMenu();
            }
        });
        var setElement = UICommandManager.getCommand(key);
        return setElement;
    }

    var createRecentSubMenuItem = function() {
        var files = Config.get("recent-documents");
        if (files) {
            var elements = [];
            for (var i = 0; i < files.length; i++) {
                elements.push(createRecentSubMenuElement(files[i]));
            }
            return elements;
        }
    }
    this.itemRecentFile = createRecentSubMenuItem();
    var createRecentButton = function() {
        var check = false;
        if(thiz.itemRecentFile) {
            check = true;
        }
        thiz.register({
            label: "Recent files " ,
            isEnabled: function() { return check },
            run: function () {
             },
            type: "SubMenu",
            subItems:  thiz.itemRecentFile
        });
    }

    // Register button
    this.register(UICommandManager.getCommand("openDocumentCommand"));
    this.register(UICommandManager.getCommand("saveDocumentCommand"));
    this.register(UICommandManager.getCommand("saveAsDocumentCommand"));
    this.register(UICommandManager.getCommand("exportPageAsPNGButton"));
    this.register(UICommandManager.getCommand("exportSelectionAsPNGButton"));
    createRecentButton();
    this.register(UICommandManager.getCommand("settingAllCommand"));
    this.register(UICommandManager.getCommand("aboutDialogCommand"));

}
