import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TokenDb } from "../lib/token-db.js";

const DLN_API_BASE = "https://dln.debridge.finance/v1.0";

export function registerEstimateSameChainSwap(server: McpServer, tokenDb: TokenDb) {
  server.registerTool(
    "estimate_same_chain_swap",
    {
      description:
        "Estimate a same-chain token swap via deBridge. Returns the expected output amount, fees, slippage, and aggregator comparisons. Use search_tokens first to resolve token names to addresses and get_supported_chains to find chain IDs. Accepts both native chain IDs (e.g. '4326' for MegaETH) and deBridge internal IDs.",
      inputSchema: {
        chainId: z
          .string()
          .describe("Chain ID (native or deBridge internal). Examples: '1' (Ethereum), '56' (BNB Chain), '4326' (MegaETH)"),
        tokenIn: z
          .string()
          .describe(
            "Input token address. Use 0x0000000000000000000000000000000000000000 for native tokens (ETH, BNB, etc.)",
          ),
        tokenInAmount: z
          .string()
          .describe(
            "Amount of input token in smallest units (wei, lamports). Example: '1000000000000000000' for 1 ETH (18 decimals), '1000000' for 1 USDC (6 decimals)",
          ),
        tokenOut: z
          .string()
          .describe("Output token address"),
        slippage: z
          .string()
          .optional()
          .default("auto")
          .describe("Slippage tolerance (e.g. '0.5' for 0.5%), or 'auto' (default: 'auto')"),
        tokenOutAmount: z
          .string()
          .optional()
          .default("auto")
          .describe("Expected output amount in smallest units, or 'auto' for best quote (default: 'auto')"),
        affiliateFeePercent: z
          .number()
          .optional()
          .describe("Affiliate fee percentage (e.g. 0.1 for 0.1%)"),
        affiliateFeeRecipient: z
          .string()
          .optional()
          .describe("Wallet address to receive affiliate fees"),
      },
    },
    async (params) => {
      const apiChainId = tokenDb.resolveApiChainId(params.chainId);
      if (!apiChainId) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: `Unknown chain ID: ${params.chainId}` }),
            },
          ],
        };
      }

      const url = new URL(`${DLN_API_BASE}/chain/estimation`);

      url.searchParams.set("chainId", apiChainId);
      url.searchParams.set("tokenIn", params.tokenIn);
      url.searchParams.set("tokenInAmount", params.tokenInAmount);
      url.searchParams.set("tokenOut", params.tokenOut);
      url.searchParams.set("slippage", params.slippage);
      url.searchParams.set("tokenOutAmount", params.tokenOutAmount);

      if (params.affiliateFeePercent !== undefined) {
        url.searchParams.set("affiliateFeePercent", String(params.affiliateFeePercent));
      }
      if (params.affiliateFeeRecipient) {
        url.searchParams.set("affiliateFeeRecipient", params.affiliateFeeRecipient);
      }

      const response = await fetch(url.toString());
      const body = await response.json();

      if (!response.ok) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: body.message ?? body.error ?? body, statusCode: response.status }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(body),
          },
        ],
      };
    },
  );
}
