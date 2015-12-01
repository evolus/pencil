// Copyright (c) Evolus Solutions. All rights reserved.
// License: GPL/MPL
// $Id$

/* class */ function ShapeDefCollection() {
    this.id = null;
    this.displayName = null;

    this.customLayout = null;
    this.shapeDefs = [];
    this.shapeDefMap = {};
    this.shortcutMap = {};
    this.propertyGroups = [];
    this.properties = {};
}
/* public void */ ShapeDefCollection.prototype.addDefinition = function (shapeDef) {
    this.shapeDefs.push(shapeDef);
    this.shapeDefMap[shapeDef.id] = shapeDef;
};
/* public void */ ShapeDefCollection.prototype.addShortcut = function (shortcut) {
    this.shapeDefs.push(shortcut);
    this.shortcutMap[this.id + ":" + shortcut.displayName] = shortcut;
};
/* public ShapeDef */ ShapeDefCollection.prototype.getShapeDefById = function (id) {
    return this.shapeDefMap[id];
};
/* public ShapeDef */ ShapeDefCollection.prototype.getShortcutByDisplayName = function (name) {
    return this.shortcutMap[name];
};
/* public override String */ ShapeDefCollection.prototype.toString = function () {
    return "[ShapeDefCollection: " + this.id + "]";
};


