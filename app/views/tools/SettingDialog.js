function SettingDialog() {
    Dialog.call(this);
    this.title = "Settings";

    this.configElements = {
        "grid.enabled": this.checkboxEnableGrid,
        "edit.gridSize" : this.textboxGridSize,
        "edit.gridStyle" : this.comboGridStyle,
        "edit.snap.grid": this.snapToGrid,
        "object.snapping.enabled": this.enableSnapping,
        "object.snapping.background": this.enableSnappingBackground,
        "quick.editting": this.quickEditting,
        "edit.cutAndPasteAtTheSamePlace": this.cutAndPasteAtTheSamePlace,
        "view.undo.enabled": this.undoEnabled,
        "view.undoLevel": this.textboxUndoLevel,
        "view.uiTextScale": this.textScaleInput,
        "view.useCompactLayout": this.useCompactLayout,
        "pencil.mcp.enabled": this.checkboxEnableMcp,
        "pencil.mcp.port": this.textboxMcpPort,
        "pencil.mcp.defaultCollectionVisibility": this.comboMcpDefaultVisibility
    };

    this.bind("click", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("configName");
        });
        if (!node) return;
        var configName = node.getAttribute("configName");

        console.log("configName:", configName);
        if (node.type == "checkbox") {
            this.updateConfigAndInvalidateUI(configName, node.checked);
        }
    }, this.settingTabPane);

    this.bind("input", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("configName");
        });
        if (!node) return;
        var configName = node.getAttribute("configName");

        if (node.value == "" || parseInt(node.value) == 0) {
            var defaultValue = node.getAttribute("default-value");
            if (defaultValue) {
                node.value = defaultValue;
            }
        }

        Config.set(configName, node.value);
        this.setPreferenceItems();
    }, this.textboxGridSize);

    this.bind("change", function (event) {
        var node = Dom.findUpward(event.target, function (n) {
            return n.getAttribute && n.getAttribute("configName");
        });
        if (!node) return;
        var configName = node.getAttribute("configName");

        if (node.value == "" || parseInt(node.value) == 0) {
            var defaultValue = node.getAttribute("default-value");
            if (defaultValue) {
                node.value = defaultValue;
            }
        }
        if (configName == "pencil.mcp.port") {
            var port = parseInt(node.value, 10);
            if (isNaN(port) || port < 1024 || port > 65535) {
                Dialog.error("Invalid port: " + node.value + ". Server port must be between 1024 and 65535.");
                node.value = Config.get("pencil.mcp.port", 1919);
                return;
            }
            Config.set("pencil.mcp.port", port);
            this.setPreferenceItems();
            if (this.checkboxEnableMcp.checked && window.PencilApiServer) {
                window.PencilApiServer.restart(port);
            }
            this.updateMcpServerStatus();
            return;
        }

        if (node.type == "number" || node.type == "text") {
            // if (configName == "external.editor.bitmap.path") {
            //     if (node.value == "" ) node.value = "/usr/bin/gimp";
            // }
            // if (configName == "external.editor.vector.path") {
            //     if (node.value == "" ) node.value = "/usr/bin/inkscape";
            // }
            var configValue = Config.get(configName, node.value);

            Config.set(configName, node.value);
            this.setPreferenceItems();
            if (configName == "view.uiTextScale") {
                const delta = Math.abs(node.value - configValue);
                widget.reloadDesktopFont().then(function () {
                    if (event.restoreAction || delta == 1) return;
                    Dialog.confirm("Would you like to keep this configuration?", "",
                        "Restore the previous configuration", function () {
                            this.textScaleInput.value = configValue;
                            Dom.emitEvent("change", node, {restoreAction: true});
                            return true;
                        }.bind(this), "Keep this configuration");
                }.bind(this));
            }
        }

        ApplicationPane._instance.invalidateUIForConfig();
    }, this.settingTabPane);

    this.bind("input", function (event) {
        this.setPreferenceItems();
    }, this.preferenceNameInput);

    var thiz = this;
    this.comboGridStyle.addEventListener("p:ItemSelected", function (event) {
        var gridStyle = thiz.comboGridStyle.getSelectedItem();
        thiz.updateConfigAndInvalidateUI("edit.gridStyle", gridStyle);
    }, false);

    this.bind("click", function () {
        if (!window.PencilApiServer) return;
        var port = parseInt(thiz.textboxMcpPort.value, 10) || 1919;
        thiz.mcpStatusText.textContent = "Restarting...";
        thiz.mcpStatusText.style.color = "#ff9800";
        thiz.mcpStatusIndicator.style.backgroundColor = "#ff9800";
        window.PencilApiServer.restart(port, function () {
            thiz.updateMcpServerStatus();
        });
    }, this.buttonRestartMcp);

    if (window.globalEventBus) {
        window.globalEventBus.listen("mcp-server-status-change", function () {
            thiz.updateMcpServerStatus();
        });
    }

    this.activeMcpClient = "claude";

    if (this.btnClientClaude) {
        this.bind("click", function () { thiz.selectMcpClient("claude"); }, this.btnClientClaude);
        this.bind("click", function () { thiz.selectMcpClient("cursor"); }, this.btnClientCursor);
        this.bind("click", function () { thiz.selectMcpClient("antigravity"); }, this.btnClientAntigravity);
        this.bind("click", function () { thiz.selectMcpClient("vscode"); }, this.btnClientVscode);
    }
    if (this.btnCopyMcpConfig) {
        this.bind("click", function () {
            thiz.copyToClipboard(thiz.mcpSnippetContent.textContent, thiz.btnCopyMcpConfig);
        }, this.btnCopyMcpConfig);
    }

}
__extend(Dialog, SettingDialog);

