widget.pe = {};
widget.pe._buildContainer = function (container, context) {
    
    
};
widget.pe.BaseEditor = function () {
    
};

widget.pe.BaseEditor.prototype.init = function (container) {
    this.container = widget.get(container);
    this.container.innerHTML = "";
    Dom.addClass(this.container, "EditableContainer");
    Dom.addClass(this.container, "EditableContainerEditable");
    
    this.editor = this.createEditor();
    Dom.addClass(this.editor, "Control");
    this.container.appendChild(this.editor);
    
    this.label = Dom.newDOMElement({
        _name: "span",
        "class": this.options && this.options.multiline ? "MLabel" : "ELabel"
    });
    
    this.container.appendChild(this.label);
};
widget.pe.BaseEditor.prototype.readOnly = function (readOnly) {
    if (readOnly) {
        Dom.removeClass(this.container, "EditableContainerEditable");
    } else {
        Dom.addClass(this.container, "EditableContainerEditable");
    }
};
widget.pe.BaseEditor.prototype.useHtmlForDisplayText = function () {
    return false;
};
widget.pe.BaseEditor.prototype.updateDisplay = function () {
    var s = this.getDisplayText(this.value);
    if (this.useHtmlForDisplayText()) {
        this.label.innerHTML = s;
    } else {
        var h = Dom.htmlEncode(s);
        this.label.innerHTML = h;
    }
};
widget.pe.BaseEditor.prototype.rollback = function() {
    this.setValue(this.originalValue, true);
}
widget.pe.BaseEditor.prototype.getOriginalValue = function () {
    return this.originalValue;
};
widget.pe.BaseEditor.prototype.setValue = function (value, isOriginalValue) {
    this.value = value;
    //console.log("set value: " + isOriginalValue, typeof(isOriginalValue));
    if (isOriginalValue == null || typeof(isOriginalValue) ==  "undefined" || isOriginalValue == true) {
        this.originalValue = this.value == null ? null : JSON.parse(JSON.stringify(this.value));
        //console.log("original value: ", this.originalValue);
    }
    this.updateDisplay();
    this.setImpl(this.value);
};
widget.pe.BaseEditor.prototype.getValue = function () {
    this.value = this.getImpl();
    return this.value;
};
widget.pe.BaseEditor.prototype.getTypedValue = function (type, idOnly, forceArray) {
    return widget.pe._getStrongTypeEditorValue(this, type, idOnly, forceArray);
}

widget.pe.BaseEditor.prototype.onchange = function () {
    this.value = this.getImpl();
    this.updateDisplay();
    if (this.options && this.options.onChanged) {
        this.options.onChanged();
    }
};

widget.pe.BaseEditor.prototype.focus = function () {
    if (this.editor.focus) {
        this.editor.focus();
    }
};
widget.pe.BaseEditor.prototype.enable = function(enable) {
    if (this.editor) this.editor.disabled = !enable;
}
widget.pe.BaseEditor.prototype.listen = function () {
    var thiz = this;
    var f = function (event) {
        thiz.onchange();
    };
    
    for (var i = 0; i < arguments.length; i ++) {
        Dom.registerEvent(this.container, arguments[i], f, false);
    }
};

