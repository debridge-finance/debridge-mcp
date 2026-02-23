#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { TokenDb } from "./lib/token-db.js";
import { createServer } from "./server.js";

const tokenDb = TokenDb.load();

// Choose transport based on environment variable
if (process.env.MCP_TRANSPORT === "http") {
  const port = parseInt(process.env.PORT || "3000");
  const host = process.env.HOST || "0.0.0.0";

  // Create Express app (no DNS rebinding protection)
  const app = express();
  app.use(express.json());

  // Enable CORS for all origins
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Accept");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Handle HTTP POST requests (stateless mode)
  app.post("/mcp", async (req, res) => {
    const server = createServer(tokenDb);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on("close", () => {
      transport.close();
      server.close();
    });
  });

  app.listen(port, host, (err?: Error) => {
    if (err) {
      console.error(`Failed to start server: ${err.message}`);
      process.exit(1);
    }
    console.error(`deBridge MCP server running on http://${host}:${port}/mcp`);
  });
} else {
  // Stdio mode (default)
  const server = createServer(tokenDb);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