SettingDialog.prototype.updateConfigAndInvalidateUI = function (configName, value) {
    Config.set(configName, value);
    if (this.configElements[configName]) {
        var checkBox = this.configElements[configName];
        if (checkBox == this.checkboxEnableGrid) {
            if (value) {
                Dom.removeClass(this.textboxGridSize.parentNode, "Disabled");
                Dom.removeClass(this.gridStyleContainer, "Disabled");
            } else {
                Dom.addClass(this.textboxGridSize.parentNode, "Disabled");
                Dom.addClass(this.gridStyleContainer, "Disabled");
            }
        }
        if (checkBox == this.undoEnabled) {
            if (value) {
                Dom.removeClass(this.textboxUndoLevel.parentNode, "Disabled");
            } else {
                Dom.addClass(this.textboxUndoLevel.parentNode, "Disabled");
            }
        }
        if (checkBox == this.enableSnapping) {
            this.enableSnappingBackground.disabled = !this.enableSnapping.checked;
            if (value) {
                Dom.removeClass(this.enableSnappingBackground.parentNode, "Disabled");
            } else {
                Dom.addClass(this.enableSnappingBackground.parentNode, "Disabled");
            }
        }
        if (checkBox == this.checkboxEnableMcp) {
            if (value) {
                Dom.removeClass(this.mcpPortContainer, "Disabled");
                this.textboxMcpPort.disabled = false;
                Dom.removeClass(this.mcpVisibilityContainer, "Disabled");
            } else {
                Dom.addClass(this.mcpPortContainer, "Disabled");
                this.textboxMcpPort.disabled = true;
                Dom.addClass(this.mcpVisibilityContainer, "Disabled");
            }
            if (window.PencilApiServer) {
                if (value) {
                    var mcpPort = parseInt(this.textboxMcpPort.value, 10) || 1919;
                    window.PencilApiServer.start(mcpPort);
                } else {
                    window.PencilApiServer.stop();
                }
            }
            this.updateMcpServerStatus();
        }
        checkBox.checked = value;
    }
    this.setPreferenceItems();
}

