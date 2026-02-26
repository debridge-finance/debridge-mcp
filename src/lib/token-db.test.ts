import { describe, it, expect } from "vitest";
import { TokenDb } from "./token-db.js";

describe("TokenDb.search", () => {
  const db = TokenDb.load();

  it("exact symbol match returns all chains", () => {
    const results = db.search("USDC");
    expect(results.every((t) => t.symbol === "USDC")).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it("symbol match is case-insensitive", () => {
    const results = db.search("usdc");
    expect(results.length).toBeGreaterThanOrEqual(3);
    expect(results[0].symbol).toBe("USDC");
  });

  it("filters by chainId", () => {
    const results = db.search("USDC", "42161");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((t) => t.chainId === "42161")).toBe(true);
    expect(results[0].symbol).toBe("USDC");
  });

  it("exact EVM address lookup (case-insensitive)", () => {
    const results = db.search("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    expect(results.length).toBe(1);
    expect(results[0].symbol).toBe("USDC");
    expect(results[0].chainId).toBe("1");
  });

  it("Solana address lookup", () => {
    const results = db.search("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    expect(results.length).toBe(1);
    expect(results[0].symbol).toBe("USDC");
    expect(results[0].chainId).toBe("7565164");
  });

  it("name substring match (e.g. 'tether' finds USDT)", () => {
    const results = db.search("tether");
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.every((t) =>
      t.symbol.toLowerCase().includes("tether") ||
      t.names.some((n) => n.toLowerCase().includes("tether")),
    )).toBe(true);
  });

  it("symbol prefix match (e.g. 'USD' matches USDC and USDT)", () => {
    const results = db.search("USD");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((t) => t.symbol.startsWith("USD"))).toBe(true);
  });

  

  it("respects limit parameter", () => {
    const results = db.search("USD", undefined, 2);
    expect(results.length).toBe(2);
  });

  it("returns empty array for no matches", () => {
    const results = db.search("NONEXISTENT");
    expect(results).toEqual([]);
  });

  it("prioritizes exact symbol over name substring", () => {
    const results = db.search("ETH");
    expect(results[0].symbol).toBe("ETH");
  });

  // Lowercase address tests
  it("EVM address lookup works with checksummed (mixed-case) input", () => {
    const results = db.search("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    expect(results.length).toBe(1);
    expect(results[0].symbol).toBe("USDC");
  });

  it("EVM address lookup works with all-uppercase hex", () => {
    const results = db.search("0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48");
    expect(results.length).toBe(1);
    expect(results[0].symbol).toBe("USDC");
  });

  it("zero address finds native tokens on specific chain", () => {
    const results = db.search("0x0000000000000000000000000000000000000000", "1");
    expect(results.length).toBe(1);
    expect(results[0].symbol).toBe("ETH");
  });

  it("zero address without chain filter returns all native tokens", () => {
    const results = db.search("0x0000000000000000000000000000000000000000");
    expect(results.length).toBeGreaterThan(1);
    expect(results.every((t) => t.address === "0x0000000000000000000000000000000000000000")).toBe(true);
  });

  // Partial match tests
  it("partial name match is case-insensitive", () => {
    const results = db.search("TETHER");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((t) =>
      t.symbol.toLowerCase().includes("tether") ||
      t.names.some((n) => n.toLowerCase().includes("tether")),
    )).toBe(true);
  });

  it("single-char query matches symbol prefix or name", () => {
    const results = db.search("U");
    expect(results.length).toBeGreaterThan(0);
    // Each result should have symbol starting with U or a name containing "u"
    expect(results.every((t) =>
      t.symbol.toLowerCase().startsWith("u") ||
      t.names.some((n) => n.toLowerCase().includes("u")),
    )).toBe(true);
  });

  it("name substring 'coin' matches USD Coin", () => {
    const results = db.search("coin");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((t) =>
      t.symbol.toLowerCase().includes("coin") ||
      t.names.some((n) => n.toLowerCase().includes("coin")),
    )).toBe(true);
  });

  it("finds HYPE token", () => {
    const results = db.search("HYPE");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].symbol).toBe("HYPE");
  });

  // Invalid address validation — should not match anything
  it("truncated EVM address (too short) returns no results", () => {
    const results = db.search("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb");
    expect(results).toEqual([]);
  });

  it("extended EVM address (too long) returns no results", () => {
    const results = db.search("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48ff");
    expect(results).toEqual([]);
  });

  it("EVM address missing 0x prefix returns no results", () => {
    const results = db.search("a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    expect(results).toEqual([]);
  });

  it("invalid hex chars in EVM address returns no results", () => {
    const results = db.search("0xZ0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    expect(results).toEqual([]);
  });

  it("truncated Solana address returns no results", () => {
    const results = db.search("EPjFWdd5AufqSSqeM2qN1x");
    expect(results).toEqual([]);
  });
});

describe("TokenDb.resolveApiChainId", () => {
  const db = TokenDb.load();

  it("native ID without subscription returns chainId as-is (Ethereum '1' → '1')", () => {
    expect(db.resolveApiChainId("1")).toBe("1");
  });

  it("native ID with subscription returns debridgeSubscriptionId (MegaETH '4326' → '100000031')", () => {
    expect(db.resolveApiChainId("4326")).toBe("100000031");
  });

  it("already-internal ID passthrough ('100000031' → '100000031')", () => {
    expect(db.resolveApiChainId("100000031")).toBe("100000031");
  });

  it("unknown ID returns undefined", () => {
    expect(db.resolveApiChainId("999999")).toBeUndefined();
  });
});