widget.pe.PlainTextEditor = function (container, options) {
    this.options = options || {};
    this.init(container);
    
    if (this.options.isDate) {
        var p = $(this.editor).datepicker({
            format: "mm/dd/yyyy"
        }).on("changeDate", function () {
            p.datepicker("hide");
        });
        //this.editor.disabled = true;
        Dom.addClass(this.editor, "DateEditor");
    }

    
    if (this.options.multiline) {
        Dom.addClass(this.container, "EditableContainerMultiLine");
    }
        
    this.listen("change", "keyup");
};
widget.pe.PlainTextEditor.prototype = new widget.pe.BaseEditor();
widget.pe.PlainTextEditor.prototype.createEditor = function () {
    if (this.options.multiline) {
        return Dom.newDOMElement({
            _name: "textarea",
            "class": "form-control",
            rows: this.options.rows || "3",
            maxLength: this.options.maxLength ? this.options.maxLength : ""
        });
    } else {
        return Dom.newDOMElement({
            _name: "input",
            "class": "form-control",
            guid: widget.random(),
            type: "text",
            maxLength: this.options.maxLength ? this.options.maxLength : ""
        });
    }
};
widget.pe.PlainTextEditor.prototype.setImpl = function (value) {
    if (this.options.isDate) {
        if (value) {
            var d = value.getTime ? value : DateUtil.parse(value);
            this.editor.value = DateUtil.formatForUI(d);
//            alert([d, this.options.dateFormat, this.editor.value]);
            $(this.editor).datepicker("setValue", this.editor.value);
        } else {
            this.editor.value = "";
        }
        
        return;
    }
    
    this.editor.value = value || "";
    this.label.setAttribute("title", value || "");
};
widget.pe.PlainTextEditor.prototype.getImpl = function () {
    if (this.options.isDate) {
        if (!this.editor.value) return null;
        return DateUtil.parse(this.editor.value);
    }
    
    return this.editor.value;
};
widget.pe.PlainTextEditor.prototype.getDisplayText = function (value) {
    if (this.options.isDate) {
        if (value) {
            var d = value.getTime ? value : DateUtil.parse(value);
            return DateUtil.formatForUI(d);
        } else {
            return "";
        }
    }
    
    return value || "";
};

widget.pe.ColorPicker = function (container, options) {
    this.options = options || {};
    this.init(container);
    
    this.colorPicker = new widget.ColorPicker(this.editor, this.options);
};

widget.pe.ColorPicker.prototype = new widget.pe.BaseEditor();
widget.pe.ColorPicker.prototype.createEditor = function () {
    var div = document.createElement("div");
    return div;
};
widget.pe.ColorPicker.prototype.setImpl = function (value) {
    this.colorPicker.setValue(value);
};
widget.pe.ColorPicker.prototype.getImpl = function () {
    return this.colorPicker.getValue();
};
widget.pe.ColorPicker.prototype.setEnabled = function (enabled) {
    this.colorPicker.setEnabled(enabled);
};
widget.pe.ColorPicker.prototype.getDisplayText = function (value) {
    this.colorPicker.setValue(value);
    return "<div class=\"ColorPicker\">" + this.colorPicker.wrapper.innerHTML + "</div>";
};

widget.pe.ColorPicker.prototype.useHtmlForDisplayText = function () {
    return true;
};

widget.pe.ComboEditor = function (container, options) {
    this.options = options || {};
    this.init(container);
    
    this.comboManager = new widget.ComboManager(this.editor, this.options);
    
    if (this.options.items) {
        this.comboManager.setItems(this.options.items);
    }

    this.listen("change", "keyup", "click");
};
widget.pe.ComboEditor.prototype = new widget.pe.BaseEditor();
widget.pe.ComboEditor.prototype.createEditor = function () {
    var div = document.createElement("div");
    div.className = "ComboEditor";
    return div;
};
widget.pe.ComboEditor.prototype.setImpl = function (value) {
    this.comboManager.selectItemIfContains(value);
};
widget.pe.ComboEditor.prototype.getImpl = function () {
    return this.comboManager.getSelectedItem();
};
widget.pe.ComboEditor.prototype.getDisplayText = function (value) {
    return this.comboManager.getCurrentItemDisplayText(value);
};
widget.pe.ComboEditor.prototype.setItems = function (items) {
    this.comboManager.setItems(items);
};
widget.pe.ComboEditor.prototype.asyncLoadItems = function (loader) {
    var thiz = this;
    loader(function (items) {
        thiz.comboManager.setItems(items);
    });
};
widget.pe.ComboEditor.prototype.fireSelectionEvent = function(fromUser) {
    this.comboManager.fireSelectionEvent(fromUser);
}
widget.pe.ComboEditor.prototype.setEnable = function(enable) {
    this.enable = enable;
    this.comboManager.setEnable(enable);
}


