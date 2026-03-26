#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { Readable } from "node:stream";
import { pkg } from "./lib/pkg.js";

const DEFAULT_REMOTE_MCP_URL = "https://agents.debridge.com/mcp";
const remoteMcpUrl = process.env.REMOTE_MCP_URL || DEFAULT_REMOTE_MCP_URL;

if (process.env.MCP_TRANSPORT === "http") {
  startHttpProxy(remoteMcpUrl);
} else {
  startStdioProxy(remoteMcpUrl);
}

/**
 * Stdio proxy: bridges a local stdio MCP connection to the remote MCPd
 * via Streamable HTTP. The upstream client is long-lived.
 */
async function startStdioProxy(url: string) {
  // Connect to upstream MCPd
  const client = new Client(
    { name: `${pkg.name}-proxy`, version: pkg.version },
    { capabilities: {} },
  );
  const clientTransport = new StreamableHTTPClientTransport(new URL(url));
  await client.connect(clientTransport);

  const caps = client.getServerCapabilities() ?? {};

  // Create local server mirroring upstream capabilities
  const server = new Server(
    { name: pkg.name, version: pkg.version },
    {
      capabilities: {
        ...(caps.tools ? { tools: caps.tools } : {}),
        ...(caps.resources ? { resources: caps.resources } : {}),
      },
    },
  );

  // Proxy tool requests
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    return client.listTools(request.params);
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return client.callTool(request.params);
  });

  // Proxy resource requests (if upstream supports them)
  if (caps.resources) {
    server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
      return client.listResources(request.params);
    });

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return client.readResource(request.params);
    });

    server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async (request) => {
        return client.listResourceTemplates(request.params);
      },
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/**
 * HTTP proxy: transparently forwards all /mcp requests to the remote MCPd,
 * including SSE streaming responses.
 */
function startHttpProxy(url: string) {
  const port = parseInt(process.env.PORT || "3000");
  const host = process.env.HOST || "0.0.0.0";

  const app = express();

  // CORS — mirrors the MCPd CORS policy
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept, Mcp-Session-Id",
    );
    res.header("Access-Control-Expose-Headers", "Mcp-Session-Id");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Transparent reverse proxy for the MCP endpoint
  app.all("/mcp", async (req, res) => {
    try {
      const headers: Record<string, string> = {
        Accept:
          (req.headers.accept as string) ??
          "application/json, text/event-stream",
      };

      if (req.headers["content-type"]) {
        headers["Content-Type"] = req.headers["content-type"] as string;
      }
      if (req.headers["mcp-session-id"]) {
        headers["Mcp-Session-Id"] = req.headers["mcp-session-id"] as string;
      }

      // Read raw body for POST requests
      let body: string | undefined;
      if (req.method === "POST") {
        body = await readRawBody(req);
      }

      const upstreamRes = await fetch(url, {
        method: req.method,
        headers,
        body,
      });

      // Forward status code and headers
      res.status(upstreamRes.status);
      upstreamRes.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower !== "transfer-encoding" && lower !== "connection") {
          res.setHeader(key, value);
        }
      });

      // Stream response body
      if (upstreamRes.body) {
        const readable = Readable.fromWeb(upstreamRes.body as never);
        readable.pipe(res);
      } else {
        res.end();
      }
    } catch (err) {
      console.error("Proxy error:", err);
      if (!res.headersSent) {
        res.status(502).json({ error: "Bad gateway — upstream MCPd unreachable" });
      }
    }
  });

  app.listen(port, host, (err?: Error) => {
    if (err) {
      console.error(`Failed to start proxy: ${err.message}`);
      process.exit(1);
    }
    console.error(
      `deBridge MCP proxy running on http://${host}:${port}/mcp \u2192 ${url}`,
    );
  });
}

function readRawBody(req: express.Request): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => (data += chunk.toString()));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
