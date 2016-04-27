widget.ComboManager = function() {
    function itemSelectedHandler(event) {
        var combo = ComboManager.findInstance(event);
        if (!combo) return;

        var target = Dom.getTarget(event);
        var itemNode = Dom.findUpward(target, {
            eval: function(n) {
                return n.getAttribute && n.getAttribute("role") == "presentation";
            }
        });

        if (!itemNode) return;
        Dom.cancelEvent(event);
        var index = parseInt(itemNode.getAttribute("item-index"), 10);
        combo.selectItem(combo.items[index]);
        
        if (combo.options && combo.options.onItemSelected) {
        	combo.options.onItemSelected(true);
        }
    };

    function ComboManager(container, options) {
        this.container = widget.get(container);
        this.options = options ? options : null;
        
        var comparerImpl = this.options ? options.comparer : null;
        if (!comparerImpl) {
            comparerImpl = function (a, b) {
	        	return a == b;
	        };
        }
        
        this.comparer = function (a, b) {
            if (!a) {
                return !b;
            } else {
                if (!b) return false;
                return comparerImpl(a, b);
            }
        };
        Dom.registerEvent(this.container, "click", itemSelectedHandler, false);
    }

    ComboManager.findInstance = function(event) {
        var target = Dom.getTarget(event);
        var node = Dom.findUpward(target, {
            eval: function(n) {
                return n._combo;
            }
        });

        if (!node) return null;

        return node._combo;
    };
    
    ComboManager.prototype.fireSelectionEvent = function (fromUserAction) {
        if (this.options && this.options.onItemSelected) {
            this.options.onItemSelected(fromUserAction ? true : false);
        }
    };
    
    ComboManager.prototype.setEnable = function (enable) {
        var button = Dom.findDescendantWithClass(this.dropdown, "dropdown-toggle");
        button.disabled = !enable;
    };

    ComboManager.prototype.setItems = function (items) {
        var id = widget.random();
        this.container.innerHTML = "";
        this.items = items ? items.slice(0) : [];
        if (this.options && this.options.withExtraNull) {
            this.items.unshift(null);
        }
        
        
        var html = "<div class=\"dropdown\" id=\"" + id
                + "\"><button class=\"btn btn-default dropdown-toggle\" data-toggle=\"dropdown\" type=\"button\">"
                + "<span class=\"combo-display\"></span>&#160;&#160;&#160;" + "<span class=\"caret\"></span></button>"
        html += "<ul class=\"dropdown-menu dropdown-list\">";

        for (var index = 0; index < this.items.length; index++) {
            var item = this.items[index];
            var value = this.getItemDisplayText(item);
            var valueHtml = (this.options && this.options.useHtml) ? value : Dom.htmlEncode(value);

            html += "<li role=\"presentation\" item-index=\"" + index + "\"><a role=\"menuitem\" tabindex=\"-1\" href=\"#\">"
                    + valueHtml + "</a></li>";
        }

        html += "</ul></div>"

        this.container.innerHTML = html;
        this.dropdown = this.container.firstChild;
        this.dropdown._combo = this;
        
        var thiz = this;
        
        $(this.dropdown).on("shown.bs.dropdown", function () {
            var list = Dom.findDescendantWithClass(thiz.dropdown, "dropdown-list");
            var button = Dom.findDescendantWithClass(thiz.dropdown, "dropdown-toggle");
            if (!list) return;
            list.style.position = "fixed";
            list.style.zIndex = "999999999";
            var y = Dom.getOffsetTop(button) + Dom.getOffsetHeight(button) + 1;
            list.style.top = y + "px";
            list.style.left = Dom.getOffsetLeft(button) + "px";
            
            var h = Dom.getOffsetHeight(list);
            var H = Dom.getWindowHeight();
            
            list.style.position = "absolute";
            
            if (thiz.options.forceWidth) {
               list.style.width = thiz.options.forceWidth;
            }
            
            if (thiz.options.forceAbove) {
                list.style.top = (0 - h - 5) + "px";
                list.style.left = "0px";
            } else {
                list.style.top = Dom.getOffsetHeight(button) + "px";
                list.style.left = "0px";
                
                if (y + h > H) {
                    h = H - y - 5;
                    list.style.height = h + "px";
                }
            }
           
            var li = Dom.findDescendantWithClass(list, "Selected");
            if (li) {
               li.focus(); 
               var sp = (Dom.getOffsetHeight(list) - Dom.getOffsetHeight(li))/2;
               list.scrollTop = (li.offsetTop - sp);
            }
        });

        if (this.items.length > 0) this.selectItem(this.items[0]);
    };

    ComboManager.prototype.getItemDisplayText = function (item) {
        if (this.options && this.options.format) return this.options.format(item);
        return item.getDisplayValue ? item.getDisplayValue() : ("" + item);
    };
    ComboManager.prototype.getCurrentItemDisplayText = function (item) {
        if (this.options && this.options.formatCurrent) return this.options.formatCurrent(item);
        return this.getItemDisplayText(item);
    };
    ComboManager.prototype.selectItemIfContains = function (selectedItem) {
        var item = null;
        var found = false;
        for (var i = 0; i < this.items.length; i ++) {
            if (this.comparer(selectedItem, this.items[i])) {
                item = this.items[i];
                found = true;
                break;
            }
        }
        
        if (found) {
            this.selectItem(item);
            return true;
        }
        
        return false;
    };
    ComboManager.prototype.selectItemByProperty = function (propertyName, propertyValue) {
        var item = null;
        var found = false;
        for (var i = 0; i < this.items.length; i ++) {
            if (this.items[i] && this.items[i][propertyName] == propertyValue) {
                item = this.items[i];
                found = true;
                break;
            }
        }
        
        if (found) {
            this.selectItem(item);
            return true;
        }
        
        return false;
    };
    
    ComboManager.prototype.selectItemByValue = function (value) {
        var item = null;
        var found = false;
        for (var i = 0; i < this.items.length; i ++) {
            for (var property in this.items[i]) {
                if (this.items[i][property] === value) {
                    found = true;
                    item = this.items[i];
                }
            }
        }
        
        if (found) {
            this.selectItem(item);
            return true;
        }
        
        return false;
    };
    
    ComboManager.prototype.selectItem = function (selectedItem) {
        var thiz = this;
        Dom.doOnChildRecursively(this.dropdown, {
            eval: function(n) {
                return Dom.hasClass(n, "combo-display");
            }
        }, function(c) {
            var value = thiz.getCurrentItemDisplayText(selectedItem);
            var html = (thiz.options && thiz.options.useHtml) ? value : Dom.htmlEncode(value);
            c.innerHTML = html;
        });
        
        this.selectedItem = selectedItem;
        if (this.options.markSelectedItem || true) {
            var index = -1;
            for (var i = 0; i < this.items.length; i++) {
                if (this.comparer(selectedItem, this.items[i])) {
                    index = i;
                    break;
                }
            }
            
            Dom.doOnChildRecursively(this.dropdown, {
                eval: function(n) {
                    return n.getAttribute && n.getAttribute("role") == "presentation";
                }
            }, function(c) {
                var itemIndex = parseInt(c.getAttribute("item-index"), 10);
                if (itemIndex == index) {
                    Dom.addClass(c, "Selected");
                } else {
                    Dom.removeClass(c, "Selected");
                }
            });
        }
    };
    ComboManager.prototype.getSelectedItem = function() {
        return typeof(this.selectedItem) == "undefined" ? null : this.selectedItem;
    };
    
    ComboManager.prototype.getItems = function() {
        return this.items;
    };

    return ComboManager;
}();