(function () {
    const http = require("http");
    const path = require("path");
    const fs = require("fs");
    const express = require("express");
    const cors = require("cors");

    /*
     * PencilApiServer manages the lifecycle of the embedded Express HTTP server
     * and mounted MCP services. Exposes status inspection and dynamic start/stop/restart
     * capabilities tied to desktop Config preferences.
     *
     * Implements a strict asynchronous lifecycle state machine ("stopped", "starting",
     * "running", "stopping", "error") with pending action queuing to prevent race conditions
     * and premature EADDRINUSE port conflicts during fast checkbox toggling.
     */
    var PencilApiServer = {
        server: null,
        status: "stopped",
        currentPort: null,
        lastError: null,
        sockets: new Set(),
        _pendingAction: null,

        createApp: function () {
            var app = express();

            app.use(cors({
                origin: '*',
                methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['*'],
                exposedHeaders: ['mcp-session-id', 'content-type']
            }));

            app.use(express.json({ limit: '10mb' }));

            var RENDER_API = "/json/render";
            app.post(RENDER_API, async (req, res) => {
                var input = req.body;
                var json = input.content;

                if (!json) throw new Error("Expecting JSON content");

                var useSVG = input.output == "svg";
                var result = await ApplicationPane._instance.convertDesignJSONToImage(json, useSVG, input.openAsDocument, input.pageTitle || input.title);
                console.log("To return", result);

                if (useSVG) {
                    res.json({
                        svg: result
                    });
                } else {
                    res.json({
                        filePath: result
                    });
                }
            });

            app.post("/json/collections/icon-list", async (req, res) => {
                var input = req.body;
                var icons = await ApplicationPane._instance.getIconList(input.iconType);
                console.log("To return", icons);
                res.json({
                    icons: icons
                });
            });

            /*
             * Mount Model Context Protocol (MCP) Streamable HTTP Server.
             * Discovers mcp/server.js module relative to current directory.
             */
            try {
                var mcpModulePath = path.join(__dirname, "tools/mcp/server.js");
                if (!fs.existsSync(mcpModulePath)) {
                    mcpModulePath = path.join(__dirname, "mcp/server.js");
                }
                var mcp = require(mcpModulePath);
                mcp.mountMcpServer(app);
            } catch (mcpErr) {
                console.error("Failed to mount Pencil MCP Server:", mcpErr);
            }

            return app;
        },

        start: function (port, callback) {
            var enabled = (typeof Config !== "undefined") ? Config.get("pencil.mcp.enabled", true) : true;
            if (!enabled) {
                if (this.status === "running" || this.status === "starting") {
                    this.stop(callback);
                    return;
                }
                this.status = "stopped";
                this.currentPort = null;
                this.lastError = null;
                this._notifyStatusChange();
                if (callback) callback(null);
                return;
            }

            port = port || ((typeof Config !== "undefined") ? parseInt(Config.get("pencil.mcp.port", 1919), 10) : 1919);
            if (isNaN(port) || port < 1024 || port > 65535) {
                port = 1919;
            }

            /*
             * If currently stopping, queue this start action until the bound port
             * is completely freed by the underlying operating system.
             */
            if (this.status === "stopping") {
                var thiz = this;
                this._pendingAction = function () {
                    thiz.start(port, callback);
                };
                return;
            }

            /*
             * If already starting on the target port, do not initiate another listen call.
             */
            if (this.status === "starting" && this.currentPort === port) {
                if (callback) callback(null);
                return;
            }

            /*
             * If already running on the requested port, treat as a successful no-op.
             */
            if (this.status === "running" && this.currentPort === port && this.server) {
                if (callback) callback(null);
                return;
            }

            /*
             * If running on a different port, execute clean restart sequence.
             */
            if (this.server) {
                this.restart(port, callback);
                return;
            }

            this.status = "starting";
            this.currentPort = port;
            this.lastError = null;
            this._notifyStatusChange();

            var app = this.createApp();
            var server = http.createServer(app);
            this.server = server;

            var thiz = this;
            server.on("connection", function (socket) {
                thiz.sockets.add(socket);
                socket.on("close", function () {
                    thiz.sockets.delete(socket);
                });
            });

            server.on("error", function (err) {
                thiz.status = "error";
                thiz.server = null;
                thiz.lastError = (err.code === "EADDRINUSE")
                    ? "Port " + port + " is already in use by another application."
                    : err.message;
                console.error("Pencil API Server error:", err);
                thiz._notifyStatusChange();
                if (callback) callback(err);

                if (thiz._pendingAction) {
                    var action = thiz._pendingAction;
                    thiz._pendingAction = null;
                    action();
                }
            });

            server.listen(port, function () {
                thiz.status = "running";
                thiz.currentPort = port;
                thiz.lastError = null;
                console.log("API HTTP Server running on http://localhost:" + port);
                thiz._notifyStatusChange();
                if (callback) callback(null);

                if (thiz._pendingAction) {
                    var action = thiz._pendingAction;
                    thiz._pendingAction = null;
                    action();
                }
            });
        },

        stop: function (callback) {
            /*
             * If already stopped with no server instance, exit cleanly.
             */
            if (this.status === "stopped" && !this.server) {
                if (callback) callback(null);
                return;
            }

            /*
             * If already stopping, do not issue duplicate close requests.
             */
            if (this.status === "stopping") {
                if (callback) callback(null);
                return;
            }

            /*
             * If currently starting, queue stop to run once the listening socket resolves.
             */
            if (this.status === "starting") {
                var thiz = this;
                this._pendingAction = function () {
                    thiz.stop(callback);
                };
                return;
            }

            this.status = "stopping";
            this._notifyStatusChange();

            /*
             * Destroy active keep-alive sockets immediately to ensure the
             * operating system frees the bound port without lingering wait states.
             */
            for (var socket of this.sockets) {
                try { socket.destroy(); } catch (e) {}
            }
            this.sockets.clear();

            var serverToClose = this.server;
            this.server = null;

            var thiz = this;
            if (serverToClose) {
                if (typeof serverToClose.closeAllConnections === "function") {
                    try { serverToClose.closeAllConnections(); } catch (e) {}
                }
                serverToClose.close(function (err) {
                    thiz.status = "stopped";
                    thiz.currentPort = null;
                    thiz._notifyStatusChange();
                    if (callback) callback(err);

                    if (thiz._pendingAction) {
                        var action = thiz._pendingAction;
                        thiz._pendingAction = null;
                        action();
                    }
                });
            } else {
                this.status = "stopped";
                this.currentPort = null;
                this._notifyStatusChange();
                if (callback) callback(null);

                if (thiz._pendingAction) {
                    var action = thiz._pendingAction;
                    thiz._pendingAction = null;
                    action();
                }
            }
        },

        restart: function (newPort, callback) {
            var thiz = this;
            this.stop(function () {
                thiz.start(newPort, callback);
            });
        },

        getStatus: function () {
            var configuredPort = (typeof Config !== "undefined") ? parseInt(Config.get("pencil.mcp.port", 1919), 10) : 1919;
            var enabled = (typeof Config !== "undefined") ? Config.get("pencil.mcp.enabled", true) : true;
            var activePort = this.currentPort || configuredPort;
            return {
                status: this.status,
                enabled: enabled,
                port: activePort,
                endpoint: "http://127.0.0.1:" + activePort + "/mcp",
                error: this.lastError
            };
        },

        _notifyStatusChange: function () {
            if (typeof window !== "undefined" && window.globalEventBus) {
                window.globalEventBus.broadcast("mcp-server-status-change", this.getStatus());
            }
        }
    };

    if (typeof window !== "undefined") {
        window.PencilApiServer = PencilApiServer;
    }
    if (typeof global !== "undefined") {
        global.PencilApiServer = PencilApiServer;
    }

    /*
     * Subscribe to config-change notifications broadcast by Config.set()
     * to react dynamically when pencil.mcp.enabled changes elsewhere.
     */
    if (typeof window !== "undefined") {
        var attachBusListener = function () {
            if (window.globalEventBus) {
                window.globalEventBus.listen("config-change", function (data) {
                    if (!data) return;
                    if (data.name === "pencil.mcp.enabled") {
                        if (data.value) {
                            PencilApiServer.start();
                        } else {
                            PencilApiServer.stop();
                        }
                    }
                });
            } else {
                setTimeout(attachBusListener, 100);
            }
        };
        attachBusListener();
    }

    /*
     * Auto-start the server on startup according to persisted Config settings.
     */
    PencilApiServer.start();

})();