/*
    Evolus Commons DOM
    Copyright (c) Evolus Solutions. All rights reserved.

    $Id: evolus.common-dom.js,v 1.4 2007/06/06 08:43:42 dgthanhan Exp $
*/

/*
    @dependencies: <none>
*/

/*
    Reference Definition
*/

if (window.EVOLUS_COMMON_DOM) {
    window.EVOLUS_COMMON_DOM.count ++;
    alert("Reference Error:\n" +
            "Duplicated references of Evolus Common Dom found. Ref. count = " + (window.EVOLUS_COMMON_DOM.count));
} else {
    window.EVOLUS_COMMON_DOM = new Object();
    window.EVOLUS_COMMON_DOM.count = 1;
}

if (!window.console) window.console = {};
if (!window.console.log) window.console.log = function () { };

function __extend() {
    var __base = arguments[0];
    var sub = arguments[1];

    sub.prototype = Object.create(__base.prototype);
    sub.prototype.constructor = sub;
    sub.__base = __base;

    for (var i = 2; i < arguments.length; i ++) {
        var f = arguments[i];
        sub.prototype[f.name] = f;
    }

    return sub;
}

var Namespaces = { };

Namespaces["p"] = "http://www.evolus.vn/Namespace/Pencil";
Namespaces["svg"] = "http://www.w3.org/2000/svg";
Namespaces["xlink"] = "http://www.w3.org/1999/xlink";
Namespaces["xul"] = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
Namespaces["html"] = "http://www.w3.org/1999/xhtml";
Namespaces["xbl"] = "http://www.mozilla.org/xbl";

Namespaces["inkscape"] = "http://www.inkscape.org/namespaces/inkscape";
Namespaces["dc"] = "http://purl.org/dc/elements/1.1/";
Namespaces["cc"] = "http://creativecommons.org/ns#";
Namespaces["rdf"] = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
Namespaces["sodipodi"] = "http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd";
Namespaces["webui"] = "http://evolus.vn/Namespaces/WebUI/1.0";

var PencilNamespaces = Namespaces;


Namespaces.resolve = function (prefix) {
    var uri = Namespaces[prefix];
    if (uri) return uri;

    return null;
};

function Dom() {
}


Dom.workOn = function (xpath, node, worker) {
    var nodes = Dom.getList(xpath, node);

    for (var i = 0; i < nodes.length; i ++) {
        worker(nodes[i]);
    }
    return nodes.length;
};
Dom.getText = function (node) {
    return node.textContent;
};

