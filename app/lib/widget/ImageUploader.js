var FILE_SIZE = 5242880;
widget.ImageUploader = function () {
    function imageUploaderClickHandler(event) {
        var imageUploader = ImageUploader.findInstance(event);
        var builder = {
            title : Messages["upload_picture"],
            icon: "fa fa-upload",
            size : "small",
            buildContent : function(container) {
                if (imageUploader.option.tip) {
                    var tip = document.createElement("p");
                    tip.innerHTML = imageUploader.option.tip;
                    container.appendChild(tip);
                }
                
                var object = createUploadForm(container, imageUploader);
                this.form = object.form;
                this.iframe = object.iframe;
                this.picker = object.picker;
            },
            onOpen : function() {
                
            },
            actions : [{
                 title: Messages["upload"],
                 primary: true,
                 run: function () {
                     var thiz = this;
                     Dom.registerEvent(this.iframe, "load", function(data) {
                         var response = Dom.getIframeDocument(thiz.iframe);
                         if (response.indexOf("OK") != -1) {
                             imageUploader.isModified = true;
                             thiz._dialog.quit();
                             setTimeout(function() {
                                 imageUploader.setImage();
                             }, 500)
                         } else {
                             widget.Dialog.error(Messages["upload_error_msg"]);
                         }
                         
                     });
                     
                     var extensions = ["png", "jpg", "gif", "bmp"];
                     var fileExt = this.picker.value.split(".").pop().toLowerCase();
                     if (this.picker.value.length > 0) {
                         if (extensions.indexOf(fileExt) == -1) {
                             widget.Dialog.error(Messages["upload_not_supported_files_msg"]);
                             return false;
                         }
                         
                         if (this.picker.files && this.picker.files.length > 0 && this.picker.files[0].size >= FILE_SIZE) {
                             widget.Dialog.error(String.format(Messages["file_is_too_large_msg"], 5));
                             return false;
                         }
                         this.form.submit();
                     } else {
                         widget.Dialog.error(Messages["no_file_uploaded_msg"]);
                     }
                     
                     return false;
                 }
             }, 
             {
                title : Messages["cancel"],
                isCloseHandler : true,
                run : function() {
                    return true;
                }
            } ]
        };

        new widget.Dialog(builder).show();
    }
    
    function imageRemoverClickHandler(event) {
        var imageUploader = ImageUploader.findInstance(event);
        var container = imageUploader.container;
        widget.Dialog.confirm(Messages["remove_image_msg"],
                Messages["remove"], function () {
                    var object = createUploadForm(container, imageUploader);
                    this.form = object.form;
                    this.iframe = object.iframe;
                    this.form.submit();
                    var thiz = this;
                    Dom.registerEvent(this.iframe, "load", function(data) {
                        var response = Dom.getIframeDocument(this);
                        if (response.indexOf("OK") != -1) {
                            imageUploader.isModified = true;
                            setTimeout(
                                    function() {
                                        if (imageUploader.option.fallbackUrl) {
                                            imageUploader.imageDisplay._fallbackRequested = false;
                                        }
            
                                        imageUploader.setImage();
                                        thiz.iframe.remove();
                                        thiz.form.remove();
                                    }, 500)
                        } else {
                            widget.Dialog.error(Messages["remove_image_failed_msg"]);
                        }
                    });
                    
                },
                Messages["cancel"], function () {
                }
        );
    }
    
    function createUploadForm(container, imageUploader) {
        var iframe = document.createElement("iframe");
        iframe.setAttribute("name", "iframe");
        iframe.setAttribute("id", "frame");
        iframe.setAttribute("height", "0");
        iframe.setAttribute("width", "0");
        iframe.setAttribute("frameborder", "0");
        iframe = iframe;
        
        form = document.createElement("form");
        form.setAttribute("action", CONTEXT_PATH + "/amw/upload");
        form.setAttribute("method", "POST");
        form.setAttribute("enctype", "multipart/form-data");
        form.setAttribute("target", "iframe");
        
        var picker = document.createElement("input");
        picker.setAttribute("type", "file");
        picker.setAttribute("name", "file");
        picker.setAttribute("id", "file");
        form.appendChild(picker);
        
        var entityType = document.createElement("input");
        entityType.setAttribute("type", "hidden");
        entityType.setAttribute("name", "entityType");
        entityType.setAttribute("id", "entityType");
        entityType.value = imageUploader.option.type;
        form.appendChild(entityType);
        
        var entityId = document.createElement("input");
        entityId.setAttribute("type", "hidden");
        entityId.setAttribute("name", "entityId");
        entityId.setAttribute("id", "entityId");
        entityId.value = imageUploader.option.id;
        form.appendChild(entityId);
        
        container.appendChild(iframe);
        container.appendChild(form);
        return {
            form: form,
            iframe: iframe,
            picker: picker
        };
    }
    
    function ImageUploader(container, option) {
        this.container = widget.get(container);
        this.option = option || {};
        this.isModified = false;
        
        this.wrapper = document.createElement("div");
        this.wrapper.className = "ImageUploader";
        this.wrapper._imageUploader = this;
        if (this.option.editable) {
            Dom.addClass(this.wrapper, "Editable");
        } else {
            Dom.addClass(this.wrapper, "NonEditable");
        }
        
        this.imagePicker = document.createElement("div");
        this.imagePicker.style.position = "absolute";
        this.imagePicker.className = "ImagePicker";
        this.imagePicker.innerHTML = "<a href=\"#\"><i class=\"fa fa-plus\"></i>" + Messages["add_picture"] +"</a>";
        this.wrapper.appendChild(this.imagePicker);
        
        this.imageDisplay = document.createElement("img");
        this.imageDisplay.className = "ImageDisplay";
        this.wrapper.appendChild(this.imageDisplay);

        this.imageEditor = document.createElement("div");
        this.imageEditor.className = "ImageEditor";
        if (this.option.smallArea) {
            Dom.addClass(this.imageEditor, "Small");
        }
        this.imageReplacer = document.createElement("a");
        this.imageReplacer.href = "#";
        this.imageReplacer.setAttribute("title", Messages["replace"]);
        this.imageReplacer.innerHTML = this.option.smallArea ? "<i class=\"fa fa-exchange\"></i>" : ("<i class=\"fa fa-exchange\"></i>" + Messages["replace"]);
        this.imageEditor.appendChild(this.imageReplacer);
        
        this.imageRemover = document.createElement("a");
        this.imageRemover.href = "#";
        this.imageRemover.setAttribute("title", Messages["remove"]);
        this.imageRemover.innerHTML = this.option.smallArea ? "<i class=\"fa fa-times\"></i>" : ("<i class=\"fa fa-times\"></i>" + Messages["remove"]);
        this.imageEditor.appendChild(this.imageRemover);
        this.wrapper.appendChild(this.imageEditor);
        
        this.container.appendChild(this.wrapper);
        Dom.registerEvent(this.imagePicker, "click", imageUploaderClickHandler, false);
        Dom.registerEvent(this.imageReplacer, "click", imageUploaderClickHandler, false);
        Dom.registerEvent(this.imageRemover, "click", imageRemoverClickHandler, false);
        this.centerPicker();
        if (this.option.fallbackUrl) {
            Dom.addClass(this.wrapper, "Fallback");
        }
    }
    
    ImageUploader.prototype.centerPicker = function() {
        var containerBox = this.container.getBoundingClientRect();
        var pickerBox = this.imagePicker.getBoundingClientRect();
        try {
            this.imagePicker.style.marginTop = (containerBox.height - pickerBox.height) / 2 + "px";
        } catch (e) {
            // TODO: handle exception
        }
    };
    
    ImageUploader.prototype.setImage = function() {
        var url = CONTEXT_PATH + "/amw-im?entityType=" + this.option.type + "&entityId=" + this.option.id + "&time=" + new Date().getTime();
        this.imageDisplay.src = url;
        this.imageDisplay.setAttribute("fallback-src", this.option.fallbackUrl || "");
        this.imageDisplay.setAttribute("style", "");
        this.imageRemover.style.display = "inline";
        var thiz = this;
        this.imageDisplay.onload = function(){
            Dom.addClass(thiz.wrapper, "Display");
            centerCrop(this);
        };
        
        this.imageDisplay.onerror = function(e){
            if (thiz.option.fallbackUrl) thiz.imageRemover.style.display = "none";
            Dom.removeClass(thiz.wrapper, "Display");
            showFallback(this);
        };
    };
    
    ImageUploader.prototype.enableEditMode = function() {
        Dom.addClass(this.wrapper, "Editable");
    };
    
    ImageUploader.prototype.disableEditMode = function() {
        Dom.removeClass(this.wrapper, "Editable");
    };
    
    ImageUploader.findInstance = function(event) {
        var target = Dom.getTarget(event);
        var node = Dom.findUpward(target, {
            eval: function(n) {
                return n._imageUploader;
            }
        });

        if (!node) return null;

        return node._imageUploader;
    };
    
    return ImageUploader;
}();

