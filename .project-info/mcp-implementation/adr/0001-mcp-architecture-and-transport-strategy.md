# ADR-0001: Pencil MCP Server Architecture & Transport Strategy

## Metadata
- **Status:** Approved
- **Date:** 2026-09-30
- **Authors:** levantuan.itvn@gmail.com and Antigravity Agent
- **Parent Plan:** [.project-info/mcp-implementation/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/plans/master-plan.md)
- **Domain Specification:** [.project-info/mcp-implementation/specs/mcp-server-spec.md](file:///home/ltuan/storage/pencil/.project-info/mcp-implementation/specs/mcp-server-spec.md)

---

## 1. Context & Problem Statement

Modern AI agent environments (such as Antigravity, Cursor, Claude Desktop, and web/remote agents) support the Model Context Protocol (MCP) using HTTP-based transports, specifically the modern **Streamable HTTP** protocol (HTTP with streaming/SSE).

Evolus Pencil already runs an internal Node.js Express server inside the desktop application at [app/tools/api-server.js](file:///home/ltuan/storage/pencil/app/tools/api-server.js), loaded directly into `app.xhtml` with full in-memory access to `ApplicationPane._instance` on port 1919.

We need an architecture that exposes Pencil's rendering engine, stencil catalogs, active document structures, and AI design capabilities to external AI agents with maximum efficiency, real-time streaming capability, zero process overhead, and seamless integration with the running desktop instance.

---

## 2. Decision Drivers

1. **Protocol Modernity & Capability:** Leverage the modern Streamable HTTP protocol for MCP, enabling streaming responses, real-time progress events, bi-directional capability, and persistent HTTP connectivity.
2. **Elimination of Redundancy:** Avoid creating an unnecessary standalone CLI wrapper process whose sole purpose would be forwarding stdio JSON-RPC calls over HTTP to port 1919.
3. **Direct In-Memory Access:** Tool invocations should execute directly against `ApplicationPane._instance` without intermediate proxy hops or redundant network serialization layers.
4. **Multi-Agent & Concurrent Connectivity:** Streamable HTTP naturally supports multiple simultaneous agent sessions connecting to the same active Pencil canvas.
5. **Operational Simplicity:** A single unified server lifecycle: when Evolus Pencil runs, the MCP server is live and ready on port 1919.

---

## 3. Considered Options

### Option A: Standalone Node.js CLI with stdio Transport + HTTP Proxy Bridge (Rejected)
Create a separate Node.js CLI script using stdio transport that external agents launch as a child process. The CLI receives JSON-RPC requests via stdio and proxies them as HTTP requests to `http://127.0.0.1:1919`.
- *Downsides:*
  - **Redundant layer:** Spawns an extra Node.js process just to act as an HTTP client proxy to an already existing Node.js Express server.
  - **Rigid transport:** Stdio requires local child process management, is restricted to a single client per process, and cannot be accessed over network/remote setups.
  - **Double latency & failure modes:** Two network/IPC hops for every tool call; process crash or pipe breakage disconnects the agent session.

### Option B: Direct Embedded Streamable HTTP Server in `app/tools/api-server.js` (Chosen)
Integrate the MCP Server directly into the existing Express server in [app/tools/api-server.js](file:///home/ltuan/storage/pencil/app/tools/api-server.js) (using `@modelcontextprotocol/sdk` Streamable HTTP / SSE transport) mounted on port 1919.
- *Benefits:*
  - **Zero Redundancy:** No extra CLI process, no proxy hops, no subprocess management.
  - **High Performance:** Tool handlers directly call `ApplicationPane._instance` methods in memory with near-zero latency.
  - **Streamable HTTP Power:** Full support for streaming tool responses, real-time progress notifications, and robust HTTP session handling.
  - **Concurrent Agents:** Multiple agents/tools can connect simultaneously to the same running Pencil instance.
  - **Unified Configuration:** Single port (1919) and single service lifecycle managed inside the desktop app.

---

## 4. Decision & Rationale

We choose **Option B (Direct Embedded Streamable HTTP Server in `app/tools/api-server.js`)**:

1. **Architecture Elegance:** Pencil already initializes an Express HTTP server in `api-server.js` within the Electron window context. Embedding the MCP Streamable HTTP transport here provides a direct bridge from external agents to the Pencil runtime without any middleman process.
2. **Streamable HTTP Advantages:** Modern agents support Streamable HTTP natively. It avoids all pitfalls of stdio (buffer truncation, stderr contamination, subprocess lifecycle failures) while providing native streaming capabilities.
3. **Instant Responsiveness:** All tool handlers execute directly against `ApplicationPane._instance`, enabling instantaneous rendering, canvas manipulation, and live document inspection.

---

## 5. Consequences & Guidance

1. **Express MCP Route Integration:**
   - Mount Streamable HTTP transport endpoints (e.g. `/mcp` or `/sse` and `/message`) directly on the Express app in `app/tools/api-server.js` (modularized in `app/tools/mcp/`).
2. **Knowledge Base Access:**
   - The embedded server directly reads domain schemas and skills from `app/tools/mcp/kb/`.
3. **Port & Endpoint Configuration:**
   - Single port: `1919` (configurable via `PENCIL_API_PORT` in [.project-info/local.env](file:///home/ltuan/storage/pencil/.project-info/local.env)).
   - Streamable HTTP endpoint: `http://127.0.0.1:1919/mcp` (or `http://127.0.0.1:1919/sse`).
4. **Client Agent Configuration:**
   - Agent config registers Pencil as an HTTP/Streamable HTTP MCP server:
     ```json
     {
       "mcpServers": {
         "pencil": {
           "url": "http://127.0.0.1:1919/mcp"
         }
       }
     }
     ```

