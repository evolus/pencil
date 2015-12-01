var PageNoteDialog = {};
PageNoteDialog.handleLoad = function (event) {

    try {
        //setup font list
        var fontPopup = document.getElementById("fontPopup");
        var localFonts = Local.getInstalledFonts();
        for (var i in localFonts) {
            var item = document.createElement("menuitem");
            item.setAttribute("label", localFonts[i]);
            item.setAttribute("value", localFonts[i]);
            fontPopup.appendChild(item);
        }
        PageNoteDialog.editor = document.getElementById("editor");
        PageNoteDialog.editor.contentDocument.designMode = "on";

        PageNoteDialog.textEditingInfo = window.arguments[0];
        PageNoteDialog.returnValueHolder = window.arguments[1];
        document.title = document.title + " - " +  window.arguments[2];

        PageNoteDialog.nsIEditor=PageNoteDialog.editor.getEditor(PageNoteDialog.editor.contentWindow);
        PageNoteDialog.editor.contentDocument.body.innerHTML = PageNoteDialog.textEditingInfo.value;
        if (PageNoteDialog.textEditingInfo.font) {
            var font = PageNoteDialog.textEditingInfo.font;
            var body = PageNoteDialog.editor.contentDocument.body;
            body.style.fontFamily = font.family;
            body.style.fontSize = font.size;
            body.style.fontWeight = font.weight;

            body.style.fontStyle = font.style;
        }
        runEditorCommand("styleWithCSS", true);
        PageNoteDialog.editor.addEventListener("keypress", function (event) {
                if (event.keyCode == event.DOM_VK_ESCAPE) {
                    if (PageNoteDialog.doCancel()) window.close();
                }
        }, false);
        document.addEventListener("keydown", function (event) {
            if (event.keyCode == event.DOM_VK_UP ||
                        event.keyCode == event.DOM_VK_DOWN ||
                        event.keyCode == event.DOM_VK_LEFT ||
                        event.keyCode == event.DOM_VK_RIGHT) {
                event.stopPropagation();
            }
        }, true);
        PageNoteDialog.editor.addEventListener("keyup", function (event) {
                PageNoteDialog.markNoteModified();
        }, false);
        PageNoteDialog.editor.focus();
        runEditorCommand('selectall');
    } catch (e) {
        alert(e);
    }
};


PageNoteDialog.doCancel = function () {
    try {
        if(PageNoteDialog.modified ) {
            var result = Util.confirmExtra(Util.getMessage("save.changes.to.document.before.closing"),
                                    Util.getMessage("changes.will.be.permanently.lost"),
                                    Util.getMessage("button.save.label"), Util.getMessage("button.discard.changes"), Util.getMessage("button.cancel.label"));
            if (result.cancel) return false;
            if (result.accept) return PageNoteDialog.doApply();
        }
        PageNoteDialog.returnValueHolder.ok = false;
    } catch (e) {
        alert(e);
    }
    return true;
};
PageNoteDialog.doApply = function () {
    var html = Dom.serializeNode(PageNoteDialog.editor.contentDocument.body);
    html = html.replace(/<[\/A-Z0-9]+[ \t\r\n>]/g, function (zero) {
        return zero.toLowerCase();
    });
    if (html.match(/^<body[^>]*>([^\0]*)<\/body>$/)) {
        html = RegExp.$1;
    }

    PageNoteDialog.returnValueHolder.ok = true;
    PageNoteDialog.returnValueHolder.html = html;
    return true;
};
PageNoteDialog.markNoteModified = function () {
    if(!PageNoteDialog.modified && PageNoteDialog.nsIEditor.getModificationCount()>1) {
        PageNoteDialog.modified = true;
        document.title = document.title + "*"
    }
}
function runEditorCommand(command, arg) {

    try {
        if (typeof(arg) != "undefined") PageNoteDialog.editor.contentDocument.execCommand(command, false, arg);
        else PageNoteDialog.editor.contentDocument.execCommand(command, false, null);
        PageNoteDialog.markNoteModified();
    } catch (e) {
        alert(e);
    }
}
function runCommandByList(command, list) {
    var v = list.value;
    if (!v) return;
    try {
        runEditorCommand(command, v);
    } catch (e) { }
    list.selectedIndex = 0;
}
function queryValue(command) {
    alert(PageNoteDialog.editor.contentDocument.queryCommandValue(command));
};
function queryState(command) {
    alert(PageNoteDialog.editor.contentDocument.queryCommandState(command));
};


function doInsertLink() {
    var url = window.prompt(Util.getMessage("please.specify.the.url"), 'http://www.evolus.vn');
    if (url) {
        runEditorCommand('createlink', url);
    } else {
        runEditorCommand('unlink');
    }
}

window.addEventListener("load", PageNoteDialog.handleLoad, false);

