function BooleanEditor(def, value, target) {
    this.def = def;
    this.value = value;
    this.target = target;
};

BooleanEditor.prototype.createMenuItem = function (doc) {
    var item = doc.createElementNS(PencilNamespaces.xul, "menuitem");
    item.setAttribute("type", "checkbox");
    item.setAttribute("label", this.def.displayName);
    if (this.value) {
        item.setAttribute("checked", this.value.value);
    } else {
        item.setAttributeNS(PencilNamespaces.p, "p:tristate", true);
    }
    
    var thiz = this;
    item.addEventListener("command", function () {
        var bool = Bool.fromString(item.getAttribute("checked"));
        thiz.target.setProperty(thiz.def.name, bool);
    }, false);

    return item;
    
};
OnMenuEditor.registerTypeEditor(Bool, BooleanEditor);


function EnumEditor(def, value, target) {
    this.def = def;
    this.value = value;
    this.target = target;
};

EnumEditor.prototype.createMenuItem = function (doc) {
    var menu = doc.createElementNS(PencilNamespaces.xul, "menu");
    menu.setAttribute("label", this.def.displayName);
    
    var popup = doc.createElementNS(PencilNamespaces.xul, "menupopup");
    menu.appendChild(popup);

    var enumValues = Enum.getValues(this.def);
    for (var i in enumValues) {
        var item = doc.createElementNS(PencilNamespaces.xul, "menuitem");
        item.setAttribute("type", "radio");
        item.setAttribute("label", enumValues[i].label);
        item._value = enumValues[i].value;
        item._isEnumEditor = true;
        
        if (this.value && this.value.equals(enumValues[i].value)) {
            item.setAttribute("checked", true);
        }
        
        popup.appendChild(item);
        
    }
    
    var thiz = this;
    popup.addEventListener("command", function (event) {
        if (event.originalTarget._isEnumEditor) {
            thiz.target.setProperty(thiz.def.name, event.originalTarget._value);
        }
    }, false);

    return menu;
    
};

OnMenuEditor.registerTypeEditor(Enum, EnumEditor);

