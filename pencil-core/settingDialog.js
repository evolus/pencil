window.onerror = function (message, url, code) {
    error("SYSTEM ERROR!\n\t* " + message + "\n\t* at: " + url + ":" + code);
    return false;
};


var pencil = null;
handleOnLoad = function () {
    if (window.arguments && window.arguments.length > 0) {
        pencil = window.arguments[0];
    }

    if (navigator.userAgent.indexOf("Intel Mac") != -1) {
        Dom.addClass(document.getElementById("pencil-settings"), "macosx");
    }
    document.getElementById("undoEnabled").checked = Config.get("view.undoLevel") > 0;
    document.getElementById("labelGridSize").disabled = Config.get("grid.enabled") == false;
    document.getElementById("textboxGridSize").disabled = Config.get("grid.enabled") == false;

    document.getElementById("enableSnappingBackground").disabled = Config.get("object.snapping.enabled") == false;

    // e
    document.getElementById("enableDocking").disabled = true;

    /*
    var currentConverer = Config.get("export.oo.converter", "uno");
    document.getElementById("unoBox").style.display = (currentConverer == "uno" ? "" : "none");
    document.getElementById("jodBox").style.display = (currentConverer == "jod" ? "" : "none");
    document.getElementById("openOfficeConverterList").selectedIndex = (currentConverer == "uno") ? 0 : 1;

    var url = Config.get("export.oo.converter.jod.url", "http://example.com");
    var path = Config.get("export.oo.converter.uno.path", "/bin/sh");
    document.getElementById("jodConverterUrl").value = url;
    document.getElementById("unoConverterUrl").value = path;
    
    */

    var w = Config.get("clipartbrowser.scale.width");
    var h = Config.get("clipartbrowser.scale.height");
    if (w == null) {
        Config.set("clipartbrowser.scale.width", 200);
    }
    if (h == null) {
        Config.set("clipartbrowser.scale.height", 200);
    }

    var svgurl = Config.get("external.editor.vector.path", "/usr/bin/inkscape");
    var bitmapurl = Config.get("external.editor.bitmap.path", "/usr/bin/gimp");
    document.getElementById("svgEditorUrl").value = svgurl;
    document.getElementById("bitmapEditorUrl").value = bitmapurl;

    document.getElementById("textboxClipartBrowserScaleWidth").disabled = document.getElementById("textboxClipartBrowserScaleHeight").disabled = (Config.get("clipartbrowser.scale") == false);

    onConfigLoad();

    window.sizeToContent();
};

handleOnOk = function () {
    if (pencil) {
        var canvasList = pencil.getCanvasList();
        for (var canvas in canvasList) {
            canvasList[canvas].zoomTo(canvasList[canvas].zoom);
        }
    }
    return true;
}

handleOnCancel = function () {
}

updateConverter = function () {
    var selectedConverter = document.getElementById("openOfficeConverterList").selectedItem;
    if (selectedConverter) {
        selectedConverter = selectedConverter.value;
    }
    if ("uno" == selectedConverter) {
        document.getElementById("unoBox").style.display = "";
        document.getElementById("jodBox").style.display = "none";
    } else {
        document.getElementById("unoBox").style.display = "none";
        document.getElementById("jodBox").style.display = "";
    }
}
window.addEventListener("load", handleOnLoad, false);

//@line 41 "e:\builds\moz2_slave\win32_build\build\toolkit\components\viewconfig\content\config.js"

const nsIPrefLocalizedString = Components.interfaces.nsIPrefLocalizedString;
const nsISupportsString = Components.interfaces.nsISupportsString;
const nsIPromptService = Components.interfaces.nsIPromptService;
const nsIPrefService = Components.interfaces.nsIPrefService;
const nsIPrefBranch = Components.interfaces.nsIPrefBranch;
const nsIClipboardHelper = Components.interfaces.nsIClipboardHelper;
const nsIAtomService = Components.interfaces.nsIAtomService;

