"use strict";

class LinkToMenu {
    constructor(targetObject) {
        this.label = "Link To";
        this.type = "SubMenu";
        this.subItems = [];
        this.targetObject = targetObject;
    }

    static buildWithSubPages(targetObject) {
        let menu = new LinkToMenu(targetObject);
        menu._addSubItems();
        return menu;
    }

    getRelatedPage() {
        return this.targetObject.getMetadata("RelatedPage");
    }

    setRelatedPage(pageId) {
        this.targetObject.setMetadata("RelatedPage", pageId ? pageId : "");
    }

    _addSubItems() {
        let menu = this;
        // noinspection JSUnusedLocalSymbols
        Pencil.controller.doc.pages.forEach(
            function (page, pageNumber, pages) {
                let menuItem = new LinkToMenuItem(menu, page);
                menu.subItems.push(menuItem);
            });
        this.subItems.sort();
        let linkToNoneMenuItem = new LinkToMenuItem(this, NonePage);
        this.subItems.push(linkToNoneMenuItem);
    }
}

class LinkToMenuItem {
    constructor(menu, page) {
        this.menu = menu;
        this.label = page.name;
        this.type = SELECTION_TYPE;
        this.pageId = page.id;
    }

    toString() {
        return this.label;
    }

    isChecked() {
        let relatedPage = this.menu.getRelatedPage();
        return this.pageId === relatedPage;
    }

    isEnabled() {
        let activePageIdIsOurs = this.pageId === Pencil.controller.activePage.id;
        return !activePageIdIsOurs;
    }

    handleAction() {
        this.menu.setRelatedPage(this.pageId);
    }
}

const SELECTION_TYPE = "Selection";
const NonePage = {
    name: "Nothing",
    id: null
};