SettingDialog.prototype.setup = function () {
    this.checkboxEnableGrid.checked = Config.get("grid.enabled");
    this.snapToGrid.checked = Config.get("edit.snap.grid");
    this.enableSnapping.checked = Config.get("object.snapping.enabled");
    this.enableSnappingBackground.checked = Config.get("object.snapping.background");
    // this.embedImages.checked = Config.get("document.EmbedImages");
    this.quickEditting.checked = Config.get("quick.editting");
    this.cutAndPasteAtTheSamePlace.checked = Config.get("edit.cutAndPasteAtTheSamePlace");
    this.undoEnabled.checked = Config.get("view.undo.enabled");
    // this.checkboxScaleImage.checked = Config.get("clipartbrowser.scale");

    var gridSize = Config.get("edit.gridSize");
    if (gridSize == null) {
        Config.set("edit.gridSize", 8);
    }
    this.textboxGridSize.value = Config.get("edit.gridSize");

    this.comboGridStyle.setItems(["Dotted", "Solid"]);
    var gridStyle = Config.get("edit.gridStyle");
    if (gridStyle == null) {
        gridStyle = "Dotted";
        Config.set("edit.gridStyle", gridStyle);
    }
    this.comboGridStyle.selectItem(gridStyle);

    // var w = Config.get("clipartbrowser.scale.width");
    // var h = Config.get("clipartbrowser.scale.height");
    // if (w == null) {
    //     Config.set("clipartbrowser.scale.width", 200);
    // }
    // if (h == null) {
    //     Config.set("clipartbrowser.scale.height", 200);
    // }

    // this.textboxClipartBrowserScaleWidth.value  = Config.get("clipartbrowser.scale.width");
    // this.textboxClipartBrowserScaleHeight.value = Config.get("clipartbrowser.scale.height");

    var level = Config.get("view.undoLevel");
    if (level == null) {
        Config.set("view.undoLevel", 20);
    }
    this.textboxUndoLevel.value = Config.get("view.undoLevel");

    var textScale = Config.get("view.uiTextScale");
    if (textScale == null) {
        Config.set("view.uiTextScale", 100);
    }
    this.textScaleInput.value = Config.get("view.uiTextScale");

    this.useCompactLayout.checked = Config.get("view.useCompactLayout", false);

    var svgurl = Config.get("external.editor.vector.path", "/usr/bin/inkscape");
    var bitmapurl = Config.get("external.editor.bitmap.path", "/usr/bin/gimp");

    this.svgEditorUrl.value = svgurl;
    this.bitmapEditorUrl.value = bitmapurl;

    if (this.checkboxEnableGrid.checked) {
        Dom.removeClass(this.textboxGridSize.parentNode, "Disabled");
        Dom.removeClass(this.gridStyleContainer, "Disabled");
    } else {
        Dom.addClass(this.textboxGridSize.parentNode, "Disabled");
        Dom.addClass(this.gridStyleContainer, "Disabled");
    }

    if (this.undoEnabled.checked) {
        Dom.removeClass(this.textboxUndoLevel.parentNode, "Disabled");
    } else {
        Dom.addClass(this.textboxUndoLevel.parentNode, "Disabled");
    }

    this.enableSnappingBackground.disabled = !this.enableSnapping.checked;
    if (this.enableSnapping.checked) {
        Dom.removeClass(this.enableSnappingBackground.parentNode, "Disabled");
    } else {
        Dom.addClass(this.enableSnappingBackground.parentNode, "Disabled");
    }

    // if (this.checkboxScaleImage.checked) {
    //     Dom.removeClass(this.textboxClipartBrowserScaleWidth.parentNode, "Disabled");
    //     Dom.removeClass(this.textboxClipartBrowserScaleHeight.parentNode, "Disabled");
    // } else {
    //     Dom.addClass(this.textboxClipartBrowserScaleWidth.parentNode, "Disabled");
    //     Dom.addClass(this.textboxClipartBrowserScaleHeight.parentNode, "Disabled");
    // }
    var mcpEnabled = Config.get("pencil.mcp.enabled", true);
    this.checkboxEnableMcp.checked = mcpEnabled;

    var mcpPort = Config.get("pencil.mcp.port", 1919);
    this.textboxMcpPort.value = mcpPort;

    if (mcpEnabled) {
        Dom.removeClass(this.mcpPortContainer, "Disabled");
        this.textboxMcpPort.disabled = false;
        Dom.removeClass(this.mcpVisibilityContainer, "Disabled");
    } else {
        Dom.addClass(this.mcpPortContainer, "Disabled");
        this.textboxMcpPort.disabled = true;
        Dom.addClass(this.mcpVisibilityContainer, "Disabled");
    }

    var visibilityItems = [
        { label: "Opt-in only (Default - collections hidden until enabled)", value: "opt-in" },
        { label: "Expose all collections by default", value: "all" }
    ];
    this.comboMcpDefaultVisibility.renderer = function (item) {
        return item ? (item.label || item) : "";
    };
    this.comboMcpDefaultVisibility.comparer = function (a, b) {
        var valA = a && typeof a === "object" ? a.value : a;
        var valB = b && typeof b === "object" ? b.value : b;
        return valA === valB;
    };
    this.comboMcpDefaultVisibility.setItems(visibilityItems);

    var currentVis = Config.get("pencil.mcp.defaultCollectionVisibility", "opt-in");
    var activeItem = visibilityItems.find(function (it) { return it.value === currentVis; }) || visibilityItems[0];
    this.comboMcpDefaultVisibility.selectItem(activeItem);

    var thizSetup = this;
    this.comboMcpDefaultVisibility.addEventListener("p:ItemSelected", function () {
        var sel = thizSetup.comboMcpDefaultVisibility.getSelectedItem();
        var val = sel && typeof sel === "object" ? sel.value : sel;
        Config.set("pencil.mcp.defaultCollectionVisibility", val);
        thizSetup.setPreferenceItems();
        if (typeof CollectionManager !== "undefined" && CollectionManager.updateDefaultMcpVisibility) {
            CollectionManager.updateDefaultMcpVisibility();
        }
        thizSetup.updateMcpVisibleCollectionsList();
    }, false);

    this.updateMcpServerStatus();
    this.selectMcpClient("claude");
    this.updateMcpVisibleCollectionsList();
    this.initializePreferenceTable();
};