const nsSupportsString_CONTRACTID = "@mozilla.org/supports-string;1";
const nsPrompt_CONTRACTID = "@mozilla.org/embedcomp/prompt-service;1";
const nsPrefService_CONTRACTID = "@mozilla.org/preferences-service;1";
const nsClipboardHelper_CONTRACTID = "@mozilla.org/widget/clipboardhelper;1";
const nsAtomService_CONTRACTID = "@mozilla.org/atom-service;1";

const gPromptService = Components.classes[nsPrompt_CONTRACTID].getService(nsIPromptService);
const gPrefService = Components.classes[nsPrefService_CONTRACTID].getService(nsIPrefService);
const gPrefBranch = gPrefService.getBranch(null).QueryInterface(Components.interfaces.nsIPrefBranch2);
const gClipboardHelper = Components.classes[nsClipboardHelper_CONTRACTID].getService(nsIClipboardHelper);
const gAtomService = Components.classes[nsAtomService_CONTRACTID].getService(nsIAtomService);

var gLockAtoms = [gAtomService.getAtom("default"), gAtomService.getAtom("user"), gAtomService.getAtom("locked")];
// we get these from a string bundle
var gLockStrs = [];
var gTypeStrs = [];

const PREF_IS_DEFAULT_VALUE = 0;
const PREF_IS_USER_SET = 1;
const PREF_IS_LOCKED = 2;

var gPrefHash = {};
var gPrefArray = [];
var gPrefView = gPrefArray; // share the JS array
var gFastIndex = 0;
var gSortedColumn = "prefCol";
var gSortFunction = null;
var gSortDirection = 1; // 1 is ascending; -1 is descending

var view = {
    get rowCount() { return gPrefView.length; },
    getCellText : function(index, col) {
        if (!(index in gPrefView))
            return "";

        var value = gPrefView[index][col.id];

        switch (col.id) {
        case "lockCol":
            return gLockStrs[value];
        case "typeCol":
            return gTypeStrs[value];
        default:
            return value;
        }
    },
    getRowProperties : function(index, prop) {},
    getCellProperties : function(index, col, prop) {
        if (index in gPrefView)
            prop.AppendElement(gLockAtoms[gPrefView[index].lockCol]);
    },
    getColumnProperties : function(col, prop) {},
    treebox : null,
    selection : null,
    isContainer : function(index) { return false; },
    isContainerOpen : function(index) { return false; },
    isContainerEmpty : function(index) { return false; },
    isSorted : function() { return true; },
    canDrop : function(index, orientation) { return false; },
    drop : function(row, orientation) {},
    setTree : function(out) { this.treebox = out; },
    getParentIndex: function(rowIndex) { return -1; },
    hasNextSibling: function(rowIndex, afterIndex) { return false; },
    getLevel: function(index) { return 1; },
    getImageSrc: function(row, col) { return ""; },
    toggleOpenState : function(index) {},
    cycleHeader: function(col) {
        var index = this.selection.currentIndex;
        if (col.id == gSortedColumn)
            gSortDirection = -gSortDirection;
        if (col.id == gSortedColumn && gFastIndex == gPrefArray.length) {
            gPrefArray.reverse();
            if (gPrefView != gPrefArray)
                gPrefView.reverse();
            if (index >= 0)
                index = gPrefView.length - index - 1;
        } else {
            var pref = null;
            if (index >= 0) {
            if (gPrefArray != gPrefView)
                index = gPrefView.length - index - 1;
            else
                pref = gPrefArray[index];
            }
            var old = document.getElementById(gSortedColumn);
            old.setAttribute("sortDirection", "");
            gPrefArray.sort(gSortFunction = gSortFunctions[col.id]);
            if (gPrefView != gPrefArray) {
                if (col.id == gSortedColumn)
                    gPrefView.reverse();
                else
                    gPrefView.sort(gSortFunction);
            }
            gSortedColumn = col.id;
            if (pref)
                index = getIndexOfPref(pref);
        }
        col.element.setAttribute("sortDirection", gSortDirection > 0 ? "ascending" : "descending");
        this.treebox.invalidate();
        if (index >= 0) {
            this.selection.select(index);
            this.treebox.ensureRowIsVisible(index);
        }
        gFastIndex = gPrefArray.length;
    },
    selectionChanged : function() {},
    cycleCell: function(row, col) {},
    isEditable: function(row, col) {return false; },
    isSelectable: function(row, col) {return false; },
    setCellValue: function(row, col, value) {},
    setCellText: function(row, col, value) {},
    performAction: function(action) {},
    performActionOnRow: function(action, row) {},
    performActionOnCell: function(action, row, col) {},
    isSeparator: function(index) {return false; }
};

