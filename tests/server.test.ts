import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { TokenDb } from "../src/lib/token-db.js";
import { createServer } from "../src/server.js";

function setupClient() {
  const tokenDb = TokenDb.load();
  const server = createServer(tokenDb);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  return {
    server,
    clientTransport,
    serverTransport,
    async init() {
      await server.connect(serverTransport);
      const client = new Client({ name: "test-client", version: "1.0.0" });
      await client.connect(clientTransport);
      return client;
    },
    async close() {
      await clientTransport.close();
      await serverTransport.close();
    },
  };
}

describe("debridge-mcp server", () => {
  let ctx: ReturnType<typeof setupClient>;
  let client: Client;

  beforeEach(async () => {
    ctx = setupClient();
    client = await ctx.init();
  });

  afterEach(async () => {
    await ctx.close();
  });

  it("returns server info on initialize", async () => {
    const info = client.getServerVersion();
    expect(info).toEqual({ name: "debridge-mcp", version: "0.1.0" });
  });

  it("lists tools", async () => {
    const result = await client.listTools();
    const names = result.tools.map((t) => t.name).sort();
    expect(names).toEqual(["create_tx", "estimate_same_chain_swap", "get_instructions", "get_supported_chains", "get_trade_dapp_url", "search_tokens"]);
  });

  it("returns instructions from get_instructions tool", async () => {
    const result = await client.callTool({ name: "get_instructions" });
    expect(result.content).toHaveLength(1);
    const text = (result.content as Array<{ type: string; text: string }>)[0];
    expect(text.type).toBe("text");
    expect(text.text).toContain("deBridge MCP Server");
  });

  describe("search_tokens", () => {
    it("finds USDC across chains", async () => {
      const result = await client.callTool({
        name: "search_tokens",
        arguments: { query: "USDC" },
      });
      const content = (result.content as Array<{ type: string; text: string }>)[0];
      const data = JSON.parse(content.text);
      expect(data.total).toBeGreaterThan(0);
      expect(data.results.every((t: { symbol: string }) => t.symbol === "USDC")).toBe(true);
    });

    it("filters by chainId", async () => {
      const result = await client.callTool({
        name: "search_tokens",
        arguments: { query: "USDC", chainId: "1" },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.total).toBeGreaterThanOrEqual(1);
      expect(data.results[0].chainId).toBe("1");
      expect(data.results[0].symbol).toBe("USDC");
    });

    it("filters by name", async () => {
      const result = await client.callTool({
        name: "search_tokens",
        arguments: { query: "USDC", name: "coin" },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.total).toBeGreaterThan(0);
      expect(data.results.every((t: { names: string[] }) => t.names.some((n: string) => n.toLowerCase().includes("coin")))).toBe(true);
    });

    it("looks up by EVM address", async () => {
      const result = await client.callTool({
        name: "search_tokens",
        arguments: { query: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.total).toBe(1);
      expect(data.results[0].symbol).toBe("USDC");
      expect(data.results[0].chainId).toBe("1");
    });

    it("looks up by Solana address", async () => {
      const result = await client.callTool({
        name: "search_tokens",
        arguments: { query: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.total).toBe(1);
      expect(data.results[0].symbol).toBe("USDC");
      expect(data.results[0].chainId).toBe("7565164");
    });

    it("returns empty for no match", async () => {
      const result = await client.callTool({
        name: "search_tokens",
        arguments: { query: "NONEXISTENT" },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.total).toBe(0);
      expect(data.results).toEqual([]);
    });

    it("respects limit", async () => {
      const result = await client.callTool({
        name: "search_tokens",
        arguments: { query: "USD", limit: 2 },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.total).toBeLessThanOrEqual(2);
    });
  });

  describe("estimate_same_chain_swap", () => {
    it("returns error for unknown chain ID without calling API", async () => {
      const result = await client.callTool({
        name: "estimate_same_chain_swap",
        arguments: {
          chainId: "999999",
          tokenIn: "0x0000000000000000000000000000000000000000",
          tokenInAmount: "1000000000000000000",
          tokenOut: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        },
      });
      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      const data = JSON.parse(text);
      expect(data.error).toContain("Unknown chain ID");
    });

    it("estimates ETH → USDC swap on Ethereum", async () => {
      const result = await client.callTool({
        name: "estimate_same_chain_swap",
        arguments: {
          chainId: "1",
          tokenIn: "0x0000000000000000000000000000000000000000",
          tokenInAmount: "1000000000000000000",
          tokenOut: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        },
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.estimation).toBeDefined();
      expect(data.estimation.tokenIn.symbol).toBe("ETH");
      expect(data.estimation.tokenOut.symbol).toBe("USDC");
      expect(Number(data.estimation.tokenOut.amount)).toBeGreaterThan(0);
    });

    it("estimates USDC → USDT swap on Arbitrum", async () => {
      const result = await client.callTool({
        name: "estimate_same_chain_swap",
        arguments: {
          chainId: "42161",
          tokenIn: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
          tokenInAmount: "1000000000",
          tokenOut: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        },
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.estimation).toBeDefined();
      expect(data.estimation.tokenIn.symbol).toBe("USDC");
      expect(data.estimation.tokenOut.symbol).toMatch(/USD[T₮]/);  // API returns "USD₮0"
      expect(Number(data.estimation.tokenOut.amount)).toBeGreaterThan(0);
    });

    it("passes explicit slippage to the API", async () => {
      const result = await client.callTool({
        name: "estimate_same_chain_swap",
        arguments: {
          chainId: "1",
          tokenIn: "0x0000000000000000000000000000000000000000",
          tokenInAmount: "1000000000000000000",
          tokenOut: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          slippage: "1",
        },
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.estimation).toBeDefined();
      expect(data.estimation.slippage).toBe(1);
    });

    it("estimates USDM → ETH swap on MegaETH", async () => {
      const result = await client.callTool({
        name: "estimate_same_chain_swap",
        arguments: {
          chainId: "4326",
          tokenIn: "0xfafddbb3fc7688494971a79cc65dca3ef82079e7",
          tokenInAmount: "20000000000000000000",
          tokenOut: "0x0000000000000000000000000000000000000000",
        },
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.estimation).toBeDefined();
      expect(data.estimation.tokenIn.symbol).toMatch(/USDm/i);
      expect(Number(data.estimation.tokenOut.amount)).toBeGreaterThan(0);
    });

    it("returns API error for invalid token address", async () => {
      const result = await client.callTool({
        name: "estimate_same_chain_swap",
        arguments: {
          chainId: "1",
          tokenIn: "0x0000000000000000000000000000000000000000",
          tokenInAmount: "1000000000000000000",
          tokenOut: "0x0000000000000000000000000000000000000001",
        },
      });
      expect(result.isError).toBe(true);
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe("get_supported_chains", () => {
    it("returns all chains sorted by name", async () => {
      const result = await client.callTool({
        name: "get_supported_chains",
        arguments: {},
      });
      const chains = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(chains.length).toBe(28);
      const names: string[] = chains.map((c: { chainNames: string[] }) => c.chainNames[0]);
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    });

    it("includes Ethereum and Solana", async () => {
      const result = await client.callTool({
        name: "get_supported_chains",
        arguments: {},
      });
      const chains = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      const ids = chains.map((c: { chainId: string }) => c.chainId);
      expect(ids).toContain("1");
      expect(ids).toContain("7565164");
    });
  });
});
