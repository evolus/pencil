var Tree = function() {
    function treeClickHandler(event) {
        var target = Dom.getTarget(event);
        var chevron = Dom.findUpward(target, function(n) {
            return Dom.hasClass(n, "Chevron");
        });

        var itemObject = Dom.findUpward(target, function(n) {
            return n._item;
        });

        console.log("itemObject", itemObject);

        // check for click on leaf, wth?
        if (itemObject) {
            var treeContainer = Dom.findUpward(target, function(n) {
                return n._tree;
            });


            if (!treeContainer) return;

            var selectable = false;

            var tree = treeContainer._tree;
            if (tree.options.isItemSelectable) {
                selectable = tree.options.isItemSelectable(itemObject._item);
            } else {
                selectable = (!itemObject._item.children || itemObject._item.children.length == 0);
            }

            if (selectable) {
                if (/* tree.listener && */Dom.findParentWithClass(target, "ItemText")) {
                    var allItemText = tree.container.getElementsByClassName("ItemText");
                    var itemText = itemObject.getElementsByClassName("ItemText")[0];
                    if (!Dom.hasClass(itemText, "Disabled")) {
                        for ( var i = 0; i < allItemText.length; i++) {
                            Dom.removeClass(allItemText[i], "Selected");
                        }

                        if (itemText) {
                            Dom.addClass(itemText, "Selected");
                        }

                        tree.emitChangeEvent();
                    }
                    if (tree.listener) tree.listener(itemObject._item);
                }
            }
        }

        console.log("Click on checvron", chevron);

        if (!chevron) {
            return;
        }

        var treeContainer = Dom.findUpward(target, function(n) {
            return n._tree;
        });

        if (!treeContainer) return;

        var tree = treeContainer._tree;
        if (chevron) {
            var itemNode = Dom.findParentWithClass(chevron, "Item");
            //console.log("EXPANDING: itemNode", itemNode);
            var isExpanded = Dom.hasClass(itemNode, "Expanded");
            //console.log("EXPANDING: isExpanded", isExpanded);

            if (!isExpanded) {
                var item = itemNode._item;
                //console.log("EXPANDING: itemNode", itemNode);
                if (!itemNode.childLoaded) {
                    tree.loadChildren(item, getChildrenContainerFromItemNode(itemNode));
                    itemNode.childLoaded = true;
                }
            }

            setExpandedClasses(itemNode, !isExpanded);
        }
    }

    function treeCheckBoxListener(event) {
        var target = Dom.getTarget(event);
        if (!target || !Dom.hasClass(target, "Checkbox") || target.nodeName.toLowerCase() != "input") return;
        if (target.disabled) return;

        var treeContainer = Dom.findUpward(target, function(n) {
            return n._tree;
        });

        if (!treeContainer) return;

        var tree = treeContainer._tree;
        if ((target.checked && tree.options.propagateCheckActionDownwards)
                || (!target.checked && tree.options.propagateUncheckActionDownwards)) {
            var itemNode = target.parentNode.parentNode;
            setItemsCheckedRecursivelyFromNodes(getChildrenContainerFromItemNode(itemNode).childNodes, target.checked);
        }

        Dom.emitEvent("blur", treeContainer, {});

    }

    function setItemsCheckedRecursivelyFromNodes(nodes, checked) {
        for ( var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            node.childNodes[0].childNodes[1].checked = checked;
            var childContainer = getChildrenContainerFromItemNode(node);
            if (node.childLoaded) {
                setItemsCheckedRecursivelyFromNodes(childContainer.childNodes, checked);
            }
        }
    }
    function getChildrenContainerFromItemNode(itemNode) {
        return itemNode.childNodes[1];
    }

    function setExpandedClasses(itemNode, expanded) {
        Dom.removeClass(itemNode, expanded ? "Collapsed" : "Expanded");
        Dom.addClass(itemNode, !expanded ? "Collapsed" : "Expanded");

        Dom.removeClass(itemNode._titleElement, expanded ? "CollapsedTitle" : "ExpandedTitle");
        Dom.addClass(itemNode._titleElement, !expanded ? "CollapsedTitle" : "ExpandedTitle");

        Dom.removeClass(itemNode._childContainerElement, expanded ? "CollapsedChildren" : "ExpandedChildren");
        Dom.addClass(itemNode._childContainerElement, !expanded ? "CollapsedChildren" : "ExpandedChildren");
    }

    function Tree() {
        BaseWidget.call(this);
        this.container = this.node();

        this.container._tree = this;

        Dom.registerEvent(this.container, "click", treeClickHandler, false);
        Dom.registerEvent(this.container, "click", treeCheckBoxListener, false);
    }
    __extend(BaseTemplatedWidget, Tree);

    Tree.prototype.setup = function (source, renderer, options) {
        this.source = source;
        this.renderer = renderer;
        this.options = options || {};

        this.onInitializing = true;
        this.init();
    };
    Tree.prototype.same = function(a, b) {
        if (this.options.same) return this.options.same(a, b);
        return a == b;
    };
    Tree.prototype.init = function(__callback) {
        Dom.addClass(this.container, "Tree");
        if (this.options.checkable) {
            Dom.addClass(this.container, "CheckableTree");
        }
        var fakeTitle = document.createElement("div");
        fakeTitle.style.display = "none";
        this.container.appendChild(fakeTitle);

        var div = document.createElement("div");
        Dom.addClass(div, "Children RootChildren");
        this.container.appendChild(div);
        this.rootChildrenContainer = div;
        this.uniqueName = "tree" + widget.random();

        var thiz = this;
        this.loadChildren(null, div, function() {
            if (thiz.options.expandedAll) {
                thiz.walk(function(item, node) {
                    thiz.ensureNodeExpanded(node);
                    return true;
                }, null, function () {
                    var rootNodes = thiz.rootChildrenContainer.childNodes;
                    var hasChild = false;
                    for ( var i = 0; i < rootNodes.length; i++) {
                        var node = rootNodes[i].firstChild;
                        if (node && !Dom.hasClass(node, "NoChild")) {
                            hasChild = true;
                            break;
                        }
                    }

                    if (!hasChild) {
                        Dom.addClass(thiz.node(), "Flat");
                    }
                });
            }
            if (thiz.onInitializing) {
                thiz.onInitializing = false;
                if (thiz.options.onInitialized) thiz.options.onInitialized(thiz);
            }
            if (__callback) __callback();
        });
    };
    Tree.prototype.refresh = function(__callback) {
        var checkedItems = this.getCheckedItemsSync();
        var selectedItem = this.getSelectedItem();

        this.container.innerHTML = "";
        this.init(function () {
            this.setSelectedItem(selectedItem);
            this.setCheckedItems(checkedItems);
            if (__callback) __callback();
        }.bind(this));
    };


    Tree.prototype.rebuildItemNodeUI = function(oldItemNode, item) {
        var itemNode = this.buildItemNode(item);
        itemNode._item = item;
        var expanded = Dom.hasClass(oldItemNode, "Expanded");

        oldItemNode.parentNode.replaceChild(itemNode, oldItemNode);
        if (expanded) {
            this.loadChildren(item, getChildrenContainerFromItemNode(itemNode));
            itemNode.childLoaded = true;
            this.ensureNodeExpanded(itemNode);
        }
    };

    /*
    Tree.prototype.sort = function(item) {
        if (item.sort) return;
        if (item.children && item.children.length > 0) {
            item.children.sort(sortNameByAsc);

            for (var i = 0; i < item.children.length; i++) {
                if (item.children[i].children && item.children[i].children.length > 0) {
                    this.sort(item.children[i]);
                }
            }
        }
    };
    */

    Tree.prototype.loadChildren = function(parentItem, childrenContainer, callback) {
        Dom.addClass(childrenContainer, "Loading");
        var thiz = this;

        this.source(parentItem, function(children) {
            childrenContainer.innerHTML = "";
            if (!children) children = [];
            for ( var i = 0; i < children.length; i++) {
                var item = children[i];
                var itemNode = thiz.buildItemNode(item);
                childrenContainer.appendChild(itemNode);
                itemNode._item = item;

                if (i == children.length - 1) {
                    Dom.addClass(itemNode, "LastChild");
                    Dom.addClass(itemNode._titleElement, "LastChildTitle");
                }
            }

            if (children.length == 0) {
                var title = childrenContainer.parentNode.firstChild;
                if (title && Dom.hasClass(title, "Title")) {
                    Dom.addClass(title, "NoChild");
                }
            }

            Dom.removeClass(childrenContainer, "Loading");
            childrenContainer._items = children;

            if (callback) {
                callback(parentItem, childrenContainer, children);
            }
        });
    };

    function appendArray(source, dest) {
        for ( var i = 0; i < source.length; i++)
            dest.push(source[i]);
    }
    Tree.prototype.walk = function(visitor, tryRemaining, doneCallback) {
        var queue = [];
        appendArray(this.rootChildrenContainer.childNodes, queue);

        var thiz = this;
        var next = function() {
            if (queue.length <= 0) {
                if (doneCallback) doneCallback();
                return;
            }
            var node = queue.shift();
            var item = node._item;
            if (!visitor(item, node)) {
                if (tryRemaining) next();
                return;
            }

            var childContainer = getChildrenContainerFromItemNode(node);
            if (node.childLoaded) {
                appendArray(childContainer.childNodes, queue);
                next();
            } else {
                thiz.loadChildren(item, childContainer, function() {
                    node.childLoaded = true;
                    appendArray(childContainer.childNodes, queue);
                    next();
                });
            }
        };

        next();
    };

    Tree.prototype.setNodeAsChecked = function(itemNode, checked) {
        var checkbox = itemNode.childNodes[0].childNodes[1];
        checkbox.checked = checked;
    };
    Tree.prototype.setExpandedClasses = function(itemNode) {
        setExpandedClasses(itemNode, true);
    };
    Tree.prototype.ensureNodeExpanded = function(itemNode) {
        var p = Dom.findUpwardForNodeWithData(itemNode.parentNode, "_item");
        while (p) {
            setExpandedClasses(p, true);
            p = Dom.findUpwardForNodeWithData(p.parentNode, "_item");
        }
    };

    Tree.prototype.setCheckedItems = function(items) {
        var remaining = items.slice(0);
        var thiz = this;

        this.walk(function(item, node) {
            var checkable = !thiz.options.isItemCheckable || thiz.options.isItemCheckable(item);
            var match = null;
            var index = -1;
            if (checkable) {
                for ( var i = 0; i < remaining.length; i++) {
                    if (thiz.same(item, remaining[i])) {
                        match = remaining[i];
                        index = i;
                        break;
                    }
                }
            }

            if (match != null) {
                thiz.setNodeAsChecked(node, true);
                thiz.ensureNodeExpanded(node);

                remaining.splice(index, 1);
            } else {
                thiz.setNodeAsChecked(node, false);
            }

            return true;
            // return remaining.length > 0;
        });
    };

    Tree.prototype.getCheckedItems = function(callback) {
        var checkedItems = [];
        var queue = [];
        appendArray(this.rootChildrenContainer.childNodes, queue);

        var thiz = this;
        var next = function() {
            if (queue.length <= 0) return;
            var node = queue.shift();
            var item = node._item;
            if (node.childNodes[0].childNodes[1].checked) checkedItems.push(item);

            var childContainer = getChildrenContainerFromItemNode(node);
            if (node.childLoaded) {
                appendArray(childContainer.childNodes, queue);
                next();
            }
        };

        next();
        if (callback) callback(checkedItems);
    };
    Tree.prototype.getCheckedItemsFromNodes = function(nodes) {
        var checkedItems = [];
        for ( var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.childNodes[0].childNodes[1].checked) checkedItems.push(node._item);

            var childContainer = getChildrenContainerFromItemNode(node);
            if (node.childLoaded) {
                checkedItems = checkedItems.concat(this.getCheckedItemsFromNodes(childContainer.childNodes));
            }
        }

        return checkedItems;

    };
    Tree.prototype.getCheckedItemsSync = function() {
        return this.getCheckedItemsFromNodes(this.rootChildrenContainer.childNodes);
    };

    Tree.prototype.buildItemNode = function(item) {
        var thiz = this;
        var id = "item" + widget.random();
        var className = "ItemText";
        var badgeValue = "";
        var isDisabled = true;
        if (this.options.badge && item.children.length == 0) {
            var badge = this.options.badge;
            for ( var i = 0; i < badge.length; i++) {
                if (badge[i].areaId == item.id) {
                    badgeValue = " (" + badge[i].number + ")";
                    isDisabled = false;
                    break;
                }
            }

            if (this.options.selectedAreaId && this.options.selectedAreaId == item.id) {
                className += " Selected";
            }

            if (isDisabled) {
                className += " Disabled";
            }
        }

        if (this.options.isItemSelectable && this.options.isItemSelectable(item)) {
            className += " SelectableItem";
        }

        var itemClass = "Item Collapsed";
        var holder = {};

        var itemNode = Dom.newDOMElement({
            _name: "div",
            "class": itemClass,
            _children: [ {
                _name: "hbox",
                "class": "Title CollapsedTitle",
                _id: "titleElement",
                _children: [ {
                    _name: "span",
                    "class": "Chevron",
                    _children: [ {
                        _name: "span",
                        "class": "Down",
                        _text: "remove_circle_outline"
                    }, {
                        _name: "span",
                        "class": "Right",
                        _text: "add_circle_outline"
                    } ]
                }, {
                    _name: "input",
                    "class": "Checkbox",
                    type: this.options.exclusive ? "radio" : "checkbox",
                    name: this.uniqueName,
                    id: id,
                }, {
                    _name: "div",
                    "class": className,
                    _html: "<label for=\"" + id + "\">" + this.renderer(item) + badgeValue + "</label>",
                } ]
            }, {
                _name: "div",
                "class": "Children CollapsedChildren",
                _id: "childContainerElement"
            } ]
        }, document, holder);

        itemNode._titleElement = holder.titleElement;
        itemNode._childContainerElement = holder.childContainerElement;

        var checkbox = itemNode._titleElement.firstChild.nextSibling;
        if (this.options.isItemCheckable) {
            if (!this.options.isItemCheckable(item)) {
                checkbox.setAttribute("disabled", "true");
            }
        }

        if (this.options.isItemInitiallyChecked && this.options.isItemInitiallyChecked(item)) {
            checkbox.setAttribute("checked", "true");
        }

        if (this.options.isForcedChecked && this.options.isForcedChecked(item)) {
            checkbox.setAttribute("checked", "true");
            checkbox.setAttribute("disabled", "true");
            Dom.addClass(checkbox, "ForcedChecked");
        }

        if (this.options.onItemNodeCreated) {
            this.options.onItemNodeCreated(itemNode, item);
        }

        return itemNode;
    };

    Tree.prototype.setOnItemClickListener = function(listener) {
        this.listener = listener;
        return this;
    };

    Tree.prototype.findParentItem = function (contextNode) {
        var thiz = this;
        var node = Dom.findUpward(contextNode, function (n) {
            return n._item || n == thiz.container;
        });

        if (!node || !node._item) return null;

        node = Dom.findUpward(node.parentNode, function (n) {
            return n._item || n == thiz.container;
        });

        if (node && node._item) return node._item;
        return null;
    };

    Tree.prototype.setSelectedItem = function(selectedItem) {
        var list = this.container.getElementsByClassName("ItemText");
        for ( var i = 0; i < list.length; i++) {
            var itemObject = Dom.findUpward(list[i], function(n) {
                return n._item;
            });

            if (itemObject && itemObject._item && this.options.same(itemObject._item, selectedItem)) {

                var itemText = itemObject.getElementsByClassName("ItemText")[0];
                if (itemText) {
                    Dom.addClass(itemText, "Selected");
                }

                if (this.listener) this.listener(itemObject._item);
            } else {
                Dom.removeClass(list[i], "Selected");
            }
        }
        this.emitChangeEvent();
    };

    Tree.prototype.emitChangeEvent = function () {
        Dom.emitEvent("p:SelectionChanged", this.container, {});
    };

    Tree.prototype.getSelectedItem = function() {
        var list = this.container.getElementsByClassName("ItemText");
        for ( var i = 0; i < list.length; i++) {
            var itemObject = Dom.findUpward(list[i], function(n) {
                return n._item;
            });

            if (itemObject && itemObject._item) {
                var itemText = itemObject.getElementsByClassName("ItemText")[0];
                if (itemText && Dom.hasClass(itemText, "Selected")) {
                    return itemObject._item;
                }
            }
        }
        return null;
    };

    Tree.prototype.refreshItemDisplay = function(validate, all) {
        var list = this.container.getElementsByClassName("ItemText");
        for ( var i = 0; i < list.length; i++) {
            var itemObject = Dom.findUpward(list[i], function(n) {
                return n._item;
            });

            if (!itemObject) continue;
            var item = itemObject._item;
            if (!validate(item)) continue;
            var label = Dom.findChild(list[i], {
                eval: function(n) {
                    return Dom.isTag(n, "label");
                }
            });

            if (label) {
                label.innerHTML = this.renderer(item);
            }

            if (!all) break;
        }
    };

    return Tree;
}();