// find the index in gPrefView of a pref object
// or -1 if it does not exist in the filtered view
function getViewIndexOfPref(pref) {
    var low = -1, high = gPrefView.length;
    var index = (low + high) >> 1;
    while (index > low) {
        var mid = gPrefView[index];
        if (mid == pref)
            return index;
        if (gSortFunction(mid, pref) < 0)
            low = index;
        else
            high = index;
        index = (low + high) >> 1;
    }
    return -1;
}

// find the index in gPrefArray of a pref object
// either one that was looked up in gPrefHash
// or in case it was moved after sorting
function getIndexOfPref(pref) {
    var low = -1, high = gFastIndex;
    var index = (low + high) >> 1;
    while (index > low) {
        var mid = gPrefArray[index];
        if (mid == pref)
            return index;
        if (gSortFunction(mid, pref) < 0)
            low = index;
        else
            high = index;
        index = (low + high) >> 1;
    }

    for (index = gFastIndex; index < gPrefArray.length; ++index)
        if (gPrefArray[index] == pref)
            break;
    return index;
}

function getNearestIndexOfPref(pref) {
    var low = -1, high = gFastIndex;
    var index = (low + high) >> 1;
    while (index > low) {
        if (gSortFunction(gPrefArray[index], pref) < 0)
            low = index;
        else
            high = index;
        index = (low + high) >> 1;
    }
    return high;
}



function prefObject(prefName, prefIndex) {
    this.prefCol = prefName;
}

var gPrefListener = {
    observe: function(subject, topic, prefName) {
        if (topic != "nsPref:changed")
            return;

        var index = gPrefArray.length;
        if (prefName in gPrefHash) {
            index = getViewIndexOfPref(gPrefHash[prefName]);
            fetchPref(prefName, getIndexOfPref(gPrefHash[prefName]));
            if (index >= 0) {
                // Might need to update the filtered view
                gPrefView[index] = gPrefHash[prefName];
                view.treebox.invalidateRow(index);
            }
        if (gSortedColumn == "lockCol" || gSortedColumn == "valueCol")
            gFastIndex = 1; // TODO: reinsert and invalidate range
        } else {
            fetchPref(prefName, index);
            if (index == gFastIndex) {
                // Keep the array sorted by reinserting the pref object
                var pref = gPrefArray.pop();
                index = getNearestIndexOfPref(pref);
                gPrefArray.splice(index, 0, pref);
                gFastIndex = gPrefArray.length;
            }
        if (gPrefView == gPrefArray)
            view.treebox.rowCountChanged(index, 1);
        }

        var redrawGrid = (prefName == Config._buildName("edit.gridSize") || prefName == Config._buildName("grid.enabled"));
        var reloadSnappingData = (prefName == Config._buildName("object.snapping.enabled") || prefName == Config._buildName("object.snapping.background"));
        if (redrawGrid || reloadSnappingData) {
            if (pencil) {
                var canvasList = pencil.getCanvasList();
                for (var canvas in canvasList) {
                    if (reloadSnappingData) {
                        debug("rebuilding snap data for canvas: " + canvasList[canvas]);
                        canvasList[canvas].snappingHelper.rebuildSnappingGuide();
                    }
                    if (redrawGrid) {
                        debug("redrawing grid...");
                        canvasList[canvas].zoomTo(canvasList[canvas].zoom);
                    }
                }
            }
        }
    }
};

