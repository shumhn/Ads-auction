# Atrium.ads

**Turn anything you own into a live sponsor board.**

Atrium.ads is a peer-to-peer marketplace for auctioning measurable sponsorship rights: a sticker position on a creator's laptop or helmet, a stream overlay, a newsletter slot, a profile banner, or another physical/digital surface.

## Current status

This is a real Solana devnet + MagicBlock implementation, not a local-state auction demo.

- On-chain source: [`programs/ads_auction`](programs/ads_auction)
- Program: [`CkKb…PnvZ`](https://explorer.solana.com/address/CkKbXccct8gWcfUyZzv2UGbDLtGSoMcsM6ZrWQ5dPnvZ?cluster=devnet)
- Shared devnet USDC test mint: [`Gh9Z…tKJr`](https://explorer.solana.com/address/Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr?cluster=devnet)
- Faucet program: [`4sN8…RBK6A`](https://explorer.solana.com/address/4sN8PnN2ki2W4TFXAfzR645FWs8nimmsYeNtxM8RBK6A?cluster=devnet)
- All 22 featured physical-placement auction accounts are live and delegated on devnet.
- Bidders lock SPL tokens in a base-layer PDA vault before bidding.
- Live auction state and per-bidder escrow state execute through MagicBlock's hosted Ephemeral Rollup router.
- Creators batch-sign lot setup; each lot atomically creates its auction, delegates live state, and registers itself on the campaign.
- Bidders can create a one-hour, program-bound session key for wallet-popup-free repeated bids. SPL spending, close, refunds, and payouts remain wallet-only.
- Closing commits the result and winning escrow back to Solana without requiring a second winner signature.
- Winner finalization returns unused budget while the winning amount remains in the SPL vault; approved artwork plus winner-accepted fulfillment proof unlock creator payment and a public receipt.
- Losing bidders independently undelegate and claim full refunds.
- Late valid bids extend the deadline by 30 seconds.
- Creators can build multi-lot campaigns, assign a moderator, register auction lots, and publish the campaign on-chain.
- Campaigns can contain 1–22 creator-defined lots; the studio offers 4/5/9/12/14/22 presets plus a custom count and generates an adaptive public bidding board.
- Winning bidders upload content-addressed artwork and commit its SHA-256 hash; assigned moderators approve or reject it on-chain.
- Creators submit content-addressed fulfillment proof after winner lock; the winner accepts or disputes it on-chain.
- The creator studio exposes close, winner lock, proof-gated payment release, no-bid finalization, and losing-bid refund actions.
- The activity indexer backfills and polls program history from devnet plus regional ER endpoints discovered through the MagicBlock router, decoding only Anchor events with real transaction signatures.

The shared devnet mint is a dummy test asset with no monetary value; it is not Circle-issued or mainnet USDC. The campaign geometry and human-readable copy are UI metadata. Prices, bidder addresses, bid counts, deadlines, escrow balances, delegation status, settlement state, and receipts come from chain state.

There are no seeded bidders, logos, bids, activity events, or campaign totals. If nobody has bid, the product shows zero. Missing RPC or account data produces an explicit loading/error/unpublished state rather than a fallback dataset.

Uploaded artwork and proof bytes are stored locally by SHA-256 under ignored `.data/`; the immutable hash is the on-chain commitment. For production, replace this storage adapter with durable object storage or IPFS while retaining the same hash verification.

## Verified E2E proof

`npm run e2e:devnet` was run with two independent bidder wallets:

1. Created a base-layer auction and token vault.
2. Minted shared devnet USDC from the public on-chain faucet and locked 200 and 250 USDC from the two bidders.
3. Delegated the live auction and bid escrows.
4. Placed 100 and 125 USDC bids through MagicBlock's hosted router, including one bid authorized by a one-hour session key.
5. Closed and undelegated the auction result plus winning escrow in one ER transaction.
6. Locked the winner, returned 125 USDC of unused winner budget, and kept the 125 USDC winning amount in the vault.
7. Refunded the losing bidder 200 USDC.
8. Submitted and approved winning artwork.
9. Submitted fulfillment proof and recorded winner acceptance.
10. Released 125 USDC to the creator and verified the public settlement receipt.

Proof from the latest deadlock-safe full run:

- [Auction account](https://explorer.solana.com/address/7qacgHPNwbnU1nGw5d1ysGcGLd8UDXyTSgwaWpAXp9jV?cluster=devnet)
- [Settlement receipt](https://explorer.solana.com/address/EjQfXjyty1XhkS6efcFoshjXqK78ZYAJKn3X9SLysdDk?cluster=devnet)
- [Session-authorized ER bid](https://explorer.solana.com/tx/5dc1gvnjFpLDKjhDBQDWDyR7UXCDeJCFrvJcB9hwDJDYWwrqF22bSoybfCD2dV4p7NUe9ChCoLkkvT9D6ZnDSR76?cluster=devnet)
- [ER close + result/winner escrow commit](https://explorer.solana.com/tx/4BXV9cXbvwTJhztLfxhTJGPCzJp26cz3pTaHPGssFJdyrvnf7FpFCeBBRB53NEkRPpC5ouRY3eTJX8jiVg52hEMU?cluster=devnet)
- [Winner lock + excess return](https://explorer.solana.com/tx/4EwAQ58EMEKj7aMNPoohiGX2hnzsURfxFPrhb2RkR9eD4yu4taQkcM5XZUNejfWTBXVhg7Md3YJ3qeB6VPkJFQmq?cluster=devnet)
- [Losing-bidder refund](https://explorer.solana.com/tx/2721bg5QywBkM5oyLW4czQNRJc8Gd3g8iFsD8gkEKaXXibCrowA42Js6kLRTNim1vocja15EQiBENcZrneNCFcV3?cluster=devnet)
- [Proof-gated creator payout](https://explorer.solana.com/tx/3JT6vM37sRcyxULhnPD9rDaSGXMNA6QaXHvqXeeUinqwrgd7maUn36PJNLRHEgiqfbwubvsAH3fuQ1VkFXUu8gDT?cluster=devnet)

The latest integrated E2E run settled a fresh auction, stored two real PNGs content-addressably, committed their exact SHA-256 digests on-chain, and proved the complete campaign/trust layer against the upgraded program:

- [Settled auction](https://explorer.solana.com/address/6SVG7MBpFpiwH8pF7yEFtioHwzKzaS2todtaGhJ9w3QT?cluster=devnet)
- [Campaign account](https://explorer.solana.com/address/59yp4dmWCRNq2dV2zgPSNpvR5nJH23gN1weRrCLYN9G4?cluster=devnet)
- [Campaign lot](https://explorer.solana.com/address/EiQnY1PAmg3AGCbLvyhCsPaofYkVRnRAjPP176yWuAUU?cluster=devnet)
- [Artwork approval](https://explorer.solana.com/address/HLhS1LCjbZ4M2AsJMDbSAkqiGnsHwXZ72th9fLr3mCYA?cluster=devnet)
- [Fulfillment proof](https://explorer.solana.com/address/F6M286SziXPXa8mW9e5rrUv2R841QFCCMuunLnW4dtS5?cluster=devnet)
- [No-bid auction finalized](https://explorer.solana.com/address/71K1ePwK54XaeC1FJBAaFm2ES9YLALymmxpvi6H7mKem?cluster=devnet)

Use `/studio` for the template-only four-step auction builder, `/manage` for creator, moderator, fulfillment and settlement workflows, and `/activity` for transaction-backed history.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Connect a devnet wallet, request test USDC from the in-app shared faucet, lock a maximum budget, and submit the bid through MagicBlock.

## Verify

```bash
npm run build
npm run lint
npm run anchor-build
SOLANA_RPC_URL="<devnet-rpc>" npm run seed:devnet
SOLANA_RPC_URL="<devnet-rpc>" npm run verify:devnet
SOLANA_RPC_URL="<devnet-rpc>" npm run verify:campaign:devnet
SOLANA_RPC_URL="<devnet-rpc>" npm run e2e:devnet
SOLANA_RPC_URL="<devnet-rpc>" SETTLED_AUCTION="<fresh-auction-from-e2e:devnet>" npm run e2e:campaign:devnet
SOLANA_RPC_URL="<devnet-rpc>" npm run e2e:no-bid:devnet
```

Deployment and bidder keypairs live under ignored `anchor/.keys/`. RPC credentials live in ignored `.env.local`; neither is committed.

## Why MagicBlock

Atrium.ads follows the architecture proven in the local Atrium.ad project: permanent custody and settlement stay on Solana, frequently changing participant state is delegated for fast execution, and canonical results return to base before funds move. See [Architecture](docs/ARCHITECTURE.md) and [Roadmap](docs/ROADMAP.md).
