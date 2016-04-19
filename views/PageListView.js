function PageListView() {
    BaseTemplatedWidget.call(this);

    var findPageThumbnailView = function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.__widget && (n.__widget instanceof PageThumbnailView);
        });
        return node;
    }

    this.bind("click", function (event) {
        var node = findPageThumbnailView(event);
        if (!node) return;
        this.handleSelectPage(node.__widget.page);
    }, this.pageListContainer);

    this.bind("dblclick", function (event) {
        var node = findPageThumbnailView(event);
        if (!node) return;
        this.handleDoubleClick(node.__widget.page);

    }, this.pageListContainer);


    // this.bind("mouseover", function (event) {
    //     var page = Dom.findUpwardForData(event.target, "_page");
    //     if(!page || page.children.length == 0) return;
    //     // open child pages
    //     var activePage = function (page) {
    //         thiz.activatePage(page);
    //     }
    //     var childrenList = new ChildPageListMenu(page, activePage);
    //     childrenList.showMenuAt(event.clientX,event.clientY);
    //
    // },this.childPageContainer)

    this.bind("click", function (event) {
        var page = Dom.findUpwardForData(event.target, "_page");
        if (!page) return;
        var node = Dom.findParentWithClass(event.target, "button_Down");
        if (node && node.nodeName != "#document") {
            var childrenListMenu = new ChildPageListMenu(page, function (selectedPage) {
                thiz.activatePage(selectedPage);
            });
            childrenListMenu.showMenu(node, "left-inside", "top", 0, 0, true);
        } else {
           this.handleSelectPage(page);
       }
    }, this.childPageContainer);

    this.bind("dblclick", function (event) {
        var page = Dom.findUpwardForData(event.target, "_page");
        if (!page) return;
        this.handleDoubleClick(page);
    }, this.childPageContainer);

    this.bind("click", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return typeof(n._page) != "undefined";
        });
        if (!node) return;
        var page = node._page;
        if ((page == null && this.currentParentPage == null) || (page && this.currentParentPage && page.id == this.currentParentPage.id)) return;
        this.currentPage = null;
        if (this.currentParentPage) {
            if (page == null && this.currentParentPage) {
                for (var i in this.controller.doc.pages) {
                    var p = this.controller.doc.pages[i];
                    if (!p.parentPage && p.id == this.currentParentPage.id) {
                        this.currentPage = p;
                        break;
                    }
                }
            } else if (page) {
                for (var i in page.children) {
                    if (page.children[i].id == this.currentParentPage.id) {
                        this.currentPage = this.currentParentPage;
                        break;
                    }
                }
            }
        }
        this.currentParentPage = page;
        this.renderPages();
    }, this.pageBreadcrumb);

    var thiz = this;

    this.bind("contextmenu", function (event) {
        var childOfListPage = Dom.isChildOf(this.pageListContainer, event.target);
        var childOfChildPage = Dom.isChildOf(this.childPageContainer, event.target);
        var page;
        if (childOfChildPage) {
            page = Dom.findUpwardForData(event.target, "_page");
        } else if (childOfListPage) {
            var view = Dom.findUpwardForData(event.target, "__widget");
            if (!view) return;
              page = view.page;
        }
        var pageMenu = new PageMenu(thiz, page);
        pageMenu.showMenuAt(event.clientX, event.clientY);
    },this.node());

    this.bind("click", function (event) {
        var dialog = new PageDetailDialog();
        dialog.open({
            defaultParentPage: this.currentParentPage,
            onDone: function (page) {
                if (!page) return;
                thiz.activatePage(page);
            }
        });
    }, this.addPageButton);

    this.bind("click", function (event) {
        this.expanded = !this.expanded;
        this.invalidateExpandedState();
        this.pageListSrollView.invalidate();
        this.childPageSrollView.invalidate();
        Config.set("pageListViewExpanded.enabled", this.expanded);
    }, this.toggleButton);

    this.pageListSrollView.getStep = function () {
        return 120;
    };

    this.expanded = Config.get("pageListViewExpanded.enabled");

    this.invalidateExpandedState();
}
__extend(BaseTemplatedWidget, PageListView);
PageListView.prototype.setController = function (controller) {
    this.controller = controller;
    this.currentParentPage = null;
    this.currentPage = null;
    this.renderPages();
};
PageListView.prototype.activatePage = function (page) {
    this.currentPage = page;
    this.currentParentPage = page.parentPage;
    this.renderPages();
};
PageListView.prototype.renderPages = function() {
    this.pageBreadcrumb.innerHTML = "";
    this.pageListContainer.innerHTML = "";
    this.childPageContainer.innerHTML = "";

    this.views = [];
    if (!this.controller || !this.controller.doc) return;

    var pages = [];
    var parentPages = [];
    if (!this.currentParentPage) {
        for (var i in this.controller.doc.pages) {
            var page = this.controller.doc.pages[i];
            if (!page.parentPage) pages.push(page);
        }

    } else {
        pages = this.currentParentPage.children;

        parentPages.push(this.currentParentPage);
        var p = this.currentParentPage;
        while (p.parentPage) {
            parentPages.unshift(p.parentPage);
            p = p.parentPage;

        }
    }

    if (!this.currentPage) this.currentPage = pages[0];

    var node = Dom.newDOMElement({
        _name: "hbox",
        _children: [
            {
                _name: "button",
                type: "button",
                _children: [
                    {
                        _name: "i",
                        _text: "description"
                    },
                    {
                        _name: "span",
                        _text: this.controller.getDocumentName()
                    }
                ]
            }
        ]
    });
    node._page = null;
    this.pageBreadcrumb.appendChild(node);

    if (parentPages.length > 0) {
        node = Dom.newDOMElement({
            _name: "hbox",
            "class": "OverflowIndicator",
            _children: [
                {
                    _name: "span",
                    _text: "..."
                }
            ]
        });

        this.pageBreadcrumb.appendChild(node);
    }

    const MAX = 2;
    var index = parentPages.length;
    for (var i in parentPages) {
        var p = parentPages[i];
        node = Dom.newDOMElement({
            _name: "hbox",
            _children: [
                {
                    _name: "button",
                    type: "button",
                    _children: [
                        {
                            _name: "span",
                            _text: p.name
                        }
                    ]
                }
            ]
        });

        node._page = p;
        this.pageBreadcrumb.appendChild(node);

        if (index > MAX) Dom.addClass(node, "Overflow");
        index --;
    }

    this.pageBreadcrumb.setAttribute("overflow", parentPages.length > MAX);

    var thiz = this;
    for (var i in pages) {
        var page = pages[i];
        var selected = this.currentPage && this.currentPage.id == page.id;

        var pageThumbnailView = new PageThumbnailView();
        var childrenListMenu = new ChildPageListMenu(page, function (selectedPage) {
            thiz.activatePage(selectedPage);
        });
        pageThumbnailView.setPage(page, childrenListMenu);
        this.pageListContainer.appendChild(pageThumbnailView.node());
        pageThumbnailView.selectPage(selected);
        this.views.push(pageThumbnailView);
        var childNode;
        if( page.children.length == 0 ) {
            childNode = Dom.newDOMElement({
                _name: "hbox",
                "selected": selected,
                _children: [
                    {
                        _name: "span",
                        _text: page.name
                    }
                ]
            });
        }  else {
            childNode = Dom.newDOMElement({
                _name: "hbox",
                "selected": selected,
                class: "nodeHasChild",
                _children: [
                    {
                        _name: "span",
                        _text: page.name
                    },
                    {
                        _name: "button",
                        class:"button_Down",
                        name:"showChildren",
                        _children: [
                            {
                                _name: "i",
                                _text: "keyboard_arrow_down",
                                name:"showChildren",
                            }
                        ]
                    }
                ]
            });
        }
        childNode._page = page;
        this.childPageContainer.appendChild(childNode);
    }
    this.invalidateExpandedState();
    this.childPageSrollView.invalidate();
    this.pageListSrollView.invalidate();

    this.controller.activatePage(this.currentPage);

};

PageListView.prototype.invalidateExpandedState = function() {
    Dom.toggleClass(this.node(), "Collapsed", !this.expanded);
};

PageListView.prototype.handlePageInfoChangedEvent = function (event) {
    if (!event || !event.page) return;
    for (var i in this.views) {
        if (this.views[i].page.id == event.page.id) {
            this.views[i].setPage(event.page);
            return;
        }
    }
};

PageListView.prototype.handleSelectPage = function (page) {
    if (!page) return;
    Dom.doOnAllChildren(this.pageListContainer, function (n) {
        var view = n.__widget;
        if (!view) return;
        var p = view.page;
        view.selectPage(p.id == page.id);
    });

    Dom.doOnAllChildren(this.childPageContainer, function (n) {
        var p = n._page;
        n.setAttribute("selected", p.id == page.id);
    });

    this.controller.activatePage(page);
};

PageListView.prototype.handleDoubleClick = function (page) {
    if (!page.children || page.children.length == 0) {
        this.handleSelectPage(page);
    } else {
        this.currentParentPage = page;
        this.currentPage = null;
        this.renderPages();
    }
};
