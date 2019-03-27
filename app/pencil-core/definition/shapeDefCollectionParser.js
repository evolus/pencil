// Copyright (c) Evolus Solutions. All rights reserved.
// License: GPL/MPL
// $Id$

/* class */ function ShapeDefCollectionParser() {
}
ShapeDefCollectionParser.prototype.injectEntityDefs = function (content, file) {
	//getting the current local
	var locale = Config.getLocale();

	var dtdFile = file.parent.clone();
	debug("Locale: " + locale + ", appending to: " + dtdFile.path);
	dtdFile.append(locale + ".dtd");

	if (!dtdFile.exists()) {
		dtdFile = file.parent.clone();
		dtdFile.append("default.dtd");

		if (!dtdFile.exists()) {
		    dtdFile = file.parent.clone();
		    dtdFile.append("en-US.dtd");

		    if (!dtdFile.exists()) {
			    return content;
		    }
		}
	}

	var dtdContent = FileIO.read(dtdFile, ShapeDefCollectionParser.CHARSET);

	var doctypeContent = "<!DOCTYPE Shapes [\n" + dtdContent + "\n]>\n";

	content = content.replace(/(<Shapes)/, function (zero, one) {
			return doctypeContent + one;
		});

	return content;
};
ShapeDefCollectionParser.prototype.injectEntityDefsFromUrl = function (content, url) {
    // try {
    //     //getting the current local
    //     var locale = "en-US";
    //     var dtdUrl = url.replace(/Definition\.xml$/, locale + ".dtd");
    //
    //     var request = new XMLHttpRequest();
    //     request.open("GET", dtdUrl, false);
    //     request.send("");
    //     var doctypeContent = request.responseText;
    //     if (doctypeContent && doctypeContent.length && request.status != 404) {
    //         doctypeContent = "<!DOCTYPE Shapes [\n" + doctypeContent + "\n]>\n";
    //
    //         content = content.replace(/(<Shapes)/, function (zero, one) {
    //             return doctypeContent + one;
    //         });
    //     }
    // } catch (ex) {
    // }
	return content;
};
ShapeDefCollectionParser.CHARSET = "UTF-8";
ShapeDefCollectionParser.getCollectionPropertyConfigName = function (collectionId, propName) {
    return "Collection." + collectionId + ".properties." + propName;
};

/* public ShapeDefCollection */ ShapeDefCollectionParser.prototype.parseURL = function (url) {
    try {
        var dom = null;
        if (url.match(/^[a-z]+:\/\/.*/)) {
            var request = new XMLHttpRequest();
            request.open("GET", url, false);
            request.send("");

            var content = this.injectEntityDefsFromUrl(request.responseText, url)
            var domParser = new DOMParser();
            var dom = domParser.parseFromString(content, "text/xml");
        } else {
            dom = Dom.parseFile(url);
        }

        var collection = this.parse(dom, url);
        collection._location = url;
        collection.installDirPath = path.dirname(url);

        return collection;
    } catch (e) {
        Console.dumpError(e, "stdout");
        error(e);
    }
};

/* void */ ShapeDefCollectionParser.prototype.parseURLAsync = function (url, callback) {
    try {
        var thiz = this;

        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.onreadystatechange = function (event) {
            if (request.readyState != 4) return;

            if (request.status != 200 && request.status != 0) {
                callback(null, "file loading failed");
                return;
            }

            try {
                var content = thiz.injectEntityDefsFromUrl(request.responseText, url)
                var domParser = new DOMParser();
                dom = domParser.parseFromString(content, "text/xml");
                var collection = thiz.parse(dom, url);
                collection._location = url;

                callback(collection);
            } catch (ex) {
                callback(null, "Parsing failed, " + ex);
            }

        };
        request.send(null);
    } catch (e) {
        callback(null, "Unknown error loading the collection, " + e);
        Console.dumpError(e, "stdout");
        error(e);
    }
};
/* public ShapeDefCollection */ ShapeDefCollectionParser.prototype.parseFile = function (file, uri) {
    try {
        var fileContents = FileIO.read(file, ShapeDefCollectionParser.CHARSET);
        var domParser = new DOMParser();


        fileContents = this.injectEntityDefs(fileContents, file)

        var dom = domParser.parseFromString(fileContents, "text/xml");

        var collection = this.parse(dom, uri);
        collection._location = uri;

        return collection;
    } catch (e) {
        Console.dumpError(e, "stdout");
    }
};

