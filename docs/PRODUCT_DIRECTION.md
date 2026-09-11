# ClaimSpot product direction

## Decision

Build **Sponsorship Drops**, not a broad advertising marketplace.

> A creator, community, or event turns one visible surface into a limited live sponsor board. Brands upload a logo, preview the placement, bid with backed USDC, and receive the promised placement plus public proof.

The first release should run one operator-led event end to end. Marketplace discovery and self-serve creator onboarding come only after that event works.

## Why this wedge

- Etch My Mac proves that a concrete object, permanent placement, visual preview, all-or-nothing funding goal, and filmed fulfilment create a compelling story.
- The Solana Nepal relief auction proves that brands will bid meaningful USDC for scarce zones attached to a credible distribution surface and cause.
- ClaimSpot already has real devnet custody, MagicBlock bidding, settlement, refunds, and receipts.
- A generic marketplace starts with empty supply and empty demand. One Drop concentrates both sides around a single deadline and story.

## First product

### Campaign format

- one campaign owner;
- one uploaded physical or digital surface;
- 6–22 visually mapped spots;
- campaign-wide funding goal;
- auction start and end;
- placement duration: permanent or time-bound;
- declared payout recipient and optional charity designation;
- reserve and optional buy-now price per spot;
- mandatory deliverables and fulfilment deadline;
- public terms and content policy.

### Creator/operator flow

1. Connect and verify a wallet plus X or website identity.
2. Upload the surface image.
3. Draw and name spots; enter physical dimensions where relevant.
4. Set reserves, buy-now prices, campaign goal, auction time, placement duration, beneficiary, and deliverables.
5. Publish terms and preview the final board.
6. Moderate bids and winning artwork.
7. Close the Drop, generate the final composite, publish placement proof, and release settlement.

### Bidder flow

1. Open one shared campaign budget in USDC.
2. Upload logo, brand name, URL, X handle, email, and rights attestation.
3. Preview exactly how the artwork will appear in the selected spot.
4. Approve a campaign-scoped session key for one-click bids until auction end.
5. Bid live. If outbid, the reserved amount becomes immediately available for another spot.
6. Withdraw unused funds after close; winners receive placement, backlink, media assets, and an on-chain receipt.

### Public event flow

- live board and final-look preview;
- per-spot countdown and two-minute repeatable soft close;
- campaign funding progress;
- real activity feed and leaderboard;
- visible provisional/approved artwork state;
- final winners and composited surface;
- payout, refund, beneficiary, and fulfilment proof links.

## Money and trust model

- Bids are fully backed by USDC deposited on Solana.
- A bidder deposits once per campaign instead of once per spot.
- ER state tracks `available` and `reserved` budget. Outbidding releases the previous leader's reservation immediately inside the campaign.
- If the campaign goal is missed, every budget becomes withdrawable and no placement is owed.
- If the goal is met, winning amounts remain reserved until the campaign enters `fulfilled` or a stated release policy triggers.
- V0 settlement should support:
  - `proof_then_release` for creator campaigns;
  - `verified_direct` for approved charity campaigns.
- Charge an 8% success fee for commercial Drops and 0% for selected charity Drops.

## MagicBlock architecture

Use a public Ephemeral Rollup for the bursty bid loop and scoped Session Keys for low-friction repeat bidding. Keep campaign terms, USDC custody, final allocation, fulfilment status, and settlement receipts canonical on Solana. Commit and undelegate each spot at terminal close, then settle on base layer.

### State boundary

| State                                                 | Layer                                     | Reason                                |
| ----------------------------------------------------- | ----------------------------------------- | ------------------------------------- |
| Campaign config, terms hash, owner, beneficiary, goal | Solana                                    | Durable source of truth               |
| USDC campaign vault                                   | Solana                                    | Canonical custody                     |
| Spot configuration                                    | Solana                                    | Durable inventory                     |
| Live top bid, leader, timer, bid count                | MagicBlock ER                             | Repeated low-latency writes           |
| Bidder available/reserved budget                      | MagicBlock ER backed by base deposit      | Instant cross-spot budget reuse       |
| Artwork and media                                     | Content-addressed storage; hash on Solana | Large external content with integrity |
| Final allocation, fulfilment and settlement receipts  | Solana                                    | Public recovery and proof             |

### Selected MagicBlock products

- **Ephemeral Rollup:** yes, for live bids and soft-close updates.
- **Session Keys:** yes, scoped to `place_bid`, campaign, deposit ceiling, and auction expiry.
- **PER/private bidding:** no for V0; the product is a public English auction.
- **VRF:** no; no randomness is required.
- **Magic Actions:** no for V0; explicit base settlement is easier to observe and recover.
- **Tokenization:** no.

All mutable campaign, spot, and bidder-budget accounts used together must be delegated to a compatible ER endpoint discovered through the router. The UI must verify delegation status before bidding.

## Program changes from the current build

1. Replace isolated auctions with `Campaign` → many `SpotAuction` accounts.
2. Add campaign goal, beneficiary, settlement mode, terms URI/hash, placement duration, and fulfilment deadline.
3. Replace per-spot maximum escrow with one `CampaignBidderBalance` containing deposited, reserved, withdrawn, and claimable amounts.
4. On every outbid, release the previous leader's reserved amount and reserve only the new leader's exposure.
5. Use a two-minute per-spot soft close.
6. Add campaign cancel, goal-missed, no-bid close, timeout, refund, fulfilment, dispute, and recovery states.
7. Add platform fee and recipient split enforced at settlement.
8. Add permissionless terminal close/finalize paths plus bounded operator recovery.

## V0 screens

1. Drop page: story, funding bar, surface board, live spots, activity, countdown.
2. Bid drawer: logo upload, exact preview, brand details, USDC budget, bid confirmation.
3. Creator studio: a template-only four-step flow for spot mapping, campaign terms, pricing, and launch review. Custom surface uploads remain out of the current release.
4. Operator console: moderation, auction health, close/retry, composite generation, fulfilment, settlement.
5. Results page: final board, winners, amounts, receipts, refunds, payout and delivery proof.

## Event launch acceptance criteria

- ten or more independent devnet wallets complete onboarding;
- at least two bidders compete on one spot during its final two minutes;
- the previous leader's budget becomes reusable immediately;
- each spot closes independently and cannot accept a late bid;
- a goal-missed campaign refunds everyone;
- a successful campaign generates a final composite and public result;
- settlement routes the exact recipient and fee amounts;
- stalled delegation, commit, or settlement has a visible retry/recovery path;
- no mock bid, activity, payout, or fulfilment state is shown as real.

## Expansion after the first Drop

1. Reusable creator profiles and campaign templates.
2. Marketplace discovery and brand watchlists.
3. Card/on-ramp support for non-crypto buyers.
4. X, YouTube, newsletter, stream-overlay, event-screen, apparel, vehicle, and venue templates.
5. Private invite-only auctions and brand-team workflow only after public auction demand is proven.
