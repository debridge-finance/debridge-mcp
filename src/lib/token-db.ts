import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { TokenEntry, ChainInfo } from "../types.js";

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isAddress(query: string): boolean {
  return EVM_ADDRESS_RE.test(query) || SOLANA_ADDRESS_RE.test(query);
}

export class TokenDb {
  private tokens: TokenEntry[];
  private chains: ChainInfo[];

  constructor(tokens: TokenEntry[], chains: ChainInfo[]) {
    this.tokens = tokens;
    this.chains = chains;
  }

  static load(): TokenDb {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const dataDir = resolve(__dirname, "../../data");
    const tokens: TokenEntry[] = JSON.parse(readFileSync(resolve(dataDir, "tokens.json"), "utf-8"));
    const chains: ChainInfo[] = JSON.parse(readFileSync(resolve(dataDir, "chains.json"), "utf-8"));
    return new TokenDb(tokens, chains);
  }

  search(query: string, chainId?: string, limit = 10): TokenEntry[] {
    let pool = this.tokens;
    if (chainId) {
      pool = pool.filter((t) => t.chainId === chainId);
    }

    // Address lookup: exact match only
    if (isAddress(query)) {
      const lower = query.toLowerCase();
      return pool
        .filter((t) => t.address.toLowerCase() === lower)
        .slice(0, limit);
    }

    // Text search with priority: exact symbol > exact name > symbol starts-with > name includes
    const q = query.toLowerCase();
    const exactSymbol: TokenEntry[] = [];
    const exactName: TokenEntry[] = [];
    const symbolPrefix: TokenEntry[] = [];
    const nameSubstring: TokenEntry[] = [];

    for (const t of pool) {
      const sym = t.symbol.toLowerCase();
      const namesLower = t.names.map((n) => n.toLowerCase());
      if (sym === q) exactSymbol.push(t);
      else if (namesLower.some((n) => n === q)) exactName.push(t);
      else if (sym.startsWith(q)) symbolPrefix.push(t);
      else if (namesLower.some((n) => n.includes(q))) nameSubstring.push(t);
    }

    const byChain = (a: TokenEntry, b: TokenEntry) =>
      a.chainId.localeCompare(b.chainId);

    return [
      ...exactSymbol.sort(byChain),
      ...exactName.sort(byChain),
      ...symbolPrefix.sort(byChain),
      ...nameSubstring.sort(byChain),
    ].slice(0, limit);
  }

  getChains(): ChainInfo[] {
    return [...this.chains].sort((a, b) => a.chainNames[0].localeCompare(b.chainNames[0]));
  }

  resolveApiChainId(id: string): string | undefined {
    // Already a deBridge internal ID?
    const bySubscription = this.chains.find((c) => c.debridgeSubscriptionId === id);
    if (bySubscription) return id;
    // Native chain ID → resolve to API ID
    const byNative = this.chains.find((c) => c.chainId === id);
    if (byNative) return byNative.debridgeSubscriptionId ?? byNative.chainId;
    return undefined;
  }

  findByAddress(chainId: string, address: string): TokenEntry | undefined {
    const lower = address.toLowerCase();
    return this.tokens.find(
      (t) => t.chainId === chainId && t.address.toLowerCase() === lower,
    );
  }

  getAll(): TokenEntry[] {
    return this.tokens;
  }
}