prefObject.prototype = {
    lockCol: PREF_IS_DEFAULT_VALUE,
    typeCol: nsIPrefBranch.PREF_STRING,
    valueCol: ""
};

function fetchPref(prefName, prefIndex) {
    var pref = new prefObject(prefName);

    gPrefHash[prefName] = pref;
    gPrefArray[prefIndex] = pref;

    if (gPrefBranch.prefIsLocked(prefName))
        pref.lockCol = PREF_IS_LOCKED;
    else if (gPrefBranch.prefHasUserValue(prefName))
        pref.lockCol = PREF_IS_USER_SET;

    try {
        switch (gPrefBranch.getPrefType(prefName)) {
            case gPrefBranch.PREF_BOOL:
                pref.typeCol = gPrefBranch.PREF_BOOL;
                // convert to a string
                pref.valueCol = gPrefBranch.getBoolPref(prefName).toString();
            break;
            case gPrefBranch.PREF_INT:
                pref.typeCol = gPrefBranch.PREF_INT;
                // convert to a string
                pref.valueCol = gPrefBranch.getIntPref(prefName).toString();
            break;
            default:
            case gPrefBranch.PREF_STRING:
                pref.valueCol = gPrefBranch.getComplexValue(prefName, nsISupportsString).data;
                // Try in case it's a localized string (will throw an exception if not)
                if (pref.lockCol == PREF_IS_DEFAULT_VALUE && /^chrome:\/\/.+\/locale\/.+\.properties/.test(pref.valueCol))
                    pref.valueCol = gPrefBranch.getComplexValue(prefName, nsIPrefLocalizedString).data;
            break;
        }
    } catch (e) {
        // Also catch obscure cases in which you can't tell in advance
        // that the pref exists but has no user or default value...
    }
}

function onConfigLoad() {

    gLockStrs[PREF_IS_DEFAULT_VALUE] = "default";
    gLockStrs[PREF_IS_USER_SET] = "user set";
    gLockStrs[PREF_IS_LOCKED] = "locked";

    gTypeStrs[nsIPrefBranch.PREF_STRING] = "string";
    gTypeStrs[nsIPrefBranch.PREF_INT] = "integer";
    gTypeStrs[nsIPrefBranch.PREF_BOOL] = "boolean";

    ShowPrefs();
}

// Unhide the warning message
function ShowPrefs() {
    var prefCount = { value: 0 };
    var prefArray = gPrefBranch.getChildList("pencil.config.", prefCount);
    //var prefArray = gPrefBranch.getChildList("", prefCount);

    for (var i = 0; i < prefCount.value; ++i) {
        var prefName = prefArray[i];
        if (/^capability\./.test(prefName)) // avoid displaying "private" preferences
            continue;
        fetchPref(prefName, gPrefArray.length);
    }

    var descending = document.getElementsByAttribute("sortDirection", "descending");
    if (descending.item(0)) {
        gSortedColumn = descending[0].id;
        gSortDirection = -1;
    } else {
        var ascending = document.getElementsByAttribute("sortDirection", "ascending");
        if (ascending.item(0))
            gSortedColumn = ascending[0].id;
        else
            document.getElementById(gSortedColumn).setAttribute("sortDirection", "ascending");
    }
    gSortFunction = gSortFunctions[gSortedColumn];
    gPrefArray.sort(gSortFunction);
    gFastIndex = gPrefArray.length;

    gPrefBranch.addObserver("", gPrefListener, false);

    var configTree = document.getElementById("configTree");
    configTree.view = view;
    configTree.controllers.insertControllerAt(0, configController);

    document.getElementById("configDeck").setAttribute("selectedIndex", 0);
    document.getElementById("configTreeKeyset").removeAttribute("disabled");

    var textbox = document.getElementById("textbox");
    if (textbox.value)
        // somebody seems to already have tried to apply a filter
        FilterPrefs();
    textbox.focus();
}

