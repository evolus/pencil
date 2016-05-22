window.addEventListener("load", function() {
    var sendToMenuPopup = document.getElementById("pencil_sendToMenuPopup");
    sendToMenuPopup.addEventListener("command", PencilOverlay.onSendToCommand, false);

    var toolMenu = document.getElementById("menu_ToolsPopup");
    toolMenu.addEventListener("popupshowing", PencilOverlay.updateToolMenuEntry, false);

}, false);

var PencilOverlay = {};

PencilOverlay.updateToolMenuEntry = function () {
    try {
        var sendToMenuPopup = document.getElementById("pencil_sendToMenuPopup");
        Dom.empty(sendToMenuPopup);

        var found = false;
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                           .getService(Components.interfaces.nsIWindowMediator);
        var enumerator = wm.getEnumerator("PencilMainWindow");

        while(enumerator.hasMoreElements()) {
            var pencilWindow = enumerator.getNext();

            var controller = pencilWindow.Pencil.controller;
            var filePath = controller.filePath;
            if (!filePath) continue;

            found = true;
            var item = sendToMenuPopup.ownerDocument.createElementNS(PencilNamespaces.xul, "menuitem");
            item.setAttribute("label", filePath);
            item._pencilWindow = pencilWindow;

            sendToMenuPopup.appendChild(item);
        }
        sendToMenuPopup.parentNode.setAttribute("disabled", !found);
    } catch (e) {
        Console.dumpError(e, "Error");
    }
};
PencilOverlay.onSendToCommand = function (event) {
    var item = Dom.findUpward(event.originalTarget, function (node) {
        return node._pencilWindow;
    });
    try {
        if (item) {
            //pickup the active window:
            var browser = document.getElementById("content").selectedBrowser;
            debug(browser);
            var activeWindow = browser.contentWindow;
            var activeDocument = browser.contentDocument;

            //generate the file path
            var epPath = item._pencilWindow.Pencil.controller.filePath;
            var epFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
            epFile.initWithPath(epPath);

            var title = activeDocument.title;
            if (!title) title = Util.getMessage("untitled.page");
            var pngFileName = title.replace(/[^a-z0-9]/gi, "_") + (new Date().getTime()) + ".png";

            var pngFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
            pngFile.setRelativeDescriptor(epFile.parent, pngFileName);

            //calculating dim and save window capture to png file
            var w = activeDocument.documentElement.scrollWidth;
            var h = activeDocument.documentElement.scrollHeight;
            PencilOverlay.saveWindowToFile(activeWindow, w, h, pngFile.path, function () {
                var pngFileUri = Util.ios.newFileURI(pngFile).spec;
                item._pencilWindow.Pencil.insertPNGImage(pngFileUri, w, h, 0, 0);
                item._pencilWindow.focus();
            });

        }
    } catch (e) {
        Console.dumpError(e, "Error");
    }
};
PencilOverlay.test = function () {
    var browser = document.getElementById("content").selectedBrowser;
    debug(browser);
    var activeWindow = browser.contentWindow;
    var activeDocument = browser.contentDocument;
    debug(activeWindow.location.href);
    var w = activeDocument.documentElement.scrollWidth;
    var h = activeDocument.documentElement.scrollHeight;
    PencilOverlay.saveWindowToFile(activeWindow, w, h, "/data/home/Desktop/out.png");
};
PencilOverlay.saveWindowToFile = function (targetWindow, canvasW, canvasH, filePath, callback) {
    var canvas = document.createElementNS(PencilNamespaces.html, "canvas");
    canvas.style.width = canvasW + "px";
    canvas.style.height = canvasH + "px";
    canvas.width = canvasW;
    canvas.height = canvasH;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.save();
    ctx.scale(1, 1);
    ctx.drawWindow(targetWindow, 0, 0, canvasW, canvasH, "rgba(255,255,255,0)");
    ctx.restore();

    PencilOverlay.saveURI(canvas.toDataURL("image/png", ""), filePath, callback ? callback : null);
};
PencilOverlay.saveURI = function (url, filePath, callback)
{


    uri = Components.classes["@mozilla.org/network/standard-url;1"].
          createInstance(Components.interfaces.nsIURI);
    uri.spec = url;

    localFile = Components.classes["@mozilla.org/file/local;1"].
                createInstance(Components.interfaces.nsILocalFile)
    localFile.initWithPath(filePath)

    persistListener = new PersistProgressListener(callback ? callback : null);
    persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].
              createInstance(Components.interfaces.nsIWebBrowserPersist);

    persist.progressListener = persistListener;
    persist.saveURI(uri, null, null, null, null, localFile);
}

function PersistProgressListener(callback)
{
  this.init();
  this.callback = callback ? callback : null;
}

PersistProgressListener.prototype =
{
  QueryInterface : function(aIID) {
    if(aIID.equals(Components.interfaces.nsIWebProgressListener))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  init : function() {
  },

  destroy : function() {
  },

  // nsIWebProgressListener
  onProgressChange : function (aWebProgress, aRequest,
                               aCurSelfProgress, aMaxSelfProgress,
                               aCurTotalProgress, aMaxTotalProgress) {
    debug("aCurTotalProgress: " + aCurTotalProgress + ", aMaxTotalProgress: " + aMaxTotalProgress);
  },

  onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus) {
      if (aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
        if (this.callback) {
            var f = this.callback;
            f();
        }
      }
  },

  onLocationChange : function(aWebProgress, aRequest, aLocation) {
  },

  onStatusChange : function(aWebProgress, aRequest, aStatus, aMessage) {
  },

  onSecurityChange : function(aWebProgress, aRequest, aState) {
  }
};