SettingDialog.prototype.initializePreferenceTable = function () {
    this.preferenceTable.column(new DataTable.PlainTextColumn("Preference Name", function (data) {
        return data.name;
    }).width("1*"));
    this.preferenceTable.column(new DataTable.PlainTextColumn("Status", function (data) {
        return data.status;
    }).width("7em"));
    this.preferenceTable.column(new DataTable.PlainTextColumn("Type", function (data) {
        return data.type;
    }).width("7em"));
    this.preferenceTable.column(new DataTable.PlainTextColumn("Value", function (data) {
        return data.value;
    }).width("15em"));

    this.preferenceTable.selector(false);
    var thiz = this;
    window.setTimeout(function () {
        thiz.preferenceTable.setup();
        thiz.preferenceTable.setDefaultSelectionHandler({
            run: function (data) {
                if (data.type == "boolean") {
                    thiz.updateConfigAndInvalidateUI(data.name, !data.value);
                } else {
                    Dialog.prompt(data.name, data.value, "OK", function (value) {
                        data.value = value;
                        var result = value;
                        if (data.type != "string") {
                            result = parseFloat(value);
                            if (data.name == "view.undoLevel" || data.name == "edit.gridSize" ) {
                                if (!result || parseInt(result) == 0 ) {
                                    if (data.name == "view.undoLevel") {
                                        result = 10;
                                        thiz.textboxUndoLevel.value = result;
                                    } else if (data.name == "edit.gridSize" ) {
                                        result = 5;
                                        thiz.textboxGridSize.value = result;
                                    }
                                }
                            }
                        } else {
                            if (data.name == "external.editor.bitmap.path")
                            {
                                if (result == "" ){
                                    result = "/usr/bin/gimp";
                                }
                                thiz.bitmapEditorUrl.value = result;
                            }
                            if (data.name == "external.editor.vector.path") {
                                if (result == "" ){
                                    result = "/usr/bin/inkscape";
                                }
                                thiz.svgEditorUrl.value = result;
                            }
                            if (data.name == "edit.gridStyle")
                            {
                               if (result == "") {
                                  result = "Dotted"
                               }
                               thiz.comboGridStyle.selectedItem = result;
                            }
                        }
                        Config.set(data.name, result);
                        thiz.setPreferenceItems();
                    }, "Cancel");
                }
            }
        });
        thiz.setPreferenceItems();
    }, 200);
};

