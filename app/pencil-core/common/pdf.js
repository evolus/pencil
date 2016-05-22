var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;

function test() {
    var browser = document.getElementById("browser");
    var printSettings = Cc["@mozilla.org/gfx/printsettings-service;1"]
                                                            .getService(Ci.nsIPrintSettingsService)
                                                            .newPrintSettings;
    printSettings.printSilent = true;
    printSettings.showPrintProgress = false;
    printSettings.printBGImages = true;
    printSettings.printBGColors = true;
    printSettings.printToFile = true;
    printSettings.toFileName = "e:\\print.pdf";
    printSettings.printFrameType = Ci.nsIPrintSettings.kFramesAsIs;
    printSettings.outputFormat = Ci.nsIPrintSettings.kOutputFormatPDF;

    //XXX we probably need a preference here, the header can be useful
    printSettings.footerStrCenter = "";
    printSettings.footerStrLeft     = "";
    printSettings.footerStrRight    = "";
    printSettings.headerStrCenter = "";
    printSettings.headerStrLeft     = "";
    printSettings.headerStrRight    = "";
    printSettings.marginTop = 0;
    printSettings.marginRight = 0;
    printSettings.marginBottom = 0;
    printSettings.marginLeft = 0;
    printSettings.unwriteableMarginTop = 0;
    printSettings.unwriteableMarginRight = 0;
    printSettings.unwriteableMarginBottom = 0;
    printSettings.unwriteableMarginLeft = 0;
    printSettings.printBGColors = true;
    printSettings.title = "Pencil printing";
    var listener = {
        onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
            if (aStateFlags & Ci.nsIWebProgressListener.STATE_STOP) {
                //sendAsyncMessage("Browser:SaveAs:Return", { type: json.type, id: json.id, referrer: json.referrer });
            }
        },
        onProgressChange : function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {},

        // stubs for the nsIWebProgressListener interfaces which nsIWebBrowserPrint doesn't use.
        onLocationChange : function() { throw "Unexpected onLocationChange"; },
        onStatusChange     : function() { throw "Unexpected onStatusChange";     },
        onSecurityChange : function() { throw "Unexpected onSecurityChange"; }
    };

    var webBrowserPrint = browser.contentWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebBrowserPrint);
    webBrowserPrint.print(printSettings, listener);
}
