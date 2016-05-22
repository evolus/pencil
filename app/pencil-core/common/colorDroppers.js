var ColorDropper = function () {
    var active = false;
    var dropper = null;
    var colorCallback = null;
    var currentPanel = null;
    var lastPanelX = 0;
    var lastPanelY = 0;
    try {
        dropper = Components.classes["@iosart.com/Utils/ColorZilla;1"].createInstance()
                            .QueryInterface(Components.interfaces.mozIColorZilla);
    } catch (e) {}

	function stop() {
	    active = false;
	    if (currentPanel) {
	        currentPanel.openPopupAtScreen(lastPanelX, lastPanelY, false);
	    }

	    currentPanel = false;
        if (document && document.documentElement) {
            document.documentElement.removeAttributeNS(PencilNamespaces.p, "probing");
        }
        if (window.opener) {
            window.opener.document.documentElement.removeAttributeNS(PencilNamespaces.p, "probing");
        }
	}

    function getRValue(color) {
	    return color & 0xff;
    }

    function getGValue(color) {
	    return (color >> 8) & 0xff;
    }

    function getBValue(color) {
	    return (color >> 16) & 0xff;
    }

    var clickHandler = function (event) {
        if (!active || !dropper || !colorCallback) {
            if (active) {
                stop();
            }
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        var c = dropper.GetPixel(event.screenX, event.screenY);
        var color = new Color();
        color.r = getRValue(c);
        color.g = getGValue(c);
        color.b = getBValue(c);
        color.a = 1.0;

        stop();

        colorCallback(color);
    };

    window.addEventListener("mousedown", clickHandler, true);

    if (window.opener) {
        window.opener.addEventListener("mousedown", clickHandler, true);
    }

    return {
        begin: function (callback, node) {
            colorCallback = callback;

            currentPanel = Dom.findUpward(node, function (n) {
                return n.localName == "panel" && n.namespaceURI == PencilNamespaces.xul;
            });

            if (currentPanel) {
                lastPanelX = currentPanel.popupBoxObject.screenX;
                lastPanelY = currentPanel.popupBoxObject.screenY;
                currentPanel.hidePopup();
            }

            document.documentElement.setAttributeNS(PencilNamespaces.p, "p:probing", true);
            if (window.opener) {
                window.opener.document.documentElement.setAttributeNS(PencilNamespaces.p, "p:probing", true);
            }

            active = true;
        },
        isAvailable: function () {
            return dropper != null;
        }
    };
} ();
