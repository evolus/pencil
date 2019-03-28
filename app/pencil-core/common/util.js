// Copyright (c) Evolus Solutions. All rights reserved.
// License: GPL/MPL
// $Id$


const IS_MAC = process && /^darwin/.test(process.platform);
const IS_WIN32 = process && /^win/.test(process.platform);

const PR_RDONLY      = 0x01;
const PR_WRONLY      = 0x02;
const PR_RDWR        = 0x04;
const PR_CREATE_FILE = 0x08;
const PR_APPEND      = 0x10;
const PR_TRUNCATE    = 0x20;
const PR_SYNC        = 0x40;
const PR_EXCL        = 0x80;

const DOM_VK_CANCEL = 3
const DOM_VK_HELP = 6
const DOM_VK_BACK_SPACE = 8
const DOM_VK_TAB = 9
const DOM_VK_CLEAR = 12
const DOM_VK_RETURN = 13
const DOM_VK_ENTER = 14
const DOM_VK_SHIFT = 16
const DOM_VK_CONTROL = 17
const DOM_VK_ALT = 18
const DOM_VK_PAUSE = 19
const DOM_VK_CAPS_LOCK = 20
const DOM_VK_ESCAPE = 27
const DOM_VK_SPACE = 32
const DOM_VK_PAGE_UP = 33
const DOM_VK_PAGE_DOWN = 34
const DOM_VK_END = 35
const DOM_VK_HOME = 36
const DOM_VK_LEFT = 37
const DOM_VK_UP = 38
const DOM_VK_RIGHT = 39
const DOM_VK_DOWN = 40
const DOM_VK_PRINTSCREEN = 44
const DOM_VK_INSERT = 45
const DOM_VK_DELETE = 46
const DOM_VK_0 = 48
const DOM_VK_1 = 49
const DOM_VK_2 = 50
const DOM_VK_3 = 51
const DOM_VK_4 = 52
const DOM_VK_5 = 53
const DOM_VK_6 = 54
const DOM_VK_7 = 55
const DOM_VK_8 = 56
const DOM_VK_9 = 57
const DOM_VK_SEMICOLON = 59
const DOM_VK_EQUALS = 61
const DOM_VK_A = 65
const DOM_VK_B = 66
const DOM_VK_C = 67
const DOM_VK_D = 68
const DOM_VK_E = 69
const DOM_VK_F = 70
const DOM_VK_G = 71
const DOM_VK_H = 72
const DOM_VK_I = 73
const DOM_VK_J = 74
const DOM_VK_K = 75
const DOM_VK_L = 76
const DOM_VK_M = 77
const DOM_VK_N = 78
const DOM_VK_O = 79
const DOM_VK_P = 80
const DOM_VK_Q = 81
const DOM_VK_R = 82
const DOM_VK_S = 83
const DOM_VK_T = 84
const DOM_VK_U = 85
const DOM_VK_V = 86
const DOM_VK_W = 87
const DOM_VK_X = 88
const DOM_VK_Y = 89
const DOM_VK_Z = 90
const DOM_VK_CONTEXT_MENU = 93
const DOM_VK_NUMPAD0 = 96
const DOM_VK_NUMPAD1 = 97
const DOM_VK_NUMPAD2 = 98
const DOM_VK_NUMPAD3 = 99
const DOM_VK_NUMPAD4 = 100
const DOM_VK_NUMPAD5 = 101
const DOM_VK_NUMPAD6 = 102
const DOM_VK_NUMPAD7 = 103
const DOM_VK_NUMPAD8 = 104
const DOM_VK_NUMPAD9 = 105
const DOM_VK_MULTIPLY = 106
const DOM_VK_ADD = 107
const DOM_VK_SEPARATOR = 108
const DOM_VK_SUBTRACT = 109
const DOM_VK_DECIMAL = 110
const DOM_VK_DIVIDE = 111
const DOM_VK_F1 = 112
const DOM_VK_F2 = 113
const DOM_VK_F3 = 114
const DOM_VK_F4 = 115
const DOM_VK_F5 = 116
const DOM_VK_F6 = 117
const DOM_VK_F7 = 118
const DOM_VK_F8 = 119
const DOM_VK_F9 = 120
const DOM_VK_F10 = 121
const DOM_VK_F11 = 122
const DOM_VK_F12 = 123
const DOM_VK_F13 = 124
const DOM_VK_F14 = 125
const DOM_VK_F15 = 126
const DOM_VK_F16 = 127
const DOM_VK_F17 = 128
const DOM_VK_F18 = 129
const DOM_VK_F19 = 130
const DOM_VK_F20 = 131
const DOM_VK_F21 = 132
const DOM_VK_F22 = 133
const DOM_VK_F23 = 134
const DOM_VK_F24 = 135
const DOM_VK_NUM_LOCK = 144
const DOM_VK_SCROLL_LOCK = 145
const DOM_VK_COMMA = 188
const DOM_VK_PERIOD = 190
const DOM_VK_SLASH = 191
const DOM_VK_BACK_QUOTE = 192
const DOM_VK_OPEN_BRACKET = 219
const DOM_VK_BACK_SLASH = 220
const DOM_VK_CLOSE_BRACKET = 221
const DOM_VK_QUOTE = 222
const DOM_VK_META = 224

Object.defineProperty(Event.prototype, "originalTarget", {
    get: function () {
        return this.target;
    }
});

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(factory);
    } else if (typeof exports === "object") {
        module.exports = factory();
    } else {
        root.ResizeSensor = factory();
    }
}(this, function () {

    // Make sure it does not throw in a SSR (Server Side Rendering) situation
    if (typeof window === "undefined") {
        return null;
    }
    // Only used for the dirty checking, so the event callback count is limited to max 1 call per fps per sensor.
    // In combination with the event based resize sensor this saves cpu time, because the sensor is too fast and
    // would generate too many unnecessary events.
    var requestAnimationFrame = window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        function (fn) {
            return window.setTimeout(fn, 20);
        };

    /**
     * Iterate over each of the provided element(s).
     *
     * @param {HTMLElement|HTMLElement[]} elements
     * @param {Function}                  callback
     */
    function forEachElement(elements, callback){
        var elementsType = Object.prototype.toString.call(elements);
        var isCollectionTyped = ('[object Array]' === elementsType
            || ('[object NodeList]' === elementsType)
            || ('[object HTMLCollection]' === elementsType)
            || ('[object Object]' === elementsType)
            || ('undefined' !== typeof jQuery && elements instanceof jQuery) //jquery
            || ('undefined' !== typeof Elements && elements instanceof Elements) //mootools
        );
        var i = 0, j = elements.length;
        if (isCollectionTyped) {
            for (; i < j; i++) {
                callback(elements[i]);
            }
        } else {
            callback(elements);
        }
    }

    /**
     * Class for dimension change detection.
     *
     * @param {Element|Element[]|Elements|jQuery} element
     * @param {Function} callback
     *
     * @constructor
     */
    var ResizeSensor = function(element, callback) {
        /**
         *
         * @constructor
         */
        function EventQueue() {
            var q = [];
            this.add = function(ev) {
                q.push(ev);
            };

            var i, j;
            this.call = function() {
                for (i = 0, j = q.length; i < j; i++) {
                    q[i].call();
                }
            };

            this.remove = function(ev) {
                var newQueue = [];
                for(i = 0, j = q.length; i < j; i++) {
                    if(q[i] !== ev) newQueue.push(q[i]);
                }
                q = newQueue;
            }

            this.length = function() {
                return q.length;
            }
        }

        /**
         * @param {HTMLElement} element
         * @param {String}      prop
         * @returns {String|Number}
         */
        function getComputedStyle(element, prop) {
            if (element.currentStyle) {
                return element.currentStyle[prop];
            }
            if (window.getComputedStyle) {
                return window.getComputedStyle(element, null).getPropertyValue(prop);
            }

            return element.style[prop];
        }

        /**
         *
         * @param {HTMLElement} element
         * @param {Function}    resized
         */
        function attachResizeEvent(element, resized) {
            if (element.resizedAttached) {
                element.resizedAttached.add(resized);
                return;
            }

            element.resizedAttached = new EventQueue();
            element.resizedAttached.add(resized);

            element.resizeSensor = document.createElement('div');
            element.resizeSensor.className = 'resize-sensor';
            var style = 'position: absolute; left: 0; top: 0; right: 0; bottom: 0; overflow: hidden; z-index: -1; visibility: hidden;';
            var styleChild = 'position: absolute; left: 0; top: 0; transition: 0s;';

            element.resizeSensor.style.cssText = style;
            element.resizeSensor.innerHTML =
                '<div class="resize-sensor-expand" style="' + style + '">' +
                    '<div style="' + styleChild + '"></div>' +
                '</div>' +
                '<div class="resize-sensor-shrink" style="' + style + '">' +
                    '<div style="' + styleChild + ' width: 200%; height: 200%"></div>' +
                '</div>';
            element.appendChild(element.resizeSensor);

            if (getComputedStyle(element, 'position') == 'static') {
                element.style.position = 'relative';
            }

            var expand = element.resizeSensor.childNodes[0];
            var expandChild = expand.childNodes[0];
            var shrink = element.resizeSensor.childNodes[1];
            var dirty, rafId, newWidth, newHeight;
            var lastWidth = element.offsetWidth;
            var lastHeight = element.offsetHeight;

            var reset = function() {
                expandChild.style.width = '100000px';
                expandChild.style.height = '100000px';

                expand.scrollLeft = 100000;
                expand.scrollTop = 100000;

                shrink.scrollLeft = 100000;
                shrink.scrollTop = 100000;
            };

            reset();

            var onResized = function() {
                rafId = 0;

                if (!dirty) return;

                lastWidth = newWidth;
                lastHeight = newHeight;

                if (element.resizedAttached) {
                    element.resizedAttached.call();
                }
            };

            var onScroll = function() {
                newWidth = element.offsetWidth;
                newHeight = element.offsetHeight;
                dirty = newWidth != lastWidth || newHeight != lastHeight;

                if (dirty && !rafId) {
                    rafId = requestAnimationFrame(onResized);
                }

                reset();
            };

            var addEvent = function(el, name, cb) {
                if (el.attachEvent) {
                    el.attachEvent('on' + name, cb);
                } else {
                    el.addEventListener(name, cb);
                }
            };

            addEvent(expand, 'scroll', onScroll);
            addEvent(shrink, 'scroll', onScroll);
        }

        forEachElement(element, function(elem){
            attachResizeEvent(elem, callback);
        });

        this.detach = function(ev) {
            ResizeSensor.detach(element, ev);
        };
    };

    ResizeSensor.detach = function(element, ev) {
        forEachElement(element, function(elem){
            if(elem.resizedAttached && typeof ev == "function"){
                elem.resizedAttached.remove(ev);
                if(elem.resizedAttached.length()) return;
            }
            if (elem.resizeSensor) {
                if (elem.contains(elem.resizeSensor)) {
                    elem.removeChild(elem.resizeSensor);
                }
                delete elem.resizeSensor;
                delete elem.resizedAttached;
            }
        });
    };

    return ResizeSensor;

}));

