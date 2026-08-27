import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  STARTER_COLLECTIBLES,
  TOKEN_LIST,
  TOKENS,
  type Collectible,
  type TokenId,
} from "./tokens";
import {
  accountFromMnemonic,
  createMnemonic,
  fakeTxHash,
  isEvmAddress,
  isValidMnemonic,
  quoteSwap,
} from "./engine";

export type TxKind =
  | "send"
  | "receive"
  | "buy"
  | "sell"
  | "swap"
  | "tip"
  | "mint"
  | "app";

export interface Tx {
  id: string;
  hash: `0x${string}`;
  kind: TxKind;
  title: string;
  subtitle: string;
  tokenId?: TokenId;
  amount?: number;
  usd: number;
  counterparty?: string;
  ts: number;
  status: "pending" | "confirmed" | "failed";
}

export interface ConnectedApp {
  id: string;
  name: string;
  domain: string;
  lastUsed: number;
}

interface WalletState {
  hydrated: boolean;
  mnemonic: string | null;
  address: `0x${string}` | null;
  solanaAddress: string | null;
  createdAt: number | null;
  unlocked: boolean;
  balances: Record<TokenId, number>;
  collectibles: Collectible[];
  txs: Tx[];
  cashUsd: number;
  connectedApps: ConnectedApp[];
  hiddenTokens: TokenId[];
  bootstrap: () => void;
  createWallet: () => { mnemonic: string; address: `0x${string}` };
  importWallet: (mnemonic: string) => void;
  resetDemo: () => void;
  lock: () => void;
  unlock: () => void;
  send: (input: {
    tokenId: TokenId;
    to: string;
    amount: number;
    memo?: string;
    kind?: TxKind;
  }) => Tx;
  receiveDemo: (tokenId: TokenId, amount: number, from: string) => Tx;
  buy: (tokenId: TokenId, usd: number) => Tx;
  sell: (tokenId: TokenId, amount: number) => Tx;
  swap: (from: TokenId, to: TokenId, amount: number) => Tx;
  sendCollectible: (id: string, to: string) => Tx;
  connectApp: (app: Omit<ConnectedApp, "lastUsed">) => void;
  disconnectApp: (id: string) => void;
  toggleHidden: (id: TokenId) => void;
}

const STARTER_BALANCES: Record<TokenId, number> = {
  eth: 2.4812,
  weth: 0.91,
  usdc: 4250.18,
  degen: 128_400,
  higher: 8200,
  bnkr: 45_000,
  op: 186.4,
  sol: 4.22,
};

const EMPTY_BALANCES: Record<TokenId, number> = {
  eth: 0,
  weth: 0,
  usdc: 0,
  degen: 0,
  higher: 0,
  bnkr: 0,
  op: 0,
  sol: 0,
};

