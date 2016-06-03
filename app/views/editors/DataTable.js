var DataTable = function () {
    Dom.registerEvent(window, "load", function () {
        var f = function (event) {
            var target = Dom.getTarget(event);
            Dom.doOnChildRecursively(target, {
                eval: function (node) {
                    return Dom.hasClass(node, "DataTable") && node._dt && node._dt.invalidateSizing;
                }
            }, function (node) {
                node._dt.invalidateSizing();
            });
        };
        Dom.registerEvent(document.body, "overflow", f, false);
        Dom.registerEvent(document.body, "underflow", f, false);
    });

    function clickHandler(event) {
        var target = Dom.getTarget(event);
        var link = Dom.findUpward(target, new DomTagNameEvaluator("a"));
        if (link) return;
        var selectionPane = Dom.findUpward(target, {
            eval: function (n) {
                var hasClass = Dom.hasClass(n, "ActionInfoPane");
                return hasClass;
            },
        });
        if (selectionPane) return;

        //alert("start checking from: " + event.type);
        var checkbox = Dom.findUpward(target, {
            eval: function (n) {
                var hasClass = Dom.hasClass(n, "DataTableCheck");
                return hasClass;
            },
        });

        var infoSelection = Dom.findUpward(target, {
            eval: function (n) {
                var hasClass = Dom.hasClass(n, "DataTableCheckInfo");
                return hasClass;
            },
        });

        var dataTable = DataTable.findInstance(event);
        if (!dataTable) return;

        if (infoSelection && dataTable.showSelectionInfo) {
            dataTable.setSelectionInfoVisible(true);
            return;
        }

        if (checkbox) {
            checkBoxClickHandler(target, checkbox, event);
            return;
        }

        var th = Dom.findUpward(target, new DomTagNameEvaluator("th"));
        if (th) return;

        var actionNode = Dom.findUpward(target, {
            eval: function (n) {
                return n.getAttribute && n.getAttribute("action-id");
            }
        });



        //check for primary clickable item
        var td = Dom.findUpward(target, new DomTagNameEvaluator("td"), function (node) {
            return node == dataTable.container;
        });
        if (td) {
            var primary = null;
            Dom.doOnChildRecursively(td, {
                eval: function (n) {
                    return n.getAttribute && n.getAttribute("primary") == "true";
                }
            }, function (n) {
                primary = n;
            });

            if (primary && primary.click && primary != target) {
                primary.click();
                return;
            }
        }

        //find data row instance
        var row = Dom.findUpward(target, {
            eval: function (n) {
                return n.getAttribute && n.getAttribute("data-index");
            }
        });

        if (!row) return;

        var index = parseInt(row.getAttribute("data-index"), 10);
        var data = dataTable.items[index];
        if (event.shiftKey) {
            //var json = JSON.stringify(data, null, 2);
            //alert(json);
            console.log("ROW DATA:", data);
        }

        if (actionNode) {
            actionClickHandler(target, actionNode, row, data, dataTable, event);
            return;
        }

        if (dataTable.defaultSelectionHandler) {
            dataTable.defaultSelectionHandler.run(data);
        }
    }
    function actionClickHandler(target, actionNode, row, data, dataTable, event) {
        var id = actionNode.getAttribute("action-id");
        //find action instance
        var action = null;
        for (var i = 0; i < dataTable.actualColumns.length; i ++) {
            var column = dataTable.actualColumns[i];
            if (!column.actions) continue;
            for (var j = 0; j < column.actions.length; j ++) {
                if (column.actions[j].id == id) {
                    action = column.actions[j];
                    break;
                }
            }

            if (action) break;
        }

        if (!action) return;
        if (!row) return;

        //invoke the action
        action.handler(data);
    }

    function checkBoxClickHandler(target, checkbox, event) {
        var dataTable = DataTable.findInstance(event);
        if (!dataTable) return;

        var all = Dom.hasClass(checkbox, "All");

        if (all) {
            if (checkbox.checked) {
                if (dataTable.totalItems > 200) {
                    widget.Dialog.error("Selecting more than 200 items is not supported.");
                    checkbox.checked = false;
                    return;
                }

                if (checkbox.checked) {
                    dataTable.selectAll();
                } else {
                    dataTable.selectNone();
                }
            } else {
                dataTable.selectNone();
            }

            dataTable.fireAllCheckBoxChangedEvent(checkbox.checked);
        } else {
            var allChecked = true;
            Dom.doOnChildRecursively(dataTable.table, {
                eval: function (n) { return Dom.hasClass(n, "DataTableCheck") && Dom.hasClass(n, "Item")}
            }, function (c) {
                if (!c.checked) allChecked = false;
            })

            Dom.doOnChildRecursively(dataTable.table, {
                eval: function (n) { return Dom.hasClass(n, "DataTableCheck") && Dom.hasClass(n, "All")}
            }, function (c) {
                c.checked = allChecked && !dataTable.multiPages;
            })

            dataTable._updateCheckedRowIndicator();

            var index = parseInt(checkbox.getAttribute("data-index"), 10);
            dataTable.fireCheckBoxChangedEvent(index, checkbox.checked);
        }

        dataTable.fireSelectionChangedEvent(true);
    }

    function columnHeaderClickHandler(event) {
        var dataTable = DataTable.findInstance(event);
        if (!dataTable) return;

        var target = Dom.getTarget(event);
        var th = Dom.findUpward(target, {
            eval: function (n) {
                return Dom.hasClass(n, "Sortable") && n.id;
            }
        });

        if (!th) return;
        var id = th.id;
        for (var i = 0; i < dataTable.actualColumns.length; i ++) {
            var column = dataTable.actualColumns[i];
            if (!column.propertyName) continue;

            if (column.columnId == id) {
                console.log("Found colum id ", column, th);
                var asc = Dom.hasClass(th, "AscSort");
                var order = {
                        propertyName: column.propertyName,
                        asc: !asc
                    };
                for (var k = 0; k < dataTable.orderRequestListeners.length; k ++) {
                    dataTable.orderRequestListeners[k].changeOrder(order);
                }
                dataTable.currentOrder = order;
                return;
            }
        }
    }

    function SelectorColumn(exclusive, selectable, checked) {
        this.exclusive = exclusive;
        this.headerClass = "DTCheckbox DTCheckboxAll";
        this.selectable = selectable || function () { return true; };
        this.checked = checked || function () { return false; };
        this.name = "name" + widget.random();
    }

    SelectorColumn.prototype.getCellContentHtml = function (data, row, col) {
        return "<input primary=\"true\" type=\"" + (this.exclusive ? "radio" : "checkbox") + "\"" + (this.selectable(data) ? "" : " disabled=\"true\"") + (this.selectable(data) ? "" : " _isSelectable=\"false\"") + (this.checked(data) ? "" : " checked=\"true\"") + " class=\"DataTableCheck Item\" data-index=\"" + row + "\" name=\"" + this.name + "\" />";
    };
    SelectorColumn.prototype.getTitleInfo = function () {
        return "Select all";
    };
    SelectorColumn.prototype.getTitleContentHtml = function () {
        return this.exclusive ? "" : "<input type=\"checkbox\" class=\"DataTableCheck All\" /><span class=\"DataTableCheckInfo\" title=\"View selection details\"><i class=\"fa fa fa-info\"></i></span>";
    };
    SelectorColumn.prototype.getBodyClass = function () {
        return "DTCheckBoxBody";
    };
    SelectorColumn.prototype.getExtraWrapperClass = function () {
        return "DTCheckBox";
    };

    function ActionColumn(actions) {
        this.actions = actions;
        this.headerClass = "Actions";
        this.title = "Actions";

    }
    ActionColumn.prototype.getTitleContentHtml = function () {
        return this.title;
    };
    ActionColumn.prototype.getCellContentHtml = function (data, row, col) {
        var html = "";
        for (var i = 0; i < this.actions.length; i ++) {
            var action = this.actions[i];
            if (action.isApplicable && !action.isApplicable(data)) continue;
            html += "<span action-id=\"" + action.id + "\" class=\"mi " + action.type + " Action"  + action.id +  " " + (action.isApplicable && action.isApplicable(data) ? "" : "disabled")  + "\" title=\"" + Dom.htmlEncode(action.title) + "\"><i>" + action.icon + "</i></span>"

            // html += "<span action-id=\"" + action.id + "\" class=\"fa " + action.type + " Action"  + action.id +  " " + (action.isApplicable && action.isApplicable(data) ? "" : "disabled")  + "\" title=\"" + Dom.htmlEncode(action.title) + "\"></span>"
        }
        return html;
    };
    ActionColumn.prototype.getBodyClass = function () {
        return "Actions";
    };
    ActionColumn.prototype.getTitleInfo = function () {
        return Messages["actions"];
    };
    ActionColumn.prototype.width = function (w) {
        this.preferredWidth = "" + w;
        return this;
    };

    function DataTable() {
        BaseWidget.call(this);

        this.container = this.node();
        this.columns = [];
        this.actions = [];
        this.withSelector = false;
        this.showSelectionInfo = true;
        this.temp = document.createElement("div");
        this.orderRequestListeners = [];
        this.listeners = [];
        this.multiPages = false;
        this.id = "";
        this.exclusive = false;
        this.hiddenColumnIds = [];
        this.preferredHeight = 400;
        this.defaultColWidth = "1*";
        this.itemsChangedListener = null;
        this.headerHeight = 0;
        this.hiddenHeader = false;

        Dom.registerEvent(this.container, "click", clickHandler, false);

        var ua = navigator.userAgent.toLowerCase();
        if (ua.indexOf("chrome/") >= 0
                || ua.indexOf("safari/") >= 0
                || ua.indexOf("trident") >= 0) {
            //detect container size change
            var thiz = this;
            function detector() {
                try {
                    if (typeof (thiz.lastContainerWidth) != "undefined") {
                        var w = Dom.getOffsetWidth(thiz.container);
                        if (w != thiz.lastContainerWidth) {
                            thiz.invalidateSizing(detector);
                        }
                    }
                } finally {
                    if (!Dom.isElementExistedInDocument(thiz.container)) {
                        return;
                    }
                    window.setTimeout(detector, 500);
                }
            }

            detector();

        }

        var thiz = this;
    }
    __extend(BaseTemplatedWidget, DataTable);

    DataTable.prototype.withOverflowIndicators = function(indicatorContainer) {
        var thiz = this;
        var left = document.createElement("div");
        Dom.addClass(left, "DTOverflowIndicator DTOverflowIndicatorLeft");
        indicatorContainer.appendChild(left);
        this.leftOverflowIndicator = left;

        var right = document.createElement("div");
        Dom.addClass(right, "DTOverflowIndicator DTOverflowIndicatorRight");
        indicatorContainer.appendChild(right);
        this.rightOverflowIndicator = right;

        Dom.registerEvent(this.container, "scroll", function () {
            thiz.invalidateOverflowIndicators();
        }, false);

        return this;
    };
    DataTable.prototype.invalidateSelectionInfo = function(paginator) {
        if (!this._selectionPane || !this._selectionPane._dt) return;
        var thiz = this;
        this._selectionPane._pg = paginator;
        paginator.getSelectedItems(function(items) {
            thiz._selectionPane._dt.setItems(items);
            Dom.toggleClass(thiz.container, "HasSelectionInfo", items && items.length > 0);
        });
    }
    DataTable.prototype.addSelectionInfoPane = function() {
        var thiz = this;
        var infoPane = document.createElement("div");
        Dom.addClass(infoPane, "SelectionInfoPane");

        var ab = new ActionBar();
        var footerPane = ab.node();

        infoPane.appendChild(footerPane);
        Dom.addClass(footerPane, "ActionInfoPane FooterBar");

        ab.register({
            getIcon: function () { return "fa fa-trash" },
            getTitle: function () {
               return Messages["column_selection_removeAll_caption"];
            },
            isApplicable: function () {
                return thiz._selectionPane && thiz._selectionPane._dt && thiz._selectionPane._dt.getItems() && thiz._selectionPane._dt.getItems().length > 0;
            },
            run: function () {
                thiz.reset();
                thiz.fireSelectNoneActionEvent();
                thiz.fireSelectionChangedEvent(true);
                thiz.setSelectionInfoVisible(false);
            }
        });
        ab.register({
            getIcon: function () { return "fa fa-times" },
            getTitle: function () {
               return Messages["close"];
            },
            isApplicable: function () {
                return true;
            },
            run: function () {
                thiz.setSelectionInfoVisible(false);
            }
        });
        var selectionItemDataTable = new DataTable();
        var bodyPane = selectionItemDataTable.node();
        Dom.addClass(bodyPane, "SelectionBodyPane");
        infoPane.appendChild(bodyPane);

        selectionItemDataTable.column(new DataTable.PlainTextColumn("#", function(data, row, col){
            return (row +1);
        }).width("4em"));
        selectionItemDataTable.column(new DataTable.PlainTextColumn("Item", function(data){
            return thiz.sumarizerSelectionItem(data);
        }).width("1*"));
        var removeAction = {
                id: "removeItem", type: "fa fa-trash", title: "Remove",
                isApplicable: function(tag) {
                    return true;
                },
                handler: function (item) {
                    //console.log("Remove ", item);
                    var foundIndex = -1;
                    var cb = function(selectedsInPaginator, thiz) {
                        for (var index = 0; index < selectedsInPaginator.length; index++) {
                            if (thiz.comparer(selectedsInPaginator[index], item)) {
                               foundIndex = index;
                               break;
                            }
                        }
                        if (foundIndex != -1) {
                            selectedsInPaginator.splice(foundIndex, 1);
                        }
                        if (thiz.isSelectAll()) {
                            Dom.removeClass(thiz.container, "SelectAll");
                            Dom.doOnChildRecursively(thiz.table, {
                                eval: function (n) { return Dom.hasClass(n, "DataTableCheck") && Dom.hasClass(n, "All")}
                            }, function (c) {
                                c.checked = false;
                            })
                        }
                        if  (thiz._selectionPane._pg) {
                            thiz._selectionPane._pg.selectedItems = selectedsInPaginator;
                        }
                        thiz.selectItems(selectedsInPaginator, true);
                        thiz._selectionPane._dt.setItems(selectedsInPaginator);
                        thiz.fireSelectionChangedEvent(true);
                        thiz._selectionPane._actionBar.invalidate();

                    };
                    if (thiz._selectionPane._pg) {
                        thiz._selectionPane._pg.getSelectedItems(function(items) {
                            cb(items, thiz);
                        });
                    } else {
                        cb(thiz.getSelectedItems(), thiz);
                    }
                }
        };
        var actions = [];
        actions.push(removeAction);
        selectionItemDataTable.column(new DataTable.ActionColumn(actions).width("6em"));

        //selectionItemDataTable.setup();

        this.container.appendChild(infoPane);
        this._selectionPane = infoPane;
        this._selectionPane._actionBar = ab;
        this._selectionPane._dt = selectionItemDataTable;
        this.setSelectionInfoVisible(false);
        this._selectionPane._dt.setup(function() {

        });

        return this;
    }
    DataTable.prototype.sumarizerSelectionItem = function(data) {
        return Dom.htmlEncode(data);
    }
    DataTable.prototype.setSelectionInfoVisible = function (visible) {
        if (!this._selectionPane) return;
        this._selectionPane.style.display = visible ? "block" : "none";
        if (visible) {
            this._selectionPane._dt.invalidateSizing();
            this._selectionPane._actionBar.invalidate();
        }
    };
    DataTable.prototype.setShowSelectionInfo = function(show) {
        this.showSelectionInfo = show;
    }
    DataTable.prototype.disabledCheckBoxWhenCheckAll = function(disabled) {
        this.disabledWhenCheckAll = disabled;
    }
    DataTable.prototype.invalidateOverflowIndicators = function () {
        if (!this.leftOverflowIndicator) return;

        var overflowLeft = (this.container.scrollLeft != 0);
        var overflowRight = (this.container.offsetWidth + this.container.scrollLeft != this.container.scrollWidth);

        var indicatorContainer = this.leftOverflowIndicator.parentNode;
        if (overflowLeft) {
            Dom.addClass(indicatorContainer, "DTOverflowLeft");
        } else {
            Dom.removeClass(indicatorContainer, "DTOverflowLeft");
        }
        if (overflowRight) {
            Dom.addClass(indicatorContainer, "DTOverflowRight");
        } else {
            Dom.removeClass(indicatorContainer, "DTOverflowRight");
        }
    };
    DataTable.prototype.setHeight = function(height) {
    };

    DataTable.prototype.setMinHeight = function(height) {
    };

    DataTable.prototype.setHiddenHeader = function(isHidden) {
    	this.hiddenHeader = isHidden;
    };
    DataTable.prototype.fireSelectionChangedEvent = function (fromUserAction) {
        for (var i = 0; i < this.listeners.length; i ++) {
            if (this.listeners[i].onSelectionChanged) this.listeners[i].onSelectionChanged(this, fromUserAction);
        }
        if (this._selectionPane && this._selectionPane._dt && !this._selectionPane._pg) {
            this._selectionPane._dt.setItems(this.getSelectedItems());
        }
    };
    DataTable.prototype.fireCheckBoxChangedEvent = function (index, isChecked) {
        for (var i = 0; i < this.listeners.length; i ++) {
            if (this.listeners[i].onCheckBoxChanged) this.listeners[i].onCheckBoxChanged(index, isChecked);
        }
    };
    DataTable.prototype.fireAllCheckBoxChangedEvent = function (isChecked) {
        for (var i = 0; i < this.listeners.length; i ++) {
            if (this.listeners[i].onAllCheckBoxChanged) this.listeners[i].onAllCheckBoxChanged(isChecked);
        }
    };
    DataTable.prototype.fireSelectNoneActionEvent = function () {
        for (var i = 0; i < this.listeners.length; i ++) {
            if (this.listeners[i].onSelectNoneAction) this.listeners[i].onSelectNoneAction();
        }
    };
    DataTable.prototype.selectAll = function () {
        Dom.addClass(this.container, "SelectAll");
        this.selectCurrentPageItems(true);
        this.fireSelectionChangedEvent(true);
    };
    DataTable.prototype.selectCurrentPageItems = function (selected) {
        var all = this.isSelectAll();
        var thiz = this;
        Dom.doOnChildRecursively(this.table, {
            eval: function (n) { return Dom.hasClass(n, "DataTableCheck") && Dom.hasClass(n, "Item")}
        }, function (c) {
            if (c.getAttribute("_isSelectable") == false || c.getAttribute("_isSelectable") == "false") {
                c.disabled = true;
            } else {
                c.checked = selected;
                c.disabled = typeof(thiz.disabledWhenCheckAll) == "undefined" ? all : thiz.disabledWhenCheckAll;
            }

        });

        //this.fireSelectionChangedEvent();
    };

    DataTable.prototype.selectItems = function (items, fromUserActions) {
        var thiz = this;
        var allChecked = true;
        var checkAllElement = null;

        Dom.doOnChildRecursively(this.table, {
            eval: function (n) { return Dom.hasClass(n, "DataTableCheck") && Dom.hasClass(n, "Item")}
        }, function (c) {
            var index = parseInt(c.getAttribute("data-index"), 10);
            var item = thiz.items[index]
            var itemChecked = contains(items, item, thiz.comparer);
            c.checked =  itemChecked;

            if (!itemChecked) {
                allChecked = false;
            }
        });

        Dom.doOnChildRecursively(this.table, {
            eval: function (n) { return Dom.hasClass(n, "DataTableCheck") && Dom.hasClass(n, "All")}
        }, function (c) {
            if (!thiz.items || thiz.items.length == 0) {
                allChecked = false;
                c.disabled = true;
            } else {
                c.disabled = false;
            }

            c.checked = allChecked;
        });

        Dom.doOnChildRecursively(this.table, {
            eval: function (n) { return Dom.hasClass(n, "DataTableCheck") && Dom.hasClass(n, "Item")}
        }, function (c) {
            if (c.getAttribute("_isSelectable") == false || c.getAttribute("_isSelectable") == "false") {
                c.disabled = true;
            } else if (allChecked) {
                c.disabled = true;
            } else {
                c.disabled = false;
            }
        });

        this._updateCheckedRowIndicator();

        this.fireSelectionChangedEvent(fromUserActions);
    };
    DataTable.prototype._updateCheckedRowIndicator = function () {
        Dom.doOnChildRecursively(this.table, {
            eval: function (n) {
                return Dom.hasClass(n, "DataTableCheck") && Dom.hasClass(n, "Item");
            }
        }, function (c) {
            var tr = Dom.findParentByTagName(c, "tr");
            if (tr) {
                Dom.toggleClass(tr, "DTCheckedItemRow",  c.checked);
            }
        })

    };
    DataTable.prototype.highlightItems = function (items, styleClass) {
        var thiz = this;

        Dom.doOnAllChildren(this.body, function (tr) {
            var dataIndex = tr.getAttribute("data-index");
            if (!dataIndex) return;

            var index = parseInt(dataIndex, 10);
            var item = thiz.items[index]
            if (!item) return;

            if (contains(items, item, thiz.comparer)) {
                Dom.addClass(tr, styleClass ? styleClass : "Highlighted");
            } else {
                Dom.removeClass(tr, styleClass ? styleClass : "Highlighted");
            }
        })
    };
    DataTable.prototype.removeHighlightItems = function (items, styleClass) {
        var thiz = this;

        Dom.doOnAllChildren(this.body, function (tr) {
            var dataIndex = tr.getAttribute("data-index");
            if (!dataIndex) return;

            var index = parseInt(dataIndex, 10);
            var item = thiz.items[index]
            if (!item) return;

            if (contains(items, item, thiz.comparer)) {
                Dom.removeClass(tr, styleClass ? styleClass : "Highlighted");
            }
        })
    };
    DataTable.prototype.selectNone = function () {
        Dom.removeClass(this.container, "SelectAll");
        this.selectCurrentPageItems(false);
        this.fireSelectionChangedEvent();
        this.fireSelectNoneActionEvent();
    };
    DataTable.prototype.isSelectAll = function () {
        return Dom.hasClass(this.container, "SelectAll");
    };
    DataTable.prototype.reset = function () {
        this.selectNone();
        Dom.doOnChildRecursively(this.table, {
            eval: function (n) { return Dom.hasClass(n, "DataTableCheck") && Dom.hasClass(n, "All")}
        }, function (c) {
            c.checked = false;
        })
    };

    DataTable.prototype.getSelectionCount = function () {
        if (this.isSelectAll()) return this.totalItems;
        return this.getSelectedItems().length;
    };

    DataTable.prototype.column = function (c) {
        this.columns.push(c);
        return this;
    };
    DataTable.prototype.withItemComparer = function (comparer) {
        this.comparer = comparer;
        return this;
    };
    DataTable.prototype.action = function (a, asSelectionHander) {
        this.actions.push(a);
        if (asSelectionHander) {
            this.setDefaultSelectionHandler(handler);
        }
        return this;
    };
    DataTable.prototype.selector = function (s, ex) {
        this.withSelector = s;
        this.exclusive = ex || false;
        return this;
    };
    DataTable.prototype.setDefaultSelectionHandler = function (handler) {
        this.defaultSelectionHandler = handler;
        Dom.addClass(this.table, "WithSelectionHandler");
    };

    DataTable.prototype.withColumnBuilder = function (builder) {
        this.columnBuilder = builder;
        return this;
    };
    DataTable.prototype.createColumnDefinitions = function () {
        this.actualColumns = [];

        //add a selector column if required
        if (this.withSelector) {
            var selectorColumn = new SelectorColumn(this.exclusive, this.selectable, this.checked);
            selectorColumn.sizingPolicy = this.selectorColumnWidth || "45px";
            this.actualColumns.push(selectorColumn);
        }

        if (this.columnBuilder) {
            this.columns = this.columnBuilder.build();
        }

        for (var i = 0; i < this.columns.length; i ++) {
            var column = this.columns[i];
            column.sizingPolicy = column.preferredWidth || this.defaultColWidth || "1*";
            this.actualColumns.push(column);
        }

        //add an action column at the end, if requested
        if (this.actions && this.actions.length > 0) {
            var actionColum = new ActionColumn(this.actions);
            actionColum.sizingPolicy = actionColum.preferredWidth || this.defaultColWidth || "1*";
            this.actualColumns.push(actionColum);
        }
    };
    DataTable.prototype.setup = function (callback) {
        this.actualColumns = [];

        this.createColumnDefinitions();

        if (this.isConfigurable && !this.columnBuilder) {
            var thiz = this;
            $userService.getConfigParam("nv.amw", "hidden_columns_" + this.systemId, function (param) {
                if (param && param.smallValue) {
                    thiz.hiddenColumnIds = (param.smallValue == "-" ? "" : param.smallValue).split(",");
                } else {
                    //construct default hidden columns
                    thiz.hiddenColumnIds = [];
                    for (var i = 0; i < thiz.columns.length; i ++) {
                        var c = thiz.columns[i];
                        if (c.defaultHidden) thiz.hiddenColumnIds.push(c.id);
                    }
                }
                thiz._init();
                if (callback) callback();
            });
        } else {
            this._init();
            if (callback) callback();
        }

        return this;
    };

    DataTable.prototype.systemId = function (id) {
        this.systemId = id;
        return this;
    };
    DataTable.prototype.configurable = function () {
        this.isConfigurable = true;
        return this;
    };
    DataTable.prototype.invalidateSizing = function() {
    	var thiz = this;
    	if (!Dom.isElementExistedInDocument(this.container)) {
    	    return;
    	}
        var selected = this.getSelectedItems();
    	this.setup(function () {
    		thiz._setItems(thiz.getItems(), false);
    		thiz.selectItems(selected);
    	});
    }
    DataTable.prototype.supportZebraColor = function() {
        return true;
    }
    DataTable.prototype._init = function() {
        var random = widget.random();
        this.tableId = "table" + random;
        this.headerId = "header" + random;
        this.bodyId = "body" + random;
        this.lastContainerWidth = Dom.getOffsetWidth(this.container);
        var totalWidth = this.lastContainerWidth - 1;
        var remainingWidth = totalWidth;

        this.createColumnDefinitions();

        var html =
                "<table style=\"width: #@@TABLE_WIDTH@@#px;\" id=\"" + this.tableId + "\" class=\"table DataTable"
                + (this.supportZebraColor() ? " table-striped": "") + " table-bordered\">\n" +
                "    <thead class=\"" + (this.hiddenHeader ? "Hidden" : "") + "\">\n" +
                "        <tr id=\"" + this.headerId + "\">\n";

        var totalWeight = 0;
        //console.log("Actual cols size ", this.actualColumns.length);
        for (var i = 0; i < this.actualColumns.length; i ++) {

        	if (!this.isColumnVisible(this.actualColumns[i])) continue;

        	var col = this.actualColumns[i];
            var wText = col.sizingPolicy;
            var w = 0;
            if (wText.endsWith("px")) {
            	w = parseInt(wText.substring(0, wText.length-2));
            	col._width = w;
            	remainingWidth -= w;
            } else if (wText.endsWith("em")) {
    			var v = wText.substring(0, wText.length-2);
    			w = v * Util.em();
    			col._width = w;
            	remainingWidth -= w;
    		} else if (wText.endsWith("*")) {
                w = parseInt(wText.substring(0, wText.length - 1));
                totalWeight += w;
            } else {
            	w = parseInt(wText);
            	col._width = w;
            	remainingWidth -= w;
            }
        }

        var MIN_FLEX_WIDTH = this.minColWidth();
        var totalDisplayWidth = totalWidth - remainingWidth;
        if (remainingWidth < 0) remainingWidth = 0;

        for (var i = 0; i < this.actualColumns.length; i ++) {
        	if (!this.isColumnVisible(this.actualColumns[i])) continue;
        	var col = this.actualColumns[i];
            var wText = col.sizingPolicy;
            if (wText.endsWith("*")) {
                w = parseInt(wText.substring(0, wText.length - 1));
                var width = Math.floor((remainingWidth * w) / totalWeight);
                width = Math.max(width, MIN_FLEX_WIDTH * w);

                col._width = width;
                totalDisplayWidth += width;
            }
        }

        var realTableWidth = Math.max(totalWidth, totalDisplayWidth);
        html = html.replace("#@@TABLE_WIDTH@@#", "" + realTableWidth);

        var t = 0;
        for (var i = 0; i < this.actualColumns.length; i ++) {
            if (!this.isColumnVisible(this.actualColumns[i])) continue;
            t += col._width;
            var id = "col" + random + "_" + i;
            var col = this.actualColumns[i];
            col.columnId = id;
            var clazz = "";
            if (col.headerClass) {
                clazz += col.headerClass;
            }

            if (col.propertyName) {
                clazz += " Sortable";
            }
            var extra = "";
            if (col.getExtraWrapperClass) {
                extra = " class=\"" + col.getExtraWrapperClass() + "\"";
            }

            var style = "";
            style += "width: " + col._width + "px; height: 25px; overflow: hidden;";
            var margin = 1;
            html +=
                "<th title=\"" + Dom.htmlEncode(col.getTitleInfo()) + "\" width=\"" + col._width + "\" id=\"" + id + "\" class=\"" + clazz + "\" style=\"" + style +"\"><div" + extra + " style=\"width: " + (col._width - margin) + "px;\">" + col.getTitleContentHtml() + "</div></th>";
        }

        html += "        </tr>\n" +
                "    </thead>\n" +
                "    <tbody id=\"" + this.bodyId + "\">\n" +
                "    </tbody>\n" +
                "</table>";

        this.container.innerHTML = html;

        this.table = document.getElementById(this.tableId);
        this.header = document.getElementById(this.headerId);
        this.headerHeight = Dom.getOffsetHeight(this.header);
        this.body = document.getElementById(this.bodyId);

        if (this.defaultSelectionHandler) {
            Dom.addClass(this.table, "WithSelectionHandler");
        }

        this.table._dt = this;

        this.overlay = document.createElement("div");
        Dom.addClass(this.overlay, "BusyOverlay");
        this.container.appendChild(this.overlay);

        Dom.addClass(this.container, "DataTableContainer");

        var thiz = this;
        if (this.isConfigurable) {
            if (this.columnSettingButton) {
                try {
                    this.columnSettingButton.parentNode.removeChild(this.columnSettingButton);
                } catch (e) {}
            }
            this.columnSettingButton = document.createElement("div");
            if (this.columnSettingButtonContainer) {
                this.columnSettingButtonContainer.appendChild(this.columnSettingButton);
                Dom.addClass(this.columnSettingButtonContainer, "DataTableColumSettingContainer");
            } else {
                this.container.appendChild(this.columnSettingButton);
                Dom.addClass(this.container, "DataTableColumSettingContainer");
            }
            Dom.addClass(this.columnSettingButton, "ColumnSetting");
            this.columnSettingButton.innerHTML = "<span><i class=\"fa fa-cog\"></i></span>";
            this.columnSettingButton.setAttribute("title", Messages["change_column_settings_title"]);
            Dom.registerEvent(this.columnSettingButton, "click", function () {
                if (thiz.columnBuilder) {
                    thiz.columnBuilder.setup(function () {
                        thiz._init();
                        if (thiz.items) thiz.setItems(thiz.items);
                    });
                } else {
                    //console.log("Show col setting..");
                    thiz.showColumnSettingDialog();
                }
            }, false);
        }
        if (this.withSelector) {
            this.addSelectionInfoPane();
        }
        if (this.currentOrder) {
           this.setOrder(this.currentOrder);
        }
        Dom.registerEvent(this.header, "click", columnHeaderClickHandler, false);

    };
    DataTable.prototype.isColumnVisible = function (column) {
        if (this.columnBuilder) return true;
        if (!this.hiddenColumnIds) return true;
        for (var i = 0; i < this.hiddenColumnIds.length; i ++) {
            if (this.hiddenColumnIds[i] == column.id) return false;
        }

        return true;
    };
    DataTable.prototype.defaultColWidth = function(w) {
    	this.defaultColWidth = w;
    	return this;
    }
    DataTable.prototype.minColWidth = function() {
      return 50;
    };
    DataTable.prototype.setHiddenColumnIds = function (ids) {
        var paramValue = "";
        for (var i = 0; i < ids.length; i ++) {
            if (paramValue) paramValue += ",";
            paramValue += ids[i];
        }
        this.hiddenColumnIds = ids;
        if (!paramValue) paramValue = "-";
        var thiz = this;
        $userService.updateConfigParam("nv.amw", "hidden_columns_" + this.systemId, paramValue, function () {
            thiz._init();
            if (thiz.items) thiz.setItems(thiz.items);
        }, null, widget.LOADING);
    };
    DataTable.prototype.showColumnSettingDialog = function () {
        var thiz = this;
        var builder = {
            title: "Column Settings",
            size: "mini",
            buildContent: function (container) {
                container.innerHTML = "<strong>Visible columns:</strong>";
                var div = document.createElement("div");
                Dom.addClass(div, "ColumnSelectorContainer");
                container.appendChild(div);
                this.checkboxContainer = div;
                for (var i = 0; i < thiz.columns.length; i ++) {
                    var id = "c" + widget.random();
                    var row = Dom.newDOMElement({
                        _name: "div",
                        _children: [{
                            _name: "input",
                            "type": "checkbox",
                            id: id
                        }, {
                            _name: "label",
                            "for": id,
                            _html: thiz.columns[i].getTitleContentHtml()
                        }]
                    }, document);
                    div.appendChild(row);
                    row.firstChild.checked = thiz.isColumnVisible(thiz.columns[i]);
                    row._column = thiz.columns[i];
                }
            },
            actions: [
                {
                    title: Messages["save"],
                    primary: true,
                    run: function () {
                        var hiddenIds = [];
                        for (var i = 0; i < this.checkboxContainer.childNodes.length; i ++) {
                            var row = this.checkboxContainer.childNodes[i];
                            if (!row.firstChild.checked) {
                                hiddenIds.push(row._column.id);
                            }
                        }

                        if (hiddenIds.length == thiz.columns.length) {
                            widget.Dialog.error(Messages["please_select_at_least_one_visible_column_msg"]);
                            return false;
                        }

                        thiz.setHiddenColumnIds(hiddenIds);
                        return true;
                    }
                },
                {
                    title: Messages["cancel"],
                    isCloseHandler: true,
                    run: function () {
                        return true;
                    }
                }
            ]
        };
        new BuilderBasedDialog(builder).open();
    };

    DataTable.prototype.getCalculatedHeight = function () {
    	var headerHeight = this.table.getElementsByTagName("th")[0].offsetHeight;
        var bodyHeight = this.table.offsetHeight - headerHeight;
        var rowHeight = bodyHeight / (this.items ? this.items.length : 1);


        var dialog = Dom.findParentWithClass(this.table, "DialogContainer");
        if (dialog) {
            //find scrollable container
            var container = Dom.findParentWithClass(this.table, "MainContainer");
            var expectedBodyHeight = container.offsetHeight - headerHeight;
            return Math.floor(expectedBodyHeight);
        } else {
            var outerContainer = widget.get("outerContainer");
            var contentHeight = outerContainer ? outerContainer.offsetHeight : document.body.offsetHeight;
            //console.log([contentHeight, this.table.offsetHeight, window.innerHeight]);
            var d = contentHeight - this.table.offsetHeight;
            var expectedBodyHeight = window.innerHeight - d - headerHeight;
            var n = Math.floor(expectedBodyHeight);
            var h = window.innerHeight - this.getHeightElement(this.table).y - 30;
            return h;
        }
    };

    DataTable.prototype.getHeightElement = function(element) {
		var xPosition = 0;
		var yPosition = 0;
		while (element) {
			xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
			yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
			element = element.offsetParent;
		}
		return {
			x : xPosition,
			y : yPosition
		};
	};

	DataTable.prototype.getDefaultRowHeight = function() {
		var headerHeight = this.table.getElementsByTagName("th")[0].offsetHeight;
        var bodyHeight = this.table.offsetHeight - headerHeight;
		var rowHeight = 0;
		if (this.items.length == 0) {
        	rowHeight = 1.5 * Util.em();
        } else {
        	rowHeight = bodyHeight / this.items.length;
        }

		return rowHeight;
	};
    DataTable.prototype.getPreferredPageSize = function (busy) {
        this.table.style.height = "auto";
        var headerHeight = Dom.getOffsetHeight(this.table.getElementsByTagName("th")[0]);
        var bodyHeight = Dom.getOffsetHeight(this.table) - headerHeight;
        var rowHeight = bodyHeight / (this.items ? this.items.length : 1);

        var maxBodyHeight = Dom.getOffsetHeight(this.container) - Dom.calculateSystemScrollbarSize().h - headerHeight;
        var rows = Math.floor(maxBodyHeight / rowHeight);
        if (rows <= 0) rows = 1;
        this.lastCalculatedPageSize = rows;
        return rows;
    };

    DataTable.prototype.getItemHeight = function () {
        var rowHeight = this.getDefaultRowHeight();
        return rowHeight;
    };

    DataTable.prototype.showBusy = function (busy) {
        if (busy) {
            //Dom.addClass(this.container, "Busy");
            //Dom.addClass(this.container, "DataTableContainerBusy");
            defaultIndicator.busy(widget.LOADING);
        } else {
            //Dom.removeClass(this.container, "Busy");
            //Dom.removeClass(this.container, "DataTableContainerBusy");
            defaultIndicator.done();
        }
    };

    DataTable.prototype.getItems = function() {
    	return this.items;
    };

    DataTable.prototype.addItems = function(items) {
    	var html = "";
        for (var i = 0; i < items.length; i ++) {
            var item = items[i];
            html += "<tr data-index=\"" + i + "\">";
            for (var j = 0; j < this.actualColumns.length; j ++) {
                if (!this.isColumnVisible(this.actualColumns[j])) continue;
                var column = this.actualColumns[j];
                html += "<td data-title=\"" + Dom.htmlEncode(column.title) + "\"";
                if (column.getBodyClass) {
                    var c = column.getBodyClass(item, i, j);
                    if (c) {
                        html += " class=\"" + c + "\"";
                    }
                }
                if (column._width) {
                    html += " style=\"width: " + column._width + ";\"";
                }
                html += ">";
                var cellHtml = column.getCellContentHtml(item, i, j);
                if (column.getContentTitle) {
                	 var text = column.getContentTitle(item, i, j);
                	 if (text && text.length > 0) {
                		 html += " title=\"" + text  +"\"";
                	 }
                }
                html += "</td>"
            }

            html += "</tr>";
            this.items.push(items[i]);
        }

        if (navigator.userAgent.match(/MSIE/i)) {
            this.temp.innerHTML = "<table><tbody>" + html + "</tbody></table>";
            var newBody = this.temp.firstChild.firstChild;
            newBody.parentNode.removeChild(newBody);
            this.table.replaceChild(newBody, this.body);
            this.body.innerHTML += newBody;
        } else {
            this.body.innerHTML += html;
        }


        this.fireSelectionChangedEvent(false);
    }
    DataTable.prototype.getClassOfRow = function(item) {
        return "";
    }

    DataTable.prototype.markedAsPaginated = function (paginated) {
        this.paginated = paginated;
        if (paginated) {
            Dom.addClass(this.container, "DataTableContainerPaginated");
        } else {
            Dom.removeClass(this.container, "DataTableContainerPaginated");
        }
    };
    DataTable.prototype._setItems = function(items, notify) {
    	var html = "";
        this.items = items || [];
        for (var i = 0; i < this.items.length; i ++) {
            var item = this.items[i];
            var classOfRow = this.getClassOfRow(item);
            html += "<tr data-index=\"" + i + "\" class=\"" + (i == 0 ? "FirstRow" : (i == this.items.length - 1 ? "LastRow" : "TableRow")) + (classOfRow.length > 0 ? (" " + classOfRow) : "") + "\">";
            for (var j = 0; j < this.actualColumns.length; j ++) {
                if (!this.isColumnVisible(this.actualColumns[j])) continue;
                var column = this.actualColumns[j];
                html += "<td data-title=\"" + Dom.htmlEncode(column.title) + "\"";
                if (column.getBodyClass) {
                    var c = column.getBodyClass(item, i, j);
                    if (c) {
                        html += " class=\"" + c + "\"";
                    }
                }
                if (column._width) {
                    html += " style=\"width: " + (column._width - 1) + "px;\"";
                }
                var cellHtml = column.getCellContentHtml(item, i, j);
                if (column.getContentTitle) {
                	 var text = column.getContentTitle(item, i, j);
                	 if (text && text.length > 0) {
                		 html += " title=\"" + text  +"\"";
                	 }
                }

                html += "><div class=\"CellContentWrapper\" style=\"width: " + (column._width - 1) + "px;\">";
                html += cellHtml;
                html += "</div></td>"
            }

            html += "</tr>";
        }

        if (navigator.userAgent.match(/MSIE/i)) {
            this.temp.innerHTML = "<table><tbody>" + html + "</tbody></table>";
            var newBody = this.temp.firstChild.firstChild;
            newBody.parentNode.removeChild(newBody);
            this.table.replaceChild(newBody, this.body);
            this.body = newBody;
        } else {
            this.body.innerHTML = html;
        }

        this.selectCurrentPageItems(this.isSelectAll());

        if (this.leftOverflowIndicator) {
            this.leftOverflowIndicator.style.height = this.table.offsetHeight + "px";
        }
        if (this.rightOverflowIndicator) {
            this.rightOverflowIndicator.style.height = this.table.offsetHeight + "px";
        }

        this.table.style.height = "auto";
        this.invalidateOverflowIndicators();
        if (this.lastCalculatedPageSize && this.items.length == this.lastCalculatedPageSize) {
            var padding = 0;
            if (Dom.getOffsetWidth(this.table) > Dom.getOffsetWidth(this.container)) {
                padding = Dom.calculateSystemScrollbarSize().h;
            }
            this.table.style.height = (Dom.getOffsetHeight(this.container) - padding) + "px";
        } else {
            this.table.style.height = "auto";
        }
        this.invalidateOverflowIndicators();

        this.fireSelectionChangedEvent(false);

        if (this.onItemsChanged && notify) {
        	this.onItemsChanged(this.items);
        }
    }
    DataTable.prototype.setItems = function (items, dontNotify) {
        this._setItems(items, dontNotify ? false : true);
    };
    DataTable.prototype.onItemsChanged = function(items) {
    	if (this.itemsChangedListener) {
    		this.itemsChangedListener(items);
    		//console.log("Notify", items);
    	}
    }
    DataTable.prototype.setItemsChangedListener = function(listener) {
    	this.itemsChangedListener = listener;
    	return this;
    }
    DataTable.prototype.getSelectedItems = function () {
        var selectedItems = [];
        var thiz = this;
        Dom.doOnChildRecursively(this.table, {
            eval: function (n) {
                return Dom.hasClass(n, "DataTableCheck") && Dom.hasClass(n, "Item") && n.checked;
            }
        }, function (c) {
            var index = parseInt(c.getAttribute("data-index"), 10);
            selectedItems.push(thiz.items[index]);
        })

        return selectedItems;
    }

    ///// IOrderDisplay interface
    DataTable.prototype.setOrder = function (order) {
        for (var i = 0; i < this.actualColumns.length; i ++) {
            var column = this.actualColumns[i];
            var th = document.getElementById(column.columnId);
            if (!th) continue;
            Dom.removeClass(th, "DescSort");
            Dom.removeClass(th, "AscSort");
            Dom.removeClass(th, "BothSort");

            if (order && order.propertyName == column.propertyName) {
                Dom.addClass(th, order.asc ? "AscSort" : "DescSort");
            }
        }
        this.currentOrder = order;
    };
    DataTable.prototype.getOrder = function () {
        return this.currentOrder;
    };

    DataTable.prototype.addOrderRequestListener = function (listener) {
        this.orderRequestListeners.push(listener);
    };
    DataTable.prototype.addListener = function (listener) {
        this.listeners.push(listener);
    };

    DataTable.findInstance = function (event) {
        var target = Dom.getTarget(event);
        return DataTable.findInstanceFromNode(target);
    }
    DataTable.findInstanceFromNode = function (target) {
        var table = Dom.findUpward(target, {
            eval: function (n) {
                return n._dt;
            }
        });

        if (!table) return null;

        return table._dt;
    };
    DataTable.getRowData = function (node) {
        var dataTable = DataTable.findInstanceFromNode(node);
        if (!dataTable) return null;

        var row = Dom.findUpward(node, {
            eval: function (n) {
                return n.getAttribute && n.getAttribute("data-index");
            }
        });

        if (!row) return null;

        var index = parseInt(row.getAttribute("data-index"), 10);
        var data = dataTable.items[index];

        return data;
    }


    DataTable.SelectorColumn = SelectorColumn;
    DataTable.ActionColumn = ActionColumn;

    function BaseColumn() {
    }
    BaseColumn.prototype.sortable = function (propertyName) {
        this.propertyName = propertyName;
        return this;
    };
    BaseColumn.prototype.hiddenByDefault = function () {
        this.defaultHidden = true;
        return this;
    };
    BaseColumn.prototype.getContentTitle = function (data, row, col) {
        return "";
    };
    BaseColumn.prototype.width = function (w) {
        this.preferredWidth = "" + w;
        return this;
    };
    BaseColumn.prototype.setSizing = function (sizing) {
        this.sizingPolicy = sizing;
        return this;
    };
    BaseColumn.prototype.generateId = function (text) {
        this.id = text.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    };
    BaseColumn.prototype.getTitleInfo = function () {
        return this.title ? this.title : "";
    };
    DataTable.BaseColumn = BaseColumn;

    DataTable.PlainTextColumn = function (title, getter, clazz) {
        this.title = title;
        this.headerClass = clazz;
        this.getter = getter;
        this.generateId(title);
    };
    DataTable.PlainTextColumn.prototype = new BaseColumn();
    DataTable.PlainTextColumn.prototype.getTitleContentHtml = function () {
        return !this.useHtmlTitle() ? Dom.htmlEncode(this.title) : this.title;
    };
    DataTable.PlainTextColumn.prototype.useHtmlTitle = function() {
        return false;
    }
    DataTable.PlainTextColumn.prototype.getContentTitle = function (data, row, col) {
        return Dom.attrEncode(this.getter(data, row, col));
    };
    DataTable.PlainTextColumn.prototype.getCellContentHtml = function (data, row, col) {
        return Dom.htmlEncode(this.getter(data, row, col));
    };

    DataTable.GenericColumn = function (title, renderer, clazz) {
        this.title = title;
        this.headerClass = clazz;
        this.renderer = renderer;
        this.generateId(title);
    };
    DataTable.GenericColumn.prototype = new BaseColumn();
    DataTable.GenericColumn.prototype.useHtmlTitle = function() {
        return false;
    }
    DataTable.GenericColumn.prototype.getTitleContentHtml = function () {
        return !this.useHtmlTitle() ? Dom.htmlEncode(this.title) : this.title;
    };
    DataTable.GenericColumn.prototype.getTitleContent = function (data, row, col) {
        return Dom.htmlEncode(this.renderer(data, row, col));
    };
    DataTable.GenericColumn.prototype.getCellContentHtml = function (data, row, col) {
        return this.renderer(data, row, col);
    };

    DataTable.LinkColumn = function (title, linkContentBuilder, linkHrefBuider, clazz) {
        this.title = title;
        this.headerClass = clazz;
        this.linkContentBuilder = linkContentBuilder;
        this.linkHrefBuider = linkHrefBuider;
        this.generateId(title);
    };
    DataTable.LinkColumn.prototype = new BaseColumn();
    DataTable.LinkColumn.prototype.getTitleContentHtml = function () {
        return Dom.htmlEncode(this.title);
    };
    DataTable.LinkColumn.prototype.getCellContentHtml = function (data, row, col) {
        var href = this.linkHrefBuider(data, row, col);
        var content = Dom.htmlEncode(this.linkContentBuilder(data, row, col));
        return "<a href=\"" + href + "\" target=\"_blank\">" + content + "</a>";
    };
    DataTable.LinkColumn.prototype.getContentTitle = function (data, row, col) {
	   var content = Dom.htmlEncode(this.linkContentBuilder(data, row, col));
	   return content;
    };
    DataTable.NVLinkColumn = function (title, fieldName, clazz) {
        this.title = title;
        this.headerClass = clazz;
        this.fieldName = fieldName;
        this.sortable(fieldName);
        this.generateId(fieldName);
    };
    DataTable.NVLinkColumn.prototype = new BaseColumn();
    DataTable.NVLinkColumn.prototype.getTitleContentHtml = function () {
        return Dom.htmlEncode(this.title);
    };
    DataTable.NVLinkColumn.prototype.getCellContentHtml = function (data, row, col) {
        var link = getLinkFromProperty(this.fieldName, data);
        if (!link) return "";
        var content = Dom.htmlEncode(link.text);
        return "<a href=\"" + link.href + "\" target=\"_blank\">" + content + "</a>";
    };
    DataTable.NVLinkColumn.prototype.getContentTitle = function (data, row, col) {
        var link = getLinkFromProperty(this.fieldName, data);
        if (!link) return "";
        var content = Dom.htmlEncode(link.text);
        return content;
    };

    DataTable.Action = function (title, type, handler) {
        this.title = title;
        this.type = type;
        this.handler = handler;
        this.id = widget.random();
    };



    return DataTable;
}();