(function(){
  var attachEvent = document.attachEvent;
  var isIE = navigator.userAgent.match(/Trident/);
  var requestFrame = (function(){
    var raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
        function(fn){ return window.setTimeout(fn, 20); };
    return function(fn){ return raf(fn); };
  })();

  var cancelFrame = (function(){
    var cancel = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame ||
           window.clearTimeout;
    return function(id){ return cancel(id); };
  })();

  function resizeListener(e){
    var win = e.target || e.srcElement;
    if (win.__resizeRAF__) cancelFrame(win.__resizeRAF__);
    win.__resizeRAF__ = requestFrame(function(){
      var trigger = win.__resizeTrigger__;
      trigger.__resizeListeners__.forEach(function(fn){
        fn.call(trigger, e);
      });
    });
  }

  function objectLoad(e){
    this.contentDocument.defaultView.__resizeTrigger__ = this.__resizeElement__;
    this.contentDocument.defaultView.addEventListener('resize', resizeListener);
  }

  window.addResizeListener = function(element, fn){
    if (!element.__resizeListeners__) {
      element.__resizeListeners__ = [];
      if (attachEvent) {
        element.__resizeTrigger__ = element;
        element.attachEvent('onresize', resizeListener);
      }
      else {
        if (getComputedStyle(element).position == 'static') element.style.position = 'relative';
        var obj = element.__resizeTrigger__ = document.createElement('object');
        obj.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; pointer-events: none; z-index: -1;');
        obj.__resizeElement__ = element;
        obj.onload = objectLoad;
        obj.type = 'text/html';
        if (isIE) element.appendChild(obj);
        obj.data = 'about:blank';
        if (!isIE) element.appendChild(obj);
      }
    }
    element.__resizeListeners__.push(fn);
  };

  window.removeResizeListener = function(element, fn){
    element.__resizeListeners__.splice(element.__resizeListeners__.indexOf(fn), 1);
    if (!element.__resizeListeners__.length) {
      if (attachEvent) element.detachEvent('onresize', resizeListener);
      else {
        element.__resizeTrigger__.contentDocument.defaultView.removeEventListener('resize', resizeListener);
        element.__resizeTrigger__ = !element.removeChild(element.__resizeTrigger__);
      }
    }
  }
})();

/* class */ var Dom = {};

/* static int */ Dom.workOn = function (xpath, node, worker) {
    var nodes = Dom.getList(xpath, node);

    for (var i = 0; i < nodes.length; i ++) {
        worker(nodes[i]);
    }
    return nodes.length;
};
/* static int */ Dom.getText = function (node) {
    return node.textContent;
};

