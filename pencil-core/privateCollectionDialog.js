var PrivateCollectionDialog = {
    get Pencil() {
        return window.opener.Pencil;
    }
};

PrivateCollectionDialog.setup = function () {
    PrivateCollectionDialog.dialogData = window.arguments ? window.arguments[0] : {};
    PrivateCollectionDialog.valueHolder = PrivateCollectionDialog.dialogData.valueHolder;

    PrivateCollectionDialog.collectionName = document.getElementById("collectionName");
    PrivateCollectionDialog.collectionDescription = document.getElementById("collectionDescription");
    PrivateCollectionDialog.collectionAuthor = document.getElementById("collectionAuthor");
    PrivateCollectionDialog.collectionInfoUrl = document.getElementById("collectionInfoUrl");

    PrivateCollectionDialog.collectionName.value = PrivateCollectionDialog.dialogData.collectionName;
    PrivateCollectionDialog.collectionDescription.value = PrivateCollectionDialog.dialogData.collectionDescription ? PrivateCollectionDialog.dialogData.collectionDescription : "";
    PrivateCollectionDialog.collectionAuthor.value = PrivateCollectionDialog.dialogData.collectionAuthor ? PrivateCollectionDialog.dialogData.collectionAuthor : "";
    PrivateCollectionDialog.collectionInfoUrl.value = PrivateCollectionDialog.dialogData.collectionInfoUrl ? PrivateCollectionDialog.dialogData.collectionInfoUrl : "";
};
PrivateCollectionDialog.validatePage = function () {
    if (PrivateCollectionDialog.collectionName.value == null || PrivateCollectionDialog.collectionName.value.length == 0) {
        Util.error(Util.getMessage("error.title"), Util.getMessage("please.enter.collection.name"), Util.getMessage("button.close.label"));
        PrivateCollectionDialog.collectionName.focus();
        return false;
    }
    return true;
};
PrivateCollectionDialog.onFinish = function () {
    if (PrivateCollectionDialog.validatePage()) {
        PrivateCollectionDialog.valueHolder.collectionName = PrivateCollectionDialog.collectionName.value;
        PrivateCollectionDialog.valueHolder.collectionDescription = PrivateCollectionDialog.collectionDescription.value;
        PrivateCollectionDialog.valueHolder.collectionAuthor = PrivateCollectionDialog.collectionAuthor.value;
        PrivateCollectionDialog.valueHolder.collectionInfoUrl = PrivateCollectionDialog.collectionInfoUrl.value;
        return true;
    }
    return false;
};

window.onload = function () {
    PrivateCollectionDialog.setup();
};
