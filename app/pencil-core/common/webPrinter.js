var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;

function WebPrinter() {
    //create the window
    var iframe = document.createElementNS(PencilNamespaces.html, "html:iframe");

    var container = document.body;
    if (!container) container = document.documentElement;
    var box = document.createElement("box");
    box.setAttribute("style", "-moz-box-pack: start; -moz-box-align: start;");

    iframe.setAttribute("style", "border: none; min-width: 0px; min-height: 0px; width: 1px; height: 1px; visibilityx: hidden;");
    iframe.setAttribute("src", "blank.html");

    box.appendChild(iframe);
    container.appendChild(box);

    box.style.MozBoxPack = "start";
    box.style.MozBoxAlign = "start";

    var thiz = this;

    this.nextHandler = null;

    window.addEventListener("DOMFrameContentLoaded", function (event) {
        var win = iframe.contentWindow;
        debug("WebPrinter: DOMFrameContentLoaded, " + win);
        if (!win._initialized) {
            debug("WebPrinter: Initializing content window");
            win._isRasterizeFrame = true;
            win.addEventListener("MozAfterPaint", function (event) {
                //debug("MozAfterPaint: " + [event, event.originalTarget, win.document]);

                if (!event.originalTarget._isRasterizeFrame) return;
                win.setTimeout(function () {
                    if (!thiz.nextHandler) return;

                    debug("WebPrinter: calling next handler");
                    var f = thiz.nextHandler;
                    thiz.nextHandler = null;
                    f();
                }, 1000);

                /*if (!event.originalTarget._isRasterizeFrame) return;
                if (!thiz.nextHandler) return;

                var f = thiz.nextHandler;
                thiz.nextHandler = null;
                f();*/

            }, false);

            var document = iframe.contentDocument.documentElement;
            document.style = document.style || {};
            document.style.backgroundColor = "rgba(0, 0, 0, 0)";
            win._initialized = true;
        }
    }, false);

    this.win = iframe.contentWindow;
    this.win.document.body.setAttribute("style", "padding: 0px; margin: 0px;")
};
WebPrinter.prototype.printUrl = function (url, settings, callback) {
    var thiz = this;
    this.nextHandler = function () {
        thiz._printWindow(settings, callback);
    };
    this.win.location.href = url;
};
WebPrinter.prototype._printWindow = function (settings, callback) {
    var printSettings = Cc["@mozilla.org/gfx/printsettings-service;1"]
                                                            .getService(Ci.nsIPrintSettingsService)
                                                            .newPrintSettings;
                                                            
    printSettings.printBGImages = true;
    printSettings.printBGColors = true;
    printSettings.shrinkToFit = true;
    printSettings.printFrameType = Ci.nsIPrintSettings.kFramesAsIs;
    
    if (settings.filePath) {
        printSettings.printSilent = true;
        printSettings.showPrintProgress = false;
        printSettings.printToFile = true;
        printSettings.toFileName = settings.filePath;
        printSettings.outputFormat = Ci.nsIPrintSettings.kOutputFormatPDF;
    } else {
        printSettings.printSilent = false;
        printSettings.showPrintProgress = true;
        printSettings.printToFile = false;
    }
    
    printSettings.footerStrCenter = "";
    printSettings.footerStrLeft     = "";
    printSettings.footerStrRight    = "";
    printSettings.headerStrCenter = "";
    printSettings.headerStrLeft     = "";
    printSettings.headerStrRight    = "";
    printSettings.marginTop = 0.25;
    printSettings.marginRight = 0.25;
    printSettings.marginBottom = 0.25;
    printSettings.marginLeft = 0.25;
    printSettings.unwriteableMarginTop = 0;
    printSettings.unwriteableMarginRight = 0;
    printSettings.unwriteableMarginBottom = 0;
    printSettings.unwriteableMarginLeft = 0;
    printSettings.title = settings.title ? settings.title : "Pencil printing";
    
    var option = settings["print.paperSize"];
    if (option) {
        var size = WebPrinter.paperSizeMap[option];
        if (size) {
            printSettings.paperData = size.data;
            printSettings.paperName = size.name;
            printSettings.paperWidth = size.width;
            printSettings.paperHeight = size.height;
            printSettings.paperSizeUnit = size.unit;
        }
    }
    var landscape = ("landscape" == settings["print.orientation"]);
    if (landscape) {
        if (settings.filePath) {
            //HACK: landscape mode for PDF printing should be portrait with swapped sizes
            printSettings.orientation = Ci.nsIPrintSettings.kPortraitOrientation;
            printSettings.paperWidth = size.height;
            printSettings.paperHeight = size.width;
        } else {
            printSettings.orientation = Ci.nsIPrintSettings.kLandscapeOrientation;
        }
    } else {
        printSettings.orientation = Ci.nsIPrintSettings.kPortraitOrientation;
    }
    
    var listener = {
        onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
            if (aStateFlags & Ci.nsIWebProgressListener.STATE_STOP) {
                callback();
            }
        },
        onProgressChange : function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {},

        onLocationChange : function() { throw "Unexpected onLocationChange"; },
        onStatusChange     : function() { throw "Unexpected onStatusChange";     },
        onSecurityChange : function() { throw "Unexpected onSecurityChange"; }
    };

    var webBrowserPrint = this.win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebBrowserPrint);
    webBrowserPrint.print(printSettings, listener);
};

const kPaperSizeMillimeters = Ci.nsIPrintSettings.kPaperSizeMillimeters;
const kPaperSizeInches = Ci.nsIPrintSettings.kPaperSizeInches;