function onConfigUnload() {
    if (document.getElementById("configDeck").getAttribute("selectedIndex") == 0) {
        gPrefBranch.removeObserver("", gPrefListener);
        var configTree = document.getElementById("configTree");
        configTree.view = null;
        configTree.controllers.removeController(configController);
    }
}

function FilterPrefs() {
    var substring = document.getElementById("textbox").value;
    var rex;
    // Check for "/regex/[i]"
    if (substring.charAt(0) == '/') {
        var r = substring.match(/^\/(.*)\/(i?)$/);
        try {
            rex = RegExp(r[1], r[2]);
        } catch (e) {
            return; // Do nothing on incomplete or bad RegExp
        }
    }

    var prefCol = view.selection.currentIndex < 0 ? null : gPrefView[view.selection.currentIndex].prefCol;
    var oldlen = gPrefView.length;
    gPrefView = gPrefArray;
    if (substring) {
        gPrefView = [];
        if (!rex)
            rex = RegExp(substring.replace(/([^* \w])/g, "\\$1").replace(/^\*+/, "").replace(/\*+/g, ".*"), "i");
        for (var i = 0; i < gPrefArray.length; ++i)
            if (rex.test(gPrefArray[i].prefCol + ";" + gPrefArray[i].valueCol))
                gPrefView.push(gPrefArray[i]);
        if (gFastIndex < gPrefArray.length)
            gPrefView.sort(gSortFunction);
    }
    view.treebox.invalidate();
    view.treebox.rowCountChanged(oldlen, gPrefView.length - oldlen);
    gotoPref(prefCol);
}

function prefColSortFunction(x, y) {
    if (x.prefCol > y.prefCol)
        return gSortDirection;
    if (x.prefCol < y.prefCol)
        return -gSortDirection;
    return 0;
}

function lockColSortFunction(x, y) {
    if (x.lockCol != y.lockCol)
        return gSortDirection * (y.lockCol - x.lockCol);
    return prefColSortFunction(x, y);
}

function typeColSortFunction(x, y) {
    if (x.typeCol != y.typeCol)
        return gSortDirection * (y.typeCol - x.typeCol);
    return prefColSortFunction(x, y);
}

function valueColSortFunction(x, y) {
    if (x.valueCol > y.valueCol)
        return gSortDirection;
    if (x.valueCol < y.valueCol)
        return -gSortDirection;
    return prefColSortFunction(x, y);
}

const gSortFunctions = {
    prefCol: prefColSortFunction,
    lockCol: lockColSortFunction,
    typeCol: typeColSortFunction,
    valueCol: valueColSortFunction
};

const configController = {
    supportsCommand: function supportsCommand(command) {
        return command == "cmd_copy";
    },
    isCommandEnabled: function isCommandEnabled(command) {
        return view.selection && view.selection.currentIndex >= 0;
    },
    doCommand: function doCommand(command) {
        copyPref();
    },
    onEvent: function onEvent(event) {
    }
}

