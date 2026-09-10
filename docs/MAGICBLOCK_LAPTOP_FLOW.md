# ClaimSpot laptop auction: MagicBlock boundary

## Decision

Use a public MagicBlock Ephemeral Rollup for the repeated, public bid loop. Keep campaign ownership,
the SPL-token vault, artwork/proof hashes, and payout/refund settlement on Solana devnet. Do not use a
Private Ephemeral Rollup for the public English auction because every participant is supposed to see
the current highest bid and bid count.

## End-to-end route

| User action                                   | State                                                        | Destination                          |
| --------------------------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| Creator creates laptop campaign               | Campaign                                                     | Solana devnet                        |
| Creator creates each lot                      | Auction + LiveAuction + SPL vault + delegation + CampaignLot | One composed Solana transaction      |
| Bidder locks devnet USDC                      | SPL tokens in lot vault, BidEscrow                           | Solana devnet                        |
| Bidder delegates BidEscrow                    | BidEscrow clone                                              | Solana devnet delegation transaction |
| Bidder enables one-click bidding (optional)   | One-hour, target-program-bound session token                 | Solana devnet                        |
| Bidder places a bid                           | LiveAuction + BidEscrow                                      | Router-selected ER `fqdn`            |
| Browser receives a top-bid change             | LiveAuction account subscription                             | WebSocket derived from the ER `fqdn` |
| Anyone closes the ended auction               | LiveAuction + winning BidEscrow commit/undelegation          | Router-selected ER `fqdn`            |
| Losing bidder returns delegated BidEscrow     | BidEscrow commit and undelegation                            | Router-selected ER `fqdn`            |
| Creator locks winner; losers claim refunds    | Winner/excess/refund state and SPL vault                     | Solana devnet                        |
| Winner submits artwork; creator submits proof | Content hash and review accounts                             | Solana devnet                        |
| Accepted proof releases creator payment       | SPL transfer and SettlementReceipt                           | Solana devnet                        |

## Where the ER subscription lives

1. `src/lib/claimspot-program.ts` calls router `getDelegationStatus` for every active LiveAuction.
2. Accounts are grouped by the exact returned `fqdn`; no regional ER URL is hard-coded.
3. A web3 `Connection` is created for that endpoint and `onAccountChange` subscribes to each
   LiveAuction. Web3 derives the matching `wss://` endpoint when the router returns `https://`.
4. `src/lib/use-live-auction-stream.ts` overlays pushed fields on the slower canonical query.
5. Public boards expose `connected`, `connecting`, or `fallback` status. The 30-second query is only
   reconciliation for sleep, network loss, ER migration, and terminal base-layer settlement.

Only the hot LiveAuction fields are pushed: reserve, increment, end time, highest bid, highest bidder,
bid count, and closed state. SPL custody never moves to the browser or the subscription.

## Signature design

- Campaign creation and publishing remain creator-wallet actions.
- Each lot composes `createAuction`, `delegateLiveAuction`, and `registerCampaignLot` atomically, so
  Explorer shows the delegation in the same successful transaction and a failed registration cannot
  leave a half-created lot.
- Lot transactions are prepared in groups of four and passed to wallet `signAllTransactions`. A
  four-lot campaign therefore normally has three approval phases: campaign, lot batch, and publish.
  Wallets without batch-sign support fall back to individual signatures.
- A bidder may authorize a memory-only session signer for one hour. The on-chain session token binds
  the signer to the bidder wallet and ClaimSpot program. Only `placeBid` accepts it. Budget deposits,
  refunds, auction close, proof review, and payout remain wallet-signed.
- The session token cannot spend SPL tokens: the USDC maximum was already locked in the bidder's
  program-owned vault before the repeated bid loop starts.

## Why Atrium.ad uses a public ER

Atrium.ad uses a public Ephemeral Rollup because live auction bids are intentionally transparent. This keeps the auction board observable while delegated state supports low-latency execution. Session keys, explicit WebSocket cleanup, and base-layer recovery keep repeated bidding responsive and settlement durable.

## Remaining laptop-product boundaries

- Devnet media is content-addressed but stored under the local `.data` adapter.
- Each lot has a separate bidder budget; outbid capital is not yet immediately reusable across lots.
- Auction close and payment release remain explicit permissionless user/operator actions; no hosted keeper is running.
- A disputed proof safely leaves the winning amount in the vault, but governed refund/arbitration remedies are not implemented yet.
- Reloading the browser intentionally forgets the temporary session signer; its unusable on-chain
  authorization expires after one hour unless the bidder revokes it first.