WebPrinter.paperSizeMap =
{
  na_letter:{
    data:18,
    name:"na_letter",
    displayName:"US Note",
    width:8.5,
    height:11,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  ppd_Tabloid:{
    data:3,
    name:"ppd_Tabloid",
    displayName:"US Tabloid",
    width:11,
    height:17,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  ppd_Ledger:{
    data:4,
    name:"ppd_Ledger",
    displayName:"US Ledger",
    width:17,
    height:11,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  na_legal:{
    data:5,
    name:"na_legal",
    displayName:"US Legal",
    width:8.5,
    height:14,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  na_invoice:{
    data:6,
    name:"na_invoice",
    displayName:"US Statement",
    width:5.5,
    height:8.5,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  na_executive:{
    data:7,
    name:"na_executive",
    displayName:"US Executive",
    width:7.25,
    height:10.5,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  iso_a3:{
    data:8,
    name:"iso_a3",
    displayName:"A3",
    width:297,
    height:420,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  iso_a4:{
    data:10,
    name:"iso_a4",
    displayName:"A4 Small",
    width:210,
    height:297,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  iso_a4_land:{
    data:10,
    name:"iso_a4",
    displayName:"A4 Small",
    width:297,
    height:210,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  iso_a5:{
    data:11,
    name:"iso_a5",
    displayName:"A5",
    width:148,
    height:210,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  jis_b4:{
    data:12,
    name:"jis_b4",
    displayName:"B4 (JIS)",
    width:257,
    height:364,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  jis_b5:{
    data:13,
    name:"jis_b5",
    displayName:"B5 (JIS)",
    width:182,
    height:257,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  om_folio:{
    data:14,
    name:"om_folio",
    displayName:"Folio",
    width:210,
    height:330,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  na_quarto:{
    data:15,
    name:"na_quarto",
    displayName:"Quarto",
    width:8.5,
    height:10.83,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  na_10x14:{
    data:16,
    name:"na_10x14",
    displayName:"10x14 (envelope)",
    width:10,
    height:14,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  na_ledger:{
    data:17,
    name:"na_ledger",
    displayName:"11x17 (envelope)",
    width:11,
    height:17,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  'na_number-9':{
    data:19,
    name:"na_number-9",
    displayName:"US Envelope #9",
    width:3.875,
    height:8.875,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  'na_number-10':{
    data:20,
    name:"na_number-10",
    displayName:"US Envelope #10",
    width:4.125,
    height:9.5,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  'na_number-11':{
    data:21,
    name:"na_number-11",
    displayName:"US Envelope #11",
    width:4.5,
    height:10.375,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  'na_number-12':{
    data:22,
    name:"na_number-12",
    displayName:"US Envelope #12",
    width:4.75,
    height:11,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  'na_number-14':{
    data:23,
    name:"na_number-14",
    displayName:"US Envelope #14",
    width:5,
    height:11.5,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  na_c:{
    data:24,
    name:"na_c",
    displayName:"C size sheet",
    width:17,
    height:22,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  na_d:{
    data:25,
    name:"na_d",
    displayName:"D size sheet",
    width:22,
    height:34,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  na_e:{
    data:26,
    name:"na_e",
    displayName:"E size sheet",
    width:34,
    height:44,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  iso_dl:{
    data:27,
    name:"iso_dl",
    displayName:"Envelope DL",
    width:110,
    height:220,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  iso_c5:{
    data:28,
    name:"iso_c5",
    displayName:"Envelope C5",
    width:162,
    height:229,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  iso_c3:{
    data:29,
    name:"iso_c3",
    displayName:"Envelope C3",
    width:324,
    height:458,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  iso_c4:{
    data:30,
    name:"iso_c4",
    displayName:"Envelope C4",
    width:229,
    height:324,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  iso_c6:{
    data:31,
    name:"iso_c6",
    displayName:"Envelope C6",
    width:114,
    height:162,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  iso_c6c5:{
    data:32,
    name:"iso_c6c5",
    displayName:"Envelope C65",
    width:114,
    height:229,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  iso_b4:{
    data:33,
    name:"iso_b4",
    displayName:"Envelope B4",
    width:250,
    height:353,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  iso_b5:{
    data:34,
    name:"iso_b5",
    displayName:"Envelope B5",
    width:176,
    height:250,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  iso_b6:{
    data:35,
    name:"iso_b6",
    displayName:"Envelope B6",
    width:125,
    height:176,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  om_italian:{
    data:36,
    name:"om_italian",
    displayName:"Italian Envelope",
    width:110,
    height:230,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  },
  na_monarch:{
    data:37,
    name:"na_monarch",
    displayName:"US Envelope Monarch",
    width:3.875,
    height:7.5,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  na_personal:{
    data:38,
    name:"na_personal",
    displayName:"US Personal Envelope",
    width:3.625,
    height:6.5,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  'na_fanfold-us':{
    data:39,
    name:"na_fanfold-us",
    displayName:"US Std Fanfold",
    width:11,
    height:14.875,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  'na_fanfold-eur':{
    data:40,
    name:"na_fanfold-eur",
    displayName:"German Std Fanfold",
    width:8.5,
    height:12,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  na_foolscap:{
    data:41,
    name:"na_foolscap",
    displayName:"German Legal Fanfold",
    width:8.5,
    height:13,
    unit:Ci.nsIPrintSettings.kPaperSizeInches
  },
  jpn_hagaki:{
    data:43,
    name:"jpn_hagaki",
    displayName:"Japanese Postcard",
    width:100,
    height:148,
    unit:Ci.nsIPrintSettings.kPaperSizeMillimeters
  }
}
