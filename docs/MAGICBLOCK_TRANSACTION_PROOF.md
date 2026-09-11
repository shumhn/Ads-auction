# Atrium.ads MagicBlock transaction proof

Verified on 2026-09-11 against the deployed Atrium.ads program and the MagicBlock devnet endpoints.

## Deployment and endpoints

- Atrium.ads program: [`CkKbXccct8gWcfUyZzv2UGbDLtGSoMcsM6ZrWQ5dPnvZ`](https://explorer.solana.com/address/CkKbXccct8gWcfUyZzv2UGbDLtGSoMcsM6ZrWQ5dPnvZ?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet)
- Solana base RPC used by the app: `https://rpc.magicblock.app/devnet`
- Magic Router: `https://devnet-router.magicblock.app`
- Discovered ER for the verified live auction: `https://devnet-as.magicblock.app/`
- ER authority: `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57` (MagicBlock Asia devnet validator)

The router reported the verified live-auction account as delegated to the Atrium.ads program at Solana slot `496219625`.

## Latest app-driven auction: `testing`

This is the latest complete auction run created and operated through the Atrium.ads UI. It was independently re-read from the Solana devnet and MagicBlock Asia ER RPCs on 2026-09-11.

- Local application: [`testing` public auction](http://localhost:3000/campaign/C1HTTAjzMovwPYoPYyDJL6gp636PC1UMT1FoF9SiNdX9)
- Campaign account: [`C1HT…NdX9`](https://explorer.solana.com/address/C1HTTAjzMovwPYoPYyDJL6gp636PC1UMT1FoF9SiNdX9?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet)
- Winning lot: `Left strip · top`
- Auction account: [`EPS5…bhns`](https://explorer.solana.com/address/EPS5aXL6RVXLeXW9ZRvzaXL5pQPomfedLzaHy79bbhns?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet)
- Live-auction account: [`DApo…1Hz4`](https://explorer.solana.com/address/DApo2aZsDVHgDHsbxVaPWvDDpEHrFvSg2YXLAiHz1Hz4?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet)
- Winner: [`6ivU…kxsr`](https://explorer.solana.com/address/6ivUCwXmn7XxW7f18LxtjxsBbA5boAqX2PqxY4QNkxsr?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet)
- Final amount: `100` devnet demo USDC (`100,000,000` mint atoms)
- Settlement receipt: [`4JYb…BUXx`](https://explorer.solana.com/address/4JYbkYFujS2dCvidBmqF4jqUEAVFJm6Y8zrjSUCDBUXx?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet)

### End-to-end integration proof

| Stage | Layer | Verified instruction/event | Transaction |
| --- | --- | --- | --- |
| Create campaign | Solana devnet | `CreateCampaign` | [`35pS…TW3`](https://explorer.solana.com/tx/35pSYzxCTj6eHbWAybgw87yuTGssQmzjJJ1PBntbDU6Xab8jzwW6vGT46icj7tTxKohLUM4Rz55en3xBEUXRvTW3?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |
| Publish campaign | Solana devnet | `PublishCampaign` | [`3dd1…42rt`](https://explorer.solana.com/tx/3dd1rmtMDgPKaBXkkt5d87YsPAua2JQTSVQ4EsZ2YxiCVz2rLhd4X9DDcsxuB1fpfw4xK8ayr5zNgYnYMKGd42rt?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |
| Create lot, delegate live state and register lot | Solana devnet | `CreateAuction` + `DelegateLiveAuction` + `RegisterCampaignLot` | [`atyp…yzVa`](https://explorer.solana.com/tx/atypDSpyhsR92ryyXPiykbRR5GyLB8eBN1W7uabt1J1yYtvzr4nQL7vy2bmrm94hJ4QW2hVHaWCX2td8uj2yzVa?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |
| Lock winner's bid budget and delegate bidder state | Solana devnet | `OpenBidEscrow` + `DelegateBidEscrow` | [`2QxS…mHke`](https://explorer.solana.com/tx/2QxSvA4zDECjScoQv5xts8k8FUPQcegmDTn4wzZvRVvoBHTCG2tSdmhnyUwCpJmWjYjrmHSPoKa1kX4aQQiKmHke?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |
| Bid 1: 50 USDC | MagicBlock Asia ER | `PlaceBid`, bidder `81Ct…TWjX` | [`Uxe5…Umjh`](https://explorer.solana.com/tx/Uxe5tY97qAWtTEGXPpYRGY6BNw2fSyrHGdNoHFpM7vXyec723CycAsoy1kJQVixpFKfMGtzExQ66iX1u8riUmjh?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |
| Bid 2: 55 USDC | MagicBlock Asia ER | `PlaceBid`, bidder `HSSF…DcRy` | [`3AL6…bnU3`](https://explorer.solana.com/tx/3AL6H9LiaVfk8Y3VDHgjrQNv619CX2DR49P95siAGD2pN4W2kFZN2QCNB6aK7X6ccF5LttE3GAdUD6HSju6sbnU3?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |
| Bid 3: 60 USDC | MagicBlock Asia ER | `PlaceBid`, bidder `HSSF…DcRy` | [`nhtY…nJfc`](https://explorer.solana.com/tx/nhtYyCrQuN2nWWKnWTHoBVw2fYSGdzbK5stjdyo3w9CjjyqRVAYqVe44wLbAtav4zRrAiiQV9nKW4shXMZFnJfc?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |
| Bid 4: 65 USDC | MagicBlock Asia ER | `PlaceBid`, bidder `HSSF…DcRy` | [`3tks…9GmZ`](https://explorer.solana.com/tx/3tkshc8hBoGWJgVuWzGZAvg5DNZBWtJnYydfKBGFn571oqk4sDwKYmiaT4tA2by5erGdQ7XP85uuw2R14r8x9GmZ?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |
| Bid 5: 80 USDC | MagicBlock Asia ER | `PlaceBid`, bidder `HSSF…DcRy` | [`6AvZ…RJbq`](https://explorer.solana.com/tx/6AvZabJvU1CHr6ScRa1fNqkTaWDsPUZEHZp1AxzW8StYEBcE3nDH5oDWN78VGtXJbo8vdSEU449VacewrS3RJbq?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |
| Bid 6: 90 USDC | MagicBlock Asia ER | `PlaceBid`, bidder `HSSF…DcRy` | [`WY5o…TZ2R`](https://explorer.solana.com/tx/WY5oTrp7KTNuVa32pdQB4DBTFMc1xeh1Yh4A4MUndoowTRg8WQsWVtcK3C1d7EN93FM793URtydCceUgmZjTZ2R?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |
| Bid 7: 100 USDC | MagicBlock Asia ER | `PlaceBid`, winner `6ivU…kxsr` | [`2XUG…PtQf`](https://explorer.solana.com/tx/2XUGdZJoBJ44v5FWd6mbZjYceckuLGWJ6s336ScZCFGsVnqXGysMKZhK33Ndo79zagAin9Ay6p6MFSpWZQFiPtQf?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |
| Commit final ER state and undelegate | MagicBlock Asia ER | `CloseAndUndelegate` | [`64tc…2CFJ`](https://explorer.solana.com/tx/64tcDCzovf6fE5BCKVshjbkdYY3wskHbt2Cm6edqerUC1bJBgTZiPXeXV2yDkBmLnGDWwYMNUb3ZRxfPCWfi2CFJ?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |
| Lock winner | Solana devnet | `FinalizeAuction`, 100 USDC | [`66YE…ScHN3`](https://explorer.solana.com/tx/66YEq18gaHfqn75wzjmCvK3NPudBiEGzPRmftkpUr5Ey6HF9X5R4zzge7T3B8Tg57Y1W4yZPZAXKRF3zbS7ScHN3?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |
| Winner submits artwork | Solana devnet | `SubmitCreative` | [`5TFt…8RoAM`](https://explorer.solana.com/tx/5TFtJzqoosaJfw5cvu4i6JK1Tb8RqaQNxNwtETZ4ywgLDtBt2ou5kGQrWJxrm1ZSo9YPYJBg5CkGGqJeCXb8RoAM?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |
| Creator approves artwork | Solana devnet | `ReviewCreative` | [`E1UK…tKQ4W`](https://explorer.solana.com/tx/E1UKR7otgRfmvcQHn1ALWGufBhX9s2ymeEbfGEKbJJXhYjzUbyirktAHXc2jXVtuq7qF6QdNEbeerrtkVVtKQ4W?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |
| Creator submits placement proof | Solana devnet | `SubmitFulfillmentProof` | [`3hZ1…kVjBh`](https://explorer.solana.com/tx/3hZ1yMgoSVNtH6JGpEUKjx7orig45XbfZUMdmZj8ZXbtw6DsS6PA18jjJ1pWdns4wBEGPxAAmra7x7HsAQgkVjBh?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |
| Winner accepts delivery | Solana devnet | `ReviewFulfillmentProof` | [`3Dhr…dijx1`](https://explorer.solana.com/tx/3DhrJxXpGSrx3v1XuHCcdAsTygJsV92E2o5gjkWE4YucPqt7AcPNWHA6VCZNarNZXzFYfVRc8LZN1DfPhqZdijx1?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |
| Release escrowed payment to creator | Solana devnet | `ReleasePayment`, settlement receipt created | [`2P3r…fGmi`](https://explorer.solana.com/tx/2P3rPGx84i7v6x8qzvdgYV6mTYmnt29oucxWs5js6KQCwkSQeRXsSXddP2ETiPxU85udoWHn1uruF5rFA7dfzGmi?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |

All transactions above returned `meta.err = null`. After the ER close, the router reports `isDelegated: false`; the live-auction account, finalized auction account and settlement receipt all exist on canonical Solana devnet and are owned by the deployed Atrium.ads program.

## One current auction traced across both layers

Auction: [`BJHMbwmdBduHbvhK2kpdyVeFLew4Vck8H1jv5srHr9DJ`](https://explorer.solana.com/address/BJHMbwmdBduHbvhK2kpdyVeFLew4Vck8H1jv5srHr9DJ?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet)

| Stage | Layer | Verified instruction/event | Transaction |
| --- | --- | --- | --- |
| Create lot and delegate live state | Solana devnet | `CreateAuction` + `DelegateLiveAuction` + `RegisterCampaignLot` | [`NtSA…YVN`](https://explorer.solana.com/tx/NtSAJBJXqvZzLLSZxRe1joKqMTJ5Ydj1BXNZe9HgRcBugFk5zwhSRWfR5HZXfVCG8hQCQ9soZs69br1TWishYVN?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |
| Lock 200 test USDC and delegate bidder state | Solana devnet | `OpenBidEscrow` + `DelegateBidEscrow` | [`3Ui1…mE7r`](https://explorer.solana.com/tx/3Ui17BJPvFSLgyjC6FcmnYo6jfLMTNYxvpvHG1ubzttziHqnCxWJun9ZFBv6KwzEzM3fuYkqg1WamUJdmVP1mE7r?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |
| Enable one-click bidding | Solana devnet | `CreateSessionV2` | [`3QAP…LPT2`](https://solscan.io/tx/3QAPxQW4W7HUAcjsR6LdcSz25TMuhQByarY5wMnQSeKewbLULmmG3ERUKXWKcPT8SYyC1HyjzsBpnrDWVBuaLPT2?cluster=devnet) |
| First 100 USDC bid | MagicBlock Asia ER | `PlaceBid`, bid count 1 | [`26zK…d3xg`](https://explorer.solana.com/tx/26zKLpoSs8KJwZaKjQSZVuRzVfPksmvzJhoCzRq5ANGMq8WxVey6DQ4HFyTZpi6ErJf1BiikoV66gBtjC5Fud3xg?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |
| Second 110 USDC bid | MagicBlock Asia ER | `PlaceBid`, bid count 2 | [`3Xfp…HC2y`](https://explorer.solana.com/tx/3Xfpqfbd2T1KN3nSrRjiK7jwqRa313e7nq51FBkWMNarpaS87ZnoYbCkDuX5nkcTtPy4dAqFj1osQaYeznnCHC2y?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |
| Third 200 USDC bid | MagicBlock Asia ER | `PlaceBid`, bid count 3 | [`3Kg7…aRzo`](https://explorer.solana.com/tx/3Kg71JtfJzp1US1DsXKxSyD3B7uHwss7p91nXyWYzcrztfcBVfTkdUkffMjY8S74TCGdTMrocLpqQqUTQCpVaRzo?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |

The three ER transactions were retrieved directly from the Asia ER RPC, not inferred from UI state. Each succeeded and logged `Instruction: PlaceBid` for the deployed Atrium.ads program.

## Full lifecycle proof from the integrated E2E run

Auction: [`7qacgHPNwbnU1nGw5d1ysGcGLd8UDXyTSgwaWpAXp9jV`](https://explorer.solana.com/address/7qacgHPNwbnU1nGw5d1ysGcGLd8UDXyTSgwaWpAXp9jV?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet)

| Stage | Layer | Transaction |
| --- | --- | --- |
| 100 USDC ER bid | MagicBlock Asia ER | [`3rcM…9TAiJ`](https://explorer.solana.com/tx/3rcMsCgnBommoV58JKFQJqXNYHzxRQ6dwhcr9rLX2s4VFgWp6zA8D6qWQCRZTorD93k5c8w59cSPkCxVVPY9TAiJ?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |
| 125 USDC session-authorized ER bid | MagicBlock Asia ER | [`5dc1…SR76`](https://explorer.solana.com/tx/5dc1gvnjFpLDKjhDBQDWDyR7UXCDeJCFrvJcB9hwDJDYWwrqF22bSoybfCD2dV4p7NUe9ChCoLkkvT9D6ZnDSR76?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |
| Commit result and undelegate winner state | MagicBlock Asia ER | [`4BXV…hEMU`](https://explorer.solana.com/tx/4BXV9cXbvwTJhztLfxhTJGPCzJp26cz3pTaHPGssFJdyrvnf7FpFCeBBRB53NEkRPpC5ouRY3eTJX8jiVg52hEMU?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |
| Return losing bidder state | MagicBlock Asia ER | [`2LBP…C1D8`](https://explorer.solana.com/tx/2LBPU5LfAnLfKqEv8zoQpigbdpyDZGNPt9BiBUPjG33kPWfDVKVxwUReXWcDwQxoNYSjQamCPN1c118kEFG4C1D8?cluster=custom&customUrl=https%3A%2F%2Fdevnet-as.magicblock.app) |
| Lock winner and return unused budget | Solana devnet | [`4EwA…FQmq`](https://explorer.solana.com/tx/4EwAQ58EMEKj7aMNPoohiGX2hnzsURfxFPrhb2RkR9eD4yu4taQkcM5XZUNejfWTBXVhg7Md3YJ3qeB6VPkJFQmq?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |
| Refund losing bidder | Solana devnet | [`2721…FcV3`](https://explorer.solana.com/tx/2721bg5QywBkM5oyLW4czQNRJc8Gd3g8iFsD8gkEKaXXibCrowA42Js6kLRTNim1vocja15EQiBENcZrneNCFcV3?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |
| Proof-gated creator payout | Solana devnet | [`3JT6…8gDT`](https://explorer.solana.com/tx/3JT6vM37sRcyxULhnPD9rDaSGXMNA6QaXHvqXeeUinqwrgd7maUn36PJNLRHEgiqfbwubvsAH3fuQ1VkFXUu8gDT?cluster=custom&customUrl=https%3A%2F%2Frpc.magicblock.app%2Fdevnet) |

The close transaction was also retrieved directly from the Asia ER RPC. It succeeded and logged `Instruction: CloseAndUndelegate`.

## Where MagicBlock is used in Atrium.ads

1. **Routing.** `ConnectionMagicRouter` inspects writable accounts and routes delegated writes to the correct ER.
2. **Live auction delegation.** Each `LiveAuction` PDA is delegated during lot creation.
3. **Bid-budget delegation.** The bidder first locks SPL tokens on Solana; only the corresponding `BidEscrow` state is delegated.
4. **Real-time bids.** `place_bid` runs on the ER and atomically changes top bid, leader, bid count and anti-sniping deadline.
5. **Session keys.** A short-lived, program-bound signer can authorize repeated ER bids without repeated wallet popups.
6. **Push/read path.** The UI reads and subscribes to delegated live state through the router/active ER endpoint.
7. **Commit and undelegate.** At auction close, the result and winning escrow return to canonical Solana state together.
8. **Activity evidence.** The app discovers regional ER endpoints through delegation status, retrieves ER transactions, decodes Anchor events and labels them `magicblock-er`.

MagicBlock is intentionally **not** used for permanent token custody, campaign terms, artwork/proof commitments, refunds or final payout receipts. Those remain on Solana devnet.

## Current indexed evidence

The local transaction-backed activity cache contained `265` decoded events when refreshed for the latest run:

- The latest bounded backfill read `18` events from MagicBlock ER endpoints
- The latest bounded backfill read `33` events from Solana devnet
- The latest `testing` auction contributes seven directly verified `BidPlaced` transactions from the MagicBlock Asia ER

This is a bounded rolling index, not a claim that only 265 program events exist. The raw rebuildable read model is stored in `.data/activity.json`.

## Presentation-safe claim

> Atrium.ads keeps custody and durable settlement on Solana, delegates only the high-frequency auction and bidder state to MagicBlock, executes real-time bids on the ER, then commits the winning result back to Solana for proof-gated settlement.