/* static Node */ Dom.getSingle = function (xpath, node) {
    var doc = node.ownerDocument ? node.ownerDocument : node;
    var xpathResult = doc.evaluate(xpath, node, PencilNamespaces.resolve, XPathResult.ANY_TYPE, null);
    return xpathResult.iterateNext();
};
/* static Node */ Dom.getSingleValue = function (xpath, node) {
    var doc = node.ownerDocument ? node.ownerDocument : node;
    var xpathResult = doc.evaluate(xpath, node, PencilNamespaces.resolve, XPathResult.ANY_TYPE, null);
    var node = xpathResult.iterateNext();

    return node ? node.nodeValue : null;
};
/* static Node[] */ Dom.getList = function (xpath, node) {
    var doc = node.ownerDocument ? node.ownerDocument : node;
    var xpathResult = doc.evaluate(xpath, node, PencilNamespaces.resolve, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    var nodes = [];
    var next = xpathResult.iterateNext();
    while (next) {
        nodes.push(next);
        next = xpathResult.iterateNext();
    }

    return nodes;
}
/* public static XmlDocument */ Dom.getImplementation = function () {
    return document.implementation;
};

var domParser = new DOMParser();

/* public static XmlDocument */ Dom.loadSystemXml = function (relPath) {
    var absPath = getStaticFilePath(relPath);
    return Dom.parseFile(absPath);
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
    var useCapture = false;
    if (capture) {
        useCapture = true;
    }
    target.addEventListener(event, handler, useCapture);
};
Dom.getEvent = function (e) {
    return e;
};
Dom.disableEvent = function (node, event) {
    Dom.registerEvent(node, event, function(ev) {Dom.cancelEvent(ev);}, true );
};
Dom.cancelEvent = function (e) {
    var event = Dom.getEvent(e);
    if (event.preventDefault) event.preventDefault();
    else event.returnValue = false;
};
Dom.getTarget = function (e) {
    if (!e) return {};
    var event = Dom.getEvent(e);
    return event.srcElement ? event.srcElement : (event.originalTarget ? event.originalTarget : event.target);
};
Dom.addClass = function (node, className) {
    if (Dom.hasClass(node, className)) return;
    node.className += " " + className;
};
Dom.hasClass = function (node, className) {
    if ((" " + node.className + " ").indexOf(" " + className + " ") >= 0) return true;
    return false;
};
Dom.removeClass = function (node, className) {
    if (node.className == className) {
        node.className = "";
        return;
    }
    var re = new RegExp("(^" + className + " )|( " + className + " )|( " + className + "$)", "g");
    var reBlank = /(^[ ]+)|([ ]+$)/g;
    node.className = (node.className + "").replace(re, " ").replace(reBlank, "");
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

Dom.isChildOf = function (parent, child) {
    if (!parent || !child) {
        return false;
    }
    if (parent == child) {
        return true;
    }
    return Dom.isChildOf(parent, child.parentNode);
};
Dom.findUpwardWithEval = function (node, evaluator, limit) {
    if (node == null || (limit && limit(node))) {
        return null;
    }
    if (evaluator.eval(node)) {
        return node;
    }
    return Dom.findUpward(node.parentNode, evaluator);
};
Dom.findUpward = function (node, evaluator) {
    try {
        if (node == null) {
            return null;
        }
        if (evaluator.eval) {
            return Dom.findUpwardWithEval(node, evaluator);
        }
        if (evaluator(node)) {
            return node;
        }
        return Dom.findUpward(node.parentNode, evaluator);
    } catch (e) { return null; }
};
Dom.findUpwardForData = function (node, dataName) {
    var n = Dom.findUpwardForNodeWithData(node, dataName);
    if (!n) return undefined;
    return n[dataName];
};
Dom.findUpwardForNodeWithData = function (node, dataName) {
    var n = Dom.findUpward(node, function (x) {
        return typeof(x[dataName]) != "undefined";
    });

    return n;
};
// Dom.isChildOf = function (childNode, parentNode) {
//     return Dom.findUpward(childNode, function (node) {
//         return node == parentNode;
//     });
// };
Dom.doUpward = function (node, evaluator, worker) {
    if (node == null) {
        return;
    }
    if (evaluator(node)) {
        worker(node);
    }
    return Dom.doUpward(node.parentNode, evaluator, worker);
};
function DomTagNameEvaluator(tagName) {
    this.tagName = tagName.toUpperCase();
}
DomTagNameEvaluator.prototype.eval = function (node) {
    return node && node.tagName && node.tagName.toUpperCase && (node.tagName.toUpperCase() == this.tagName);
};
Dom.findParentWithClass = function (node, className) {
    return Dom.findUpward(node, function (node) {
            var index = (" " + node.className + " ").indexOf(" " + className + " ") >= 0
            if(index > 0) {
                return true;
            } else {
                return false;
            }
        });
};
Dom.doOnChildRecursively = function (node, evaluator, worker) {
    if (!node || !node.childNodes) return null;

    for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (evaluator.eval(child)) worker(child);
        Dom.doOnChildRecursively(child, evaluator, worker);
    }

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
Dom.doOnAllChildRecursively = function (node, worker) {
    if (!node || !node.childNodes) return null;

    for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (DomAcceptAllEvaluator.eval(child)) worker(child);
        Dom.doOnChildRecursively(child, DomAcceptAllEvaluator, worker);
    }

};
var DomAcceptAllEvaluator = {
    eval: function (target) { return true; }
};


Dom.findTop = function (node, evaluator) {
    var top = null;
    try {
        Dom.doUpward(node, evaluator, function (node) {
            top = node;
        });
    } catch (e) {}

    return top;
};

Dom.emitEvent = function (name, target, data) {
    var event = target.ownerDocument.createEvent("Events");
    event.initEvent(name, true, false);
    if (Util.isXul6OrLater()) {
        event = target.ownerDocument.createEvent("CustomEvent");
        event.initCustomEvent(name, true, false, data);
    }
    if (data) {
        for (name in data) event[name] = data[name];
    }
    target.dispatchEvent(event);
};

Dom.empty = function (node) {
    if (!node || !node.hasChildNodes) return;
    while (node.hasChildNodes()) node.removeChild(node.firstChild);
};
Dom.parser = new DOMParser();
Dom.serializer = new XMLSerializer();
Dom.parseToNode = function (xml, dom) {
    var doc = Dom.parser.parseFromString(xml, "text/xml");
    if (!doc || !doc.documentElement
            || doc.documentElement.namespaceURI == "http://www.mozilla.org/newlayout/xml/parsererror.xml") {
        return null;
    }
    var node = doc.documentElement;
    if (dom) return dom.importNode(node, true);

    return node;
}
Dom.parseDocument = function (xml) {
    if (xml && xml.charCodeAt(0) === 0xFEFF) {
        xml = xml.substr(1);
    }

    var dom = Dom.parser.parseFromString(xml, "text/xml");
    return dom;
};

Dom.serializeNode = function (node) {
    return Dom.serializer.serializeToString(node);
};
Dom.serializeNodeToFile = function (node, file, additionalContentPrefixes) {
    var xml = Controller.serializer.serializeToString(node);
    var root = node.documentElement ? node.documentElement : node;
    if (root.namespaceURI == PencilNamespaces.html) {
        //this is actually an HTML document, performing a trick for supporting ">" chars inside <style> tags
        xml = xml.replace(/(<style[^>]*>)([^<]+)(<\/style>)/g, function (whole, leading, content, trailing) {
            return leading + content.replace(/&gt;/g, ">") + trailing;
        });
    }

    fs.writeFileSync(file, xml, "utf8");
};
Dom._buildHiddenFrame = function () {
    if (Dom._hiddenFrame) return;

    var iframe = document.createElementNS(PencilNamespaces.html, "html:iframe");

    var container = document.body;
    if (!container) container = document.documentElement;
    var box = document.createElement("box");
    box.setAttribute("style", "xvisibility: hidden");

    iframe.setAttribute("style", "border: none; width: 1px; height: 1px; xvisibility: hidden");
    iframe.setAttribute("src", "chrome://pencil/content/blank.html");

    box.appendChild(iframe);
    container.appendChild(box);

    box.style.MozBoxPack = "start";
    box.style.MozBoxAlign = "start";

    Dom._hiddenFrame = iframe.contentWindow;
    Dom._hiddenFrame.document.body.setAttribute("style", "padding: 0px; margin: 0px;")
};
//
/*
this is the disabled code
// */

Dom.toXhtml = function (html) {
    if (!Dom._dummyDiv) {
        Dom._dummyDiv = document.createElement("div");
        document.body.appendChild(Dom._dummyDiv);
    }
    Dom._dummyDiv.innerHTML = html;
    Dom._dummyDiv.style.display = "block";
    var xhtml = Dom.serializeNode(Dom._dummyDiv);
    Dom._dummyDiv.style.display = "none";
//    xhtml = xhtml.replace(/(<[^>]+) xmlns=""([^>]*>)/g, function (zero, one, two) {
//        return one + two;
//    });
//    xhtml = xhtml.replace(/<[\/A-Z0-9]+[ \t\r\n>]/g, function (zero) {
//        return zero.toLowerCase();
//    });
    return xhtml;
};
Dom.htmlEncode = function (text) {
    if (!Dom.htmlEncodeDiv) Dom.htmlEncodeDiv = document.createElement("div");
    Dom.htmlEncodeDiv.innerHTML = "";
    Dom.htmlEncodeDiv.appendChild(document.createTextNode(text));
    return Dom.htmlEncodeDiv.innerHTML;
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
Dom.htmlStrip = function (s) {
    if (!Dom.htmlEncodePlaceHolder) {
        Dom.htmlEncodePlaceHolder = document.createElement("div");
    }
    Dom.htmlEncodePlaceHolder.innerHTML = s;
    var t = Dom.getInnerText(Dom.htmlEncodePlaceHolder);
    Dom.htmlEncodePlaceHolder.innerHTML = "";
    return t;
};

Dom.getInnerText = function (node) {
    return node.innerText || node.textContent
            || ((node.firstChild && node.firstChild.value) ? node.firstChild.value : "");
};

Dom.setInnerText = function (element, text) {
    element.innerHTML = "";
    element.appendChild(element.ownerDocument.createTextNode(text));
};
Dom.renewId = function (shape) {
    var seed = Math.round(Math.random() * 1000);
    Dom.workOn(".//*/@id|/@id", shape, function (node) {
        var uuid = Util.newUUID();
        Dom.updateIdRef(shape, node.value, uuid);
        node.value = uuid;
    });
};
Dom.updateIdRef = function (shape, oldId, newId) {
    Dom.workOn(".//*/@p:filter | .//*/@filter | .//*/@style | .//*/@xlink:href | .//*/@clip-path | .//*/@marker-end | .//*/@marker-start | .//*/@mask | .//*/@childRef | .//@p:parentRef", shape, function (node) {
        var value = node.value;
        if (value == "#" + oldId) {
            value = "#" + newId;
        } else {
            value = value.replace(/url\(#([^\)]+)\)/g, function (zero, one) {
                if (one == oldId) {
                    return "url(#" + newId + ")";
                } else {
                    return zero;
                }
            });
            value = value.replace(/url\("\#([^"]+)"\)/g, function (zero, one) {
                if (one == oldId) {
                    return "url(#" + newId + ")";
                } else {
                    return zero;
                }
            });
        }
        node.value = value;
    });
};
Dom.resolveIdRef = function (shape, seed) {
    Dom.workOn(".//*/@p:filter | .//*/@filter | .//*/@style | .//*/@xlink:href | .//*/@clip-path | .//*/@marker-end | .//*/@marker-start | .//*/@mask | .//*/@childRef | .//@p:parentRef", shape, function (node) {
        var value = node.value;
        if (value.substring(0, 1) == "#") {
            value += seed;
        } else {
            value = value.replace(/url\(#([^\)]+)\)/g, function (zero, one) {
                return "url(#" + one + seed + ")";
            });
            value = value.replace(/url\("\#([^"]+)"\)/g, function (zero, one) {
                return "url(#" + one + seed + ")";
            });
        }
        node.value = value;
    });
};

Dom.handleAttributeChange = function(node, attributeName, handler) {
    node.addEventListener("DOMAttrModified", function(event) {
        if (event.attrName == attributeName) {
            handler(event.prevValue, event.newValue);
        }
    }, false);
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
};
Dom.swapNode = function (node1, node2) {
    var parentNode = node1.parentNode;

    var ref = node2.nextSibling;
    if (ref == node1) {
        debug("****, simple swap: " + [node1.label, node2.label]);
        parentNode.removeChild(node1);
        parentNode.insertBefore(node1, node2);

        return;
    }
    parentNode.removeChild(node2);
    parentNode.insertBefore(node2, node1);

    parentNode.removeChild(node1);
    parentNode.insertBefore(node1, ref);
};
Dom.parseFile = function (file) {
    var fileContents = fs.readFileSync(file, "utf8");
    var dom = Dom.parser.parseFromString(fileContents, "text/xml");
    return dom;
};

Dom.hide = function (node) {
    node._old_display = node.style.display;
    node.style.display = "none";
};
Dom.show = function (node) {
    if (node.style.display != "none") return;
    node.style.display = node._old_display || "block";
};

