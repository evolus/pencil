function StencilGeneratorDialog() {
    WizardDialog.call(this);
    this.title="Stencil Generator";
    this.collectionDefinition = this.wizardPanes[0];
    this.stencilDefinition = this.wizardPanes[1];
    var thiz = this;
    this.bind("click", thiz.browseIconFile, this.collectionBrowse);
    this.bind("click", thiz.browseIconFile, this.stencilBrowse);
    this.imagePaths = [];
    this.activeImageNode = null;
    var addItem = function(file) {
        var item = Dom.newDOMElement({
            _name: "li",
            _text: file.name,
        });
        item.checked = true;
        item._path = file.path;
        thiz.imageList.appendChild(item);
        thiz.imagePaths.push(file);
    }
    this.bind("click", function(event) {
        var top = Dom.findUpwardForNodeWithData(event.target, "_path");
        if (!top) {
            return;
        }
        if(thiz.activeImageNode) {
            thiz.activeImageNode.removeAttribute("active");
        }
        top.setAttribute("active", "true");
        this.activeImageNode = top;
    }, this.imageList)
    var imgCount = 0;
    Dom.registerEvent(this.imageSelector, "drop", function (event) {
        var files = event.dataTransfer.files;
        if(files.length > 0) {
            for (i = 0; i < files.length; i++) {
                console.log(files[i]);
                var dblFiles = false;
                var index = event.dataTransfer.files[i].type.indexOf("image");
                for(var j = 0; j < thiz.imagePaths.length; j++) {
                    if(files[i].path == thiz.imagePaths[j].path){
                        dblFiles = true;
                        break;
                    }
                }
                if (index < 0 || dblFiles == true) continue;
                addItem(event.dataTransfer.files[i]);
            }
        }
        console.log(imgCount);
        thiz.imageCount.innerHTML = thiz.imagePaths.length + " image found";
    }, false);

    this.bind("change", function(event){
        if(event.target.tagName == "input") {
            var value = event.target.checked;
            var top = Dom.findUpwardForNodeWithData(event.target, "_item");
            var item = top._item;
            item.checked = value;
            console.log(item);
        }
    }, this.stencilSelected);
}

__extend(WizardDialog, StencilGeneratorDialog);

StencilGeneratorDialog.prototype.onSelectionChanged = function () {
    if(this.activePane == this.collectionDefinition) {
        this.stepTitle.innerHTML = "Wellcome to the Stencil Generator";
        this.stepInfo.innerHTML = "Enter collection information and click Next to continue";
    } else {
        this.stepTitle.innerHTML = "Completing the Stencil Generator";
        this.stepInfo.innerHTML = "Stencil information";
        if(this.imagePaths.length > 0) {
            for (i in this.imagePaths) {
                var item = Dom.newDOMElement({
                    _name: "div",
                    class: "imageItem",
                    _children: [
                        {
                            _name:"img",
                            src: this.imagePaths[i].path,
                        },
                        {
                            _name:"span",
                            _text: this.imagePaths[i].name
                        },
                        {
                            _name:"input",
                            type:"checkbox",
                            checked:"true",
                        }
                    ]
                });
                item._item = this.imagePaths[i];
                this.stencilSelected.appendChild(item);
            }
        }
    }
};



StencilGeneratorDialog.prototype.invalidateSelection = function () {
    if(this.activePane == this.collectionDefinition) {
        if(this.collectionName.value == ""){
            return false;
        }
    }
    return true;
};

StencilGeneratorDialog.prototype.browseIconFile = function() {
    var thiz = this;
    dialog.showOpenDialog({
        title: "Open Icon File",
        defaultPath: os.homedir(),
        filters: [
            { name: "Icon File", extensions: ["icon", "png"] }
        ]
    }, function (filenames) {
        if (!filenames || filenames.length <= 0) return;
        if(this.activePane == this.collectionDefinition) {
            //
            return;
        }

    });
}
