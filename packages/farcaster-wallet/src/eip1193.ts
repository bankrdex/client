import { hexToString, isHex } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { useWallet } from "./store";

type RequestArgs = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

function paramsOf(args: RequestArgs): unknown[] {
  if (!args.params) return [];
  return Array.isArray(args.params) ? args.params : Object.values(args.params);
}

function ensureReady() {
  const s = useWallet.getState();
  if (!s.address || !s.mnemonic) {
    s.bootstrap();
  }
  return useWallet.getState();
}

/**
 * Local EIP-1193 provider backed by the demo mnemonic in localStorage.
 * Signs with viem. Sends debit the in-browser ledger (not a live RPC).
 */
export function createLocalEip1193Provider() {
  const listeners = new Map<string, Set<(...a: unknown[]) => void>>();

  function on(event: string, fn: (...a: unknown[]) => void) {
    const set = listeners.get(event) ?? new Set();
    set.add(fn);
    listeners.set(event, set);
    return () => off(event, fn);
  }

  function off(event: string, fn: (...a: unknown[]) => void) {
    listeners.get(event)?.delete(fn);
  }

  function emit(event: string, ...a: unknown[]) {
    listeners.get(event)?.forEach((fn) => fn(...a));
  }

  async function request(args: RequestArgs): Promise<unknown> {
    const p = paramsOf(args);
    const s = ensureReady();
    if (!s.address || !s.mnemonic) {
      throw new Error("Wallet is not ready.");
    }

    switch (args.method) {
      case "eth_chainId":
        return "0x2105"; // Base
      case "net_version":
        return "8453";
      case "eth_accounts":
      case "eth_requestAccounts":
        emit("accountsChanged", [s.address]);
        return [s.address];
      case "eth_getBalance":
        return `0x${Math.floor(s.balances.eth * 1e18).toString(16)}`;
      case "personal_sign": {
        const [data] = p as [string];
        const message =
          typeof data === "string" && isHex(data) ? hexToString(data) : String(data);
        const account = mnemonicToAccount(s.mnemonic);
        return account.signMessage({ message });
      }
      case "eth_signTypedData_v4": {
        const [, payload] = p as [string, string];
        const typed =
          typeof payload === "string" ? (JSON.parse(payload) as never) : payload;
        const account = mnemonicToAccount(s.mnemonic);
        return account.signTypedData(typed);
      }
      case "eth_sendTransaction": {
        const tx = (p[0] ?? {}) as { to?: string; value?: string; data?: string };
        const to = tx.to ?? "0x0000000000000000000000000000000000000000";
        const valueWei = tx.value ? Number.parseInt(tx.value, 16) : 0;
        const eth = valueWei / 1e18;
        if (eth > 0) {
          const sent = useWallet.getState().send({
            tokenId: "eth",
            to,
            amount: eth,
            memo: tx.data ? "Contract call" : undefined,
          });
          return sent.hash;
        }
        const sent = useWallet.getState().send({
          tokenId: "eth",
          to,
          amount: 0.0001,
          memo: "App transaction",
          kind: "app",
        });
        return sent.hash;
      }
      case "wallet_switchEthereumChain":
        return null;
      case "wallet_getCapabilities":
        return { [s.address]: { atomic: { status: "unsupported" } } };
      default:
        throw new Error(`Unsupported method: ${args.method}`);
    }
  }

  return {
    isFarcasterWallet: true,
    chainId: "0x2105",
    request,
    on,
    removeListener: off,
    emit,
  };
}

export type LocalEip1193Provider = ReturnType<typeof createLocalEip1193Provider>;