Dom.newDOMElement = function (spec, doc, holder) {
    var ownerDocument = doc ? doc : document;
    var e = spec._uri ? ownerDocument.createElementNS(spec._uri, spec._name) : ownerDocument.createElement(spec._name);

    for (name in spec) {
        if (name.match(/^_/)) continue;

        if (name.match(/^([^:]+):(.*)$/)) {
            var prefix = RegExp.$1;
            var localName = RegExp.$2;
            var uri = PencilNamespaces[prefix];
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
Dom.populate = function (container, ids, doc) {
    var dom = doc ? doc : document;
    for (var i = 0; i < ids.length; i ++) {
        var id = ids[i];
        container[id] = dom.getElementById(id);
    }
};

var Svg = {};
Svg.setX = function (node, x) {
    node.x.baseVal.value = x;
};
Svg.setY = function (node, y) {
    node.y.baseVal.value = y;
};

Svg.setWidth = function (node, w) {
    node.width.baseVal.value = w;
};
Svg.setHeight = function (node, h) {
    node.height.baseVal.value = h;
};
Svg.setStyle = function (node, name, value) {
    if (value == null) {
        node.style.removeProperty(name);
        return;
    }
    node.style.setProperty(name, value, "");
};
Svg.getStyle = function (node, name) {
    return node.style.getPropertyValue(name, "");
};
Svg.removeStyle = function (node, name) {
    node.style.removeProperty(name);
};
Svg.toTransformText = function (matrix) {
    return "matrix(" + [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].join(",") + ")";
};
Svg.ensureCTM = function (node, matrix) {
    //FIXME: this works when no parent transformation applied. fix this later

    var s = Svg.toTransformText(matrix);
    node.setAttribute("transform", s);
};
Svg.pointInCTM = function (x, y, ctm) {
    return {
        x: ctm.a * x + ctm.c * y + ctm.e,
        y: ctm.b * x + ctm.d * y + ctm.f
    };
};

Svg.vectorInCTM = function (point, userCTM, noTranslation) {
    var ctm = userCTM.inverse();

    var uPoint = new Point();
    uPoint.x = ctm.a * point.x + ctm.c * point.y + (noTranslation ? 0 : ctm.e);
    uPoint.y = ctm.b * point.x + ctm.d * point.y + (noTranslation ? 0 : ctm.f);

    return uPoint;
};
Svg.getCTM = function (target) {
    return target.getTransformToElement(target.ownerSVGElement);
};
Svg.rotateMatrix = function (angle, center, element) {
    var matrix = element.ownerSVGElement.createSVGTransform().matrix;
    matrix = matrix.translate(center.x, center.y);
    matrix = matrix.rotate(angle);
    matrix = matrix.translate(0 - center.x, 0 - center.y);

    return matrix;
};
Svg.getScreenLocation = function(element, point) {
    var sctm = element.getScreenCTM().inverse();
    return Svg.vectorInCTM(point ? point : new Point(0, 0), sctm);
};

Svg.getAngle = function (dx, dy) {
    return Math.atan2(dy, dx) * 180 / Math.PI;
};

Svg.getRelativeAngle = function (from, to, center) {
    var startAngle = Svg.getAngle(from.x - center.x, from.y - center.y);
    var endAngle = Svg.getAngle(to.x - center.x, to.y - center.y);

    return endAngle - startAngle;
};
Svg.ensureRectContains = function (rect, point) {
    rect.left = Math.min(rect.left, point.x);
    rect.right = Math.max(rect.right, point.x);
    rect.top = Math.min(rect.top, point.y);
    rect.bottom = Math.max(rect.bottom, point.y);
};
Svg.getBoundRectInCTM = function (box, ctm) {
    var p = Svg.vectorInCTM({x: box.x, y: box.y}, ctm);

    var rect = {left: p.x, right: p.x, top: p.y, bottom: p.y};


    p = Svg.vectorInCTM({x: box.x + box.width, y: box.y}, ctm);
    Svg.ensureRectContains(rect, p);

    p = Svg.vectorInCTM({x: box.x, y: box.y + box.height}, ctm);
    Svg.ensureRectContains(rect, p);

    p = Svg.vectorInCTM({x: box.x + box.width, y: box.y + box.height}, ctm);
    Svg.ensureRectContains(rect, p);

    return rect;
};
Svg.joinRect = function (rect1, rect2) {
    var minX = Math.min(rect1.x, rect2.x);
    var minY = Math.min(rect1.y, rect2.y);

    var maxX = Math.max(rect1.x + rect1.width, rect2.x + rect2.width);
    var maxY = Math.max(rect1.y + rect1.height, rect2.y + rect2.height);

    return {x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY};
};
Svg.expandRectTo = function (rect, p) {
    if (p.x < rect.x) {
        rect.width += rect.x - p.x;
        rect.x = p.x;
    } else if (p.x > rect.x + rect.width) {
        rect.width = p.x - rect.x;
    }

    if (p.y < rect.y) {
        rect.height += rect.y - p.y;
        rect.y = p.y;
    } else if (p.y > rect.y + rect.height) {
        rect.height = p.y - rect.y;
    }
};
Svg.contains = function (x, y, large) {
    return (large.x <= x && x <= large.x + large.width) &&
            (large.y <= y && y <= large.y + large.height);
};
Svg.isInside = function (small, large) {
    return Svg.contains(small.x, small.y, large) && Svg.contains(small.x + small.width, small.y + small.height, large);
};

Svg.optimizeSpeed = function(target, on) {
    return;
    if (on) {
        target.setAttributeNS(PencilNamespaces.p, "p:moving", true);
    } else {
        target.removeAttributeNS(PencilNamespaces.p, "moving");
    }
};
Svg.UNIT = ["em", "ex", "px", "pt", "pc", "cm", "mm", "in", "%"];
Svg.getWidth = function (dom) {
    try {
        var width = Dom.getSingle("/svg:svg/@width", dom).nodeValue;
        for (var i = 0; i < Svg.UNIT.length; i++) {
            if (width.indexOf(Svg.UNIT[i]) != -1) {
                width = width.substring(0, width.length - Svg.UNIT[i].length);
            }
        }
        return parseFloat(width);
    } catch (e) {
        console.debug(new XMLSerializer().serializeToString(dom));
        console.error(e);
    }
    return 0;
};
Svg.getHeight = function (dom) {
    try {
        var height = Dom.getSingle("/svg:svg/@height", dom).nodeValue;
        for (var i = 0; i < Svg.UNIT.length; i++) {
            if (height.indexOf(Svg.UNIT[i]) != -1) {
                height = height.substring(0, height.length - Svg.UNIT[i].length);
            }
        }
        return parseFloat(height);
    } catch (e) {
        Console.dumpError(e);
    }
    return 0;
};
Svg.SYMBOL_NAME_ATTR = "symbolName";
Svg.getSymbolName = function (node) {
    if (node.hasAttributeNS(PencilNamespaces.p, Svg.SYMBOL_NAME_ATTR)) {
        return node.getAttributeNS(PencilNamespaces.p, Svg.SYMBOL_NAME_ATTR);
    } else {
        return null;
    }
};
Svg.setSymbolName = function (node, name) {
    if (typeof(name) === "undefined" || name === null) {
        node.remoteAttributeNS(PencilNamespaces.p, Svg.SYMBOL_NAME_ATTR);
    } else {
        return node.setAttributeNS(PencilNamespaces.p, Svg.SYMBOL_NAME_ATTR, name);
    }
};

var Local = {};
Local.getInstalledFonts = function () {
    var installedFaces = [];
    var localFonts = [];
    // document.fonts.forEach(function (face) {
    //     if (!face._type || installedFaces.indexOf(face.family) >= 0) return;
    //     installedFaces.push(face.family);
    //     localFonts.push({family: face.family, type: face._type});
    // });

    var installedFonts = FontLoader.instance.getAllInstalledFonts();
    if (installedFonts.length > 0) {
        for (var font of installedFonts) {
            if (installedFaces.indexOf(font.name) >= 0) continue;
            installedFaces.push(font.name);
            var weights = [];
            for (var v of font.variants) if (weights.indexOf(v.weight) < 0) weights.push(v.weight);
            localFonts.push({family: font.name, type: font._type, weights: weights});
        }
    }

    Local.sortFont(localFonts);

    Local.cachedLocalFonts = localFonts;

    return localFonts;
};
Local.sortFont = function(fonts) {
    fonts.sort(function (a, b) {
        return a.family.localeCompare(b.family);
    });
};
Local.chromeToPath = function(aPath) {
    if (!aPath || !(/^chrome:/.test(aPath))) {
        return; //not a chrome url
    }

    var rv;
    var ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces["nsIIOService"]);
    var uri = ios.newURI(aPath, "UTF-8", null);
    var cr = Components.classes['@mozilla.org/chrome/chrome-registry;1'].getService(Components.interfaces["nsIChromeRegistry"]);
    rv = cr.convertChromeURL(uri).spec;

    if (/^file:/.test(rv)) {
        rv = this.urlToPath(rv);
    } else {
        rv = this.urlToPath("file://"+rv);
    }
    return rv;
};

Local.urlToPath = function(aPath) {
    if (!aPath || !/^file:/.test(aPath)) {
        return ;
    }

    var rv;
    var ph = Components.classes["@mozilla.org/network/protocol;1?name=file"]
        .createInstance(Components.interfaces.nsIFileProtocolHandler);
    rv = ph.getFileFromURLSpec(aPath).path;
    return rv;
};

Local.copyToChrome = function(src, dest) {
    var ios = Components.classes["@mozilla.org/network/io-service;1"].
              getService(Components.interfaces.nsIIOService);
    var url = ios.newURI(src, null, null);

    if (!url || !url.schemeIs("file")) throw "Expected a file URL.";

    var pngFile = url.QueryInterface(Components.interfaces.nsIFileURL).file;

    var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                  createInstance(Components.interfaces.nsIFileInputStream);
    istream.init(pngFile, -1, -1, false);

    var bstream = Components.classes["@mozilla.org/binaryinputstream;1"].
                  createInstance(Components.interfaces.nsIBinaryInputStream);
    bstream.setInputStream(istream);

    var bytes = bstream.readBytes(bstream.available());

    var aFile = Components.classes["@mozilla.org/file/local;1"].
                createInstance(Components.interfaces.nsILocalFile);

    aFile.initWithPath(Local.chromeToPath(dest));
    aFile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0600);

    var stream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"].
                 createInstance(Components.interfaces.nsIFileOutputStream);
    stream.init(aFile, 0x04 | 0x08 | 0x20, 0600, 0); // readwrite, create, truncate

    stream.write(bytes, bytes.length);
    if (stream instanceof Components.interfaces.nsISafeOutputStream) {
        stream.finish();
    } else {
        stream.close();
    }
};
Local.installWebFont = function(name, url) {
    var filename = Util.newUUID() + ".woff";
    var index = url.lastIndexOf("/");
    if (index != -1) {
        filename = url.substring(index);
    }

    var fontChromeUrl = "chrome://pencil/content/font/" + filename;
    Local.copyToChrome(url, fontChromeUrl);

    var fontCssUrl = Local.chromeToPath("chrome://pencil/skin/font.css");
    var fontFile = FileIO.open(fontCssUrl);
    var fontFace = "@font-face{font-family:" + name + ";src:url('" + fontChromeUrl + "')}\r\n";

    var content = FileIO.read(fontFile);
    if (content.indexOf(fontFace) == -1) {
        var rv = FileIO.write(fontFile, fontFace, 'a');
        Services.obs.notifyObservers(null, "startupcache-invalidate", null)
    }
};
Local.isFontExisting = function (font) {
    if (!Local.cachedLocalFonts) {
        Local.getInstalledFonts();
    }
    for (var i in Local.cachedLocalFonts) {
        if (Local.cachedLocalFonts[i].family == font) return true;
    }

    return false;
};
Local.openExtenstionManager = function() {
    const EMTYPE = "Extension:Manager";
    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
    var theEM = wm.getMostRecentWindow(EMTYPE);
    if (theEM) {
        theEM.focus();
        return;
    }
    const EMURL = "chrome://mozapps/content/extensions/extensions.xul";
    const EMFEATURES = "chrome,menubar,extra-chrome,toolbar,dialog=no,resizable";
    window.openDialog(EMURL, "", EMFEATURES);
};
Local.newTempFile = function (prefix, ext) {
    return tmp.fileSync({prefix: prefix + "-", postfix: "." + ext, keep: false});
};
Local.createTempDir = function (prefix) {
    return tmp.dirSync({prefix: prefix + "-", keep: false});
};

var Console = {};
Console.log = function (message) {
    if (console && console.log) console.log(message);
};
Console.dumpError = function (exception, toConsole) {
    console.error(exception);
};
Console.alertError = function (exception, toConsole) {
    var s = [
        exception.message,
        "",
        "Location: " + exception.fileName + " (" + exception.lineNumber + ")",
        "Stacktrace:\n\t" + (exception.stack ? exception.stack.replace(/\n/g, "\n\t") : "<empty stack trace>")
    ].join("\n");

    console.debug(s);
};

var Util = {};
Util.uuidGenerator = {
    generateUUID: function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = crypto.getRandomValues(new Uint8Array(1))[0]%16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }
};

