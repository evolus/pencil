// Copyright (c) Evolus Solutions. All rights reserved.
// License: GPL/MPL
// $Id$

function ShapeDef() {
    this.id = null;
    this.displayName = null;

    this.contentNode = null;
    this.propertyGroups = [];
    this.behaviors = [];
    this.actions = [];

    this.propertyMap = {};
    this.behaviorMap = {};
    this.actionMap = {};
}
ShapeDef.prototype.toString = function () {
    return "[ShapeDef: " + this.id + "]";
};
ShapeDef.prototype.getProperty = function (name) {
    return this.propertyMap[name];
};
ShapeDef.prototype.isPropertyAffectedBy = function (target, source, checkedProperties) {
    if (target == source) return true;

    if (checkedProperties && checkedProperties[target]) return false;

    var tp = this.propertyMap[target];
    if (!tp) return false;

    var sp = this.propertyMap[source];
    if (!sp) return false;

    if (tp.relatedProperties[source]) return true;

    var props = checkedProperties ? checkedProperties : {};
    props[target] = true;
    for (name in tp.relatedProperties) {
        if (this.isPropertyAffectedBy(name, source, props)) return true;
    }

    return false;
};

function PropertyGroup() {
    this.name = null;
    this.properties = [];
}
PropertyGroup.prototype.toString = function () {
    return "[PropertyGroup: " + this.name + "]";
};


function Property() {
    this.name = null;
    this.displayName = null;
    this.type = null;
    this.initialValue = null;

    this.relatedTargets = {};
    this.meta = {};
}
Property.prototype.toString = function () {
    return "[Property: " + this.name + "]";
};
Property.prototype.isSimilarTo = function (property) {
    return this.name == property.name &&
            this.type == property.type;
};


function Behavior() {
    this.target = null;
    this.items = [];
}
Behavior.prototype.toString = function () {
    return "[Behavior: for " + this.target + "]";
};



function BehaviorItem() {
    this.handler = null;
    this.args = [];
}
BehaviorItem.prototype.toString = function () {
    return "[BehaviorItem: " + this.handler + "]";
};



function BehaviorItemArg(literal, shapeDef, currentTarget, type) {
    this.literal = literal;
    this.type = type ? type : null;

    if (!this.type) {
        //preprocessing expression literal
        this.literal = this.literal.replace(/\$([a-z][a-z0-9]*)/gi, function (zero, one) {
            var property = shapeDef.getProperty(one);
            if (!property) {
                throw Util.getMessage("invalid.property.reference", one);
            }
            property.relatedTargets[currentTarget] = true;
            return "properties." + one;
        });
    }
}
BehaviorItemArg.prototype.toString = function () {
    return "[BehaviorItemArg: " + this.literal + "]";
};

function ShapeAction() {
    this.id = null;
    this.displayName = null;
    this.implFunction = null;
}
ShapeAction.prototype.toString = function () {
    return "[ShapeAction: " + this.implFunction + "]";
};

function Shortcut() {
    this.id = null;
    this.name = "";
    this.displayName = "";

    this.shape = null;
    this.propertyMap = {};
}










