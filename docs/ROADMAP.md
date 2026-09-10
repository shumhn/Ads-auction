# ClaimSpot roadmap

## Product goal

Make creator-owned physical and digital sponsorship inventory liquid: visually map a placement, define what the buyer receives, discover a price through a live auction, and settle globally.

## Milestone 1 — real devnet auction (complete)

- deployed Anchor program and IDL;
- hosted MagicBlock ER delegation through the router;
- devnet SPL-token vault and funded bids;
- two-wallet outbid flow;
- anti-sniping deadline extension;
- commit/undelegate settlement;
- winner lock, excess return, loser refund, and proof-gated creator payout;
- public settlement receipt;
- 22 live featured auction accounts with independent reserves and deadlines;
- frontend reads chain/ER state instead of mock bids;
- wallet-signed integration with the shared on-chain devnet USDC faucet;
- repeatable seeding and E2E scripts.

## Milestone 2 — usable creator marketplace (devnet complete)

- hash campaign terms and store content-addressed images;
- multi-lot creator publishing wizard;
- variable 1–22 lot presets, custom sizing, adaptive layout preview and shareable public campaign board;
- creator campaign builder with human-readable copy bound to on-chain hashes;
- settlement UI for close, delegate/undelegate, winner payout, no-bid completion and refunds;
- polling/backfill event indexer for base-layer and ER activity;
- on-chain artwork submission and moderator decision;

## Milestone 2.5 — production operations

- durable media/read-model storage and queued index workers;
- creator/social-channel ownership verification;
- listing moderation and prohibited-content policy;
- session keys for rapid repeat bidding where UX testing justifies them.

## Milestone 3 — fulfillment and trust (core devnet proof complete)

- enforce creative submission and approval deadlines;
- placement/shipping workflow;
- timestamped photo proof with an on-chain hash;
- winner proof acceptance/dispute state;
- governed dispute resolution and remedies;
- payout-after-proof enforcement; **complete on devnet**
- creator and brand reputation;
- invoices and downloadable campaign receipts.

## Business model

- 7.5% successful-auction fee, tested against a 5–10% range;
- sticker production and shipping margin;
- paid campaign verification/reporting;
- brand team workflow subscription after repeat demand exists.

Avoid a token at launch. The defensibility is liquidity, trust, fulfillment data, and repeat buyers.

## Launch wedge

Start with one recognizable creator and one object naturally visible on camera—a laptop, helmet, suitcase, jacket, or studio wall. Auction 8–12 concrete placements for 30 days and dedicate one premium spot to Nepal relief. The campaign becomes the product demo, distribution event, and first trust case study.