Util.newUUID = function () {
    var uuid = Util.uuidGenerator.generateUUID();
    return uuid.toString().replace(/[^0-9A-Z]+/gi, "");
};

Util.instanceToken = "" + (new Date()).getTime();
Util.getInstanceToken = function () {
    return Util.instanceToken;
};

Util.gridNormalize = function (value, size) {
    if (Config.get("edit.snap.grid", false) == false) {
        return value;
    }
    var r = value % size;
    if (r == 0) return value;

    if (r > size / 2) {
        return value + size - r;
    } else {
        return value - r;
    }
};
Util.enumInterfaces = function (object) {
    var ifaces = [];
    for (name in Components.interfaces) {
        var iface = Components.interfaces[name];
        try {
            var o = object.QueryInterface(iface);
            if (o) ifaces.push(iface);
        } catch (e) {}
    }

    return ifaces;

};
Util.handleTempImageLoad = function () {
    if (Util.handleTempImageLoadImpl) Util.handleTempImageLoadImpl();
};
Util.getClipboardImage = function (clipData, length, handler) {


    var dataStream = clipData.QueryInterface(Components.interfaces.nsIInputStream);

    var bStream = Components.classes["@mozilla.org/binaryinputstream;1"]
                            .createInstance(Components.interfaces.nsIBinaryInputStream);
    bStream.setInputStream(dataStream);
    var bytes = bStream.readBytes(bStream.available());

    //create a temp file to save
    var file = Components.classes["@mozilla.org/file/directory_service;1"]
                        .getService(Components.interfaces.nsIProperties)
                        .get("TmpD", Components.interfaces.nsIFile);
    file.append("pencil-clipboard-image.png");

    var fos = Components.classes["@mozilla.org/network/file-output-stream;1"]
                            .createInstance(Components.interfaces.nsIFileOutputStream);
    fos.init(file, 0x02 | 0x08 | 0x20, 0666, 0);

    fos.write(bytes, bytes.length);
    fos.close();

    if (!Util.ios) {
        Util.ios = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService);

    }
    var url = Util.ios.newFileURI(file).spec;

    url += "?t=" + (new Date()).getTime();

    ImageData.fromUrlEmbedded(url, function (imageData) {
        handler(imageData.w, imageData.h, imageData.data);
    });
};
Util.statusbarDisplay = null;
Util.STATUSBAR_MESSAGE_AUTOHIDE = 4000;
Util.showStatusBarInfo = function(message, autoHide) {
    if (!Util.statusbarDisplay) return;
    Util.statusbarDisplay.setAttribute("src", "chrome://pencil/skin/images/dialog-information.png");
    Util.statusbarDisplay.label = message;

    if (autoHide) {
        setTimeout(function () {
            Util.hideStatusbarMessage();
        }, Util.STATUSBAR_MESSAGE_AUTOHIDE);
    }
};
Util.showStatusBarWarning = function(message, autoHide) {
    if (!Util.statusbarDisplay) return;
    Util.statusbarDisplay.setAttribute("src", "chrome://pencil/skin/images/dialog-warning.png");
    Util.statusbarDisplay.label = message;

    if (autoHide) {
        setTimeout(function () {
            Util.hideStatusbarMessage();
        }, Util.STATUSBAR_MESSAGE_AUTOHIDE);
    }
};
Util.showStatusBarError = function(message, autoHide) {
    if (!Util.statusbarDisplay) return;
    Util.statusbarDisplay.setAttribute("src", "chrome://pencil/skin/images/dialog-error.png");
    Util.statusbarDisplay.label = message;

    if (autoHide) {
        setTimeout(function () {
            Util.hideStatusbarMessage();
        }, Util.STATUSBAR_MESSAGE_AUTOHIDE);
    }
};
Util.hideStatusbarMessage = function () {
    Util.statusbarDisplay.removeAttribute("src");
    Util.statusbarDisplay.label = "";
};
Util.setPointerPosition = function (x, y) {
    if (!Util.statusbarPointer) {
        Util.statusbarPointer = document.getElementById("pencil-statusbar-pointer");
    }
    Util.statusbarPointer.label = x + ", " + y;
};
Util.dialog = function(title, description, buttonLabel) {
    var message = {type: "info",
                    title: title,
                    description: description ? description : null,
                    acceptLabel: buttonLabel ? buttonLabel : null };

    var returnValueHolder = {};
    var dialog = window.openDialog("chrome://pencil/content/messageDialog.xul", "pencilMessageDialog" + Util.getInstanceToken(), "modal,centerscreen", message, returnValueHolder);
};
Util.info = function(title, description, buttonLabel) {
    Dialog.alert(title + "\n" + description);
};
Util.warn = function(title, description, buttonLabel) {
    Dialog.error(title + "\n" + description);
};
Util.error = function(title, description, buttonLabel) {
    Dialog.error(title + "\n" + description);
}
Util.confirm = function(title, description, acceptLabel, cancelLabel) {
    var message = {type: "confirm",
                    title: title,
                    description: description ? description : null,
                    acceptLabel: acceptLabel ? acceptLabel : null,
                    cancelLabel: cancelLabel ? cancelLabel : null };

    var returnValueHolder = {};
    var dialog = window.openDialog("chrome://pencil/content/messageDialog.xul", "pencilMessageDialog" + Util.getInstanceToken(), "modal,centerscreen", message, returnValueHolder);
    return returnValueHolder.button == "accept";
}
Util.confirmWithWarning = function(title, description, acceptLabel, cancelLabel) {
    var message = {type: "confirmWarned",
                    title: title,
                    description: description ? description : null,
                    acceptLabel: acceptLabel ? acceptLabel : null,
                    cancelLabel: cancelLabel ? cancelLabel : null };

    var returnValueHolder = {};
    var dialog = window.openDialog("chrome://pencil/content/messageDialog.xul", "pencilMessageDialog" + Util.getInstanceToken(), "modal,centerscreen", message, returnValueHolder);
    return returnValueHolder.button == "accept";
}
Util.confirmExtra = function(title, description, acceptLabel, extraLabel, cancelLabel) {
    var message = {type: "confirm2",
                    title: title,
                    description: description ? description : null,
                    acceptLabel: acceptLabel ? acceptLabel : null,
                    extraLabel: extraLabel ? extraLabel : null,
                    cancelLabel: cancelLabel ? cancelLabel : null };

    var returnValueHolder = {};
    var dialog = window.openDialog("chrome://pencil/content/messageDialog.xul", "pencilMessageDialog" + Util.getInstanceToken(), "modal,centerscreen", message, returnValueHolder);

    var result = {};
    result.accept = (returnValueHolder.button == "accept");
    result.cancel = (returnValueHolder.button == "cancel");
    result.extra = (returnValueHolder.button == "extra");

    return result;
}
Util.beginProgressJob = function(jobName, jobStarter) {
    new ProgressiveJobDialog().open({
        title: jobName,
        starter: jobStarter
    });
};
Util.setNodeMetadata = function (node, name, value) {
    node.setAttributeNS(PencilNamespaces.p, "p:" + name, value);
};
Util.getNodeMetadata = function (node, name) {
    return node.getAttributeNS(PencilNamespaces.p, name);
};
Util.generateIcon = function (target, maxWidth, maxHeight, padding, iconPath, callback, rasterizer) {
    console.log("generateIcon");
    try {
        if (!target || !target.svg) {
            return;
        }

        var bound = target.svg.getBoundingClientRect();
        var bbox = target.svg.getBBox();
        if (!bound) {
            return;
        }

        var width = bbox.width;
        var height = bbox.height;

        if (width > maxWidth || height > maxHeight) {
            if (width > height) {
                height = height / (width / maxWidth);
                width = maxWidth;
            } else {
                width = width / (height / maxHeight);
                height = maxHeight;
            }
        }

        var svg = document.createElementNS(PencilNamespaces.svg, "svg");

        svg.setAttribute("width", "" + (width + padding * 2) + "px");
        svg.setAttribute("height", "" + (height + padding * 2) + "px");

        var content = document.createElementNS(PencilNamespaces.svg, "g");
        var newSvg = target.svg.cloneNode(true);
        newSvg.removeAttribute("transform");
        newSvg.removeAttribute("id");

        content.appendChild(newSvg);

        debug("target.svg: " + target.svg.localName);

        var transform = "scale(" + width / bbox.width + ", " + height / bbox.height + ")";
        content.setAttribute("transform", transform);

        svg.appendChild(content);

        if (!rasterizer && Pencil) {
            rasterizer = Pencil.rasterizer;
        }
        console.log("iconPath:", iconPath);
        console.log("rasterizer:", rasterizer);
        if (iconPath) {
            rasterizer.rasterizeDOM(svg, iconPath, function () {});
        } else {
            rasterizer.rasterizeDOMToUrl(svg, function (data) {
                if (callback) {
                    callback(data.url);
                }
            });
        }
    } catch (ex) {
        Console.dumpError(ex);
    }
};
Util.compress = function (dir, zipFile, callback) {
    var archiver = require("archiver");
    var archive = archiver("zip");
    var output = fs.createWriteStream(zipFile);
    output.on("close", function () {
        if (callback) callback();
    });
    archive.pipe(output);
    archive.directory(dir, "/", {});
    archive.finalize();
};
Util.writeDirToZip = function (dir, writer, prefix) {
    var items = dir.directoryEntries;
    while (items.hasMoreElements()) {
        var file = items.getNext().QueryInterface(Components.interfaces.nsIFile);

        var itemPath = prefix + file.leafName;

        if (file.isDirectory()) {
            writer.addEntryDirectory(itemPath, file.lastModifiedTime * 1000, false);
            Util.writeDirToZip(file, writer, itemPath + "/");
        } else {
            writer.addEntryFile(itemPath, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, file, false);
        }
    }
};
Util.preloadFonts = function (doc) {
    var menupopup = document.createElementNS(PencilNamespaces.xul, "menupopup");
    var localFonts = Local.getInstalledFonts();
    for (var i in localFonts) {
        var item = doc.createElement("menuitem");
        item.setAttribute("label", localFonts[i]);
        item.setAttribute("value", localFonts[i]);
        item.setAttribute("style", "font-family:'" + localFonts[i] + "';font-size:14px;font-weight:normal;");
        menupopup.appendChild(item);
    }
    doc.documentElement.appendChild(menupopup);
    Util.fontList = menupopup;
};
Util.openDonate = function () {
    // try {
    //     var link = "http://pencil.evolus.vn/Donation.aspx";
    //
    //     var mediator = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
    //     var ioservice = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
    //     var protoservice = Components.classes['@mozilla.org/uriloader/external-protocol-service;1'].getService(Components.interfaces.nsIExternalProtocolService);
    //
    //     var enumerator = mediator.getEnumerator("navigator:browser");
    //     while (enumerator.hasMoreElements()) {
    //         var win = enumerator.getNext();
    //         if (win) {
    //             if ('delayedOpenTab' in win) {
    //                 win.delayedOpenTab(link);
    //                 return;
    //             }
    //             win.getBrowser().addTab(link);
    //             return;
    //         }
    //     }
    // } catch (ex) {
    // }
    // try {
    //     window.open(link);
    // } catch (ex) {
    //     var uri = ioservice.newURI(link, null, null);
    //     protoservice.loadUrl(uri);
    // }
    require("shell").openExternal("http://pencil.evolus.vn/Donation.aspx");
};
Util.getMessage = function (msg, args) {
    var text = MESSAGES[msg];
    if (!text) return msg;

    if (typeof(args) == "undefined") return text;
    return text.replace(/%S/g, "" + args);
};
Util.showNotification = function (title, ms) {
    Components.classes['@mozilla.org/alerts-service;1'].
              getService(Components.interfaces.nsIAlertsService).
              showAlertNotification(null, title, ms, false, '', null);
};
Util.isXulrunner = function() {
    return navigator.userAgent.indexOf("Firefox") == -1;
};
Util.getXulrunnerVersion = function() {
    var agent = navigator.userAgent;
    var version = agent.match(/rv:([^\s\)]*)/i);
    if (version && version.length > 1) {
        return version[1];
    }
    return "0";
};
Util.isXul6OrLater = function() {
    var version = Util.getXulrunnerVersion();
    var q = version.split("\.");
    if (q.length > 0) {
        return parseInt(q[0]) >= 6;
    }
    return false;
};
Util.isMac = function() {
    return navigator.userAgent.indexOf("Intel Mac") != -1;
}
Util.em = function () {
    if (Util._calculatedEM) return Util._calculatedEM;
    var div = document.createElement("div");
    var s = "mmmmmmmmmmmmmmmmmmmmmmmmmmm";
    div.innerHTML = s;
    document.body.appendChild(div);
    div.style.position = "absolute";
    div.style.top = "0px";
    div.style.opacity = "0";
    div.style.left = "0px";
    div.style.whiteSpace = "nowrap";

    Util._calculatedEM = div.offsetWidth / s.length;
    document.body.removeChild(div);
    return Util._calculatedEM;
};
function debugx(ex) {
    debug("debugx is no longer supported");
}
if (!window.dump) {
    if (console && console.log) {
        window.dump = function (obj) {
            console.log(obj);
        };
    } else {
        window.dump = function () {};
    }
}