Dom.getSingle = function (xpath, node) {
    if (document.all) {
        node.ownerDocument.setProperty("SelectionLanguage", "XPath");
        return node.selectSingleNode(xpath);
    }
    var doc = node.ownerDocument ? node.ownerDocument : node;
    var xpathResult = doc.evaluate(xpath, node, Namespaces.resolve, XPathResult.ANY_TYPE, null);
    return xpathResult.iterateNext();
};
Dom.getList = function (xpath, node) {
    //alert(node.selectNodes);
    if (document.all) {
        node.ownerDocument.setProperty("SelectionLanguage", "XPath");
        return node.selectNodes(xpath);
    }

    var doc = node.ownerDocument ? node.ownerDocument : node;
    var xpathResult = doc.evaluate(xpath, node, Namespaces.resolve, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    var nodes = [];
    var next = xpathResult.iterateNext();
    while (next) {
        nodes.push(next);
        next = xpathResult.iterateNext();
    }

    return nodes;
}
Dom.setEnabled = function (enabled) {
	for (var i = 1; i < arguments.length; i ++) {
		arguments[i].disabled = !enabled;
		if (enabled) {
			arguments[i].removeAttribute("disabled");
		} else {
			arguments[i].setAttribute("disabled", "true");
		}
	}
};
Dom.getChildValue = function (xpath, node) {
    try {
        return Dom.getSingle(xpath, node).nodeValue;
    } catch (e) {
        return null;
    }
};
Dom.isElementExistedInDocument = function(element) {
    while (element) {
        if (element == document) {
            return true;
        }
        element = element.parentNode;
    }
    return false;
}

Dom.registerEvent = function (target, event, handler, capture) {
    if (!target) {
        //console.log("Can not register event to NULL target", event, handler);
        return;
    }
    if (event == "wheel") {
        window.addWheelListener(target, handler, capture);
        return;
    }

    var useCapture = false;
    if (capture) {
        useCapture = true;
    }
    if (target.addEventListener) {
        target.addEventListener(event, handler, useCapture);
    } else if (target.attachEvent) {
        target.attachEvent("on" + event, handler);
    }
};

Dom.unregisterEvent = function (target, event, handler, capture) {
    var useCapture = false;
    if (capture) {
        useCapture = true;
    }
    if (target.removeEventListener) {
        target.removeEventListener(event, handler, useCapture);
    } else if (target.dettachEvent) {
        target.dettachEvent("on" + event, handler);
    }
};
Dom.empty = function (node) {
    if (!node) return;
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
};
Dom.disableEvent = function (node, event) {
    Dom.registerEvent(node, event, function(ev) {Dom.cancelEvent(ev);}, true );
};

Dom.getEvent = function (e) {
    return window.event ? window.event : e;
};

Dom.getTarget = function (e) {
    if (!e) return {};
    var event = Dom.getEvent(e);
    return event.srcElement ? event.srcElement : event.originalTarget;
};

Dom.getWheelDelta = function (e) {
    var event = Dom.getEvent(e);
    var delta = 0;
    if (event.wheelDelta) { /* IE/Opera. */
            delta = event.wheelDelta/120;
            /** In Opera 9, delta differs in sign as compared to IE.
                */
    } else if (event.detail) { /** Mozilla case. */
            /** In Mozilla, sign of delta is different than in IE.
                * Also, delta is multiple of 3.
                */
            delta = -event.detail/3;
    }

    return delta;
};

Dom.emitEvent = function (name, sourceElement, options) {
    var evt = null;
    if (document.createEvent) {
        evt = document.createEvent("HTMLEvents");
        if (evt.initEvent) {
            evt.initEvent(name, true, false);
        }
    } else if (document.createEventObject) {
        evt = document.createEventObject();
        evt.eventType = name;
    }
    if (!evt) {
       //console.log("Can not find method create event to emit event" , name);
       return;
    }
    evt.eventName = name;

    for (n in options) evt[n] = options[n];

    //console.log("emit event on " , sourceElement.tagName, name);
    if (sourceElement.dispatchEvent) {
        sourceElement.dispatchEvent(evt);
    } else if (sourceElement.fireEvent) {
        sourceElement.fireEvent('on'+ evt.eventType, evt);
    } else if (sourceElement[name]) {
        sourceElement[name]();
    } else if (sourceElement['on'+name]) {
        sourceElement['on'+name]();
    }

};

Dom.getEventOffset = function (e, to) {
    var x = 0;
    var y = 0;

    if (to) {
        x = Dom.getOffsetLeft(to);
        y = Dom.getOffsetTop(to);
    }

    var event = Dom.getEvent(e);
    if (typeof(event.pageX) != "undefined" || typeof(event.pageY) != "undefined") {
        return {
            x: event.pageX - x,
            y: event.pageY - y
        }
    } else {
        return {
            x: event.clientX + Dom.getScrollLeft() - x,
            y: event.clientY + Dom.getScrollTop() - y
        }
    }
};

Dom.getTouchOffset = function (t, to) {
    var x = 0;
    var y = 0;

    if (to) {
        x = Dom.getOffsetLeft(to);
        y = Dom.getOffsetTop(to);
    }

    return {
        x: t.pageX - x,
        y: t.pageY - y
    }
};

Dom.getEventScreenX = function (event) {
    if (event.touches && event.touches.length == 1) {
        return event.touches[0].screenX;
    } else {
        return event.screenX;
    }
};
Dom.getEventScreenY = function (event) {
    if (event.touches && event.touches.length == 1) {
        return event.touches[0].screenY;
    } else {
        return event.screenY;
    }
};
Dom.isMultiTouchEvent = function (event) {
    return event.touches && event.touches.length > 1;
};

Dom.cancelEvent = function (e) {
    var event = Dom.getEvent(e);
    if (event.preventDefault) {
        event.preventDefault();
    } else if (event.stopPropagation) {
        event.stopPropagation();
    } else event.returnValue = false;
};
Dom.cancelEventBubbling = function (e) {
    if (event.stopPropagation) {
        event.stopPropagation();
    } else {
        e.cancelBubble = true;
    }
}

Dom.addClass = function (node, className) {
    if (!node) return;
    if ((" " + node.className + " ").indexOf(" " + className + " ") >= 0) return;
    node.className += " " + className;
};
Dom.removeClass = function (node, className) {
    if (!node) return;
    if (node.className == className) {
        node.className = "";
        return;
    }
    var re = new RegExp("(^" + className + " )|( " + className + " )|( " + className + "$)", "g");
    var reBlank = /(^[ ]+)|([ ]+$)/g;
    node.className = node.className ? node.className.replace(re, " ").replace(reBlank, "") : "";
};
Dom.toggleClass = function (node, className, add) {
    if (add) {
        Dom.addClass(node, className);
    } else {
        Dom.removeClass(node, className);
    }
}


Dom.getOffsetLeft = function (control) {
    var offset = control.offsetLeft;
    var parent = control.offsetParent;
    if (parent) if (parent != control) return offset + Dom.getOffsetLeft(parent);
    return offset;
};

Dom.getOffsetTop = function (control) {
    var offset = control.offsetTop;
    var parent = control.offsetParent;
    if (parent) if (parent != control) {
        var d = parent.scrollTop || 0;
        return offset + Dom.getOffsetTop(parent) - d;
    }
    return offset;
};

Dom.getOffsetHeight = function (control) {
    return control ? control.offsetHeight : 0;
};

Dom.getOffsetWidth = function (control) {
    return control ? control.offsetWidth : 0;
};

Dom.getWindowHeight = function () {
  if ( typeof( window.innerWidth ) == 'number' ) {
    return window.innerHeight;
  } else if ( document.documentElement &&
      ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
    return document.documentElement.clientHeight;
  } else if ( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
    return document.body.clientHeight;
  }
  return 0;
};

Dom.getWindowWidth = function () {
  if ( typeof( window.innerWidth ) == 'number' ) {
    return window.innerWidth;
  } else if ( document.documentElement &&
      ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
    return document.documentElement.clientWidth;
  } else if ( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
    return document.body.clientWidth;
  }
  return 0;
};

Dom.getScrollTop = function () {
  if ( typeof( window.pageYOffset ) == 'number' ) {
    //Netscape compliant
    return window.pageYOffset;
  } else if ( document.body && ( document.body.scrollLeft || document.body.scrollTop ) ) {
    //DOM compliant
    return  document.body.scrollTop;
  } else if ( document.documentElement &&
      ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
    //IE6 standards compliant mode
    return  document.documentElement.scrollTop;
  }
  return 0;
};

Dom.getScrollLeft = function () {
  if ( typeof( window.pageXOffset ) == 'number' ) {
    //Netscape compliant
    return window.pageXOffset;
  } else if ( document.body && ( document.body.scrollLeft || document.body.scrollTop ) ) {
    //DOM compliant
    return  document.body.scrollLeft;
  } else if ( document.documentElement &&
      ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
    //IE6 standards compliant mode
    return  document.documentElement.scrollLeft;
  }
  return 0;
};
Dom.reformHTML = function (node) {
};
Dom.appendAfter = function (fragment, node) {
    if (!node.parentNode) {
        return;
    }
    if (node.nextSibling) {
        node.parentNode.insertBefore(fragment, node.nextSibling);
    } else {
        node.parentNode.appendChild(fragment);
    }
    //Dom.reformHTML(node.parentNode);
};
Dom.insertBefore = function (fragment, node) {
    if (!node.parentNode) {
        return;
    }
    node.parentNode.insertBefore(fragment, node);
    Dom.reformHTML(node.parentNode);
};
Dom.appendParent = function (fragment, node) {
    if (!node.parentNode) {
        return;
    }
    node.parentNode.appendChild(fragment);
    Dom.reformHTML(node.parentNode);
};
Dom.prependParent = function (fragment, node) {
    if (!node.parentNode) {
        return;
    }
    if (node.parentNode.childNodes.length > 0) {
        node.parentNode.insertBefore(fragment, node.parentNode.childNodes[0]);
    } else {
        node.parentNode.appendChild(fragment);
    }
    Dom.reformHTML(node.parentNode);
};
Dom.append = function (fragment, node) {
    node.appendChild(fragment);
    Dom.reformHTML(node);
};
Dom.prepend = function (fragment, node) {
    if (node.childNodes.length > 0) {
        node.insertBefore(fragment, node.childNodes[0]);
    } else node.appendChild(fragment);
    Dom.reformHTML(node);
};
Dom.replace = function (fragment, node) {
    if (!node.parentNode) {
        return;
    }
    node.parentNode.replaceChild(fragment, node);
    Dom.reformHTML(node.parentNode);
};
Dom.xmlToFragment = function (xml) {
    var doc = null;
    var wrappedXml = "<root>" + xml + "</root>";
    if (document.implementation.createDocument) {
        var parser = new DOMParser();
        doc = parser.parseFromString(wrappedXml, "text/xml");
    } else {
        doc = new ActiveXObject("Microsoft.XMLDOM");
        doc.loadXML(wrappedXml);
    }
    var fragment = doc.createDocumentFragment();
    var root = doc.documentElement;
    for(var i = 0; i < root.childNodes.length; i++) {
        fragment.appendChild(root.childNodes[i].cloneNode(true));
    }
    return fragment;

};
Dom.importNode = function (doc, node, importChildren) {
    if (doc.importNode) return doc.importNode(node, importChildren);
    var i = 0;
    switch (node.nodeType) {
        case 11: // DOCUMENT FRAGMENT
            var newNode = doc.createDocumentFragment();
            if (importChildren) {
                for(i = 0; i < node.childNodes.length; i++) {
                    var clonedChild = Dom.importNode(doc, node.childNodes[i], true);
                    if (clonedChild) newNode.appendChild(clonedChild);
                }
            }
            return newNode;
        case 1: // ELEMENT
            var newNode = doc.createElement(node.nodeName);
            for(i = 0; i < node.attributes.length; i++){
                newNode.setAttribute(node.attributes[i].name, node.attributes[i].value);
            }
            if (importChildren) {
                for(i = 0; i < node.childNodes.length; i++) {
                    var clonedChild = Dom.importNode(doc, node.childNodes[i], true);
                    if (clonedChild) newNode.appendChild(clonedChild);
                }
            }
            return newNode;
        case 3: // TEXT
            return doc.createTextNode(node.nodeValue);
    }
    return null;
};
Dom.get = function (id, doc) {
    var targetDocument = doc ? doc : document;
    return targetDocument.getElementById(id);
};
Dom.getTags = function (tag, doc) {
    var targetDocument = doc ? doc : document;
    return targetDocument.getElementsByTagName(tag);
};
Dom.getTag = function (tag, doc) {
    var targetDocument = doc ? doc : document;
    return targetDocument.getElementsByTagName(tag)[0];
};
Dom.isChildOf = function (parent, child) {
    if (!parent || !child) {
        return false;
    }
    if (parent == child) {
        return true;
    }
    return Dom.isChildOf(parent, child.parentNode);
};
Dom.findUpward = function (node, evaluator, limit) {
    if (node == null || (limit && limit(node))) {
        return null;
    }
    if (evaluator.eval(node)) {
        return node;
    }
    return Dom.findUpward(node.parentNode, evaluator);
};
Dom.doUpward = function (node, evaluator, worker) {
    if (node == null) {
        return;
    }
    if (evaluator.eval(node)) {
        worker.work(node);
    }
    return Dom.doUpward(node.parentNode, evaluator, worker);
};
Dom.findChild = function (node, evaluator) {
    if (!node || !node.childNodes) return null;

    for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (evaluator.eval(child)) return child;
    }

    return null;
};
Dom.doOnChild = function (node, evaluator, worker) {
    if (!node || !node.childNodes) return null;

    for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (evaluator.eval(child)) worker(child);
    }

};
Dom.doOnAllChildren = function (node, worker) {
    Dom.doOnChild(node, DomAcceptAllEvaluator, worker);
};
Dom.doOnChildRecursively = function (node, evaluator, worker) {
    if (!node || !node.childNodes) return null;

    for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (evaluator.eval(child)) worker(child);
        Dom.doOnChildRecursively(child, evaluator, worker);
    }

};
Dom.findChildTag = function (node, tag) {
    return Dom.findChild(node, new DomTagNameEvaluator(tag));
};

