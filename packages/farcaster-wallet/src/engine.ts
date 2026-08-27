import { generateMnemonic, mnemonicToAccount, english } from "viem/accounts";
import { keccak256, stringToHex } from "viem";
import type { TokenId } from "./tokens";
import { NETWORK_FEE_USD, SWAP_FEE, TOKENS } from "./tokens";

export function createMnemonic(): string {
  return generateMnemonic(english);
}

export function accountFromMnemonic(mnemonic: string) {
  const account = mnemonicToAccount(mnemonic);
  return {
    address: account.address,
    mnemonic,
  };
}

export function isValidMnemonic(phrase: string): boolean {
  const words = phrase.trim().toLowerCase().split(/\s+/);
  if (words.length !== 12 && words.length !== 24) return false;
  return words.every((w) => (english as readonly string[]).includes(w));
}

export function isEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function fakeTxHash(parts: string): `0x${string}` {
  return keccak256(stringToHex(`${parts}:${Date.now()}:${Math.random()}`));
}

export function quoteSwap(from: TokenId, to: TokenId, amount: number) {
  const src = TOKENS[from];
  const dst = TOKENS[to];
  const usd = amount * src.priceUsd;
  const fee = usd * SWAP_FEE;
  const out = (usd - fee) / dst.priceUsd;
  return {
    usd,
    feeUsd: fee,
    networkUsd: NETWORK_FEE_USD,
    out,
    rate: src.priceUsd / dst.priceUsd,
  };
}