if (typeof(console) == "undefined") {
    console = {
        debug: function (value) {
            dump("DEBUG: " + value + "\n");
        },
        error: function (value) {
            dump("ERROR: " + value + "\n");
        },
        info: function (value) {
            dump("INFO : " + value + "\n");
        },
        warn: function (value) {
            dump("WARN : " + value + "\n");
        },
    };
}

const DEV_ENABLED = require("electron").remote.app.devEnable ? true : false;

function debug() {
    //if (DEV_ENABLED) console.log.apply(console, ["DEBUG>"].concat(Array.prototype.slice.call(arguments)));
}
function stackTrace() {
	//DEBUG_BEGIN
	var lines = [];
	for (var frame = Components.stack; frame; frame = frame.caller) {
		lines.push(frame.name + " (" + frame.filename + "@" + frame.lineNumber + ")");
	}
	debug(lines.join("\n"));
    //DEBUG_END
}
function warn(value) {
    //console.warn(value);
    debug(value);
}
function info(value) {
	//DEBUG_BEGIN
    console.info(value);
    debug(value);
    //DEBUG_END
}
function error(value) {
    console.error(value);
    debug(value);
}
var lastTick = (new Date()).getTime();
function tick(value) {
	//DEBUG_BEGIN
    return;
    var date = new Date();
    var newTick = date.getTime();
    var delta = newTick - lastTick;
    lastTick = newTick;

    var prefix = value ? (value + ": ").toUpperCase() : "TICK: ";
    dump(prefix + date.getSeconds() + "." + date.getMilliseconds() + " (" + delta + " ms)\n");
	//DEBUG_END
}

