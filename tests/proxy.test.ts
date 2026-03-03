import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { pkg } from "../src/lib/pkg.js";

/**
 * These tests verify the proxy wiring: a downstream MCP client talks to
 * a proxy Server that forwards requests to an upstream "fake MCPd" Server.
 *
 * Upstream (fake MCPd) ←→ upstreamClient ←→ [proxy Server] ←→ downstreamClient
 *
 * We simulate this by wiring three InMemoryTransport pairs.
 */

function createFakeMcpd() {
  const server = new Server(
    { name: "fake-mcpd", version: "0.0.1" },
    { capabilities: { tools: {}, resources: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_supported_chains",
        description: "List supported chains",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "search_tokens",
        description: "Search tokens",
        inputSchema: {
          type: "object" as const,
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === "get_supported_chains") {
      return {
        content: [
          { type: "text" as const, text: JSON.stringify([{ chainId: "1", chainNames: ["Ethereum"] }]) },
        ],
      };
    }
    if (name === "search_tokens") {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ results: [{ symbol: "USDC", chainId: "1" }], query: (args as Record<string, unknown>)?.query }),
          },
        ],
      };
    }
    return { content: [{ type: "text" as const, text: "unknown tool" }], isError: true };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [{ uri: "skill://index", name: "skill-index" }],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => ({
    contents: [{ uri: request.params.uri, text: "# Skills\n- cross-chain-swap" }],
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [{ uriTemplate: "skill://{name}", name: "skill" }],
  }));

  return server;
}

function createProxyServer(upstreamClient: Client) {
  const caps = upstreamClient.getServerCapabilities() ?? {};

  const server = new Server(
    { name: pkg.name, version: pkg.version },
    {
      capabilities: {
        ...(caps.tools ? { tools: caps.tools } : {}),
        ...(caps.resources ? { resources: caps.resources } : {}),
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    return upstreamClient.listTools(request.params);
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return upstreamClient.callTool(request.params);
  });

  if (caps.resources) {
    server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
      return upstreamClient.listResources(request.params);
    });

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return upstreamClient.readResource(request.params);
    });

    server.setRequestHandler(ListResourceTemplatesRequestSchema, async (request) => {
      return upstreamClient.listResourceTemplates(request.params);
    });
  }

  return server;
}

describe("MCP proxy", () => {
  let fakeMcpd: Server;
  let upstreamClient: Client;
  let proxyServer: Server;
  let downstreamClient: Client;

  beforeAll(async () => {
    // Wire up fake MCPd
    fakeMcpd = createFakeMcpd();
    const [upClientTransport, upServerTransport] = InMemoryTransport.createLinkedPair();
    await fakeMcpd.connect(upServerTransport);

    upstreamClient = new Client({ name: "proxy-upstream", version: "1.0.0" });
    await upstreamClient.connect(upClientTransport);

    // Wire up proxy → downstream
    proxyServer = createProxyServer(upstreamClient);
    const [downClientTransport, downServerTransport] = InMemoryTransport.createLinkedPair();
    await proxyServer.connect(downServerTransport);

    downstreamClient = new Client({ name: "test-client", version: "1.0.0" });
    await downstreamClient.connect(downClientTransport);
  });

  afterAll(async () => {
    await downstreamClient.close();
    await proxyServer.close();
    await upstreamClient.close();
    await fakeMcpd.close();
  });

  it("reports server info", () => {
    const info = downstreamClient.getServerVersion();
    expect(info?.name).toBe(pkg.name);
  });

  describe("tools", () => {
    it("lists tools from upstream", async () => {
      const { tools } = await downstreamClient.listTools();
      const names = tools.map((t) => t.name).sort();
      expect(names).toEqual(["get_supported_chains", "search_tokens"]);
    });

    it("proxies tool calls", async () => {
      const result = await downstreamClient.callTool({ name: "get_supported_chains" });
      const text = (result.content as Array<{ text: string }>)[0].text;
      const chains = JSON.parse(text);
      expect(chains).toEqual([{ chainId: "1", chainNames: ["Ethereum"] }]);
    });

    it("forwards tool arguments", async () => {
      const result = await downstreamClient.callTool({
        name: "search_tokens",
        arguments: { query: "ETH" },
      });
      const text = (result.content as Array<{ text: string }>)[0].text;
      const data = JSON.parse(text);
      expect(data.query).toBe("ETH");
    });
  });

  describe("resources", () => {
    it("lists resources from upstream", async () => {
      const { resources } = await downstreamClient.listResources();
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe("skill://index");
    });

    it("reads a resource from upstream", async () => {
      const { contents } = await downstreamClient.readResource({ uri: "skill://index" });
      expect(contents[0].text).toContain("cross-chain-swap");
    });

    it("lists resource templates from upstream", async () => {
      const { resourceTemplates } = await downstreamClient.listResourceTemplates();
      expect(resourceTemplates).toHaveLength(1);
      expect(resourceTemplates[0].uriTemplate).toBe("skill://{name}");
    });
  });
});