Dom.findChildWithClass = function (node, className) {
    return Dom.findChild(node, {eval: function (node) {
        return (" " + node.className + " ").indexOf(" " + className + " ") >= 0;
    }});
};
Dom.findDescendantWithClass = function (node, className) {
    if (!node || !node.childNodes) return null;

    for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if ((" " + child.className + " ").indexOf(" " + className + " ") >= 0) return child;
        var descendant = Dom.findDescendantWithClass(child, className);
        if (descendant) return descendant;
    }

    return null;
};
function DomTagNameEvaluator(tagName) {
    this.tagName = tagName.toUpperCase();
}
DomTagNameEvaluator.prototype.eval = function (node) {
    return node && node.tagName && node.tagName.toUpperCase && (node.tagName.toUpperCase() == this.tagName);
};
Dom.findParentWithClass = function (node, className) {
    return Dom.findUpward(node, {
        className: className,
        eval: function (node) {
            return (" " + node.className + " ").indexOf(" " + this.className + " ") >= 0;
        }
    });
};
Dom.findParentByTagName = function (node, tagName) {
    return Dom.findUpward(node, {
        tagName: tagName.toUpperCase(),
        eval: function (node) {
            return node.tagName && node.tagName.toUpperCase && (node.tagName.toUpperCase() == this.tagName);
        }
    });
}
Dom.findParentWithProperty = function (node, property) {
    if (node == null) {
        return null;
    }
    if (typeof(node[property]) != "undefined") {
        return node;
    }
    return Dom.findParentWithProperty(node.parentNode, property);
};
Dom.findParentWithAttribute = function (node, attName, attValue) {
    if (node == null) {
        return null;
    }
    //alert(node);
    if (node.getAttribute) {
        var value = node.getAttribute(attName);
        if (value) {
            if (!attValue) return node;
            if (attValue == value) return node;
        }
    }
    return Dom.findParentWithAttribute(node.parentNode, attName, attValue);
};
Dom.findNonEditableParent = function (node) {
    if (node == null) {
        return null;
    }
    return Dom.findNonEditableParent(node.parentNode);
};
Dom.isTag = function (node, tagName) {
    return (node.tagName && node.tagName.toUpperCase && node.tagName.toUpperCase() == tagName.toUpperCase());
};
Dom.hasClass = function (node, className) {
    return (" " + node.className + " ").indexOf(className) >= 0;
};
Dom.findFirstChild = function(node, tagName) {
    for (var i = 0; i < node.childNodes.length; i ++) {
        var child = node.childNodes[i];
        if (Dom.isTag(child, tagName)) {
            return child;
        }
    }
    return null;
}
Dom.findFirstChildWithClass = function(node, className) {
    for (var i = 0; i < node.childNodes.length; i ++) {
        var child = node.childNodes[i];
        if ((" " + child.className + " ").indexOf(" " + className + " ") >= 0) {
            return child;
        }
    }
    return null;
};
Dom.findLastChild = function(node, tagName) {
    for (var i = node.childNodes.length - 1; i >= 0; i --) {
        var child = node.childNodes[i];
        if (Dom.isTag(child, tagName)) {
            return child;
        }
    }
    return null;
}
Dom.getDocumentBody = function () {
    return document.getElementsByTagName("body")[0];
};
Dom.attrEncode = function (s, preserveCR) {
    preserveCR = preserveCR ? '&#13;' : '\n';
    return ('' + s) /* Forces the conversion to string. */
        .replace(/&/g, '&amp;') /* This MUST be the 1st replacement. */
        .replace(/'/g, '&apos;') /* The 4 other predefined entities, required. */
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        /*
        You may add other replacements here for HTML only
        (but it's not necessary).
        Or for XML, only if the named entities are defined in its DTD.
        */
        .replace(/\r\n/g, preserveCR) /* Must be before the next replacement. */
        .replace(/[\r\n]/g, preserveCR);
        ;
};
Dom.htmlEncode = function (s, skipNewLineProcessing) {
    if (!Dom.htmlEncodePlaceHolder) {
        Dom.htmlEncodePlaceHolder = document.createElement("div");
    }
    Dom.htmlEncodePlaceHolder.innerHTML = "";
    Dom.htmlEncodePlaceHolder.appendChild(document.createTextNode(s));
    var html = Dom.htmlEncodePlaceHolder.innerHTML;
    if (!skipNewLineProcessing) {
        html = html.replace(/[\n]/g, "<br/>");
    }

    return html;
};
Dom.htmlStrip = function (s) {
    if (!Dom.htmlEncodePlaceHolder) {
        Dom.htmlEncodePlaceHolder = document.createElement("div");
    }
    Dom.htmlEncodePlaceHolder.innerHTML = s;
    var t = Dom.getInnerText(Dom.htmlEncodePlaceHolder);
    Dom.htmlEncodePlaceHolder.innerHTML = "";
    return t;
};
Dom.setInnerText = function (node, text, unit) {
    node.innerHTML = "";
    if (unit && text.length > 0)  {
        node.appendChild(node.ownerDocument.createTextNode(text + " " + unit));
    } else {
        node.appendChild(node.ownerDocument.createTextNode(text));
    }

};

Dom.setInnerLineText = function (node, line) {
    if (line.length > 0) {
        for (var i = 0 ; i < line.length; i++) {
            node.innerHTML += line[i];
            if (i < line.length - 1) {
                node.innerHTML += "<br/>";
            }
        }
    }
};

Dom.getInnerText = function (node) {
    if (document.all) return node.innerText;
    if (node.textContent) return node.textContent;
    if (node.firstChild && node.firstChild.value) return node.firstChild.value;

    return "";
};

Dom.installBehavior = function(target, eventName, checker, handler) {
    Dom.registerEvent(target, eventName, function(e) {
                            if (checker.check(e)) {
                                handler.positive();
                            } else {
                                handler.nagative();
                            }
                        });
    Dom.registerEvent(window, "load", function(e) {
                            if (checker.check(null, target)) {
                                handler.positive();
                            } else {
                                handler.nagative();
                            }
                        });
};

Dom.newDOMElement = function (spec, doc, holder) {
    var ownerDocument = doc ? doc : document;
    var e = spec._uri ? ownerDocument.createElementNS(spec._uri, spec._name) : ownerDocument.createElement(spec._name);

    for (name in spec) {
        if (name.match(/^_/)) continue;

        if (name.match(/^([^:]+):(.*)$/)) {
            var prefix = RegExp.$1;
            var localName = RegExp.$2;
            var uri = Namespaces[prefix];
            e.setAttributeNS(uri, name, spec[name]);
        } else {
            e.setAttribute(name, spec[name]);
            if (name == "class") {
                Dom.addClass(e, spec[name]);
            }
        }
    }

    if (spec._text) {
        e.appendChild(e.ownerDocument.createTextNode(spec._text));
    }
    if (spec._cdata) {
        e.appendChild(e.ownerDocument.createCDATASection(spec._cdata));
    }
    if (spec._html) {
        e.innerHTML = spec._html;
    }
    if (spec._children && spec._children.length > 0) {
        e.appendChild(Dom.newDOMFragment(spec._children, e.ownerDocument, holder || null));
    }

    if (holder && spec._id) {
        holder[spec._id] = e;
    }

    return e;
};
Dom.newDOMFragment = function (specs, doc, holder) {
    var ownerDocument = doc ? doc : document;
    var f = ownerDocument.createDocumentFragment();

    for (var i in specs) {
        f.appendChild(Dom.newDOMElement(specs[i], ownerDocument, holder || null));
    }
    return f;
};

function DomSelectedChecker(targetElement) {
    this.targetElement = targetElement;
}
DomSelectedChecker.prototype.check = function (event, t) {
    var target = this.targetElement ? this.targetElement : (t ? t : Dom.getTarget(event));
    return target.checked || target.selected;
};
Dom.SELECTED_CHECKER = new DomSelectedChecker();


var DomAcceptAllEvaluator = {
    eval: function (target) { return true; }
};
function DomValueIsChecker(value) {
    this.value = value;
}
DomValueIsChecker.prototype.check = function (event, t) {
    var target = t ? t : Dom.getTarget(event);

    if (target.value && target.value == this.value) {
        return true;
    }

    if (target.selectedIndex && target.options && target.options[target.selectedIndex]) {
        if (target.options[target.selectedIndex].value == this.value) {
            return true;
        }
    }

    return false;
};

function DomValueInChecker(values) {
    this.values = values;
}
DomValueInChecker.prototype.check = function (event, t) {
    var target = t ? t : Dom.getTarget(event);

    var value = null;
    if (target.value) {
        value = target.value;
    }

    if (target.selectedIndex && target.options && target.options[target.selectedIndex]) {
        value = target.options[target.selectedIndex].value;
    }

    if (value && this.values.indexOf("|" + value + "|") >= 0) {
        return true;
    }
    return false;
};

function DomEnableToggleHandler(control) {
    this.control = control;
}
DomEnableToggleHandler.prototype.positive = function() {
    var firstControl = Dom.disableControls(this.control, false);
    if (firstControl && firstControl.focus) {
        firstControl.focus();
        firstControl.select();
    }
};
DomEnableToggleHandler.prototype.nagative = function() {
    Dom.disableControls(this.control, true);
};
Dom.disableControls = function (element, disabled) {
    var nodeName = element.nodeName.toUpperCase();
    if (nodeName == "INPUT" || nodeName == "TEXTAREA" || nodeName == "SELECT") {
        element.disabled = disabled;

        return element;
    } else if (element.childNodes) {
        var firstControl = null;
        for (var i = 0; i < element.childNodes.length; i ++) {
            var control = Dom.disableControls(element.childNodes[i], disabled);
            if (!firstControl) firstControl = control;
        }
        return firstControl;
    }
};
Dom.calculateSystemScrollbarSize = function () {
    if (Dom.calculatedSystemScrollbarSize) {
        return Dom.calculatedSystemScrollbarSize;
    }

    var wrapper = document.createElement("div");
    wrapper.style.overflow = "scroll";
    wrapper.style.visibility = "hidden";
    wrapper.style.position = "absolute";

    var inner = document.createElement("div");
    inner.style.width = "10px";
    inner.style.height = "10px";
    wrapper.appendChild(inner);

    document.body.appendChild(wrapper);

    Dom.calculatedSystemScrollbarSize = {
        w: Dom.getOffsetWidth(wrapper) - Dom.getOffsetWidth(inner),
        h: Dom.getOffsetHeight(wrapper) - Dom.getOffsetHeight(inner)
    };

    document.body.removeChild(wrapper);

    return Dom.calculatedSystemScrollbarSize;
};

Dom.getBoundingClientRect = function (target) {
    var box = target.getBoundingClientRect();
    var newBox = {top: box.top, bottom: box.bottom, left: box.left, right: box.right};
    newBox.width = box.right - box.left;
    newBox.height = box.bottom - box.top;
    return newBox;
};

Dom.getIframeDocument = function(target) {
    var doc = "";
    if (target.contentDocument) { // DOM
        doc = target.contentDocument;
    } else if (target.contentWindow) { // IE win
        doc = target.contentWindow.document;
    }
    return doc.body.innerHTML
}

function DomVisibilityToggleHandler(control) {
    this.control = control;
}
DomVisibilityToggleHandler.prototype.positive = function() {
    this.control.style.display = "";
};
DomVisibilityToggleHandler.prototype.nagative = function() {
    this.control.style.display = "none";
};