var Net = {};
Net.uploadAndDownload = function (url, uploadFile, downloadTargetFile, listener, options) {

    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                                .getService(Components.interfaces.nsIIOService);

    var uri = ioService.newURI(url, null, null);
    var channel = ioService.newChannelFromURI(uri);

    var httpChannel = channel.QueryInterface(Components.interfaces.nsIHttpChannel);

    var listener = {
        foStream: null,
        file: downloadTargetFile,
        listener: listener,
        size: 0,

        writeMessage: function (message) {
            if (this.listener && this.listener.onMessage) {
                this.listener.onMessage(message);
            }
        },
        onStartRequest: function (request, context) {
            this.writeMessage("Request started");
        },
        onDataAvailable: function (request, context, stream, sourceOffset, length) {

            if (this.canceled) return;

            try {
                if (!this.foStream) {
                    this.foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                            .createInstance(Components.interfaces.nsIFileOutputStream);
                    this.writeMessage("Start receiving file...");

                    this.downloaded = 0;

                    this.foStream.init(this.file, 0x04 | 0x08 | 0x20, 0664, 0);
                }

                try {
                    this.size = parseInt(httpChannel.getResponseHeader("Content-Length"), 10);
                } catch (e) { }

                var bStream = Components.classes["@mozilla.org/binaryinputstream;1"].
                                createInstance(Components.interfaces.nsIBinaryInputStream);

                bStream.setInputStream(stream);
                var bytes = bStream.readBytes(length);


                this.foStream.write(bytes, bytes.length);

                this.downloaded += length;

                if (this.size > 0) {
                    var percent = Math.floor((this.downloaded * 100) / this.size);
                    if (this.listener && this.listener.onProgress) this.listener.onProgress(percent);
                }
            } catch (e) {
                alert("Saving error:\n" + e);
            }
        },
        onStopRequest: function (request, context, status) {


            this.foStream.close();
            this.writeMessage("Done");
            this.listener.onDone();
        },
        onChannelRedirect: function (oldChannel, newChannel, flags) {
        },
        getInterface: function (aIID) {
            try {
                return this.QueryInterface(aIID);
            } catch (e) {
                throw Components.results.NS_NOINTERFACE;
            }
        },
        onProgress : function (aRequest, aContext, aProgress, aProgressMax) { },
        onStatus : function (aRequest, aContext, aStatus, aStatusArg) {
            this.writeMessage("onStatus: " + [aRequest, aContext, aStatus, aStatusArg]);
        },
        onRedirect : function (aOldChannel, aNewChannel) { },

        QueryInterface : function(aIID) {
            if (aIID.equals(Components.interfaces.nsISupports) ||
                aIID.equals(Components.interfaces.nsIInterfaceRequestor) ||
                aIID.equals(Components.interfaces.nsIChannelEventSink) ||
                aIID.equals(Components.interfaces.nsIProgressEventSink) ||
                aIID.equals(Components.interfaces.nsIHttpEventSink) ||
                aIID.equals(Components.interfaces.nsIStreamListener)) {

                return this;
            }

            throw Components.results.NS_NOINTERFACE;
        }
    }; //listener

    var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                        .createInstance(Components.interfaces.nsIFileInputStream);
    inputStream.init(uploadFile, 0x04 | 0x08, 0644, 0x04); // file is an nsIFile instance

    var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
    var mime = "application/octet-stream";

    if (options && options.mime) mime = options.mime;

    uploadChannel.setUploadStream(inputStream, mime, -1);

    httpChannel.requestMethod = "POST";

    if (options && options.headers) {
        for (name in options.headers) {
            httpChannel.setRequestHeader(name, options.headers[name], false);
        }
    }

    channel.notificationCallbacks = listener;
    channel.asyncOpen(listener, null);
};
Net.submitMultiplart = function (url, parts, externalListener, options) {

    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                                .getService(Components.interfaces.nsIIOService);

    var uri = ioService.newURI(url, null, null);
    var channel = ioService.newChannelFromURI(uri);

    var httpChannel = channel.QueryInterface(Components.interfaces.nsIHttpChannel);

    var listener = {
        foStream: null,
        file: downloadTargetFile,
        listener: externalListener,
        size: 0,

        writeMessage: function (message) {
            if (this.listener && this.listener.onMessage) {
                this.listener.onMessage(message);
            }
        },
        onStartRequest: function (request, context) {
            this.writeMessage("Request started");
        },
        onDataAvailable: function (request, context, stream, sourceOffset, length) {
        },
        onStopRequest: function (request, context, status) {
            this.foStream.close();
            this.writeMessage("Done");
            this.listener.onDone();
        },
        onChannelRedirect: function (oldChannel, newChannel, flags) {
        },
        getInterface: function (aIID) {
            try {
                return this.QueryInterface(aIID);
            } catch (e) {
                throw Components.results.NS_NOINTERFACE;
            }
        },
        onProgress : function (aRequest, aContext, aProgress, aProgressMax) { },
        onStatus : function (aRequest, aContext, aStatus, aStatusArg) {
            this.writeMessage("onStatus: " + [aRequest, aContext, aStatus, aStatusArg]);
        },
        onRedirect : function (aOldChannel, aNewChannel) { },

        QueryInterface : function(aIID) {
            if (aIID.equals(Components.interfaces.nsISupports) ||
                aIID.equals(Components.interfaces.nsIInterfaceRequestor) ||
                aIID.equals(Components.interfaces.nsIChannelEventSink) ||
                aIID.equals(Components.interfaces.nsIProgressEventSink) ||
                aIID.equals(Components.interfaces.nsIHttpEventSink) ||
                aIID.equals(Components.interfaces.nsIStreamListener)) {

                return this;
            }

            throw Components.results.NS_NOINTERFACE;
        }
    }; //listener

    var stream = Components.classes["@mozilla.org/io/multiplex-input-stream;1"]
                            .createInstance(Components.interfaces.nsIMultiplexInputStream)
                            .QueryInterface(Components.interfaces.nsIInputStream);

    var boundary = "--------PENCIL--" + new Date().getTime();
    var boundaryStart = "\r\n--" + boundary + "\r\n" ;
    var boundaryEnd = "\r\n--" + boundary + "--" ;

    for (var i = 0; i < parts.length; i ++) {
        var part = parts[i];
        if (part.file) {
            //append the open boundary
            stream.appendStream(Net.createSimpleTextStream(boundaryStart));

            var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                                .createInstance(Components.interfaces.nsIFileInputStream);
            inputStream.init(part.file, 0x04 | 0x08, 0644, 0x04); // file is an nsIFile instance

            var bufferedInputStream = Components.classes["@mozilla.org/network/buffered-input-stream;1"]
                                .createInstance(Components.interfaces.nsIBufferedInputStream);
            bufferedInputStream.init(inputStream, 4096);

            //wrap the file stream into a MIME-input stream
            var mimeInputStream = Components.classes["@mozilla.org/network/mime-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIMIMEInputStream);

            mimeInputStream.addHeader("Content-Type", "image/png");
            mimeInputStream.addHeader("Content-Disposition", "form-data; name=\"" + part.name + "\"; filename=\"" + part.file.leafName + "\"");
            mimeInputStream.addContentLength = true;

            mimeInputStream.setData(bufferedInputStream);
            stream.appendStream(mimeInputStream);
        } else {
            //append the open boundary
            stream.appendStream(Net.createSimpleTextStream(boundaryStart));

            var mimeInputStream = Components.classes["@mozilla.org/network/mime-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIMIMEInputStream);

            mimeInputStream.addContentLength = true;
            mimeInputStream.addHeader("Content-Type", "application/x-www-form-urlencoded");
            mimeInputStream.addHeader("Content-Disposition", "form-data; name=\"" + part.name + "\"");
            mimeInputStream.setData(Net.createSimpleTextStream(part.value));
            stream.appendStream(mimeInputStream);
        }
    }

    stream.appendStream(Net.createSimpleTextStream(boundaryEnd));

    var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
    uploadChannel.setUploadStream(stream, null, -1);

    httpChannel.requestMethod = "POST";
    httpChannel.setRequestHeader("Content-Length", stream.available() - 2, false);
    httpChannel.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary, false);
    httpChannel.allowPipelining = false;

    if (options.auth) {
        var authenticator = Components.classes["@mozilla.org/network/http-authenticator;1?scheme=" + options.auth.scheme]
                            .getService(Components.interfaces.nsIHttpAuthenticator);

        var credentials = authenticator.generateCredentials(httpChannel, "Basic realm=\"Bugzilla\"",
                                                              false, uri.host,
                                                              {value: options.auth.user},
                                                              {value: options.auth.password},
                                                              {},
                                                              {});
        httpChannel.setRequestHeader("Authorization", credentials, true);
    }


    if (options && options.headers) {
        for (name in options.headers) {
            httpChannel.setRequestHeader(name, options.headers[name], false);
        }
    }

    channel.notificationCallbacks = listener;
    channel.asyncOpen(listener, null);
};
Net.createSimpleTextStream = function (text) {
    var stream = Components.classes['@mozilla.org/io/string-input-stream;1']
                    .createInstance(Components.interfaces.nsIStringInputStream);
    stream.setData(text, -1);

    return stream;
};
Net.downloadAsync = function(url, destPath, listener) {
    var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
              .createInstance(Components.interfaces.nsIWebBrowserPersist);
    var file = Components.classes["@mozilla.org/file/local;1"]
               .createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(destPath); // download destination
    var obj_URI = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService)
                  .newURI(url, null, null);

    persist.progressListener = listener;
    /*{
      onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
        var percentComplete = (aCurTotalProgress/aMaxTotalProgress)*100;
        var ele = document.getElementById("progress_element");
        ele.innerHTML = percentComplete +"%";
      },
      onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
        // do something
      }
    }*/
    persist.saveURI(obj_URI, null, null, null, "", file);
}
Util.goDoCommand = function (command, doc) {
    var dom = doc ? doc : document;
    var controller = dom.commandDispatcher.getControllerForCommand(command);
    if (controller && controller.isCommandEnabled(command)){
        controller.doCommand(command);
    }
};
Util.getFileExtension = function (path) {
    if (path) {
        var index = path.lastIndexOf(".");
        if (index != -1) {
            return path.substring(index + 1);
        }
    }
    return null;
};
Util.getCustomProperty = function (node, name, defaultValue) {
	if (node.hasAttributeNS(PencilNamespaces.p, name)) {
		return node.getAttributeNS(PencilNamespaces.p, name);
	}

	return defaultValue;
};
Util.getCustomNumberProperty = function (node, name, defaultValue) {
	var v = Util.getCustomProperty(node, name, null);
	if (v == null) return defaultValue;

	return parseFloat(v);
};
Util.setCustomProperty = function (node, name, value) {
	node.setAttributeNS(PencilNamespaces.p, "p:" + name, value);
};
Util.imageOnloadListener = function (event) {
    var image = event.target;
    var W = image.parentNode.clientWidth - 2;
    var H = image.parentNode.clientHeight - 2;
    var w = image.naturalWidth;
    var h = image.naturalHeight;

    var r = (image._mode == "center-crop" ? Math.min(w/W, h/H) : Math.max(w/W, h/H));

    if (!image._allowUpscale) r = Math.max(r, 1);

    w /= r;
    h /= r;

    image.parentNode.style.position = "relative";
    if (image._mode == "center-crop") {
        image.parentNode.style.overflow = "hidden";

    }
    image.style.position = "absolute";

    image.style.width = w + "px";
    image.style.height = h + "px";

    image.style.left = (W - w) / 2 + "px";
    image.style.top = (H - h) / 2 + "px";

    image.style.visibility = "inherit";

};
Util.setupImage = function (image, src, mode, allowUpscale) {
    image.onload = Util.imageOnloadListener;
    image.style.visibility = "hidden";
    image.style.width = "0px";
    image.style.height = "0px";
    image._mode = mode;
    image._allowUpscale = allowUpscale;
    image.src = src;
};

Util.isDev = function() {
    return process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);
};

function stencilDebug(x) {
    debug(x);
}

window.addEventListener("DOMContentLoaded", function () {
    document.documentElement.setAttribute("platform", navigator.platform.indexOf("Linux") < 0 ? "Other" : "Linux");
    Util.platform = navigator.platform.indexOf("Linux") < 0 ? "Other" : "Linux";
    Util.statusbarDisplay = document.getElementById("pencil-statusbar-display");
    //Util.initTextMetricFrame();
}, false);

var propertyTypeArray = ["Alignment", "Bool", "Bound", "Color", "CSS", "Dimension", "Enum", "Font", "Handle", "ImageData", "PlainText", "Point", "RichText", "RichTextArray", "ShadowStyle", "SnappingData", "StrokeStyle", "Outlet"];

Util.isXul17OrLater = function() {
    var version = Util.getXulrunnerVersion();
    var q = version.split("\.");
    if (q.length > 0) {
        return parseInt(q[0]) >= 17;
    }
    return false;
};


var pencilSandbox = {};
pencilSandbox.Dom = Dom;
pencilSandbox.Console = Console;
pencilSandbox.PencilNamespaces = PencilNamespaces;

