function ValueParamEditor(param, valueMap) {
    this._construct(param, valueMap);
}
ValueParamEditor.prototype = new BaseParamEditor();

ValueParamEditor.prototype.buildBodyUI = function () {
    Dom.addClass(this.containerElement, "ValueParamEditorContainer ValueParamEditorContainer_" + this.param.valueParamType.name);
    var key = this.param.valueParamType.name === "SINGLE_SELECTION_LIST" ? "LIST" : this.param.valueParamType.name;
    var extraPrototype = ValueParamEditor.PARAM_TYPES[key];
    if (!extraPrototype) extraPrototype = ValueParamEditor.PARAM_TYPES.DEFAULT;
    for (name in extraPrototype) {
        this[name] = extraPrototype[name];
    }
    
    this.buildBodyControl();
//    this.bodyElement.setAttribute("title", this.param.valueParamType.name);
    
    var thiz = this;
//    Dom.registerEvent(this.containerElement, "dblclick", function () {
//        console.log("------------------ " + thiz.param.key + " -------------------");
//        console.log("  PARAM:", thiz.param);
//    });
};
ValueParamEditor.prototype.loadValue = function (valueMap) {
    var value = valueMap[this.param.key];
    if (typeof (value) == "undefined") {
        value = this.param.defaultValue;
    }
    if (typeof (value) != "undefined") {
        this.setValue(value);
    }
};
ValueParamEditor.prototype.saveValue = function (valueMap) {
    valueMap[this.param.key] = this.getValue();
};
ValueParamEditor.PARAM_TYPES = {
    LIST: {
        buildBodyControl: function () {
            var thiz = this;
            this.comboManager = new widget.ComboManager(this.bodyElement, {
                comparer: function (a, b) {
                    return a.value == b.value;
                },
                format: function (item) {
                    return item ? (item.displayKey ? (Messages[item.displayKey] || item.displayKey) : item.displayName) || "&#160;" : "&#160;";
                },
                onItemSelected: function () {
                    thiz.emitChangeEvent();
                },
                withExtraNull: false, //!thiz.param.required,
                useHtml: true
            });
            
            if (this.param.options) this.comboManager.setItems(this.param.options);
        },
        setValue: function (value) {
            var option = null;
            this.value = value;
            var l = this.param && this.param.options ? this.param.options.length : 0;
            for (var i = 0; i < l; i ++) {
                if (this.param.options[i].value == value) {
                    option = this.param.options[i];
                    break;
                }
            }
            
            if (option) {
                this.comboManager.selectItem(option);
            } 
        },
        getValue: function () {
            var selectedItem = this.comboManager.getSelectedItem();
            return selectedItem ? selectedItem.value : null;
        },
        invalidate: function (valueMap) {
            if (this.param.options && this.param.options.length > 0) {
                return; //invalidate is needed for dynamic list only
            }
            
            var thiz = this;
            var context = thiz.param._context;
            $reportTemplateService.loadTreeByRetriever(context.type, context.id, thiz.param.key, context.getValueMap(), function (options) {
                if (options) {
                    thiz.comboManager.setItems(options);
                    if (thiz.value) {
                        thiz.comboManager.selectItemByValue(thiz.value);
                    }
                    thiz.setRendered(true);
                } else {
                    thiz.setRendered(false);
                }
            });
        }
    },
    MULTI_SELECTION_TREE: {
        buildBodyControl: function () {
            Dom.addClass(this.containerElement, "EditModeActivated");
            var thiz = this;
            this.selectionEditor = new widget.pe.MultiSelectionEditor(this.bodyElement, {
                title: this.getPreLabel() || Messages[this.param.displayedName],
                format: function (item) {
                    if (item.icon) {
                        return "<span class=\"IconicLabel\"><img width=\"16\" height=\"16\" src=\""+ CONTEXT_PATH + item.icon + "\"/></span> " + 
                        "<span>" + item.name + "</span>";
                    } else {
                        if (thiz.param.key == "query_param_dep_id") {
                            return "<span class=\"IconicLabel\"><img width=\"16\" height=\"16\" src=\""+ CONTEXT_PATH + "/images/department_icon_32X32.gif" + "\"/></span> " + 
                            "<span>" + item.name + "</span>";
                        }
                        
                        return item.name;
                    }
                },
                useHtml: true,
                selectedItemFormat: function (item) {
                    return item.name;
                },
                compare: sameId,
                buildSource: function (sourceBuilderCallback) {
                    var context = thiz.param._context;
                    $reportTemplateService.loadTreeByRetriever(context.type, context.id, thiz.param.key, context.getValueMap(), function (results) {
                        sourceBuilderCallback(function (item, callback) {
                            if (!item) {
                                if (results.length == 1) {
                                    var root = results[0];
                                    if (root.invisble) {
                                        callback(root.children);
                                        return;
                                    }
                                }
                                
                                callback(results);
                            } else {
                                callback(item.children);
                            }
                        });
                    });
                },
                onChanged: function () {
                    thiz.emitChangeEvent();
                },
                checkable: true,
                isItemCheckable: function (item) {
                    return item.selectable;
                },
                propagateCheckActionDownwards: true,
                propagateUncheckActionDownwards: true,
            });
            this.selectionEditor.setValue([]);
        },
        setValue: function (value) {
            var list = [];
            if (value) {
                var parts = value.split(/\,/);
                for (var i = 0; i < parts.length; i ++) {
                    var partId = parseInt(parts[i], 10);
                    if (isNaN(partId)) {
                        list.push(parts[i]);
                    } else {
                        list.push(partId);
                    }
                }
            }
            
            if (list && list.length > 0) {
                var thiz = this;
                var context = this.param._context;
                $reportTemplateService.loadItemsFromIdsByRetriever(context.type, context.id, thiz.param.key, context.getValueMap(), list, function (results) {
                    thiz.selectionEditor.setValue(results);
                });
            } else {
                this.selectionEditor.setValue([]);
            }
        },
        getValue: function () {
            var list = this.selectionEditor.getValue();
            var value = [];
            for (var i = 0; i < list.length; i ++) value.push(list[i].id);
            
            return Util.join(value, ",");
        }
    },
    MULTI_SELECTION_LIST: {
        buildBodyControl: function () {
            Dom.addClass(this.containerElement, "EditModeActivated");
            var thiz = this;
            this.selectionEditor = new widget.pe.MultiSelectionEditor(this.bodyElement, {
                title: this.getPreLabel(),
                format: function (item) {
                    if (item.icon) {
                        return "<span class=\"IconicLabel\"><img width=\"16\" height=\"16\" src=\""+ CONTEXT_PATH + item.icon + "\"/></span> " + 
                        "<span>" + item.name + "</span>";
                    } else {
                        return item.name;
                    }
                },
                useHtml: true,
                selectedItemFormat: function (item) {
                    return item.name;
                },
                compare: sameId,
                buildSource: function (sourceBuilderCallback) {
                    var context = thiz.param._context;
                    $reportTemplateService.loadTreeByRetriever(context.type, context.id, thiz.param.key, context.getValueMap(), function (results) {
                        sourceBuilderCallback(function (item, callback) {
                            if (!item) {
                                //check if the result is SelectionListEntry, convert it
                                if (results.length > 0
                                        && typeof(results[0].id) == "undefined"
                                            && typeof(results[0].value) != "undefined") {
                                    var convertedList = [];
                                    for (var i = 0; i < results.length; i ++) {
                                        convertedList.push({
                                            id: results[i].value,
                                            name: (results[i].displayName || Messages[results[i].displayKey]),
                                            selectable: true
                                        });
                                    }
                                    
                                    callback(convertedList);
                                    return;
                                }
                                
                                if (results.length == 1) {
                                    var root = results[0];
                                    if (root.invisble) {
                                        callback(root.children);
                                        return;
                                    }
                                }
                                callback(results);
                            } else {
                                callback(item.children);
                            }
                        });
                    })
                },
                onChanged: function () {
                    thiz.emitChangeEvent();
                },
                checkable: true,
                isItemCheckable: function (item) {
                    return item.selectable;
                },
                propagateCheckActionDownwards: false,
                propagateUncheckActionDownwards: false,
            });
            this.selectionEditor.setValue([]);
        },
        setValue: function (value) {
            var list = [];
            if (value) {
                var parts = value.split(/\,/);
                for (var i = 0; i < parts.length; i ++) {
                    var partId = parseInt(parts[i], 10);
                    if (isNaN(partId)) {
                        list.push(parts[i]);
                    } else {
                        list.push(partId);
                    }
                }
            }
            
            function setItemsWithConversion(items) {
                var c = [];
                for (var i = 0; i < items.length; i ++) {
                    c.push({
                        id: items[i].value || items[i].id,
                        name: (items[i].displayName || Messages[items[i].displayKey] || items[i].name),
                        selectable: true,
                        icon: items[i].icon || ""
                    });
                }
                
                thiz.selectionEditor.setValue(c);
            }
            
            if (list && list.length > 0) {
                var thiz = this;
                
                if (this.param.options && this.param.options.length > 0) {
                    var items = [];
                    for (var i = 0; i < list.length; i ++) {
                        var id = list[i];
                        for (var j = 0; j < this.param.options.length; j ++) {
                            var option = this.param.options[j];
                            if (option.value == id) {
                                items.push(option);
                            }
                        }
                    }
                    
                    setItemsWithConversion(items);
                } else {
                    var context = this.param._context;
                    $reportTemplateService.loadItemsFromIdsByRetriever(context.type, context.id, thiz.param.key, context.getValueMap(), list, function (results) {
                        setItemsWithConversion(results);
                    });
                }
            } else {
                this.selectionEditor.setValue([]);
            }
        },
        getValue: function () {
            var list = this.selectionEditor.getValue();
            var value = [];
            for (var i = 0; i < list.length; i ++) value.push(list[i].id);
            
            return Util.join(value, ",");
        }
    },
    BOOLEAN: {
        buildBodyControl: function () {
            var id = widget.random();
            this.checkBox = Dom.newDOMElement({
                _name: "input",
                type: "checkbox",
                "id": id
            });
            
            this.bodyElement.appendChild(this.checkBox);
            
            this.postLabelElement.setAttribute("for", id);
        },
        setValue: function (value) {
            this.checkBox.checked = ("true" == "" + value);
        },
        getValue: function () {
            return "" + this.checkBox.checked;
        },
        getPreferredLeadingSize: function () {
            return 0;
        }
    },
    MULTI_SELECTION_BOX: {
        buildBodyControl: function () {
            var thiz = this;
            this.items = [];
            var button = Dom.newDOMElement({
                _name: "button",
                "class": "btn btn-default MultiSelectionEditor Control",
                _children: [{
                    _name: "span",
                    _html: "&nbsp;",
                    "class": "display",
                    _id: "listView"
                },{
                    _name: "span",
                    _html: "&nbsp;"
                },{
                    _name: "i",
                    "class": "fa fa-ellipsis-h"
                }]
            }, document, this);
            this.bodyElement.appendChild(button);
            
            Dom.registerEvent(button, "click", function(e){
                Dom.cancelEvent(e);
                widget.Dialog.select(thiz.param.options, function (items) {
                    thiz.items = items;
                    thiz.invalidateSelectedItemDisplay();
                }, thiz.items, {
                    same: function (a, b) {
                        return a.value == b.value;
                    },
                    formatter: function (item) {
                        return item.displayName || Messages[item.displayKey];
                    },
                    columns: 4,
                    message: thiz.getPreLabel() + ":"
                });
            });
        },
        setValue: function (value) {
            this.items = [];
            if (value) {
                var values = value.split(",");
                for (var i = 0; i < values.length; i ++) {
                    var item = find(this.param.options, function (x) { return x.value == values[i];});
                    if (item) this.items.push(item);
                }
            }
            
            this.invalidateSelectedItemDisplay();
        },
        getValue: function () {
            var values = [];
            for (var i = 0; i < this.items.length; i ++) {
                values.push(this.items[i].value);
            }
            
            return Util.join(values, ",");
        },
        invalidateSelectedItemDisplay: function () {
            var html = "";
            for (var i = 0; i < this.items.length; i ++) {
                if (html) html += ", ";
                var item = this.items[i];
                html += Dom.htmlEncode(item.displayName || Messages[item.displayKey]);
            }
            this.listView.innerHTML = html || "&#160;";
        }
    },
    STRING: {
        buildBodyControl: function () {
            var id = widget.random();
            this.input = Dom.newDOMElement({
                _name: "input",
                type: "type",
                "class": "form-control",
                "id": id
            });
            
            this.bodyElement.appendChild(this.input);
            if (this.param.fieldSize) {
                this.input.style.width = this.param.fieldSize + "px";
            }
        },
        setValue: function (value) {
            this.input.value = value;
        },
        getValue: function () {
            return this.input.value;
        }
    },
    INTEGER: {
        buildBodyControl: function () {
            var id = widget.random();
            this.input = Dom.newDOMElement({
                _name: "input",
                type: "type",
                "class": "form-control",
                "id": id
            });
            
            this.bodyElement.appendChild(this.input);
            if (this.param.fieldSize) {
                this.input.style.width = this.param.fieldSize + "px";
            } else {
                this.input.style.width = "70px";
            }
            
            this.input._integer = true;
            Util.enforceNumberInput(this.input);
        },
        setValue: function (value) {
            this.input.value = value;
        },
        getValue: function () {
            return this.input.value;
        }
    },
    SINGLE_TAG: {
        buildBodyControl: function () {
            var id = widget.random();
            this.input = Dom.newDOMElement({
                _name: "input",
                type: "type",
                "class": "form-control",
                "id": id,
                "style": "width: 17ex"
            });
            
            this.bodyElement.appendChild(this.input);
            widget.Util.installAutoComplete(this.input,
                    function (query, callback) {    //SOURCE
                        var configuration = {
                                pageNo: 1,
                                pageSize: 50,
                                orders: [{
                                    ascending: true,
                                    propertyName: "networkId"
                                }]
                        };
                        $tagService.findTags(query, configuration, function(tags) {
                            callback(tags.results);
                        }, function(){});
                    },
                    widget.Util.makeMultiColumnItemRenderer(    //ITEM RENDERER
                            {
                                getWidth: function (tag) { return "15em"; },
                                getIcon: function (tag) { return "fa-tag"; },
                                getText: function (tag) { return tag.networkId; },
                                getExtraStyle: function (tag) { return "font-weight: bold; margin-right: 1em;" }
                            }
                    ),
                    
                    function (tag) {  //INPUT TEXT BUILDER
                        return tag.networkId
                    },
                    null, null, //NO FILTER, NO SORTER
                    
                    {   //EVENT LISTENER
                        onItemSelected: function (tag) {
                        },
                        onTextSelected: function () {
                        }
                    }
                );
        },
        setValue: function (value) {
            var thiz = this;
            if (value) {
                $tagService.getTagById(value, function(tag) {
                   if (tag) {
                       thiz.tagId = tag.id;
                       thiz.input.value = tag.networkId;
                   }
                });
            }
        },

        getValue: function () {
            var tag = widget.Util.getAutoCompletedItem(this.input);
            return tag ? tag.id : this.tagId ? this.tagId : this.input.value;
        }
    },
    SINGLE_ASSET: {
        buildBodyControl: function () {
            var id = widget.random();
            this.input = Dom.newDOMElement({
                _name: "input",
                type: "type",
                "class": "form-control",
                "id": id,
                "style": "width: 17ex"
            });
            
            this.bodyElement.appendChild(this.input);
            
            widget.Util.installAutoComplete(this.input,
                    function (query, callback) {    //SOURCE
                        var config = {
                                pageNo: 1,
                                pageSize: 20,
                                orders: [{
                                    ascending: true,
                                    propertyName: "name"
                                }]
                        };

                        $assetService.assetAutoCompleteSearch(query, 0, config, function (result) {
                            callback(result.results);
                        }, function () {});
                        
                    },
                    widget.Util.makeMultiColumnItemRenderer(    //ITEM RENDERER
                            {
                                getWidth: function (asset) { return "22em"; },
                                getIcon: function (asset) { return "fa-cube"; },
                                getText: function (asset) { return asset.assetDTO.name; },
                                getExtraStyle: function (asset) { return "font-weight: bold; margin-right: 1em;" }
                            },
                            {
                                getWidth: function (asset) { return "10em"; },
                                getIcon: function (asset) { return CONTEXT_PATH + asset.assetDTO.primaryCategory.icon; },
                                getIconSize: function (asset) { return "16px"; },
                                getText: function (asset) { return asset.assetDTO.primaryCategory.name; }
                            }
                    ),
                    
                    function (asset) {  //INPUT TEXT BUILDER
                        return asset.assetDTO.name;
                    },
                    null, null, //NO FILTER, NO SORTER
                    
                    {   //EVENT LISTENER
                        onItemSelected: function (asset) {
                        },
                        onTextSelected: function () {
                        }
                    }
                );
        },
        setValue: function (value) {
            var thiz = this;
            if (value) {
                $assetService.findAssetById(value, function(asset){
                   if (asset && asset.assetDTO) {
                       thiz.input.value = asset.assetDTO.name;
                       thiz.assetId = asset.assetDTO.id;
                   } 
                });
            }
        },
        getValue: function () {
            var item = widget.Util.getAutoCompletedItem(this.input);
            return item ? item.assetDTO.id : this.assetId ? this.assetId : "";
        }
    },
    MULTI_ASSET: {
        buildBodyControl: function () {
            var thiz = this;
            this.items = [];
            Dom.addClass(this.containerElement, "EditModeActivated");
            var button = Dom.newDOMElement({
                _name: "button",
                "class": "btn btn-default MultiSelectionEditor Control",
                _children: [{
                    _name: "span",
                    _html: "&nbsp;",
                    "class": "display",
                    _id: "assetView"
                },{
                    _name: "span",
                    _html: "&nbsp;"
                },{
                    _name: "i",
                    "class": "fa fa-ellipsis-h"
                }]
            }, document, this.bodyElement);
            this.bodyElement.appendChild(button);
            
            this.renderer = function(items) {
                var html = "";
                for (var i = 0; i < items.length; i++) {
                    html += "<span class=\"IconicLabel\"><img width=\"16\" height=\"16\" src=\""+ CONTEXT_PATH + items[i].assetDTO.primaryCategory.icon + "\"/></span> " + 
                    "<span>" + items[i].assetDTO.name + "</span> ";
                }
                
                if (items.length > 0) {
                } else {
                    html = "&nbsp;";
                }
                
                thiz.bodyElement.assetView.innerHTML = html;
            };
            
            Dom.registerEvent(button, "click", function(e){
                Dom.cancelEvent(e);
                new MultiAssetSelectionDialog(function(items){
                    thiz.items = items;
                    thiz.renderer(thiz.items);
                }).open(thiz.items, true);
            });
        },
        setValue: function (value) {
            var thiz = this;
            $assetService.getAssetByIds(value.split(/\,/), function (result) {
                thiz.items = result;
                thiz.renderer(thiz.items);
            }, function(){});
        },
        getValue: function () {
            var list = [];
            for (var i = 0; i < this.items.length; i++) {
                list.push(this.items[i].assetDTO.id);
            }
            
            return Util.join(list, ",");
        }
    },
    TABLE_SINGLE_SELECTION: {
        buildBodyControl: function () {
            var thiz = this;
            this.source = [];
            Dom.addClass(this.containerElement, "EditModeActivated");
            var thiz = this;
            var button = Dom.newDOMElement({
                _name: "button",
                "class": "btn btn-default MultiSelectionEditor Control",
                _children: [{
                    _name: "span",
                    _html: "&nbsp;",
                    "class": "display",
                    _id: "itemView"
                },{
                    _name: "span",
                    _html: "&nbsp;"
                },{
                    _name: "i",
                    "class": "fa fa-ellipsis-h"
                }]
            }, document, this.bodyElement);
            this.bodyElement.appendChild(button);
            
            this.source = [{
                name: "AASEDA",
                id: "214324"
                
            }, {
                name: "GSFWE",
                id: "45534234"
            }];
            
            this.renderer = function(item) {
                return item.name;
            };
            
            this.comparer = function(a, b) {
                if (a.id == b.id) return true;
                return false;
            };
            
            Dom.registerEvent(button, "click", function(e){
                Dom.cancelEvent(e);
                var context = thiz.param._context;
                new TableSingleSelectionDialog(function(item){
                    thiz.item = item;
                    thiz.getDisplayText(item.id, function (name) {
                        thiz.bodyElement.itemView.innerHTML = Dom.htmlEncode(name);
                    });
                     
                }, context, thiz.param.key, thiz.item, thiz.getPreLabel()).open();
            });
        },
        getDisplayText: function (id, callback) {
            var context = this.param._context;
            $reportTemplateService.getTableSelectionDisplay(context.type, context.id, this.param.key, id, callback);
        },
        setValue: function (value) {
            var thiz = this;
            this.getDisplayText(parseInt(value, 10), function (name) {
                thiz.bodyElement.itemView.innerHTML = Dom.htmlEncode(name);
            });
            this.item = {id: value};
        },
        getValue: function () {
            return this.item ? ("" + this.item.id) : "";
        }
    },
    HIDDEN: {
        buildBodyControl: function () {
        },
        setValue: function (value) {
            this._value = value;
        },
        getValue: function () {
            return this._value || null;
        }
    },
    DEFAULT: {
        buildBodyControl: function () {
            this.bodyElement.appendChild(Dom.newDOMElement({
                _name: "span",
                "style": "color: red;",
                _html: "?" + this.param.valueParamType.name + "?"
            }));
        },
        setValue: function (value) {
        },
        getValue: function () {
        }
    },
};