import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TokenDb } from "./lib/token-db.js";
import { registerSearchTokens } from "./tools/search-tokens.js";
import { registerGetSupportedChains } from "./tools/get-supported-chains.js";
import { registerCreateTx } from "./tools/create-tx.js";
import { registerGetTradeDappUrl } from "./tools/get-trade-dapp-url.js";
import { registerEstimateSameChainSwap } from "./tools/estimate-same-chain-swap.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillMd = readFileSync(resolve(__dirname, "../SKILL.md"), "utf-8");

export function createServer(tokenDb: TokenDb) {
  const server = new McpServer({
    name: "debridge-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "get_instructions",
    {
      description:
        "CALL THIS FIRST. Returns the full guide for the deBridge MCP server: " +
        "how to initiate cross-chain and same-chain cryptocurrency swaps and transfers, " +
        "estimate pricing, inspect paths and fees, and generate a deBridge App URL " +
        "for the user to complete the transaction. " +
        "Covers the recommended workflow (resolve chains → resolve tokens → create transaction → generate link) " +
        "and practical tips for every tool in this server.",
    },
    () => ({
      content: [{ type: "text", text: skillMd }],
    }),
  );

  registerSearchTokens(server, tokenDb);
  registerGetSupportedChains(server, tokenDb);
  registerCreateTx(server);
  registerGetTradeDappUrl(server);
  registerEstimateSameChainSwap(server, tokenDb);

  return server;
}
