var PrivateCollectionWizard = {
    get Pencil() {
        return window.opener.Pencil;
    }
};

PrivateCollectionWizard.setup = function () {
    PrivateCollectionWizard.dialogData = window.arguments ? window.arguments[0] : {};
    PrivateCollectionWizard.valueHolder = PrivateCollectionWizard.dialogData.valueHolder;

    PrivateCollectionWizard.collectionPane = document.getElementById("collection");
    PrivateCollectionWizard.collectionName = document.getElementById("collectionName");
    PrivateCollectionWizard.collectionDescription = document.getElementById("collectionDescription");
    PrivateCollectionWizard.shapeName = document.getElementById("shapeName");
    PrivateCollectionWizard.shapeIcon = document.getElementById("shapeIcon");
    PrivateCollectionWizard.autoGenerateIcon = document.getElementById("autoGenerateIcon");

    PrivateCollectionWizard.collectionList = document.getElementById("collectionList");

    //Setup Private Collections
    var collections = PrivateCollectionWizard.dialogData.collections;
    Dom.empty(PrivateCollectionWizard.collectionList);

    var item = Dom.newDOMElement({
        _name: "listitem",
        _uri: PencilNamespaces.xul,
        label: Util.getMessage("create.new.private.collection")
    });
    item._collection = -1;
    PrivateCollectionWizard.collectionList.appendChild(item);

    for (var i = 0; i < collections.length; i++) {
        item = Dom.newDOMElement({
            _name: "listitem",
            _uri: PencilNamespaces.xul,
            label: collections[i].displayName
        });
        item._collection = collections[i];
        PrivateCollectionWizard.collectionList.appendChild(item);
    }

    //window.setTimeout(PrivateCollectionWizard.onPageSelectionChanged, 10);
};
PrivateCollectionWizard.onPageSelectionChanged = function () {
};
PrivateCollectionWizard.browseIconFile = function () {
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

    fp.init(window, Util.getMessage("select.icon.file"), nsIFilePicker.modeOpen);
    fp.appendFilters(Components.interfaces.nsIFilePicker.filterImages | Components.interfaces.nsIFilePicker.filterAll);

    if (fp.show() == nsIFilePicker.returnCancel) return;

    PrivateCollectionWizard.shapeIcon.value = fp.file.path;
};
PrivateCollectionWizard.checkCollection = function () {
    PrivateCollectionWizard.collection = PrivateCollectionWizard.collectionList.selectedItem;
    if (PrivateCollectionWizard.collection == null) {
        Util.error(Util.getMessage("error.title"), Util.getMessage("please.select.at.least.one.collection"), Util.getMessage("button.close.label"));
        return false;
    } else if (PrivateCollectionWizard.collection._collection == -1) {
        PrivateCollectionWizard.collectionPane.style.display = '';
    } else {
        PrivateCollectionWizard.collectionPane.style.display = 'none';
    }
    return true;
};
PrivateCollectionWizard.validatePage = function () {
    if (PrivateCollectionWizard.collection != null && PrivateCollectionWizard.collection._collection == -1) {
        if (PrivateCollectionWizard.collectionName.value == null || PrivateCollectionWizard.collectionName.value.length == 0) {
            Util.error(Util.getMessage("error.title"), Util.getMessage("please.enter.collection.name"), Util.getMessage("button.close.label"));
            PrivateCollectionWizard.collectionName.focus();
            return false;
        }
    }
    if (PrivateCollectionWizard.shapeName.value == null || PrivateCollectionWizard.shapeName.value.length == 0) {
        Util.error(Util.getMessage("error.title"), Util.getMessage("please.enter.shape.name"), Util.getMessage("button.close.label"));
        PrivateCollectionWizard.shapeName.focus();
        return false;
    }
    if (!PrivateCollectionWizard.autoGenerateIcon.checked) {
        if (PrivateCollectionWizard.shapeIcon.value == null || PrivateCollectionWizard.shapeIcon.value.length == 0) {
            Util.error(Util.getMessage("error.title"), Util.getMessage("please.select.shape.icon"), Util.getMessage("button.close.label"));
            PrivateCollectionWizard.shapeIcon.focus();
            return false;
        } else {
            var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(PrivateCollectionWizard.shapeIcon.value);
            if (!file.exists()) {
                Util.error(Util.getMessage("error.title"), Util.getMessage("shape.icon.is.not.valid.or.file.not.found"), Util.getMessage("button.close.label"));
                PrivateCollectionWizard.shapeIcon.focus();
                return false;
            }
        }
    }
    return true;
};
PrivateCollectionWizard.onFinish = function () {
    PrivateCollectionWizard.valueHolder.collectionName = PrivateCollectionWizard.collectionName.value;
    PrivateCollectionWizard.valueHolder.collectionDescription = PrivateCollectionWizard.collectionDescription.value;
    PrivateCollectionWizard.valueHolder.shapeName = PrivateCollectionWizard.shapeName.value;
    PrivateCollectionWizard.valueHolder.shapeIcon = PrivateCollectionWizard.shapeIcon.value;
    PrivateCollectionWizard.valueHolder.autoGenerateIcon = PrivateCollectionWizard.autoGenerateIcon.checked;
    PrivateCollectionWizard.valueHolder.collection = PrivateCollectionWizard.collection._collection;
    return true;
};

window.onload = function () {
    PrivateCollectionWizard.setup();
};

window.onerror = function (msg, url, lineNumber) {
    error([msg, url, lineNumber]);
};

