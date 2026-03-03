import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Readable } from "node:stream";
import http from "node:http";

/**
 * Tests the HTTP proxy mode: a local Express app that transparently
 * forwards /mcp requests to an upstream "fake MCPd" HTTP server.
 */

function createFakeMcpdApp(): Express {
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const server = new Server(
      { name: "fake-mcpd", version: "0.0.1" },
      { capabilities: { tools: {} } },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "ping",
          description: "Returns pong",
          inputSchema: { type: "object" as const, properties: {} },
        },
      ],
    }));

    server.setRequestHandler(CallToolRequestSchema, async () => ({
      content: [{ type: "text" as const, text: "pong" }],
    }));

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on("close", () => {
      transport.close();
      server.close();
    });
  });

  return app;
}

function createProxyApp(upstreamUrl: string): Express {
  const app = express();

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  app.all("/mcp", async (req, res) => {
    try {
      const headers: Record<string, string> = {
        Accept: (req.headers.accept as string) ?? "application/json, text/event-stream",
      };
      if (req.headers["content-type"]) {
        headers["Content-Type"] = req.headers["content-type"] as string;
      }

      let body: string | undefined;
      if (req.method === "POST") {
        body = await new Promise<string>((resolve) => {
          let data = "";
          req.on("data", (chunk: Buffer) => (data += chunk.toString()));
          req.on("end", () => resolve(data));
        });
      }

      const upstreamRes = await fetch(upstreamUrl, {
        method: req.method,
        headers,
        body,
      });

      res.status(upstreamRes.status);
      upstreamRes.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower !== "transfer-encoding" && lower !== "connection") {
          res.setHeader(key, value);
        }
      });

      if (upstreamRes.body) {
        const readable = Readable.fromWeb(upstreamRes.body as never);
        readable.pipe(res);
      } else {
        res.end();
      }
    } catch {
      res.status(502).json({ error: "Bad gateway — upstream MCPd unreachable" });
    }
  });

  return app;
}

describe("HTTP proxy", () => {
  let mcpdServer: http.Server;
  let mcpdPort: number;
  let proxyApp: Express;

  beforeAll(async () => {
    const mcpdApp = createFakeMcpdApp();
    mcpdServer = mcpdApp.listen(0);
    const addr = mcpdServer.address();
    mcpdPort = typeof addr === "object" && addr ? addr.port : 0;
    proxyApp = createProxyApp(`http://127.0.0.1:${mcpdPort}/mcp`);
  });

  afterAll(() => {
    mcpdServer.close();
  });

  it("proxies initialize request", async () => {
    const res = await request(proxyApp)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      })
      .expect(200);

    expect(res.body).toHaveProperty("jsonrpc", "2.0");
    expect(res.body.result).toHaveProperty("serverInfo");
    expect(res.body.result.serverInfo.name).toBe("fake-mcpd");
  });

  it("proxies tools/list", async () => {
    const res = await request(proxyApp)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      })
      .expect(200);

    const tools = res.body.result.tools;
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("ping");
  });

  it("proxies tools/call", async () => {
    const res = await request(proxyApp)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "ping", arguments: {} },
      })
      .expect(200);

    expect(res.body.result.content[0].text).toBe("pong");
  });

  it("returns 502 when upstream is unreachable", async () => {
    const brokenProxy = createProxyApp("http://127.0.0.1:1/mcp");
    const res = await request(brokenProxy)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 4,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      });

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.error).toContain("Bad gateway");
  });
});