SettingDialog.prototype.setPreferenceItems = function () {
    var items = [];
    Config._load();
    var query = this.preferenceNameInput.value;
    for (var configName in Config.data) {
        if (configName.indexOf(query) < 0) continue;
        var value = Config.data[configName];
        if (typeof(value)=="object") continue;
        items.push({
            name: configName,
            status: "user set",
            value: value,
            type: typeof(value)
        });
    };
    this.preferenceTable.setItems(items);
};

SettingDialog.prototype.getDialogActions = function () {
    return [
        Dialog.ACTION_CLOSE
    ];
};

SettingDialog.prototype.updateMcpServerStatus = function () {
    if (!this.mcpStatusText || !window.PencilApiServer) return;
    var info = window.PencilApiServer.getStatus();

    if (info.status === "running") {
        this.mcpStatusIndicator.style.backgroundColor = "#4caf50";
        this.mcpStatusText.textContent = "Running";
        this.mcpStatusText.style.color = "#4caf50";
        this.mcpStatusDetail.textContent = "Streamable HTTP (JSON-RPC 2.0) listening on " + info.endpoint;
        this.buttonRestartMcp.disabled = false;
        this.buttonRestartMcp.textContent = "Restart Server";
    } else if (info.status === "stopped") {
        this.mcpStatusIndicator.style.backgroundColor = "#9e9e9e";
        this.mcpStatusText.textContent = "Stopped";
        this.mcpStatusText.style.color = "#9e9e9e";
        this.mcpStatusDetail.textContent = "MCP server is disabled in settings.";
        this.buttonRestartMcp.disabled = true;
        this.buttonRestartMcp.textContent = "Server Stopped";
    } else if (info.status === "error") {
        this.mcpStatusIndicator.style.backgroundColor = "#f44336";
        this.mcpStatusText.textContent = "Error / Port Conflict";
        this.mcpStatusText.style.color = "#f44336";
        this.mcpStatusDetail.textContent = info.error || ("Failed to bind port " + info.port);
        this.buttonRestartMcp.disabled = false;
        this.buttonRestartMcp.textContent = "Retry / Restart";
    } else if (info.status === "stopping") {
        this.mcpStatusIndicator.style.backgroundColor = "#ff9800";
        this.mcpStatusText.textContent = "Stopping...";
        this.mcpStatusText.style.color = "#ff9800";
        this.mcpStatusDetail.textContent = "Stopping server on port " + info.port;
        this.buttonRestartMcp.disabled = true;
        this.buttonRestartMcp.textContent = "Stopping...";
    } else {
        this.mcpStatusIndicator.style.backgroundColor = "#ff9800";
        this.mcpStatusText.textContent = "Starting...";
        this.mcpStatusText.style.color = "#ff9800";
        this.mcpStatusDetail.textContent = "Initializing server on port " + info.port;
        this.buttonRestartMcp.disabled = true;
        this.buttonRestartMcp.textContent = "Starting...";
    }

    this.updateMcpClientGuide();
    this.updateMcpVisibleCollectionsList();
};

SettingDialog.prototype.copyToClipboard = function (text, buttonElement) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
    } else if (typeof require === "function") {
        require("electron").clipboard.writeText(text);
    }
    if (buttonElement) {
        var prevText = buttonElement.textContent;
        buttonElement.textContent = "Copied!";
        Dom.addClass(buttonElement, "copied");
        setTimeout(function () {
            buttonElement.textContent = prevText;
            Dom.removeClass(buttonElement, "copied");
        }, 2000);
    }
};