ShapeDefCollectionParser.prototype.loadBuiltinPrivateCollection = function (installDirPath) {
    var collectionFile = path.join(installDirPath, "PrivateCollection.xml");
    if (!fs.existsSync(collectionFile)) return null;
    
    var collection = PrivateCollectionManager.parseSingleCollectionFile(collectionFile);
    return collection;
};

ShapeDefCollectionParser.prototype.loadCustomLayout = function (installDirPath, collection) {
    var layoutUri = path.join(installDirPath, "Layout.xhtml");
    if (!fs.existsSync(layoutUri)) return null;

    try {
        var html = fs.readFileSync(layoutUri, {encoding: "utf8"});
        if (!html) return null;

        var dom = Dom.parseDocument(html);

        var container = Dom.getSingle("/html:html/html:body", dom);
        if (!container) container = dom.documentElement;

        var div = dom.createElementNS(PencilNamespaces.html, "div");
        while (container.firstChild) {
            var n = container.firstChild;
            container.removeChild(n);
            div.appendChild(n);
        }

        Dom.workOn("//html:img[@src]", div, function (image) {
            var src = image.getAttribute("src");
            if (src && src.indexOf("data:image") != 0) {
                var parts = src.split("/");
                src = installDirPath;
                for (var p of parts) src = path.join(src, p);

                image.setAttribute("src", src);
                if (collection) collection.previewURL = src;
            }
        });

        return document.importNode(div, true);

    } catch (ex) {
        console.error(ex);
    }

    return null;
};
/* public ShapeDefCollection */ ShapeDefCollectionParser.prototype.parse = function (dom, uri) {
    var collection = new ShapeDefCollection();
    collection.url = uri ? uri : dom.documentURI;
    collection.installDirPath = path.dirname(uri);

    collection.customLayout = this.loadCustomLayout(collection.installDirPath, collection);
    collection.builtinPrivateCollection = this.loadBuiltinPrivateCollection(collection.installDirPath);

    var s1 = collection.url.toString();
    var s2 = window.location.href.toString();

    var max = Math.min(s1.length, s2.length);
    var i = 0;
    for (i = 0; i < max; i++) {
        if (s1[i] != s2[i] ) break;
    }
    collection.relURL = s1.substring(i);

    var shapeDefsNode = dom.documentElement;
    collection.id = shapeDefsNode.getAttribute("id");
    collection.displayName = shapeDefsNode.getAttribute("displayName");
    collection.description = shapeDefsNode.getAttribute("description");
    collection.author = shapeDefsNode.getAttribute("author");
    collection.infoUrl = shapeDefsNode.getAttribute("url");
    collection.system = shapeDefsNode.getAttribute("system") == "true";
    collection.fonts = [];

    Dom.workOn("./p:Script", shapeDefsNode, function (scriptNode) {
        var context = { collection: collection };
        try {
            pEval(scriptNode.textContent, context, "COLLECTION_SCRIPT: " + collection.displayName + ", " + collection.relURL + " (" + scriptNode.getAttribute("comments") + ")");
        } catch (e) {
            console.error("Collection script evaluation failed: " + collection.displayName, e);
        }
    });
    Dom.workOn("./p:Fonts/p:Font", shapeDefsNode, function (fontNode) {
        var font = {
            name: fontNode.getAttribute("name")
        };

        for (var variantName in FontRepository.SUPPORTED_VARIANTS) {
            var filePath = fontNode.getAttribute(variantName);
            if (filePath) font[variantName] = filePath;
        }

        collection.fonts.push(font);
    });

    this.parseCollectionProperties(shapeDefsNode, collection);

    var parser = this;

    Dom.workOn("./p:Shape | ./p:Shortcut", shapeDefsNode, function (node) {
        if (node.localName == "Shape") {
            collection.addDefinition(parser.parseShapeDef(node, collection));
        } else {
            collection.addShortcut(parser.parseShortcut(node, collection));
        }

    });
    
    return collection;
};

