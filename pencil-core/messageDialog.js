var titleText = null;
var descText = null;
var message = null;
var icon = null;

var returnValueHolder;
function handleOnload() {
    titleText = document.getElementById("titleText");
    descText = document.getElementById("descText");
    descHtml = document.getElementById("descHtml");
    icon = document.getElementById("icon");

    returnValueHolder = window.arguments[1];
    message = window.arguments[0];

    //setup
    document.title = "Evolus Pencil";

    if (message.title) {
        Dom.empty(titleText);
        titleText.appendChild(document.createTextNode(message.title));
    }
    if (message.description) {
        if (message.description.constructor.name == "RichText") {
            descText.parentNode.removeChild(descText);
            descHtml.innerHTML = message.description.html;
        } else {
            descHtml.parentNode.removeChild(descHtml);
            Dom.empty(descText);
            descText.appendChild(document.createTextNode(message.description ? message.description : ""));
        }
    } else {
        descText.parentNode.removeChild(descText);
        descHtml.parentNode.removeChild(descHtml);
    }

    var dialog = document.documentElement;

    if (message.type == "info") {
        dialog.buttons = "accept";
        icon.className = "message-icon";
    } else if (message.type == "warn") {
        dialog.buttons = "accept";
        icon.className = "warning-icon";
    } else if (message.type == "error") {
        dialog.buttons = "cancel";
        icon.className = "error-icon";
    } else if (message.type == "confirm") {
        dialog.buttons = "accept,cancel";
        icon.className = "question-icon";
    } else if (message.type == "confirmWarned") {
        dialog.buttons = "accept,cancel";
        icon.className = "alert-icon";
    } else if (message.type == "confirm2") {
        dialog.buttons = "accept,cancel,extra1";
        icon.className = "question-icon";
    }

    setButtonLabel("accept", message.acceptLabel ? message.acceptLabel : Util.getMessage("button.ok.label"));
    setButtonLabel("cancel", message.cancelLabel ? message.cancelLabel : Util.getMessage("button.cancel.label"));
    setButtonLabel("extra1", message.extraLabel ? message.extraLabel : Util.getMessage("button.apply.label"));

}
function setButtonLabel(dlgtype, label) {
    var dialog = document.documentElement;
    var button = dialog.getButton(dlgtype);
    if (!button || !label) return;
    button.setAttribute("label", label);
};
function handleDialogAccept() {
    returnValueHolder.button = "accept";
    return true;
};
function handleDialogCancel() {
    returnValueHolder.button = "cancel";
    return true;
};
function handleDialogExtra1() {
    returnValueHolder.button = "extra";
    window.close();
    return true;
};
window.addEventListener("load", handleOnload, false);

