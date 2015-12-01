var PrivateShapeDialog = {
    get Pencil() {
        return window.opener.Pencil;
    }
};

PrivateShapeDialog.setup = function () {
    PrivateShapeDialog.dialogData = window.arguments ? window.arguments[0] : {};
    PrivateShapeDialog.valueHolder = PrivateShapeDialog.dialogData.valueHolder;

    PrivateShapeDialog.shapeName = document.getElementById("shapeName");
    PrivateShapeDialog.shapeIcon = document.getElementById("shapeIcon");
    PrivateShapeDialog.changeIcon = document.getElementById("changeIcon");

    PrivateShapeDialog.shapeName.value = PrivateShapeDialog.dialogData.shapeName;
};
PrivateShapeDialog.onPageSelectionChanged = function () {
};
PrivateShapeDialog.browseIconFile = function () {
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

    fp.init(window, Util.getMessage("select.icon.file"), nsIFilePicker.modeOpen);
    fp.appendFilters(Components.interfaces.nsIFilePicker.filterImages | Components.interfaces.nsIFilePicker.filterAll);

    if (fp.show() == nsIFilePicker.returnCancel) return;

    PrivateShapeDialog.shapeIcon.value = fp.file.path;
};
PrivateShapeDialog.validatePage = function () {
    if (PrivateShapeDialog.shapeName.value == null || PrivateShapeDialog.shapeName.value.length == 0) {
        Util.error(Util.getMessage("error.title"), Util.getMessage("please.enter.shape.name"), Util.getMessage("button.close.label"));
        PrivateShapeDialog.shapeName.focus();
        return false;
    }
    if (PrivateShapeDialog.changeIcon.checked) {
        if (PrivateShapeDialog.shapeIcon.value == null || PrivateShapeDialog.shapeIcon.value.length == 0) {
            Util.error(Util.getMessage("error.title"), Util.getMessage("please.select.shape.icon"), Util.getMessage("button.close.label"));
            PrivateShapeDialog.shapeIcon.focus();
            return false;
        } else {
            var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(PrivateShapeDialog.shapeIcon.value);
            if (!file.exists()) {
                Util.error(Util.getMessage("error.title"), Util.getMessage("shape.icon.is.not.valid.or.file.not.found"), Util.getMessage("button.close.label"));
                PrivateShapeDialog.shapeIcon.focus();
                return false;
            }
        }
    }
    return true;
};
PrivateShapeDialog.onFinish = function () {
    if (PrivateShapeDialog.validatePage()) {
        PrivateShapeDialog.valueHolder.shapeName = PrivateShapeDialog.shapeName.value;
        PrivateShapeDialog.valueHolder.shapeIcon = PrivateShapeDialog.shapeIcon.value;
        PrivateShapeDialog.valueHolder.changeIcon = PrivateShapeDialog.changeIcon.checked;
        return true;
    }
    return false;
};

window.onload = function () {
    PrivateShapeDialog.setup();
};
