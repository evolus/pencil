function AboutDialog(collection) {
    Dialog.call(this);
    this.title = function () {
        return collection.displayName;
    };

    //this.title = collection.displayName;
    var line = document.createElement("p");
    var lineText = document.createTextNode(collection.description);
    line.appendChild(lineText);
    this.dialogBody.appendChild(line);
    var list = document.createElement("ul");
    var li = document.createElement("li");
    var liText = document.createTextNode("Author: " + collection.author);
    li.appendChild(liText);
    list.appendChild(li);
    li = document.createElement("li");
    var url = document.createElement("a");
    var urlText = document.createTextNode("More information: " + collection.infoUrl || collection.url);
    url.appendChild(urlText);
    url.setAttribute("href","#");
    li.appendChild(url);
    list.appendChild(li);
    this.dialogBody.appendChild(list);

}
__extend(Dialog, AboutDialog);

AboutDialog.prototype.getDialogActions = function () {
    return [
        // Dialog.ACTION_CANCEL,
        // { type: "extra1", title: "Options...", run: function () {
        //     new AboutDialog().open();
        //     return false;
        // }},
        { type: "accept", title: "OK", run: function () {
            // alert("accepted");
            return true;
        }}
    ]
};