/* private void */ ShapeDefCollectionParser.prototype.parseCollectionProperties = function (shapeDefsNode, collection) {
    Dom.workOn("./p:Properties/p:PropertyGroup", shapeDefsNode, function (propGroupNode) {
        var group = new PropertyGroup;
        group.name = propGroupNode.getAttribute("name");

        Dom.workOn("./p:Property", propGroupNode, function (propNode) {
            var property = new Property();
            property.name = propNode.getAttribute("name");
            property.displayName = propNode.getAttribute("displayName");

            var type = propNode.getAttribute("type");
            try {
                property.type = window[type];
            } catch (e) {
                alert(e);
                throw Util.getMessage("invalid.property.type", type);
            }
            var literal = Dom.getText(propNode);

            property.initialValue = property.type.fromString(Dom.getText(propNode));

            try {
                var s = Config.get(ShapeDefCollectionParser.getCollectionPropertyConfigName (collection.id, property.name));
                if (typeof(s) != "undefined" && s != null) {
                    property.value = property.type.fromString(s);
                } else {
                    property.value = property.initialValue;
                }
            } catch (e) {
                property.value = property.initialValue;
            }

            //parsing meta
            Dom.workOn("./@p:*", propNode, function (metaAttribute) {
                var metaValue = metaAttribute.nodeValue;
                metaValue = metaValue.replace(/\$([a-z][a-z0-9]*)/gi, function (zero, one) {
                    property.relatedProperties[one] = true;
                    return "properties." + one;
                });
                property.meta[metaAttribute.localName] = metaValue;
            });

            group.properties.push(property);
            collection.properties[property.name] = property;
        });

        collection.propertyGroups.push(group);
    });

    /*/ styles
    Dom.workOn("./p:Styles/p:Group", shapeDefsNode, function (styleGroupNode) {
        var group = new StyleGroup;
        group.name = styleGroupNode.getAttribute("name");

        Dom.workOn("./p:Style", styleGroupNode, function (styleNode) {
            var style = new Style();
            style.name = styleNode.getAttribute("name");
            style.iconPath = styleNode.getAttribute("icon");
            if (style.iconPath && style.iconPath.indexOf("data:image") != 0) {
                style.iconPath = collection.url.substring(0, collection.url.lastIndexOf("/") + 1) + style.iconPath;
            }

            Dom.workOn("./p:Property", styleNode, function (propNode) {
                var property = new Property();
                property.name = propNode.getAttribute("name");
                property.displayName = propNode.getAttribute("displayName");
                var type = propNode.getAttribute("type");
                try {
                    property.type = window[type];
                } catch (e) {
                    throw "Invalid property type: " + type;
                }
                var valueElement = Dom.getSingle("./p:*", propNode);
                if (valueElement) {
                    if (valueElement.localName == "Null") {
                        property.value = null;
                    }
                } else {
                    property.value = property.type.fromString(Dom.getText(propNode));
                }

                style.properties[property.name] = property;
            });

            group.styles[style.name] = style;
        });

        collection.styleGroups[group.name] = group;
    });
    //debug(collection.styleGroups);/*/
};
/* public ShapeDef */ ShapeDefCollectionParser.prototype.parseShapeDef = function (shapeDefNode, collection) {
    var shapeDef = new ShapeDef();
    shapeDef.id = collection.id + ":" + shapeDefNode.getAttribute("id");
    shapeDef.displayName = shapeDefNode.getAttribute("displayName");
    shapeDef.system = shapeDefNode.getAttribute("system") == "true";
    shapeDef.collection = collection;
    var inherits = shapeDefNode.getAttribute("inherits");
    if (inherits) {
        if (inherits.indexOf(":") < 0) inherits = collection.id + ":" + inherits;
        var parentShapeDef = collection.shapeDefMap[inherits];
        if (parentShapeDef) {
            shapeDef.parentShapeDef = parentShapeDef;
            this.processInheritance(shapeDef);
        }
    }

    var iconPath = shapeDefNode.getAttribute("icon");
    // if (iconPath.indexOf("data:image") != 0) {
    //     iconPath = collection.url.substring(0, collection.url.lastIndexOf("/") + 1) + iconPath;
    // }
    shapeDef.iconPath = iconPath;

    // adding shapeDef meta
    shapeDef.meta = {};
    Dom.workOn("./@p:*", shapeDefNode, function (metaAttribute) {
        var metaValue = metaAttribute.nodeValue;
        metaValue = metaValue.replace(/\$([a-z][a-z0-9]*)/gi, function (zero, one) {
            property.relatedProperties[one] = true;
            return "properties." + one;
        });
        shapeDef.meta[metaAttribute.localName] = metaValue;
    });

    var parser = this;

    //parse properties
    Dom.workOn("./p:Properties/p:PropertyGroup", shapeDefNode, function (propGroupNode) {
        //find existing property group to support duplicate inherited groups
        var groupName = propGroupNode.getAttribute("name");
        var group = null;
        for (var g of shapeDef.propertyGroups) {
            if (g.name == groupName) {
                group = g;
                break;
            }
        }
        if (!group) {
            group = new PropertyGroup();
            group.name = groupName;
            shapeDef.propertyGroups.push(group);
        }

        Dom.workOn("./p:Property", propGroupNode, function (propNode) {
            var property = new Property();
            property.name = propNode.getAttribute("name");
            property.displayName = propNode.getAttribute("displayName");

			if(propNode.getAttribute("reload")) property.reload = propNode.getAttribute("reload");

            var type = propNode.getAttribute("type");
            try {
                property.type = window[type];
                if (!property.type) {
                    console.error("Unknown type: " + type + ", in " + collection.displayName);
                }
            } catch (e) {
                alert(e);
                throw Util.getMessage("invalid.property.type", type);
            }
            var valueElement = Dom.getSingle("./p:*", propNode);
            if (valueElement) {
                if (valueElement.localName == "E") {
                    var expression = Dom.getText(valueElement);
                    expression = expression.replace(/\$\$([a-z][a-z0-9]*)/gi, function (zero, one) {
                        return "collection.properties." + one + ".value";
                    });

                    property.initialValueExpression = expression;
                } else if (valueElement.localName == "Null") {
                    property.initialValue = null;
                }
            } else {
                property.initialValue = property.type.fromString(Dom.getText(propNode));
            }

            property.relatedProperties = {};
            //parsing meta
            Dom.workOn("./@p:*", propNode, function (metaAttribute) {
                var metaValue = metaAttribute.nodeValue;
                metaValue = metaValue.replace(/\$([a-z][a-z0-9]*)/gi, function (zero, one) {
                    property.relatedProperties[one] = true;
                    return "properties." + one;
                });
                property.meta[metaAttribute.localName] = metaValue;
            });

            if (shapeDef.propertyMap[property.name]) {
                shapeDef.removeProperty(property.name);
            }

            group.properties.push(property);
            shapeDef.propertyMap[property.name] = property;
        });
    });

    /*/ styles
    for (var kk in collection.styleGroups) {
        shapeDef.styleGroups[kk] = collection.styleGroups[kk];
    }

    Dom.workOn("./p:Styles/p:Group", shapeDefNode, function (styleGroupNode) {
        var name = styleGroupNode.getAttribute("name");
        var group = new StyleGroup;
        if (shapeDef.styleGroups[name]) {
            group = shapeDef.styleGroups[name];
        }
        group.name = name;

        Dom.workOn("./p:Style", styleGroupNode, function (styleNode) {
            var style = new Style();
            var name = styleNode.getAttribute("name");
            if (group.styles[name]) {
                style = group.styles[name];
            }
            style.name = styleNode.getAttribute("name");
            style.iconPath = styleNode.getAttribute("icon");
            if (style.iconPath && style.iconPath.indexOf("data:image") != 0) {
                style.iconPath = collection.url.substring(0, collection.url.lastIndexOf("/") + 1) + style.iconPath;
            }

            Dom.workOn("./p:Property", styleNode, function (propNode) {
                var property = new Property();
                var name = propNode.getAttribute("name");
                if (style.properties[name]) {
                    property = style.properties[name];
                }
                property.name = propNode.getAttribute("name");
                property.displayName = propNode.getAttribute("displayName");
                var type = propNode.getAttribute("type");
                try {
                    property.type = window[type];
                } catch (e) {
                    alert(e);
                    throw "Invalid property type: " + type;
                }
                var valueElement = Dom.getSingle("./p:*", propNode);
                if (valueElement) {
                    if (valueElement.localName == "Null") {
                        property.value = null;
                    }
                } else {
                    property.value = property.type.fromString(Dom.getText(propNode));
                }

                style.properties[property.name] = property;
            });

            group.styles[style.name] = style;
        });

        shapeDef.styleGroups[group.name] = group;
    });
    8*/

    //parse behaviors
    Dom.workOn("./p:Behaviors/p:For", shapeDefNode, function (forNode) {
        var targets = forNode.getAttribute("ref");
        if (targets) {
            targets = targets.split(",");
            for (var t = 0; t < targets.length; t++) {
                var behavior = new Behavior();
                behavior.target = targets[t];

                shapeDef.behaviorMap[behavior.target] = behavior;

                Dom.workOn("./p:*", forNode, function (behaviorItemNode) {
                    var item = new BehaviorItem();
                    item.handler = Pencil.behaviors[behaviorItemNode.localName];
                    var count = Dom.workOn("./p:Arg", behaviorItemNode, function (argNode) {
                        item.args.push(new BehaviorItemArg(Dom.getText(argNode), shapeDef, behavior.target, argNode.getAttribute("literal")));
                    });

                    if (count == 0) {
                        var text = Dom.getText(behaviorItemNode);
                        item.args.push(new BehaviorItemArg(text, shapeDef, behavior.target, null));
                    }

                    behavior.items.push(item);
                });

                shapeDef.behaviors.push(behavior);
            }
        }
    });

    //parsing actions
    Dom.workOn("./p:Actions/p:Action", shapeDefNode, function (actionNode) {

        var action = new ShapeAction();
        action.id = actionNode.getAttribute("id");
        action.displayName = actionNode.getAttribute("displayName");
        action.meta = {};

        Dom.workOn("./@p:*", actionNode, function (metaAttribute) {
            var metaValue = metaAttribute.nodeValue;
            metaValue = metaValue.replace(/\$([a-z][a-z0-9]*)/gi, function (zero, one) {
                return "properties." + one;
            });
            action.meta[metaAttribute.localName] = metaValue;
        });

        var implNode = Dom.getSingle("./p:Impl", actionNode);
        var text = implNode.textContent;
        action.implFunction = null;
        try {
            action.implFunction = function () {
                var s = "var x = function () { " + text + "}; x.apply(contextObject)";
                return pEval(s, {contextObject: this});
            };
        } catch (e) {
            Console.dumpError(e);
        }

        if (shapeDef.actionMap[action.id]) {
            shapeDef.removeAction(action.id);
        }

        shapeDef.actionMap[action.id] = action;
        shapeDef.actions.push(action);

    });

    // pickup the content node
    shapeDef.contentNode = Dom.getSingle("./p:Content", shapeDefNode);

    // replacing id -> p:name
    Dom.workOn(".//*[@id]", shapeDef.contentNode, function (node) {
        var id = node.getAttribute("id");
        node.setAttributeNS(PencilNamespaces.p, "p:name", id);
        node.removeAttribute("id");
    });


    var parentContentPlaceHolder = Dom.getSingle(".//p:ParentContent", shapeDef.contentNode);
    if (parentContentPlaceHolder && shapeDef.parentShapeDef && shapeDef.parentShapeDef.contentNode) {
        var f = shapeDef.contentNode.ownerDocument.createDocumentFragment();
        for (var i = 0; i < shapeDef.parentShapeDef.contentNode.childNodes.length; i ++) {
            var child = shapeDef.parentShapeDef.contentNode.childNodes[i];
            child = shapeDef.contentNode.ownerDocument.importNode(child, true);
            f.appendChild(child);
        }

        parentContentPlaceHolder.parentNode.replaceChild(f, parentContentPlaceHolder);
    }

    return shapeDef;
};

