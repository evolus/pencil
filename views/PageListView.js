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

    this.bind("click", function (event) {
        var page = Dom.findUpwardForData(event.target, "_page");
        if (!page) return;
        this.handleSelectPage(page);
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
        var page = Dom.findUpwardForData(event.target, "_page");
        thiz.activatePage(page);
        if (page) {
            var pageMenu = new PageMenu(thiz,page);
            pageMenu.showMenuAt(event.clientX, event.clientY);
        }  
    })

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
        this.toggle();
        Config.set("pageListViewExpanded", this.expanded);
    }, this.toggleButton);

    this.expanded = Config.get("pageListViewExpanded", "true") == "true" ? true : false;
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
                _name: "i",
                _text: "description"
            },
            {
                _name: "span",
                _text: this.controller.getDocumentName() + (parentPages.length == 0 ? ":" : "")
            }
        ]
    });
    node._page = null;
    this.pageBreadcrumb.appendChild(node);

    for (var i in parentPages) {
        var p = parentPages[i];
        node = Dom.newDOMElement({
            _name: "hbox",
            _children: [
                {
                    _name: "span",
                    _text: p.name + ((i == (parentPages.length - 1)) ? ":" : "")
                }
            ]
        });

        node._page = p;
        this.pageBreadcrumb.appendChild(node);
    }

    for (var i in pages) {
        var page = pages[i];
        var pageThumbnailView = new PageThumbnailView();
        pageThumbnailView.setPage(page);
        this.pageListContainer.appendChild(pageThumbnailView.node());
        pageThumbnailView.selectPage(this.currentPage && this.currentPage.id == page.id);
        this.views.push(pageThumbnailView);

        var childNode = Dom.newDOMElement({
            _name: "hbox",
            "selected": (this.currentPage && this.currentPage.id == page.id),
            _children: [
                {
                    _name: "span",
                    _text: page.name
                }
            ]
        });

        childNode._page = page;
        this.childPageContainer.appendChild(childNode);
    }

    this.toggle();
    this.controller.activatePage(this.currentPage);
};

PageListView.prototype.toggle = function() {
    if (this.expanded) {
        this.pageListContainer.style.display = "flex";
        this.childPageContainer.style.display = "none";
        this.toggleButton.childNodes[0].innerHTML = "expand_less";
    } else {
        var h = this.pageListContainer.offsetHeight;
        this.pageListContainer.style.display = "none";
        this.childPageContainer.style.display = "flex";
        this.toggleButton.childNodes[0].innerHTML = "expand_more";
    }
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