SettingDialog.prototype.selectMcpClient = function (clientKey) {
    this.activeMcpClient = clientKey;
    var clientButtons = [
        { key: "claude", btn: this.btnClientClaude },
        { key: "cursor", btn: this.btnClientCursor },
        { key: "antigravity", btn: this.btnClientAntigravity },
        { key: "vscode", btn: this.btnClientVscode }
    ];
    clientButtons.forEach(function (item) {
        if (!item.btn) return;
        if (item.key === clientKey) {
            Dom.addClass(item.btn, "active");
        } else {
            Dom.removeClass(item.btn, "active");
        }
    });
    this.updateMcpClientGuide();
};

SettingDialog.prototype.updateMcpClientGuide = function () {
    if (!this.mcpSnippetContent) return;
    var port = parseInt(this.textboxMcpPort ? this.textboxMcpPort.value : 1919, 10);
    if (isNaN(port) || port <= 0) {
        port = Config.get("pencil.mcp.port", 1919);
    }
    var endpoint = "http://127.0.0.1:" + port + "/mcp";

    var snippet = "";
    var title = "Claude Desktop";

    switch (this.activeMcpClient) {
        case "cursor":
            title = "Cursor (.cursor/mcp.json)";
            snippet = JSON.stringify({
                "mcpServers": {
                    "pencil": {
                        "url": endpoint
                    }
                }
            }, null, 2);
            break;
        case "antigravity":
            title = "Antigravity (mcp_config.json)";
            snippet = JSON.stringify({
                "mcpServers": {
                    "pencil": {
                        "serverUrl": endpoint
                    }
                }
            }, null, 2);
            break;
        case "vscode":
            title = "VS Code (.vscode/mcp.json)";
            snippet = JSON.stringify({
                "servers": {
                    "pencil": {
                        "type": "http",
                        "url": endpoint
                    }
                }
            }, null, 2);
            break;
        case "claude":
        default:
            title = "Claude Desktop (claude_desktop_config.json)";
            snippet = JSON.stringify({
                "mcpServers": {
                    "pencil": {
                        "command": "npx",
                        "args": [
                            "-y",
                            "mcp-remote",
                            endpoint
                        ]
                    }
                }
            }, null, 2);
            break;
    }

    if (this.mcpSnippetTitle) {
        this.mcpSnippetTitle.textContent = title;
    }
    this.mcpSnippetContent.textContent = snippet;
};

SettingDialog.prototype.updateMcpVisibleCollectionsList = function () {
    if (!this.mcpVisibleCollectionsList) return;
    this.mcpVisibleCollectionsList.innerHTML = "";

    if (typeof CollectionManager === "undefined" || !CollectionManager.shapeDefinition || !Array.isArray(CollectionManager.shapeDefinition.collections)) {
        this.mcpVisibleCollectionsList.textContent = "No collections loaded.";
        return;
    }

    var visibleCols = [];
    for (var i = 0; i < CollectionManager.shapeDefinition.collections.length; i++) {
        var col = CollectionManager.shapeDefinition.collections[i];
        if (col && col.id && CollectionManager.isCollectionMcpVisible(col)) {
            visibleCols.push(col);
        }
    }

    if (visibleCols.length === 0) {
        var emptyNotice = Dom.newDOMElement({
            _name: "div",
            style: "opacity: 0.6; font-style: italic; padding: 0.2em 0;",
            _text: "No collections are currently visible to MCP."
        });
        this.mcpVisibleCollectionsList.appendChild(emptyNotice);
        return;
    }

    var list = Dom.newDOMElement({
        _name: "ul",
        style: "margin: 0.3em 0 0 0; padding-left: 1.4em; line-height: 1.5;"
    });

    for (var j = 0; j < visibleCols.length; j++) {
        var c = visibleCols[j];
        var item = Dom.newDOMElement({
            _name: "li",
            _text: c.displayName || c.name || c.id
        });
        list.appendChild(item);
    }

    this.mcpVisibleCollectionsList.appendChild(list);
};