widget.pe.DateTimeEditor = function (container, options) {
    this.options = options || {};
    this.init(container);
    
    var useSeconds = this.options.useSeconds ? this.options.useSeconds : false;
    var format = this.options.format ? this.options.format : null;
    widget.Util.initDateTimeEditor(this.editor, this.options.withTime, useSeconds, format);
    Dom.addClass(this.editor, "DateEditor");
        
    this.listen("change", "keyup");
};
widget.pe.DateTimeEditor.prototype = new widget.pe.BaseEditor();
widget.pe.DateTimeEditor.prototype.createEditor = function () {
    return Dom.newDOMElement({
        _name: "input",
        "class": "form-control",
        guid: widget.random(),
        type: "text"
    });
};
widget.pe.DateTimeEditor.prototype.setImpl = function (value) {
    widget.Util.setDateTimeEditorValue(this.editor, value);
};
widget.pe.DateTimeEditor.prototype.getImpl = function () {
    return widget.Util.getDateTimeEditorValue(this.editor);
};
widget.pe.DateTimeEditor.prototype.getDisplayText = function (value) {
    if (!value) return "";
    return DateUtil.formatForUI(DateUtil.ensureDate(value), this.options.withTime);
};

widget.pe.TimeEditor = function(container, options) {
    this.options = options || {};
    this.init(container);
    widget.Util.initTimeEditor(this.editor, this.options);
    this.listen("change", "keyup");
}

widget.pe.TimeEditor.prototype = new widget.pe.BaseEditor();
widget.pe.TimeEditor.prototype.createEditor = function () {
    return Dom.newDOMElement({
        _name: "input",
        "class": "form-control",
        guid: widget.random(),
        type: "text"
    });
};
widget.pe.TimeEditor.prototype.setImpl = function (value) {
    widget.Util.setTimeEditorValue(this.editor, value);
};
widget.pe.TimeEditor.prototype.getDisplayText = function (value) {
    if (value == null) return "00:00";
    return value.getHours() + ":" + value.getMinutes();
};
widget.pe.TimeEditor.prototype.getImpl = function () {
    var data = this.editor.value.split(":");
    if (data.length != 2) return null;
    return {hours: parseInt(data[0], 10), minutes: parseInt(data[1], 10)};
};
widget.pe.NumberEditor = function (container, options) {
    this.options = options || {};
    this.init(container);
    
    Dom.addClass(this.editor, "NumberEditor");
    Util.enforceNumberInput(this.editor);
    
    this.listen("change", "keyup");
};
widget.pe.NumberEditor.prototype = new widget.pe.BaseEditor();
widget.pe.NumberEditor.prototype.createEditor = function () {
    return Dom.newDOMElement({
        _name: "input",
        "class": "form-control",
        guid: widget.random(),
        type: "text",
        maxLength: this.options.maxLength ? this.options.maxLength : ""
    });
};
widget.pe.NumberEditor.prototype.setImpl = function (value) {
    this.editor.value = "" + (value || "");
};
widget.pe.NumberEditor.prototype.getImpl = function () {
    return this.editor.value ? parseFloat(this.editor.value) : null;
};
widget.pe.NumberEditor.prototype.getDisplayText = function (value) {
    return "" + (value || "");
};

widget.pe.BooleanEditor = function (container, options) {
    this.options = options || {};
    if (!this.options.format) {
        this.options.format = function (b) {
            return b ? Messages["yes"] : Messages["no"];
        };
    }
    
    this.init(container);
    
    this.comboManager = new widget.ComboManager(this.editor, this.options);
    this.comboManager.setItems([true, false]);

    this.listen("change", "keyup", "click");
};
widget.pe.BooleanEditor.prototype = new widget.pe.BaseEditor();
widget.pe.BooleanEditor.prototype.createEditor = function () {
    var div = document.createElement("div");
    div.className = "test";
    return div;
};
widget.pe.BooleanEditor.prototype.setImpl = function (value) {
    this.comboManager.selectItem(value);
};
widget.pe.BooleanEditor.prototype.getImpl = function () {
    //console.log("BooleanEditor.prototype.getImpl", this.comboManager.getSelectedItem());
    return this.comboManager.getSelectedItem();
};
widget.pe.BooleanEditor.prototype.getDisplayText = function (value) {
    return this.comboManager.getCurrentItemDisplayText(value);
};

