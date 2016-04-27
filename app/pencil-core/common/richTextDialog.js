var RichTextDialog = {};
RichTextDialog.handleLoad = function (event) {
    
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
        RichTextDialog.editor = document.getElementById("editor");        
        RichTextDialog.editor.contentDocument.designMode = "on";
        
        RichTextDialog.textEditingInfo = window.arguments[0];
        RichTextDialog.returnValueHolder = window.arguments[1];

        RichTextDialog.editor.contentDocument.body.innerHTML = RichTextDialog.textEditingInfo.value;
        if (RichTextDialog.textEditingInfo.font) {
            var font = RichTextDialog.textEditingInfo.font;
            var body = RichTextDialog.editor.contentDocument.body;
            body.style.fontFamily = font.family;
            body.style.fontSize = font.size;
            body.style.fontWeight = font.weight;
            body.style.fontStyle = font.style;
        }
        runEditorCommand("styleWithCSS", true);
        RichTextDialog.editor.addEventListener("keypress", function (event) {
            if (event.keyCode == event.DOM_VK_ESCAPE) {
                if (RichTextDialog.doCancel()) window.close();
            }
        }, false);
        RichTextDialog.editor.focus();
        runEditorCommand('selectall');
    } catch (e) {
        alert(e);
    }
};


RichTextDialog.doCancel = function () {
    try {
        RichTextDialog.returnValueHolder.ok = false;
    } catch (e) {
        alert(e);
    }
    return true;
};
RichTextDialog.doApply = function () {
    var html = Dom.serializeNode(RichTextDialog.editor.contentDocument.body);
    html = html.replace(/<[\/A-Z0-9]+[ \t\r\n>]/g, function (zero) {
        return zero.toLowerCase();
    });
    if (html.match(/^<body[^>]*>([^\0]*)<\/body>$/)) {
        html = RegExp.$1;
    }
    
    RichTextDialog.returnValueHolder.ok = true;
    RichTextDialog.returnValueHolder.html = html;
    return true;
};

function runEditorCommand(command, arg) {
    
    try {
        if (typeof(arg) != "undefined") RichTextDialog.editor.contentDocument.execCommand(command, false, arg);
        else RichTextDialog.editor.contentDocument.execCommand(command, false, null);
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
    alert(RichTextDialog.editor.contentDocument.queryCommandValue(command));
};
function queryState(command) {
    alert(RichTextDialog.editor.contentDocument.queryCommandState(command));
};


function doInsertLink() {
    var url = window.prompt('Please specify the URL', 'http://www.evolus.vn');
    if (url) {
        runEditorCommand('createlink', url);
    } else {
        runEditorCommand('unlink');
    }
}

window.addEventListener("load", RichTextDialog.handleLoad, false);

