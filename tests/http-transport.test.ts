import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { TokenDb } from "../src/lib/token-db.js";
import { pkg } from "../src/lib/pkg.js";
import { createServer } from "../src/server.js";

describe("HTTP Streamable Transport", () => {
  let app: Express;
  let tokenDb: TokenDb;

  beforeAll(() => {
    tokenDb = TokenDb.load();
    app = express();
    app.use(express.json());

    // Set up the MCP HTTP endpoint (stateless mode)
    app.post("/mcp", async (req, res) => {
      const server = createServer(tokenDb);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode
        enableJsonResponse: true, // Return JSON instead of SSE for testing
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on("close", () => {
        transport.close();
        server.close();
      });
    });
  });

  describe("MCP Protocol Initialization", () => {
    it("should handle initialize request", async () => {
      const response = await request(app)
        .post("/mcp").set("Accept", "application/json, text/event-stream")
        .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: {
              name: "test-client",
              version: "1.0.0",
            },
          },
        })
        .expect(200)
        .expect("Content-Type", /json/);

      expect(response.body).toHaveProperty("jsonrpc", "2.0");
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body.result).toHaveProperty("protocolVersion");
      expect(response.body.result).toHaveProperty("serverInfo");
      expect(response.body.result.serverInfo.name).toBe(pkg.name);
      expect(response.body.result.serverInfo.version).toBe(pkg.version);
    });

    it("should return server capabilities", async () => {
      const response = await request(app)
        .post("/mcp").set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 2,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: {
              name: "test-client",
              version: "1.0.0",
            },
          },
        })
        .expect(200);

      expect(response.body.result).toHaveProperty("capabilities");
      expect(response.body.result.capabilities).toHaveProperty("tools");
    });
  });

  describe("Tool Listing", () => {
    it("should list available tools", async () => {
      const response = await request(app)
        .post("/mcp").set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/list",
          params: {},
        })
        .expect(200);

      expect(response.body.result).toHaveProperty("tools");
      expect(Array.isArray(response.body.result.tools)).toBe(true);
      expect(response.body.result.tools.length).toBeGreaterThan(0);

      // Verify expected tools are present
      const toolNames = response.body.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain("get_instructions");
      expect(toolNames).toContain("search_tokens");
      expect(toolNames).toContain("get_supported_chains");
      expect(toolNames).toContain("create_tx");
      expect(toolNames).toContain("get_trade_dapp_url");
    });

    it("should include tool descriptions", async () => {
      const response = await request(app)
        .post("/mcp").set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 4,
          method: "tools/list",
          params: {},
        })
        .expect(200);

      const tools = response.body.result.tools;
      tools.forEach((tool: any) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(typeof tool.description).toBe("string");
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Tool Execution", () => {
    it("should execute get_instructions tool", async () => {
      const response = await request(app)
        .post("/mcp").set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: {
            name: "get_instructions",
            arguments: {},
          },
        })
        .expect(200);

      expect(response.body.result).toHaveProperty("content");
      expect(Array.isArray(response.body.result.content)).toBe(true);
      expect(response.body.result.content[0]).toHaveProperty("type", "text");
      expect(response.body.result.content[0].text).toContain("deBridge");
    });

    it("should execute search_tokens tool", async () => {
      const response = await request(app)
        .post("/mcp").set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 6,
          method: "tools/call",
          params: {
            name: "search_tokens",
            arguments: {
              query: "USDC",
            },
          },
        })
        .expect(200);

      expect(response.body.result).toHaveProperty("content");
      expect(Array.isArray(response.body.result.content)).toBe(true);
      expect(response.body.result.content[0]).toHaveProperty("type", "text");

      // Parse the JSON response - returns object with results array
      const tokenData = JSON.parse(response.body.result.content[0].text);
      expect(tokenData).toHaveProperty("results");
      expect(Array.isArray(tokenData.results)).toBe(true);
      expect(tokenData.results.length).toBeGreaterThan(0);
      expect(tokenData.results[0]).toHaveProperty("symbol", "USDC");
    });

    it("should execute get_supported_chains tool", async () => {
      const response = await request(app)
        .post("/mcp").set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 7,
          method: "tools/call",
          params: {
            name: "get_supported_chains",
            arguments: {},
          },
        })
        .expect(200);

      expect(response.body.result).toHaveProperty("content");
      const chainData = JSON.parse(response.body.result.content[0].text);
      expect(Array.isArray(chainData)).toBe(true);
      expect(chainData.length).toBeGreaterThan(0);
      expect(chainData[0]).toHaveProperty("chainId");
      expect(chainData[0]).toHaveProperty("chainNames");
      expect(Array.isArray(chainData[0].chainNames)).toBe(true);
    });

    it("should handle tool errors gracefully", async () => {
      const response = await request(app)
        .post("/mcp").set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 8,
          method: "tools/call",
          params: {
            name: "nonexistent_tool",
            arguments: {},
          },
        })
        .expect(200);

      // MCP returns an error wrapped in content for unknown tools
      expect(response.body.result).toHaveProperty("content");
      const errorText = response.body.result.content[0].text;
      expect(errorText).toContain("not found");
    });
  });

  describe("Stateless Mode", () => {
    it("should handle multiple independent requests", async () => {
      // First request
      const response1 = await request(app)
        .post("/mcp").set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 9,
          method: "tools/call",
          params: {
            name: "search_tokens",
            arguments: { query: "ETH" },
          },
        })
        .expect(200);

      expect(response1.body.result).toBeDefined();

      // Second independent request
      const response2 = await request(app)
        .post("/mcp").set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 10,
          method: "tools/call",
          params: {
            name: "search_tokens",
            arguments: { query: "USDT" },
          },
        })
        .expect(200);

      expect(response2.body.result).toBeDefined();

      // Both should have different results
      const data1 = JSON.parse(response1.body.result.content[0].text);
      const data2 = JSON.parse(response2.body.result.content[0].text);
      expect(data1.results[0].symbol).toBe("ETH");
      expect(data2.results[0].symbol).toBe("USDT");
    });
  });

  describe("Error Handling", () => {
    it("should reject invalid JSON-RPC requests", async () => {
      // Invalid JSON-RPC structure returns 400
      await request(app)
        .post("/mcp").set("Accept", "application/json, text/event-stream")
        .send({
          // Missing jsonrpc field
          id: 11,
          method: "tools/list",
        })
        .expect(400);
    });

    it("should handle malformed tool arguments", async () => {
      const response = await request(app)
        .post("/mcp").set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 12,
          method: "tools/call",
          params: {
            name: "search_tokens",
            arguments: {
              // Missing required 'query' parameter
            },
          },
        })
        .expect(200);

      // MCP wraps validation errors in content
      expect(response.body.result).toHaveProperty("content");
      const errorText = response.body.result.content[0].text;
      expect(errorText.toLowerCase()).toContain("validation error");
    });

    it("should handle empty POST body", async () => {
      // Empty body should return 400 Bad Request
      await request(app).post("/mcp").set("Accept", "application/json, text/event-stream").send({}).expect(400);
    });
  });

  describe("Content Type Handling", () => {
    it("should accept application/json content type", async () => {
      const response = await request(app)
        .post("/mcp").set("Accept", "application/json, text/event-stream")
        .set("Content-Type", "application/json")
        .send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 13,
            method: "tools/list",
            params: {},
          })
        )
        .expect(200);

      expect(response.body.result).toHaveProperty("tools");
    });

    it("should handle requests without explicit content type", async () => {
      const response = await request(app)
        .post("/mcp").set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 14,
          method: "tools/list",
          params: {},
        })
        .expect(200);

      expect(response.body.result).toHaveProperty("tools");
    });
  });

  describe("Concurrent Requests", () => {
    it("should handle multiple concurrent requests", async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post("/mcp").set("Accept", "application/json, text/event-stream")
          .send({
            jsonrpc: "2.0",
            id: 15 + i,
            method: "tools/call",
            params: {
              name: "search_tokens",
              arguments: { query: "USDC" },
            },
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.result).toBeDefined();
        expect(response.body.result.content).toBeDefined();
      });
    });
  });
});