/* public ShapeDef */ ShapeDefCollectionParser.prototype.processInheritance = function (shapeDef) {
// this.contentNode = null;
// this.propertyGroups = [];
// this.behaviors = [];
// this.actions = [];
//
// this.propertyMap = {};
// this.behaviorMap = {};
// this.actionMap = {};

    shapeDef.propertyGroups = [].concat();
    for (var group of shapeDef.parentShapeDef.propertyGroups) {
        var clonedGroup = group.clone();
        shapeDef.propertyGroups.push(clonedGroup);

        for (var prop of clonedGroup.properties) {
            shapeDef.propertyMap[prop.name] = prop;
        }
    }

    shapeDef.behaviors = [].concat(shapeDef.parentShapeDef.behaviors);
    for (var name in shapeDef.parentShapeDef.behaviorMap) {
        shapeDef.behaviorMap[name] = shapeDef.parentShapeDef.behaviorMap[name];
    }

    shapeDef.actions = [].concat(shapeDef.parentShapeDef.actions);
    for (var name in shapeDef.parentShapeDef.actionMap) {
        shapeDef.actionMap[name] = shapeDef.parentShapeDef.actionMap[name];
    }
};
/* public Shortcut */ ShapeDefCollectionParser.prototype.parseShortcut = function (shortcutNode, collection) {
    var shortcut = new Shortcut();

    shortcut.displayName = shortcutNode.getAttribute("displayName");
    shortcut.system = shortcutNode.getAttribute("system") == "true";
    shortcut.collection = collection;
    var iconPath = shortcutNode.getAttribute("icon");
    // if (iconPath.indexOf("data:image") != 0) {
    //     iconPath = collection.url.substring(0, collection.url.lastIndexOf("/") + 1) + iconPath;
    // }
    shortcut.iconPath = iconPath;

    var to = shortcutNode.getAttribute("to");
    var shapeId = (to.indexOf(":") > 0) ? to : collection.id + ":" + to;

    var shapeDef = (to.indexOf(":") > 0) ?
                        CollectionManager.shapeDefinition.locateDefinition(shapeId) : collection.getShapeDefById(shapeId);


    if (!shapeDef) throw Util.getMessage("bad.shortcut.target.not.found", shapeId);

    shortcut.shape = shapeDef;
    shortcut.id = "system:ref:" + shortcut.displayName.replace(/[^a-z0-9]+/gi, "_").toLowerCase() + shortcut.shape.id;

    //parse property values
    Dom.workOn(".//p:PropertyValue", shortcutNode, function (propValueNode) {
        var name = propValueNode.getAttribute("name");

        var valueElement = Dom.getSingle("./p:*", propValueNode);
        var spec = {};
        if (valueElement) {
            if (valueElement.localName == "E") {
                var expression = Dom.getText(valueElement);
                expression = expression.replace(/\$\$([a-z][a-z0-9]*)/gi, function (zero, one) {
                    return "collection.properties." + one + ".value";
                });

                spec.initialValueExpression = expression;
            } else if (valueElement.localName == "Null") {
                spec.initialValue = null;
            }
        } else {
            var type = shapeDef.getProperty(name).type;
            spec.initialValue = type.fromString(Dom.getText(propValueNode));
            spec.collection = collection;
        }

        shortcut.propertyMap[name] = spec;
    });

    shortcut.propertyMap._collection = collection;

    return shortcut;
};