function updateContextMenu() {
    var lockCol = PREF_IS_LOCKED;
    var typeCol = nsIPrefBranch.PREF_STRING;
    var valueCol = "";
    var copyDisabled = true;
    var prefSelected = view.selection.currentIndex >= 0;

    if (prefSelected) {
        var prefRow = gPrefView[view.selection.currentIndex];
        lockCol = prefRow.lockCol;
        typeCol = prefRow.typeCol;
        valueCol = prefRow.valueCol;
        copyDisabled = false;
    }

    var copyPref = document.getElementById("copyPref");
    copyPref.setAttribute("disabled", copyDisabled);

    var copyName = document.getElementById("copyName");
    copyName.setAttribute("disabled", copyDisabled);

    var copyValue = document.getElementById("copyValue");
    copyValue.setAttribute("disabled", copyDisabled);

    var resetSelected = document.getElementById("resetSelected");
    resetSelected.setAttribute("disabled", lockCol != PREF_IS_USER_SET);

    var canToggle = typeCol == nsIPrefBranch.PREF_BOOL && valueCol != "";
    // indicates that a pref is locked or no pref is selected at all
    var isLocked = lockCol == PREF_IS_LOCKED;

    var modifySelected = document.getElementById("modifySelected");
    modifySelected.setAttribute("disabled", isLocked);
    modifySelected.hidden = canToggle;

    var toggleSelected = document.getElementById("toggleSelected");
    toggleSelected.setAttribute("disabled", isLocked);
    toggleSelected.hidden = !canToggle;
}

function copyPref() {
    var pref = gPrefView[view.selection.currentIndex];
    gClipboardHelper.copyString(pref.prefCol + ';' + pref.valueCol);
}

function copyName() {
    gClipboardHelper.copyString(gPrefView[view.selection.currentIndex].prefCol);
}

function copyValue() {
    gClipboardHelper.copyString(gPrefView[view.selection.currentIndex].valueCol);
}

function ModifySelected() {
    if (view.selection.currentIndex >= 0)
        ModifyPref(gPrefView[view.selection.currentIndex]);
}

function ResetSelected() {
    var entry = gPrefView[view.selection.currentIndex];
    gPrefBranch.clearUserPref(entry.prefCol);
}

function NewPref(type) {
    var result = { value: "" };
    var dummy = { value: false };
    if (gPromptService.prompt(window, Util.getMessage("new.pref.value", [gTypeStrs[type]]),
                            Util.getMessage("enter.the.preference.name"),
                            result,
                            null,
                            dummy) && result.value) {
        var pref;
        if (result.value in gPrefHash)
            pref = gPrefHash[result.value];
        else
            pref = { prefCol: result.value, lockCol: PREF_IS_DEFAULT_VALUE, typeCol: type, valueCol: "" };
        if (ModifyPref(pref))
            setTimeout(gotoPref, 0, result.value);
    }
}

function gotoPref(pref) {
    // make sure the pref exists and is displayed in the current view
    var index = pref in gPrefHash ? getViewIndexOfPref(gPrefHash[pref]) : -1;
    if (index >= 0) {
        view.selection.select(index);
        view.treebox.ensureRowIsVisible(index);
    } else {
        view.selection.clearSelection();
        view.selection.currentIndex = -1;
    }
}

function ModifyPref(entry) {
    if (entry.lockCol == PREF_IS_LOCKED)
        return false;
    var title = Util.getMessage("enter.pref.value", [gTypeStrs[entry.typeCol]]);
    if (entry.typeCol == nsIPrefBranch.PREF_BOOL) {
        var check = { value: entry.valueCol == "false" };
        if (!entry.valueCol && !gPromptService.select(window, title, entry.prefCol, 2, [false, true], check))
            return false;
        gPrefBranch.setBoolPref(entry.prefCol, check.value);
    } else if (entry.typeCol == nsIPrefBranch.PREF_INT) {
        var result = { value: entry.valueCol };
        var dummy = { value: false };
        if (!gPromptService.prompt(window, title, entry.prefCol, result, null, dummy)) return;
        gPrefBranch.setIntPref(entry.prefCol, result.value);
    } else {
        var result = { value: entry.valueCol };
        var dummy = { value: 0 };
        if (!gPromptService.prompt(window, title, entry.prefCol, result, null, dummy))
            return false;
        var supportsString = Components.classes[nsSupportsString_CONTRACTID].createInstance(nsISupportsString);
        supportsString.data = result.value;
        gPrefBranch.setComplexValue(entry.prefCol, nsISupportsString, supportsString);
    }

    gPrefService.savePrefFile(null);
    return true;
}
