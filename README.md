# Farcaster Client Snapshot — with a working wallet

Fork of the [Farcaster client snapshot](https://github.com/farcasterxyz/client) (mobile + web) **plus a drop-in MIT wallet**.

The upstream snapshot ships without the proprietary Farcaster Wallet. This fork adds `packages/farcaster-wallet` and wires it into the web `/wallet` page so others can fork and keep send / receive / buy / sell / swap / tip.

**License: MIT** (see [LICENSE](./LICENSE)). The wallet package is also MIT.

## Wallet

Web wallet lives at `/~/wallet` (same route as the old stub). It supports:

- **View** balances (ETH, USDC, DEGEN, HIGHER, BNKR on Base, plus OP and SOL)
- **Send** to a 0x address or Farcaster / ENS name
- **Receive** (EVM + Solana addresses)
- **Buy** (debit-card demo)
- **Sell** (token → USDC)
- **Swap** (0.3% quote)
- **Collectibles** and activity
- **Backup** (BIP-39 phrase, import, reset)
- **EIP-1193** provider for mini-app `personal_sign` / `eth_sendTransaction`

This is a **local demo ledger**. Keys stay in the browser (`localStorage`). Signatures are real (viem). Transfers do not hit mainnet. Do not deposit real funds.

Details: [`packages/farcaster-wallet/README.md`](./packages/farcaster-wallet/README.md).

## Getting Started

In the project root, install dependencies and start watching shared packages:

```
pnpm install && pnpm watch
```

Then in a new terminal, run your preferred client:

### Mobile

```
cd apps/farcaster-mobile
pnpm install
pnpm ios
```

### Web

```
cd apps/farcaster-web
pnpm install
pnpm start
```

Open the Wallet tab. You should see a seeded demo portfolio instead of “Farcaster Wallet is available on Farcaster mobile.”

## Contributing

Upstream (`farcasterxyz/client`) is a one-way snapshot — PRs there are overwritten. **This fork is meant to be forked.** Open PRs here, or copy `packages/farcaster-wallet` into your own client.

## License

See [LICENSE](./LICENSE).