Util.importSandboxFunctions = function () {
    for (var i = 0; i < arguments.length; i ++) {
        var f = arguments[i];
        pencilSandbox[f.name] = f;
    }
};
Util.workOnListAsync = function (list, worker, callback) {
    var index = -1;
    var next = function () {
        index ++;
        if (!list || index >= list.length) {
            if (callback) callback();
            return;
        }

        var item = list[index];
        worker(item, index, next);
    }
    next();
};
Util.compareVersion = function (version1, version2) {
    var a = version1.split(/\./);
    var b = version2.split(/\./);

    for (var i = 0; i < Math.min(a.length, b.length); i ++) {
        var n1 = parseInt(a[i], 10);
        var n2 = parseInt(b[i], 10);

        if (isNaN(n1) || isNaN(n2)) {
            n1 = a[i];
            n2 = b[i];
        }

        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }

    if (a.length > b.length) return 1;
    if (a.length < b.length) return -1;

    return 0;
};


function pEval (expression, extra, codeLocation) {
    var result = null;

    try {
        if (extra) {
            with (extra) result = eval(expression);
        } else {
            result = eval(expression)
        }
    } catch (ex) {
        if (expression.length < 2000) error("Problematic code: " + expression);
        if (codeLocation) error("Code location: " + codeLocation);
        Console.dumpError(ex);
    }

    return result;
};
function doLater(f, ms, win) {
    var w = win ? win : window;
    var start = new Date().getTime();
    var g = function () {
        var now = new Date().getTime();
        if (now - start > ms) {
            //alert(now - start);
            f();
            return;
        }
        w.setTimeout(g, 100);
    };

    g();
}

function geo_translate (p, dx, dy) {
    return {x: p.x + dx, y: p.y + dy};
};
function geo_rotate (p, a) {
    return {x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a)};
};

/**
 * p1: rotated point
 * p2: center
 * d: new length
 * a: rotated angle
 */
function geo_getRotatedPoint(p1, p2, d, a) {
    var p = geo_translate(p1, 0 - p2.x, 0 - p2.y);
    p = geo_rotate(p, a);
    p = geo_translate(p, p2.x, p2.y);

    var dx = p.x - p2.x;
    var dy = p.y - p2.y;

    var l = Math.sqrt(dx * dx + dy * dy);
    var r = d / l;
    p = {
        x: Math.round(p2.x + dx * r),
        y: Math.round(p2.y + dy * r)
    };

    return p;
};
function geo_vectorLength (p1, p2) {
    var dx = p1.x - p2.x;
    var dy = p1.y - p2.y;

    return Math.sqrt(dx * dx + dy * dy);
};

function geo_pointAngle (x, y) {
    if (x == 0) return y > 0 ? Math.PI / 2 : 0 - Math.PI / 2;
    return Math.atan2(y, x);
};

function geo_vectorAngle (p1, p2, q1, q2) {
    return geo_pointAngle(q2.x - q1.x, q2.y - q1.y) - geo_pointAngle(p2.x - p1.x, p2.y - p1.y);
};

function geo_findIntersection(a1, b1, a2, b2) {
	var x0 = a1.x;
	var y0 = a1.y;
	var a = b1.x - a1.x;
	var b = b1.y - a1.y;

	var x1 = a2.x;
	var y1 = a2.y;
	var c = b2.x - a2.x;
	var d = b2.y - a2.y;

	var u = d*a - c*b;
	if (u == 0) return null;

	var t = (d*x1 - d*x0 - c*y1 + c*y0) / u;
	return {
		x: x0 + a*t,
		y: y0 + b*t,
	};
}

function geo_buildQuickSmoothCurve(points, inputControlLength) {
	debug("geo_buildQuickSmoothCurve: points = " + points.length + ", controlLength: " + inputControlLength);
	if (points.length != 4) {
		return geo_buildSmoothCurve(points);
		return;
	}

    var spec = [M(points[0].x, points[0].y)];
    var controlLength = Math.min(geo_vectorLength(points[0], points[3]) / 2, 60);

    if (typeof(inputControlLength) != "undefined") {
    	controlLength = Math.max(3 * inputControlLength, controlLength);
    }

    debug("controlLength: " + controlLength);
    var p1 = geo_getRotatedPoint(points[1], points[0], controlLength, 0);
    var p2 = geo_getRotatedPoint(points[2], points[3], controlLength, 0);
    spec.push(C(p1.x, p1.y, p2.x, p2.y, points[3].x, points[3].y));

    return spec;
};
function geo_buildSmoothCurve (points) {
    var spec = [M(points[0].x, points[0].y)];
    var len = points.length;
    var lastAngle = null;
    for (var i = 1; i < len; i ++) {
        var p1 = points[i - 1];
        if (lastAngle != null) {
            p1 = geo_getRotatedPoint(points[i], points[i - 1],
                                            geo_vectorLength(points[i], points[i - 1]) / 5,
                                            angle
                                            );
        }

        var p2 = points[i];
        if (i < len - 1) {
            var a = geo_vectorAngle(points[i], points[i- 1], points[i], points[i + 1]);
            if (a < 0) a = Math.PI * 2 + a;

            angle = (Math.PI / 2 - Math.abs(a) / 2);
            p2 = geo_getRotatedPoint(points[i - 1], points[i],
                                            geo_vectorLength(points[i], points[i - 1]) / 5,
                                            0 - angle
                                            );
            lastAngle = angle;
        }

        spec.push(C(p1.x, p1.y, p2.x, p2.y, points[i].x, points[i].y));
        //spec.push(L(points[i].x, points[i].y));
    }

    return spec;
};

function fsExistSync(p) {
    try {
        var stat = fs.statSync(p);
        return stat;
    } catch (e) {
        if (e.code == "ENOENT") return null;
        throw e;
    }
};
function fsExistAsDirectorySync(p) {
    try {
        var stat = fs.statSync(p);
        return stat.isDirectory();
    } catch (e) {
        if (e.code == "ENOENT") return false;
        throw e;
    }
}

function deleteFileOrFolder(p) {
    try {
        var stat = fs.statSync(p);
        if (stat.isDirectory()) {
            var children = fs.readdirSync(p);
            children.forEach(function (child) {
                if (child == "." || child == "..") return;
                deleteFileOrFolder(path.join(p, child));
            });

            fs.rmdirSync(p);
        } else {
            fs.unlinkSync(p);
        }
    } catch (e) {}
}


/* credit: http://stackoverflow.com/a/26038979/5746831 */
function copyFileSync(source, target) {
    var targetFile = target;

    if (fsExistSync(target)) {
        if (fs.lstatSync(target).isDirectory()) {
            targetFile = path.join(target, path.basename(source));
        }
    }

    fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync(source, target) {
    var files = [];

    //check if folder needs to be created or integrated
    var targetFolder = path.join(target, path.basename(source));
    if (!fsExistSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
    }

    //copy
    if (fs.lstatSync(source).isDirectory()) {
        files = fs.readdirSync(source);
        files.forEach(function (file) {
            var curSource = path.join(source, file);
            if (fs.lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, targetFolder);
            } else {
                copyFileSync(curSource, targetFolder);
            }
        });
    }
}

function getStaticFilePath(subPath) {
    var filePath = __dirname;
    if (!subPath) return filePath;

    var parts = subPath.split("/");
    for (var i = 0; i < parts.length; i ++) {
        filePath = path.join(filePath, parts[i]);
    }

    return filePath;
}

function _before(before, fn) {
  return function () {
    before.apply(this, arguments);
    return fn.apply(this, arguments);
  };
}

function _after(fn, after) {
  return function () {
    var result = fn.apply(this, arguments);
    after.call(this, result);
    return result;
  };
}

function getRequiredValue(input, message, pattern) {
    var value = input.value;
    var valid = pattern ? value.match(pattern) : value.trim().length > 0;
    if (!valid) {
        var e = new Error(message || "Please enter a valid value.");
        e._input = input;
        e._isValidationError = true;
        throw e;
    }

    return value;
}
function handleCommonValidationError(e) {
    if (e._isValidationError) {
        Dialog.error(e.message, "", function () {
            setTimeout(function () {
                e._input.focus();
                e._input.select();
            }, 250);
        });

        return false;
    } else {
        throw e;
    }
}

function contains(list, item, comparer) {
    return findItemByComparer(list, item, comparer) >= 0;
}

function sameList(a, b, comparer) {
    return containsAll(a, b, comparer) && containsAll(b, a, comparer);
};
function containsAll(a, b, comparer) {
    var c = comparer || sameId;
    for (var i = 0; i < b.length; i ++) {
        if (!contains(a, b[i], c)) return false;
    }

    return true;
};
function intersect(a, b, comparer) {
    if (!a || !b) return [];
    var items = [];
    for (var i = 0; i < a.length; i ++) {
        if (contains(b, a[i], comparer)) {
            items.push(a[i]);
        }
    }

    return items;
};

function findItemByComparer(list, item, comparer) {
    for (var i = 0; i < list.length; i ++) {
        if (comparer(list[i], item)) return i;
    }

    return -1;
}
function removeItemByComparer(list, item, comparer) {
    var result = [];
    for (var i = 0; i < list.length; i ++) {
        if (!comparer(list[i], item)) {
            result.push(list[i]);
        }
    }

    return result;
}
function find(list, matcher) {
    for (var i = 0; i < list.length; i ++) {
        if (matcher(list[i])) return list[i];
    }

    return null;
}
function findById(list, id) {
    return find(list, function (u) { return u.id == id; });
}
function _export() {
    var obj = {};
    for (var i = 0; i < arguments.length; i ++) {
        var f = arguments[i];
        if (typeof(f) != "function") continue;
        obj[f.name] = f;
    }

    return obj;
}
function sameId(a, b) {
    if (!a) return !b;
    if (!b) return false;
    return a.id == b.id;
}
function sameRelax(a, b) {
    return a == b;
}

process.on('uncaughtException', function (e) {
    console.error("UNCAUGHT EXCPTION", e);
});

Util.importSandboxFunctions(geo_buildQuickSmoothCurve, geo_buildSmoothCurve, geo_getRotatedPoint, geo_pointAngle, geo_rotate, geo_translate, geo_vectorAngle, geo_vectorLength, geo_findIntersection);
