# farcaster-wallet

MIT drop-in wallet for the [Farcaster client snapshot](https://github.com/farcasterxyz/client).

The published snapshot strips the proprietary Farcaster Wallet iframe
(`wallet.farcaster.xyz`). This package puts a **working local wallet** back in
the web client so forks can view balances, send, receive, buy, sell, swap, tip,
and sign mini-app requests.

It is a **demo / development ledger**:

- Keys are a BIP-39 mnemonic derived with [viem](https://viem.sh), stored in
  `localStorage` (`fc-wallet-v1`).
- `personal_sign` / `eth_signTypedData_v4` are real signatures from that
  mnemonic.
- Send / buy / sell / swap debit an in-browser balance book (Base-first: ETH,
  USDC, DEGEN, HIGHER, BNKR, plus OP and SOL). They do **not** broadcast to
  mainnet.

**Do not put real funds on this wallet.** Point a production fork at your own
RPC, bundler, and key storage before going live.

## What it covers

| Need | How |
| --- | --- |
| View | Portfolio, token list, 24h change, activity |
| Send | 0x address or Farcaster / ENS name |
| Receive | EVM + Solana address, copy, simulated inbound |
| Buy | Debit-card demo with buying power |
| Sell | Token → USDC |
| Swap | 0.3% fee quote between listed tokens |
| Collectibles | View + send demo NFTs |
| Mini apps | EIP-1193 provider (`createLocalEip1193Provider`) |
| Backup | Reveal / import mnemonic, revoke connected apps |

## Install in this monorepo

Already a workspace package. After pulling this branch:

```
pnpm install && pnpm watch
```

`apps/farcaster-web` depends on `farcaster-wallet`. The `/~/wallet` page
renders `<WalletApp />` instead of the “available on mobile” stub.

```tsx
import { WalletApp, useWallet, createLocalEip1193Provider } from 'farcaster-wallet';
```

## Wire the EIP-1193 provider

```ts
const provider = createLocalEip1193Provider();
await provider.request({ method: 'eth_requestAccounts' });
await provider.request({
  method: 'personal_sign',
  params: ['0x68656c6c6f', (await provider.request({ method: 'eth_accounts' }))[0]],
});
```

Chain id is Base (`0x2105`). `eth_sendTransaction` writes through the local
ledger and returns a keccak hash.

## License

MIT. Same as the snapshot. Copyright for this package: 2026 bankrdex.