function seedTxs(address: string): Tx[] {
  const now = Date.now();
  return [
    {
      id: "t1",
      hash: fakeTxHash("seed-buy"),
      kind: "buy",
      title: "Bought ETH",
      subtitle: "Card · Visa ••4242",
      tokenId: "eth",
      amount: 0.4,
      usd: 0.4 * TOKENS.eth.priceUsd,
      ts: now - 1000 * 60 * 42,
      status: "confirmed",
    },
    {
      id: "t2",
      hash: fakeTxHash("seed-tip"),
      kind: "tip",
      title: "Tipped @dwr.eth",
      subtitle: "From cast",
      tokenId: "degen",
      amount: -400,
      usd: -(400 * TOKENS.degen.priceUsd),
      counterparty: "dwr.eth",
      ts: now - 1000 * 60 * 180,
      status: "confirmed",
    },
    {
      id: "t3",
      hash: fakeTxHash("seed-swap"),
      kind: "swap",
      title: "Swapped USDC → DEGEN",
      subtitle: "Wallet swap",
      tokenId: "degen",
      amount: 18000,
      usd: 18000 * TOKENS.degen.priceUsd,
      ts: now - 1000 * 60 * 60 * 26,
      status: "confirmed",
    },
    {
      id: "t4",
      hash: fakeTxHash("seed-recv"),
      kind: "receive",
      title: "Received USDC",
      subtitle: shorten(address),
      tokenId: "usdc",
      amount: 500,
      usd: 500,
      counterparty: "jesse.base.eth",
      ts: now - 1000 * 60 * 60 * 50,
      status: "confirmed",
    },
  ];
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function solFromMnemonic(mnemonic: string): string {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  let h = 7;
  for (let i = 0; i < mnemonic.length; i++) {
    h = Math.imul(h ^ mnemonic.charCodeAt(i), 16777619);
  }
  let x = h >>> 0;
  for (let i = 0; i < 44; i++) {
    x = (x * 1664525 + 1013904223) >>> 0;
    out += alphabet[x % alphabet.length];
  }
  return out;
}

function freshWallet(mnemonic = createMnemonic()) {
  const { address } = accountFromMnemonic(mnemonic);
  return {
    mnemonic,
    address,
    solanaAddress: solFromMnemonic(mnemonic),
    createdAt: Date.now(),
    unlocked: true,
    balances: { ...STARTER_BALANCES },
    collectibles: [...STARTER_COLLECTIBLES],
    txs: seedTxs(address),
    cashUsd: 2400,
    connectedApps: [
      {
        id: "clanker",
        name: "Clanker",
        domain: "clanker.world",
        lastUsed: Date.now() - 1000 * 60 * 80,
      },
    ],
    hiddenTokens: [] as TokenId[],
  };
}

export const useWallet = create<WalletState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      mnemonic: null,
      address: null,
      solanaAddress: null,
      createdAt: null,
      unlocked: true,
      balances: { ...STARTER_BALANCES },
      collectibles: [...STARTER_COLLECTIBLES],
      txs: [],
      cashUsd: 2400,
      connectedApps: [],
      hiddenTokens: [],
      bootstrap: () => {
        if (get().address) {
          set({ hydrated: true });
          return;
        }
        set({ ...freshWallet(), hydrated: true });
      },
      createWallet: () => {
        const next = freshWallet();
        set({ ...next, hydrated: true });
        return { mnemonic: next.mnemonic, address: next.address };
      },
      importWallet: (phrase) => {
        if (!isValidMnemonic(phrase)) {
          throw new Error(
            "That recovery phrase is not a valid 12 or 24 word mnemonic.",
          );
        }
        const next = freshWallet(phrase.trim().toLowerCase());
        set({
          ...next,
          balances: { ...EMPTY_BALANCES },
          collectibles: [],
          txs: [],
          cashUsd: 0,
          connectedApps: [],
          hydrated: true,
        });
      },
      resetDemo: () => set({ ...freshWallet(), hydrated: true }),
      lock: () => set({ unlocked: false }),
      unlock: () => set({ unlocked: true }),
      send: ({ tokenId, to, amount, memo, kind = "send" }) => {
        const dest = to.trim();
        if (amount <= 0) throw new Error("Enter an amount.");
        if (!isEvmAddress(dest) && !dest.includes(".")) {
          throw new Error("Enter a 0x address or Farcaster name.");
        }
        const bal = get().balances[tokenId];
        if (amount > bal) throw new Error("Not enough balance.");
        const token = TOKENS[tokenId];
        const tx: Tx = {
          id: crypto.randomUUID(),
          hash: fakeTxHash(`send:${tokenId}:${dest}:${amount}`),
          kind,
          title: kind === "tip" ? `Tipped ${dest}` : `Sent ${token.symbol}`,
          subtitle: memo || dest,
          tokenId,
          amount: -amount,
          usd: -(amount * token.priceUsd),
          counterparty: dest,
          ts: Date.now(),
          status: "pending",
        };
        set((s) => ({
          balances: { ...s.balances, [tokenId]: s.balances[tokenId] - amount },
          txs: [tx, ...s.txs],
        }));
        window.setTimeout(() => {
          set((s) => ({
            txs: s.txs.map((t) =>
              t.id === tx.id ? { ...t, status: "confirmed" } : t,
            ),
          }));
        }, 900);
        return tx;
      },
      receiveDemo: (tokenId, amount, from) => {
        const token = TOKENS[tokenId];
        const tx: Tx = {
          id: crypto.randomUUID(),
          hash: fakeTxHash(`recv:${tokenId}:${from}`),
          kind: "receive",
          title: `Received ${token.symbol}`,
          subtitle: from,
          tokenId,
          amount,
          usd: amount * token.priceUsd,
          counterparty: from,
          ts: Date.now(),
          status: "confirmed",
        };
        set((s) => ({
          balances: { ...s.balances, [tokenId]: s.balances[tokenId] + amount },
          txs: [tx, ...s.txs],
        }));
        return tx;
      },
      buy: (tokenId, usd) => {
        if (usd <= 0) throw new Error("Enter an amount.");
        const cash = get().cashUsd;
        if (usd > cash) throw new Error("Not enough buying power.");
        const token = TOKENS[tokenId];
        const amount = usd / token.priceUsd;
        const tx: Tx = {
          id: crypto.randomUUID(),
          hash: fakeTxHash(`buy:${tokenId}:${usd}`),
          kind: "buy",
          title: `Bought ${token.symbol}`,
          subtitle: "Debit card · ••4242",
          tokenId,
          amount,
          usd,
          ts: Date.now(),
          status: "pending",
        };
        set((s) => ({
          cashUsd: s.cashUsd - usd,
          balances: { ...s.balances, [tokenId]: s.balances[tokenId] + amount },
          txs: [tx, ...s.txs],
        }));
        window.setTimeout(() => {
          set((s) => ({
            txs: s.txs.map((t) =>
              t.id === tx.id ? { ...t, status: "confirmed" } : t,
            ),
          }));
        }, 1100);
        return tx;
      },
      sell: (tokenId, amount) => {
        if (amount <= 0) throw new Error("Enter an amount.");
        const bal = get().balances[tokenId];
        if (amount > bal) throw new Error("Not enough balance.");
        const token = TOKENS[tokenId];
        const usd = amount * token.priceUsd * 0.995;
        const tx: Tx = {
          id: crypto.randomUUID(),
          hash: fakeTxHash(`sell:${tokenId}:${amount}`),
          kind: "sell",
          title: `Sold ${token.symbol}`,
          subtitle: "To USDC",
          tokenId,
          amount: -amount,
          usd: -usd,
          ts: Date.now(),
          status: "pending",
        };
        set((s) => ({
          balances: {
            ...s.balances,
            [tokenId]: s.balances[tokenId] - amount,
            usdc: s.balances.usdc + usd,
          },
          txs: [tx, ...s.txs],
        }));
        window.setTimeout(() => {
          set((s) => ({
            txs: s.txs.map((t) =>
              t.id === tx.id ? { ...t, status: "confirmed" } : t,
            ),
          }));
        }, 900);
        return tx;
      },
      swap: (from, to, amount) => {
        if (from === to) throw new Error("Pick two different tokens.");
        if (amount <= 0) throw new Error("Enter an amount.");
        if (amount > get().balances[from]) throw new Error("Not enough balance.");
        const q = quoteSwap(from, to, amount);
        const tx: Tx = {
          id: crypto.randomUUID(),
          hash: fakeTxHash(`swap:${from}:${to}:${amount}`),
          kind: "swap",
          title: `Swapped ${TOKENS[from].symbol} → ${TOKENS[to].symbol}`,
          subtitle: `Rate ${q.rate.toPrecision(4)}`,
          tokenId: to,
          amount: q.out,
          usd: q.usd,
          ts: Date.now(),
          status: "pending",
        };
        set((s) => ({
          balances: {
            ...s.balances,
            [from]: s.balances[from] - amount,
            [to]: s.balances[to] + q.out,
          },
          txs: [tx, ...s.txs],
        }));
        window.setTimeout(() => {
          set((s) => ({
            txs: s.txs.map((t) =>
              t.id === tx.id ? { ...t, status: "confirmed" } : t,
            ),
          }));
        }, 1000);
        return tx;
      },
      sendCollectible: (id, to) => {
        const nft = get().collectibles.find((c) => c.id === id);
        if (!nft) throw new Error("Collectible not found.");
        const tx: Tx = {
          id: crypto.randomUUID(),
          hash: fakeTxHash(`nft:${id}:${to}`),
          kind: "send",
          title: `Sent ${nft.name}`,
          subtitle: to,
          usd: 0,
          counterparty: to,
          ts: Date.now(),
          status: "confirmed",
        };
        set((s) => ({
          collectibles: s.collectibles.filter((c) => c.id !== id),
          txs: [tx, ...s.txs],
        }));
        return tx;
      },
      connectApp: (app) =>
        set((s) => ({
          connectedApps: [
            { ...app, lastUsed: Date.now() },
            ...s.connectedApps.filter((a) => a.id !== app.id),
          ],
        })),
      disconnectApp: (id) =>
        set((s) => ({
          connectedApps: s.connectedApps.filter((a) => a.id !== id),
        })),
      toggleHidden: (id) =>
        set((s) => ({
          hiddenTokens: s.hiddenTokens.includes(id)
            ? s.hiddenTokens.filter((t) => t !== id)
            : [...s.hiddenTokens, id],
        })),
    }),
    {
      name: "fc-wallet-v1",
      skipHydration: true,
      partialize: (s) => ({
        mnemonic: s.mnemonic,
        address: s.address,
        solanaAddress: s.solanaAddress,
        createdAt: s.createdAt,
        unlocked: s.unlocked,
        balances: s.balances,
        collectibles: s.collectibles,
        txs: s.txs,
        cashUsd: s.cashUsd,
        connectedApps: s.connectedApps,
        hiddenTokens: s.hiddenTokens,
      }),
    },
  ),
);

export function portfolioUsd(balances: Record<TokenId, number>): number {
  return TOKEN_LIST.reduce(
    (sum, t) => sum + (balances[t.id] ?? 0) * t.priceUsd,
    0,
  );
}

export function portfolioChange(balances: Record<TokenId, number>): number {
  const total = portfolioUsd(balances);
  if (total <= 0) return 0;
  const yesterday = TOKEN_LIST.reduce((sum, t) => {
    const amt = balances[t.id] ?? 0;
    const prev = t.priceUsd / (1 + t.change24h / 100);
    return sum + amt * prev;
  }, 0);
  if (yesterday <= 0) return 0;
  return ((total - yesterday) / yesterday) * 100;
}
