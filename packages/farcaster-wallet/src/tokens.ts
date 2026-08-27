export type ChainId = "base" | "optimism" | "ethereum" | "solana";

export type TokenId =
  | "eth"
  | "weth"
  | "usdc"
  | "degen"
  | "higher"
  | "bnkr"
  | "op"
  | "sol";

export interface TokenDef {
  id: TokenId;
  symbol: string;
  name: string;
  chain: ChainId;
  chainLabel: string;
  decimals: number;
  priceUsd: number;
  change24h: number;
  spark: number[];
  colorVar: string;
}

function walk(seed: number, start: number, vol: number): number[] {
  const out: number[] = [];
  let v = start;
  let s = seed;
  for (let i = 0; i < 24; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const n = (s % 1000) / 1000 - 0.42;
    v = Math.max(0.2, v * (1 + n * vol));
    out.push(v);
  }
  return out;
}

export const TOKENS: Record<TokenId, TokenDef> = {
  eth: {
    id: "eth",
    symbol: "ETH",
    name: "Ether",
    chain: "base",
    chainLabel: "Base",
    decimals: 18,
    priceUsd: 3426.18,
    change24h: 2.14,
    spark: walk(11, 1, 0.03),
    colorVar: "#627EEA",
  },
  weth: {
    id: "weth",
    symbol: "WETH",
    name: "Wrapped Ether",
    chain: "base",
    chainLabel: "Base",
    decimals: 18,
    priceUsd: 3425.9,
    change24h: 2.11,
    spark: walk(17, 1, 0.03),
    colorVar: "#627EEA",
  },
  usdc: {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    chain: "base",
    chainLabel: "Base",
    decimals: 6,
    priceUsd: 1,
    change24h: 0.01,
    spark: walk(3, 1, 0.002),
    colorVar: "#2775CA",
  },
  degen: {
    id: "degen",
    symbol: "DEGEN",
    name: "Degen",
    chain: "base",
    chainLabel: "Base",
    decimals: 18,
    priceUsd: 0.0124,
    change24h: 8.62,
    spark: walk(29, 0.7, 0.08),
    colorVar: "#A36EFD",
  },
  higher: {
    id: "higher",
    symbol: "HIGHER",
    name: "Higher",
    chain: "base",
    chainLabel: "Base",
    decimals: 18,
    priceUsd: 0.0186,
    change24h: -3.41,
    spark: walk(41, 1.1, 0.07),
    colorVar: "#F5C14A",
  },
  bnkr: {
    id: "bnkr",
    symbol: "BNKR",
    name: "Bankr",
    chain: "base",
    chainLabel: "Base",
    decimals: 18,
    priceUsd: 0.00418,
    change24h: 12.4,
    spark: walk(53, 0.6, 0.1),
    colorVar: "#3DDC97",
  },
  op: {
    id: "op",
    symbol: "OP",
    name: "Optimism",
    chain: "optimism",
    chainLabel: "OP Mainnet",
    decimals: 18,
    priceUsd: 1.62,
    change24h: -1.08,
    spark: walk(7, 1, 0.04),
    colorVar: "#FF0420",
  },
  sol: {
    id: "sol",
    symbol: "SOL",
    name: "Solana",
    chain: "solana",
    chainLabel: "Solana",
    decimals: 9,
    priceUsd: 148.22,
    change24h: 1.55,
    spark: walk(13, 1, 0.04),
    colorVar: "#14F195",
  },
};

export const TOKEN_LIST = Object.values(TOKENS);

export const SWAP_FEE = 0.003;
export const NETWORK_FEE_USD = 0.04;

export interface Collectible {
  id: string;
  name: string;
  collection: string;
  color: string;
  mark: string;
}

export const STARTER_COLLECTIBLES: Collectible[] = [
  {
    id: "og-1",
    name: "Farcaster OG #2847",
    collection: "Farcaster OG",
    color: "#8A63D2",
    mark: "FC",
  },
  {
    id: "moxie-12",
    name: "Fan Token · dwr.eth",
    collection: "Moxie",
    color: "#3DDC97",
    mark: "MX",
  },
  {
    id: "higher-77",
    name: "↑ Higher #77",
    collection: "Higher",
    color: "#F5C14A",
    mark: "↑",
  },
];
