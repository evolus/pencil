var InstallRemoteCollectionsDialog = {};
InstallRemoteCollectionsDialog.currentPage = 1;
InstallRemoteCollectionsDialog.collectionLength = 0;
InstallRemoteCollectionsDialog.totalPages = 0;
InstallRemoteCollectionsDialog.collectionsPerPage = 4;
InstallRemoteCollectionsDialog.collections = [];                    
InstallRemoteCollectionsDialog.init = function () {
    InstallRemoteCollectionsDialog.manager = window.opener.CollectionManager;
    Dom.populate(InstallRemoteCollectionsDialog, ["collectionListContent", "backBtn", "nextBtn", "pagingLabel"]);
    InstallRemoteCollectionsDialog.loadNewData();
};
InstallRemoteCollectionsDialog.loadNewData = function() {
    var start = (InstallRemoteCollectionsDialog.currentPage - 1) * InstallRemoteCollectionsDialog.collectionsPerPage;
    var xml = InstallRemoteCollectionsDialog.getXmlFromServer("http://localhost:8080/pencil/collection/getAllCollections?start=" + start +"&count="+InstallRemoteCollectionsDialog.collectionsPerPage+"&t="+new Date().getDate());
    
    InstallRemoteCollectionsDialog.parseXML(xml);
    InstallRemoteCollectionsDialog.totalPages = Math.ceil(InstallRemoteCollectionsDialog.collectionLength / InstallRemoteCollectionsDialog.collectionsPerPage);
    
    InstallRemoteCollectionsDialog.setNextBackButtonStatus();
    
    InstallRemoteCollectionsDialog.loadCollections();
};
InstallRemoteCollectionsDialog.loadPreviousPage = function() {
    if(InstallRemoteCollectionsDialog.backBtn.getAttribute("disabled") == "true") return;
    InstallRemoteCollectionsDialog.currentPage--;
    InstallRemoteCollectionsDialog.loadNewData();
};
InstallRemoteCollectionsDialog.loadNextPage = function() {
    if(InstallRemoteCollectionsDialog.nextBtn.getAttribute("disabled") == "true") return;
    InstallRemoteCollectionsDialog.currentPage++;
    InstallRemoteCollectionsDialog.loadNewData();
};
InstallRemoteCollectionsDialog.setNextBackButtonStatus = function() {
    if(InstallRemoteCollectionsDialog.currentPage == 1 || InstallRemoteCollectionsDialog.totalPages == 1) {
        InstallRemoteCollectionsDialog.backBtn.setAttribute("disabled", true);
    } else {
        InstallRemoteCollectionsDialog.backBtn.setAttribute("disabled", false);
    }
    
    if(InstallRemoteCollectionsDialog.totalPages == 1 || InstallRemoteCollectionsDialog.currentPage == InstallRemoteCollectionsDialog.totalPages) {
        InstallRemoteCollectionsDialog.nextBtn.setAttribute("disabled", true);
    } else {
        InstallRemoteCollectionsDialog.nextBtn.setAttribute("disabled", false);
    }
};
InstallRemoteCollectionsDialog.loadCollections = function() {
    var rows = [];
    for (var i = 0; i < InstallRemoteCollectionsDialog.collections.length; i ++) {
        var collection = InstallRemoteCollectionsDialog.collections[i];
        
        var row = {
            _name: "hbox",
            _uri: PencilNamespaces.xul,
            align: "left",
            class: "container",
            _children: [
                {
                    _name: "image",
                    _uri: PencilNamespaces.xul,
                    class: "container-image",
                    src : collection.icon
                },
                {
                    _name: "vbox",
                    _uri: PencilNamespaces.xul,
                    class: "container-vbox",
                    flex: "1",
                    _children: [
                        {
                            _name: "label",
                            _uri: PencilNamespaces.xul,
                            class: "container-vbox-name",
                            _text: collection.name
                        },
                        {
                            _name: "div",
                            _uri: "http://www.w3.org/1999/xhtml",
                            class: "container-vbox-description",
                            _text : collection.description
                        },
                        {
                            _name: "hbox",
                            _uri: PencilNamespaces.xul,
                            class: "container-vbox-hbox",
                            _children: [
                                {
                                    _name: "label",
                                    _uri: PencilNamespaces.xul,
                                    class: "container-vbox-hbox-author",
                                    _text: "Author: " + collection.author
                                },
                                {
                                    _name: "label",
                                    _uri: PencilNamespaces.xul,
                                    class: "container-vbox-hbox-lastupdate",
                                    _text: "Last updated: " + collection.lastUpdated
                                }
                            ]
                        }
                    ]
                },
                {
                    _name: "button",
                    _uri: PencilNamespaces.xul,
                    class: "container-button",
                    "collection-url": collection.packageUrl,
                    "collection-id" : collection.id,
                    label: "Install",
                    disabled: InstallRemoteCollectionsDialog.alreadyInstalledCollection(collection)
                },
                {
                    _name: "progressmeter",
                    _uri: PencilNamespaces.xul,
                    class: "container-vbox-progressmeter",
                    id: collection.id,
                    hidden: true
                }
            ]
        }
        rows.push(row);
    }
    Dom.empty(InstallRemoteCollectionsDialog.collectionListContent);
    InstallRemoteCollectionsDialog.collectionListContent.appendChild(Dom.newDOMFragment(rows));
    InstallRemoteCollectionsDialog.pagingLabel.value = InstallRemoteCollectionsDialog.currentPage + "/" + InstallRemoteCollectionsDialog.totalPages;
    InstallRemoteCollectionsDialog.collectionListContent.addEventListener("click", InstallRemoteCollectionsDialog.downloadAndInstallRemoteCollection, true);
};
InstallRemoteCollectionsDialog.alreadyInstalledCollection = function(collection) {
    for (var i in InstallRemoteCollectionsDialog.manager.shapeDefinition.collections) {
        var existingCollection = InstallRemoteCollectionsDialog.manager.shapeDefinition.collections[i];
        if (existingCollection.id == collection.id) {
            return true;
        }
    }
    return false;
};
InstallRemoteCollectionsDialog.downloadAndInstall = function (url, downloadTargetFile, outListener, options, button, progress) {

    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                                .getService(Components.interfaces.nsIIOService);

    var uri = ioService.newURI(url, null, null);
    var channel = ioService.newChannelFromURI(uri);

    var httpChannel = channel.QueryInterface(Components.interfaces.nsIHttpChannel);
    
    var listener = {
        foStream: null,
        file: downloadTargetFile,
        listener: outListener,
        size: 0,

        writeMessage: function (message) {
            if (this.listener && this.listener.onMessage) {
                this.listener.onMessage(message);
            }
        },
        onStartRequest: function (request, context) {
            this.writeMessage("Request started");
            
        },
        onDataAvailable: function (request, context, stream, sourceOffset, length) {
            
            //if (this.canceled) return;

            try {
                
                if (!this.foStream) {    
                    this.foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                            .createInstance(Components.interfaces.nsIFileOutputStream);
                                            
                    debug("Start receiving file...");

                    this.downloaded = 0;

                    this.foStream.init(this.file, 0x04 | 0x08 | 0x20, 0664, 0);
                }

                try {
                    this.size = parseInt(httpChannel.getResponseHeader("Content-Length"), 10);
                    
                } catch (e) {
                    
                }

                var bStream = Components.classes["@mozilla.org/binaryinputstream;1"].
                                createInstance(Components.interfaces.nsIBinaryInputStream);

                bStream.setInputStream(stream);
                var bytes = bStream.readBytes(length);


                this.foStream.write(bytes, bytes.length);

                this.downloaded += length;

                if (this.size > 0) {
                    var percent = Math.floor((this.downloaded * 100) / this.size);
                    if (this.listener && this.listener.onProgress) this.listener.onProgress(percent);
                    progress.setAttribute("value", percent);
                }
            } catch (e) {
                Util.error("Saving error:\n" + e);
            }
        },
        onStopRequest: function (request, context, status) {
            var self = this;
            
            progress.setAttribute("hidden", true);
            button.setAttribute("hidden", false);
            if(this.size > 0) {
                this.foStream.close();
                var callback = function() {
                    self.file.remove(true);
                };
            
                InstallRemoteCollectionsDialog.manager.installCollectionFromFile(this.file, callback);
                
            } else {
                Util.error("This collection has been removed!");
            }
            
            InstallRemoteCollectionsDialog.loadNewData();
            //this.listener.onDone();
        },
        onChannelRedirect: function (oldChannel, newChannel, flags) {
        },
        getInterface: function (aIID) {
            try {
                return this.QueryInterface(aIID);
            } catch (e) {
                throw Components.results.NS_NOINTERFACE;
            }
        },
        onProgress : function (aRequest, aContext, aProgress, aProgressMax) { },
        onStatus : function (aRequest, aContext, aStatus, aStatusArg) {
            this.writeMessage("onStatus: " + [aRequest, aContext, aStatus, aStatusArg]);
        },
        onRedirect : function (aOldChannel, aNewChannel) { },

        QueryInterface : function(aIID) {
            if (aIID.equals(Components.interfaces.nsISupports) ||
                aIID.equals(Components.interfaces.nsIInterfaceRequestor) ||
                aIID.equals(Components.interfaces.nsIChannelEventSink) ||
                aIID.equals(Components.interfaces.nsIProgressEventSink) ||
                aIID.equals(Components.interfaces.nsIHttpEventSink) ||
                aIID.equals(Components.interfaces.nsIStreamListener)) {

                return this;
            }

            throw Components.results.NS_NOINTERFACE;
        }
    }; //listener

    //var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                        //.createInstance(Components.interfaces.nsIFileInputStream);
    //inputStream.init(uploadFile, 0x04 | 0x08, 0644, 0x04); // file is an nsIFile instance

    //var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
    var mime = "application/octet-stream";

    if (options && options.mime) mime = options.mime;

    //uploadChannel.setUploadStream(inputStream, mime, -1);

    httpChannel.requestMethod = "GET";

    /*if (options && options.headers) {
        for (name in options.headers) {
            httpChannel.setRequestHeader(name, options.headers[name], false);
        }
    }*/

    channel.notificationCallbacks = listener;
    channel.asyncOpen(listener, null);
    
};
InstallRemoteCollectionsDialog.downloadAndInstallRemoteCollection = function (event) {
    if(event.originalTarget.getAttribute("disabled") == "true") return;
    var button = event.originalTarget;
    var collectionURL = button.getAttribute("collection-url");
    
    if(collectionURL) {
        var progress = document.getElementById(button.getAttribute("collection-id"));
        progress.setAttribute("hidden", false);
        button.setAttribute("hidden", true);
        button.setAttribute("disabled", true);
        try {
            var targetDir = InstallRemoteCollectionsDialog.manager.getUserStencilDirectory();
            var targetPath = targetDir.path;
            var file = Components.classes["@mozilla.org/file/local;1"].  
                   createInstance(Components.interfaces.nsILocalFile);  
            file.initWithPath(targetPath);
            file.append("file.zip");
            InstallRemoteCollectionsDialog.downloadAndInstall(collectionURL, file, null, null, button, progress);
        } catch(error) {
            button.setAttribute("disabled", false);
            progress.setAttribute("hidden", true);
            button.setAttribute("hidden", false);
            Util.error("Install collection fail, please try again!");
        }
    }
};
InstallRemoteCollectionsDialog.getXmlFromServer = function(url) {
    var xmlhttp = new XMLHttpRequest();
    var xml = "";
    try {
        xmlhttp.open("GET", url, false);
        xmlhttp.send(null);
        xml = xmlhttp.responseXML;
    }
    catch (error) {
        Util.error("Connect to server fail!");
    }
    return xml;
};
InstallRemoteCollectionsDialog.parseXML = function(xml) {    
    var node = Dom.getSingle("/Collections", xml.documentElement);
    InstallRemoteCollectionsDialog.collectionLength = node.getAttribute("max");
    InstallRemoteCollectionsDialog.currentPage = node.getAttribute("start") / InstallRemoteCollectionsDialog.collectionsPerPage + 1;
    InstallRemoteCollectionsDialog.collections = [];
    Dom.workOn("./Collection", xml.documentElement, function(node){
        var collection = {};
        collection.id = Dom.getSingle("./collectionId/text()", node).nodeValue;
        collection.name = Dom.getSingle("./name/text()", node).nodeValue;
        if(Dom.getSingle("./description/text()", node)) collection.description = Dom.getSingle("./description/text()", node).nodeValue;
        collection.author = Dom.getSingle("./author/text()", node).nodeValue;
        collection.lastUpdated = Dom.getSingle("./lastUpdate/text()", node).nodeValue;
        if(Dom.getSingle("./icon/text()", node)) collection.icon = Dom.getSingle("./icon/text()", node).nodeValue;
        collection.packageUrl = Dom.getSingle("./packageUrl/text()", node).nodeValue;
        InstallRemoteCollectionsDialog.collections.push(collection);
    });
};
window.addEventListener("load", InstallRemoteCollectionsDialog.init, false);