widget.pe.MultiSelectionEditor = function (container, options) {
    this.options = options || {};
    this.init(container);
    
    if (!this.options.renderer) this.options.renderer = this.options.format;
    
    var thiz = this;
    Dom.registerEvent(this.editor, "click", function () {
        thiz.options.buildSource(function (source) {
            new MultiSelectionDialog().open(source, thiz.options.renderer, thiz.items, thiz.options,
                    function (newSelectedItems) {
                thiz.setValue(newSelectedItems, false);
                if (thiz.options.onChanged) {
                    //console.log("on changed" + options); 
                    thiz.options.onChanged(thiz.items);
                }
            });
        });
    }, false);
    
    Dom.addClass(this.label, "MultiSelectionEditor");
    this.listen("change", "keyup", "click");
};
widget.pe.MultiSelectionEditor.prototype = new widget.pe.BaseEditor();
widget.pe.MultiSelectionEditor.prototype.createEditor = function () {
    return Dom.newDOMElement({
        _name: "button",
        "class": "btn btn-default MultiSelectionEditor",
        type: "button",
        _children: [{
            _name: "span",
            "class": "display",
            _id: "displaySpan",
            _html: "Selection 1, Selection 2, Selection 3, Last selection item"
        },{
            _name: "span",
            _html: "&#160;"
        },{
            _name: "i",
            "class": "fa fa-ellipsis-h"
        }]
    }, document, this);
};
widget.pe.MultiSelectionEditor.prototype.setImpl = function (items) {
    if (!items) items = [];
    this.items = items;
    
    if (this.useHtmlForDisplayText() || this.options.useHtml) {
        this.displaySpan.innerHTML = this.getDisplayText(this.items);
    } else {
        Dom.setInnerText(this.displaySpan, this.getDisplayText(this.items));
    }
    
    this.label.setAttribute("title", this.getTitleText(this.items));
};
widget.pe.MultiSelectionEditor.prototype.getImpl = function () {
    return this.items;
};
widget.pe.MultiSelectionEditor.prototype.getTitleText = function (items) {
    var s = "";
    for (var i = 0; i < items.length; i ++) {
        if (items[i].isRoot) continue;
        if (s) s += ", ";
        if (this.options.selectedItemFormat) {
            s += this.options.selectedItemFormat(items[i]);
        } else {
            s += this.options.format(items[i]);
        }
    }
    
    return s
};
widget.pe.MultiSelectionEditor.prototype.getDisplayText = function (items) {
    var s = "";
    for (var i = 0; i < items.length; i ++) {
        if (items[i].isRoot) continue;
        if (s) s += ", ";
        s += this.options.format(items[i], "forButtonDisplay");
    }
    
    return s
};

