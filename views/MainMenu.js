function MainMenu (menu) {
    Menu.call(this);
    this.setup();
    this.itemRecentFile;
}

__extend(Menu, MainMenu);

MainMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "Menu.xhtml";
};

MainMenu.prototype.setup = function () {
    var thiz = this;
    var createRecentSubMenuElement = function(fileName) {
        var index = fileName.indexOf("/");
        var name = fileName.substring(index);
        var key = "open" + name + "Document" ;
        var element = UICommandManager.register({
            key: key,
            label: name,
            run: function () {
                function handler() {
                    Pencil.controller.loadDocument(name);
                }
                if (Pencil.controller.modified) {
                    Pencil.controller.confirmAndSaveDocument(handler);
                    return;
                }
                handler();
            }
        });
        var setElement = UICommandManager.getCommand(key);
        return setElement;
    }

    var files = Config.get("recent-documents");
    if (files) {
        var elements = [];
        for (var i = 0; i < files.length; i++) {
            elements.push(createRecentSubMenuElement(files[i]));
        }
        this.itemRecentFile = elements;
    }

    var checkRecentButton = false;
    if(thiz.itemRecentFile.length > 0) {
        checkRecentButton = true;
    }

    var ui = UICommandManager.getCommand("RecentFileCommand");
    ui.isEnabled = function () { return checkRecentButton };
    ui.type = "SubMenu";
    ui.subItems = thiz.itemRecentFile;
    // Register button
    this.register(UICommandManager.getCommand("openDocumentCommand"));
    this.register(UICommandManager.getCommand("saveDocumentCommand"));
    this.register(UICommandManager.getCommand("saveAsDocumentCommand"));
    this.register(UICommandManager.getCommand("exportPageAsPNGButton"));
    this.register(UICommandManager.getCommand("exportSelectionAsPNGButton"));
    this.register(UICommandManager.getCommand("RecentFileCommand"));
    this.register(UICommandManager.getCommand("settingAllCommand"));
    this.register(UICommandManager.getCommand("aboutDialogCommand"));

}
