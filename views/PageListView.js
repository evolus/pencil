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
        this.handleSelectPage(node);
    }, this.pageListContainer);

    this.bind("dblclick", function (event) {
        var node = findPageThumbnailView(event);
        if (!node) return;
        var view = node.__widget;
        var page = view.page;
        if (!page.children || page.children.length == 0) {
            this.handleSelectPage(node);
        } else {
            this.currentParentPage = page;
            this.currentPage = null;
            this.renderPages();
        }

    }, this.pageListContainer);

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
                for (var i in this.controller.pages) {
                    var p = this.controller.pages[i];
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
    this.views = [];
    if (!this.controller || !this.controller.pages) return;

    var pages = [];
    var parentPages = [];
    if (!this.currentParentPage) {
        for (var i in this.controller.pages) {
            var page = this.controller.pages[i];
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
                _text: this.controller.getDocumentName()
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
                    _text: p.name
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
    }

    this.controller.activatePage(this.currentPage);

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

PageListView.prototype.handleSelectPage = function (node) {
    if (!node) return;
    Dom.doOnAllChildren(this.pageListContainer, function (n) {
        var view = n.__widget;
        if (!view) return;
        view.selectPage(n == node);
    });

    this.controller.activatePage(node.__widget.page);
};