widget.pe.AttachmentEditor = function (container, options) {
    this.options = options || {};
    this.init(container);
    
    var thiz = this;
    Dom.registerEvent(this.uploadButton, "click", function () {
        new CommonUploadDialog(function (id) {
            thiz.setValue(id, false);
        }, {
            title: options.title ? (Messages["upload"] + " " + option.dataName) : Messages["upload"]
        }).open();
    }, false);
    Dom.registerEvent(this.removeButton, "click", function () {
        widget.Dialog.confirm(Messages["remove_attachment_confirm_msg"], Messages["remove"], function () {
            thiz.setValue(null, false);
        }, Messages["cancel"],  function () {});
    }, false);
};
widget.pe.AttachmentEditor.prototype = new widget.pe.BaseEditor();
widget.pe.AttachmentEditor.prototype.createEditor = function () {
    return Dom.newDOMElement({
        _name: "div",
        "class": "AttachmentEditor",
        _children: [{
            _name: "span",
            "class": "display",
            _id: "displaySpan",
            _html: ""
        },{
            _name: "button",
            "class": "btn btn-default",
            type: "button",
            _id: "removeButton",
            style: "margin: 0px 5px;",
            _html: Messages["remove"]
        },{
            _name: "button",
            "class": "btn btn-default",
            type: "button",
            _id: "uploadButton",
            _html: Messages["change"]
        }]
    }, document, this);
};
widget.pe.AttachmentEditor.prototype.setImpl = function (attachmentId) {
    this.attachmentId = attachmentId;
    
    this.displaySpan.innerHTML = this.getDisplayText(this.attachmentId);
    this.removeButton.style.display = this.attachmentId ? "inline-block" : "none";
    this.uploadButton.innerHTML = this.attachmentId ? Messages["change"] : Messages["upload_label"];
    //http://localhost/asset-manager-web/pages/dispacher/DispacherServlet?beanName=PropertiesControllerBean&methodName=openScreen&keyAttributes=type,id&keyValues=asset,10#
};
widget.pe.AttachmentEditor.prototype.getImpl = function () {
    return this.attachmentId;
};
widget.pe.AttachmentEditor.prototype.useHtmlForDisplayText = function () {
    return true;
};
widget.pe.AttachmentEditor.prototype.getDisplayText = function (attachmentId) {
    if (!attachmentId) {
        return "";
    } else {
        var name = attachmentId;
        if (name.match(/^([^#]+)#[0-9]+$/)) {
            name = RegExp.$1;
        }
        var url = CONTEXT_PATH + "/amw/download?fileName=" + encodeURIComponent(attachmentId);
        return "<a href=\"" + url + "\" target=\"_blank\">" + Dom.htmlEncode(name) + "</a>";
    }
};
widget.pe.StaticLocationEditor = function (container, options) {
    this.options = options || {};
    this.init(container);
    
    var thiz = this;
    var openStaticLocationDialog = function() {
        new StaticLocationEditDialog(thiz.fixedLocation ? thiz.fixedLocation.assetId : null, thiz.fixedLocation, function (fixedLocation) {
            thiz.setValue(fixedLocation, false);
        }).open();
    };
    Dom.registerEvent(this.staticCheckBox, "click", function(){
       if (thiz.staticCheckBox.checked) {
           if (!thiz.fixedLocation) {
               openStaticLocationDialog();
           }
       } else {
           thiz.setValue(null, false);
       }
    });
    Dom.registerEvent(this.locationLink, "click", function() {
        openStaticLocationDialog();
    });
}
widget.pe.StaticLocationEditor.prototype = new widget.pe.BaseEditor();
widget.pe.StaticLocationEditor.prototype.createEditor = function() {
    var id = widget.random();
    return Dom.newDOMElement({
        _name: "div",
        "class": "LocationEditor",
        _children: [{
            _name: "input",
            type: "checkbox",
            id: id,
            _id: "staticCheckBox"
        },{
            _name: "label",
            "for": id,
            _text: Messages["static_location_label"],
            style: "margin-left: 0.5ex; margin-right: 1ex; font-weight: normal;",
            _id: "staticLabel"
        },{
            _name: "a",
            href: "#",
            _id: "locationLink",
            _html: Messages["static_select_location_button"]
        }]
    }, document, this);
};
widget.pe.StaticLocationEditor.prototype.getImpl = function () {
    return this.fixedLocation;
};
widget.pe.StaticLocationEditor.prototype.setImpl = function (fixedLocation) {
    this.fixedLocation = fixedLocation;
    this.staticCheckBox.checked = this.fixedLocation != null ? true : false;
    this.staticLabel.innerHTML = this.fixedLocation != null ? Messages["static_location_label"] : Messages["select_location_title"];
    this.locationLink.innerHTML = this.fixedLocation ? (this.fixedLocation.name ? this.fixedLocation.name : Messages["change_location_button"]) : "";
}
widget.pe.StaticLocationEditor.prototype.getDisplayText = function (info) {
    return "";
}

widget.pe._getStrongTypeEditorValue = function (editor, type, idOnly, forceArray) {
    var value = editor.getValue();
    if (value == null) return value;
    
    if (value instanceof Array) {
        for (var i = 0; i < value.length; i ++) {
            if (idOnly) {
                value[i] = {
                    id: value[i].id,
                    clazz: type
                }
            } else {
                value[i].clazz = type;
            }
        }

        value = new _List(forceArray ? null : "list", type, value);
    } else {
        if (idOnly) {
            value = {
                id: value.id,
                clazz: type
            }
        } else {
            value.clazz = type;
        }
    }
    
    return value;
};

widget.pe.validationRegistry = {
        required: function (value, param, editor) {
            if (((value instanceof String) && !value) || value == null) {
                return "Please enter the $TITLE."
            }
            return null;
        },
        maxLength: function (value, param, editor) {
            if (value && value.length > param) {
                return "Please enter the $TITLE with maximum " + param + " characters.";
            }
            
            return null;
        },
        patternMatched: function (value, param, editor) {
            
        }
};