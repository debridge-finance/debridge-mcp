import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const DEBRIDGE_APP_BASE = "https://app.debridge.com/";

export function registerGetTradeDappUrl(server: McpServer) {
  server.registerTool(
    "get_trade_dapp_url",
    {
      description:
        "Generate a deBridge app URL that redirects the user to continue a cross-chain swap in the browser. Use search_tokens to resolve token names to addresses and get_supported_chains for chain IDs before calling this tool.",
      inputSchema: {
        inputChain: z
          .string()
          .describe("Source chain ID. Examples: '1' (Ethereum), '56' (BNB Chain), '137' (Polygon), '7565164' (Solana)"),
        outputChain: z
          .string()
          .describe("Destination chain ID. Examples: '1' (Ethereum), '56' (BNB Chain), '42161' (Arbitrum)"),
        inputCurrency: z
          .string()
          .optional()
          .default("")
          .describe("Token address on the source chain. Leave empty for the chain's native token (ETH, BNB, etc.)"),
        outputCurrency: z
          .string()
          .optional()
          .default("")
          .describe("Token address on the destination chain. Leave empty for the chain's native token"),
        amount: z
          .string()
          .describe("Human-readable amount to swap (e.g. '1.5', '100'). NOT in smallest units — use decimal notation"),
        dlnMode: z
          .string()
          .optional()
          .default("simple")
          .describe("DLN mode: 'simple' (default) or 'advanced'"),
        address: z
          .string()
          .optional()
          .describe("Recipient wallet address on the destination chain. Use when the recipient differs from the sender's connected wallet"),
      },
    },
    async (params) => {
      const url = new URL(DEBRIDGE_APP_BASE);

      url.searchParams.set("inputChain", params.inputChain);
      url.searchParams.set("outputChain", params.outputChain);
      url.searchParams.set("inputCurrency", params.inputCurrency);
      url.searchParams.set("outputCurrency", params.outputCurrency);
      url.searchParams.set("amount", params.amount);
      url.searchParams.set("dlnMode", params.dlnMode);
      if (params.address) {
        url.searchParams.set("address", params.address);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: url.toString(),
          },
        ],
      };
    },
  );
}
