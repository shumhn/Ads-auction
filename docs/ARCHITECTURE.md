# ClaimSpot architecture

## Product boundary

ClaimSpot auctions time-bound sponsorship rights, not speculative tokens. The winner gets a defined placement, duration, creator deliverables, campaign proof, and an on-chain payment receipt.

## Solana and MagicBlock execution model

Atrium.ad uses a split execution model built around:

- base-layer custody before fast execution;
- small, delegated per-participant accounts;
- a delegated shared matching/auction account;
- hosted MagicBlock execution rather than a required local validator;
- commit and undelegate before canonical token settlement;
- winning escrow recovery in the close transaction plus independent loser recovery;
- a public settlement receipt on Solana.

## State layout

### Solana base layer

- `Campaign`: creator, moderator, mint, title/details hashes, publish state, lot count and accepted-proof count;
- `CampaignLot`: links a campaign to an auction and commits the placement/deliverable hash;
- `CreativeSubmission`: bidder artwork hash, moderator decision, reviewer and reason hash;
- `FulfillmentProof`: creator evidence hash and winner acceptance/dispute decision;
- `Auction`: creator, mint, vault, title hash, aggregate deposits/refunds, winner and settled result;
- SPL-token `Vault`: tokens for all bidders, authority set to the auction PDA;
- `SettlementReceipt`: winner, creator, mint, paid amount, title hash, and timestamp;
- canonical settled `LiveAuction` and `BidEscrow` accounts after undelegation.

### MagicBlock Ephemeral Rollup

- `LiveAuction`: reserve, increment, deadline, top bidder, top amount and bid count;
- one `BidEscrow` account per bidder: deposited maximum and latest bid amount.

Tokens never need to move inside the ER. A bid is accepted only if its delegated escrow account records enough base-layer-backed budget.

## Lifecycle

1. Creator calls `create_auction` on devnet; this creates `Auction`, `LiveAuction`, and the token vault.
2. Creator calls `delegate_live_auction`.
3. Bidder calls `open_bid_escrow`; SPL tokens move into the vault on Solana.
4. Bidder calls `delegate_bid_escrow`.
5. `place_bid` runs through `ConnectionMagicRouter`; it validates reserve, increment, deadline, and deposited budget.
6. A bid in the final 30 seconds extends the deadline by 30 seconds.
7. After expiry, permissionless `close_and_undelegate` commits the shared auction and winning `BidEscrow` back to Solana together.
8. `finalize_auction` locks the winner, returns the winner's unused maximum, and keeps the winning amount in the vault.
9. Losing bidders independently return their delegated escrow and call `claim_refund` for the full deposit.
10. The winner submits artwork, the campaign moderator approves it, the creator submits fulfillment proof, and the winner accepts or disputes it.
11. `release_payment` requires approved winner artwork and accepted proof, pays the creator, and creates `SettlementReceipt` atomically.

Campaign setup surrounds that auction lifecycle: the creator creates a draft campaign, creates/delegates each auction, registers each `CampaignLot`, then publishes. Human-readable terms and the exact MacBook image hash are committed by the campaign details hash.

## Data and media

- Human-readable campaign copy is saved only after the API verifies every referenced campaign/auction account is owned by the deployed ClaimSpot program and verifies the submitted text hashes.
- Artwork and evidence images are written content-addressably; the filename and on-chain value are the same SHA-256 digest.
- The activity indexer polls/backfills `getSignaturesForAddress`, discovers active regional ER endpoints from each delegated account's router status, loads base/ER transactions, decodes Anchor logs, and upserts by source/signature/event index. Its local JSON is a rebuildable read model, never auction truth.

## Security invariants

- no unfunded bids;
- vault authority is the auction PDA, not a server wallet;
- mint and token-account owners are constrained;
- reserve and minimum increment are enforced in-program;
- deadline and anti-sniping are enforced in-program;
- settlement requires the committed winner and amount;
- winning funds remain escrowed until approved artwork and accepted fulfillment proof exist;
- a receipt PDA prevents creator payment from being released twice;
- a balance can be claimed only once;
- losing bidders cannot be censored from refunding after settlement;
- ER confirmation is not presented as base-layer settlement.

## Remaining production work

Devnet tokens are test assets. Before mainnet: commission an external audit; move content-addressed bytes and the index read model to durable storage; add creator/social ownership verification and prohibited-content operations; implement a governed dispute-resolution outcome (the current dispute safely holds funds but has no remedy); and add retry/queue workers, a keeper, and RPC failover.
