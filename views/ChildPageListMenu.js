function ChildPageListMenu(page, onDone) {
    Menu.call(this);
    this.page = page;
    this.onDone = onDone;
    this.setup();
}

__extend(Menu, ChildPageListMenu);

ChildPageListMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "Menu.xhtml";
};
ChildPageListMenu.prototype.setup = function (page) {
    if(page) {
        this.items = [];
        this.page = page;
    }
    var thiz = this;
    var recentPage = function(page) {
        return page;
    }
    var createChild = function (page, subMenu) {
      for(var i = 0; i < page.children.length; i++) {
          if (page.children[i].children.length > 0) {
              var subItems = [] ;
              createChild(page.children[i],subItems);
              var key = "open" + page.children[i].name +"page";
              var element = UICommandManager.register({
                  key:  key,
                  label: page.children[i].name,
                  run: function () {
                      //return thiz.onDone(page.children[i]);
                  },
                  type: "SubMenu",
                  subItems: subItems
              });
              if (subMenu) {
                  subMenu.push(UICommandManager.getCommand(key));
              } else {
                  thiz.register(UICommandManager.getCommand(key));
              }
          } else {
              var pageac = recentPage(page.children[i]);
              var key = "open" + page.children[i].name +"page";
              var element = UICommandManager.register({
                  key:  key,
                  label: page.children[i].name,
                  run: function () {
                       thiz.onDone(pageac);
                  },
              });
              if (subMenu) {
                  subMenu.push(UICommandManager.getCommand(key));
              } else {
                  thiz.register(UICommandManager.getCommand(key));
              }
          }
      }
    }
    createChild(this.page);
}
