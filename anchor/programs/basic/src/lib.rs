use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer as SplTransfer};
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::MagicIntentBundleBuilder;
use session_keys::{session_auth_or, Session, SessionError, SessionTokenV2};

declare_id!("CkKbXccct8gWcfUyZzv2UGbDLtGSoMcsM6ZrWQ5dPnvZ");

pub const AUCTION_SEED: &[u8] = b"auction";
pub const LIVE_AUCTION_SEED: &[u8] = b"live_auction";
pub const BID_SEED: &[u8] = b"bid";
pub const VAULT_SEED: &[u8] = b"vault";
pub const RECEIPT_SEED: &[u8] = b"receipt";
pub const CAMPAIGN_SEED: &[u8] = b"campaign";
pub const CAMPAIGN_LOT_SEED: &[u8] = b"campaign_lot";
pub const CREATIVE_SEED: &[u8] = b"creative";
pub const PROOF_SEED: &[u8] = b"proof";
pub const ANTI_SNIPE_WINDOW_SECONDS: i64 = 30;
pub const ANTI_SNIPE_EXTENSION_SECONDS: i64 = 30;

#[ephemeral]
#[program]
pub mod basic {
    use super::*;

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: u64,
        title_hash: [u8; 32],
        details_hash: [u8; 32],
        moderator: Pubkey,
    ) -> Result<()> {
        require!(title_hash != [0; 32], ClaimSpotError::InvalidContentHash);
        require!(details_hash != [0; 32], ClaimSpotError::InvalidContentHash);
        let now = Clock::get()?.unix_timestamp;
        let campaign = &mut ctx.accounts.campaign;
        campaign.creator = ctx.accounts.creator.key();
        campaign.moderator = moderator;
        campaign.payment_mint = ctx.accounts.payment_mint.key();
        campaign.campaign_id = campaign_id;
        campaign.title_hash = title_hash;
        campaign.details_hash = details_hash;
        campaign.status = CampaignStatus::Draft;
        campaign.lot_count = 0;
        campaign.accepted_proofs = 0;
        campaign.created_at = now;
        campaign.published_at = 0;
        campaign.bump = ctx.bumps.campaign;
        emit!(CampaignCreated {
            campaign: campaign.key(),
            creator: campaign.creator,
            moderator,
            payment_mint: campaign.payment_mint,
            campaign_id,
        });
        Ok(())
    }

    pub fn register_campaign_lot(
        ctx: Context<RegisterCampaignLot>,
        lot_index: u16,
        placement_hash: [u8; 32],
        creative_required: bool,
    ) -> Result<()> {
        require!(
            placement_hash != [0; 32],
            ClaimSpotError::InvalidContentHash
        );
        require!(
            ctx.accounts.campaign.status == CampaignStatus::Draft,
            ClaimSpotError::CampaignAlreadyPublished
        );
        require!(
            lot_index == ctx.accounts.campaign.lot_count,
            ClaimSpotError::InvalidLotIndex
        );
        let lot = &mut ctx.accounts.campaign_lot;
        lot.campaign = ctx.accounts.campaign.key();
        lot.auction = ctx.accounts.auction.key();
        lot.lot_index = lot_index;
        lot.placement_hash = placement_hash;
        lot.creative_required = creative_required;
        lot.bump = ctx.bumps.campaign_lot;
        ctx.accounts.campaign.lot_count = ctx
            .accounts
            .campaign
            .lot_count
            .checked_add(1)
            .ok_or(ClaimSpotError::MathOverflow)?;
        emit!(CampaignLotRegistered {
            campaign: lot.campaign,
            auction: lot.auction,
            lot_index,
            placement_hash,
            creative_required,
        });
        Ok(())
    }

    pub fn publish_campaign(ctx: Context<PublishCampaign>) -> Result<()> {
        require!(
            ctx.accounts.campaign.status == CampaignStatus::Draft,
            ClaimSpotError::CampaignAlreadyPublished
        );
        require!(
            ctx.accounts.campaign.lot_count > 0,
            ClaimSpotError::CampaignHasNoLots
        );
        ctx.accounts.campaign.status = CampaignStatus::Live;
        ctx.accounts.campaign.published_at = Clock::get()?.unix_timestamp;
        emit!(CampaignPublished {
            campaign: ctx.accounts.campaign.key(),
            lot_count: ctx.accounts.campaign.lot_count,
            published_at: ctx.accounts.campaign.published_at,
        });
        Ok(())
    }

    pub fn submit_creative(ctx: Context<SubmitCreative>, content_hash: [u8; 32]) -> Result<()> {
        require!(content_hash != [0; 32], ClaimSpotError::InvalidContentHash);
        let creative = &mut ctx.accounts.creative;
        creative.auction = ctx.accounts.auction.key();
        creative.submitter = ctx.accounts.submitter.key();
        creative.content_hash = content_hash;
        creative.status = ReviewStatus::Pending;
        creative.reviewer = Pubkey::default();
        creative.reason_hash = [0; 32];
        creative.submitted_at = Clock::get()?.unix_timestamp;
        creative.reviewed_at = 0;
        creative.bump = ctx.bumps.creative;
        emit!(CreativeSubmitted {
            auction: creative.auction,
            creative: creative.key(),
            submitter: creative.submitter,
            content_hash,
            submitted_at: creative.submitted_at,
        });
        Ok(())
    }

    pub fn review_creative(
        ctx: Context<ReviewCreative>,
        approved: bool,
        reason_hash: [u8; 32],
    ) -> Result<()> {
        require!(
            ctx.accounts.creative.status == ReviewStatus::Pending,
            ClaimSpotError::AlreadyReviewed
        );
        if !approved {
            require!(reason_hash != [0; 32], ClaimSpotError::InvalidContentHash);
        }
        let creative = &mut ctx.accounts.creative;
        creative.status = if approved {
            ReviewStatus::Approved
        } else {
            ReviewStatus::Rejected
        };
        creative.reviewer = ctx.accounts.moderator.key();
        creative.reason_hash = reason_hash;
        creative.reviewed_at = Clock::get()?.unix_timestamp;
        emit!(CreativeReviewed {
            auction: creative.auction,
            creative: creative.key(),
            reviewer: creative.reviewer,
            approved,
            reason_hash,
            reviewed_at: creative.reviewed_at,
        });
        Ok(())
    }

    pub fn submit_fulfillment_proof(
        ctx: Context<SubmitFulfillmentProof>,
        content_hash: [u8; 32],
    ) -> Result<()> {
        require!(content_hash != [0; 32], ClaimSpotError::InvalidContentHash);
        require!(
            ctx.accounts.auction.status == AuctionStatus::Settled,
            ClaimSpotError::AuctionNotSettled
        );
        require!(
            ctx.accounts.auction.winner != Pubkey::default(),
            ClaimSpotError::NoBids
        );
        let proof = &mut ctx.accounts.proof;
        proof.auction = ctx.accounts.auction.key();
        proof.creator = ctx.accounts.creator.key();
        proof.content_hash = content_hash;
        proof.status = ProofStatus::Pending;
        proof.reviewer = Pubkey::default();
        proof.submitted_at = Clock::get()?.unix_timestamp;
        proof.reviewed_at = 0;
        proof.bump = ctx.bumps.proof;
        emit!(FulfillmentSubmitted {
            auction: proof.auction,
            proof: proof.key(),
            creator: proof.creator,
            content_hash,
            submitted_at: proof.submitted_at,
        });
        Ok(())
    }

    pub fn review_fulfillment_proof(
        ctx: Context<ReviewFulfillmentProof>,
        accepted: bool,
    ) -> Result<()> {
        require!(
            ctx.accounts.proof.status == ProofStatus::Pending,
            ClaimSpotError::AlreadyReviewed
        );
        let proof = &mut ctx.accounts.proof;
        proof.status = if accepted {
            ProofStatus::Accepted
        } else {
            ProofStatus::Disputed
        };
        proof.reviewer = ctx.accounts.winner.key();
        proof.reviewed_at = Clock::get()?.unix_timestamp;
        if accepted {
            ctx.accounts.campaign.accepted_proofs = ctx
                .accounts
                .campaign
                .accepted_proofs
                .checked_add(1)
                .ok_or(ClaimSpotError::MathOverflow)?;
        }
        emit!(FulfillmentReviewed {
            auction: proof.auction,
            proof: proof.key(),
            reviewer: proof.reviewer,
            accepted,
            reviewed_at: proof.reviewed_at,
        });
        Ok(())
    }

    pub fn create_auction(
        ctx: Context<CreateAuction>,
        auction_id: u64,
        title_hash: [u8; 32],
        reserve_price: u64,
        min_increment: u64,
        ends_at: i64,
    ) -> Result<()> {
        require!(
            ends_at > Clock::get()?.unix_timestamp,
            ClaimSpotError::InvalidEndTime
        );
        require!(reserve_price > 0, ClaimSpotError::InvalidReserve);
        require!(min_increment > 0, ClaimSpotError::InvalidIncrement);

        let auction = &mut ctx.accounts.auction;
        auction.creator = ctx.accounts.creator.key();
        auction.payment_mint = ctx.accounts.payment_mint.key();
        auction.vault = ctx.accounts.vault.key();
        auction.live_auction = ctx.accounts.live_auction.key();
        auction.auction_id = auction_id;
        auction.title_hash = title_hash;
        auction.status = AuctionStatus::Live;
        auction.winner = Pubkey::default();
        auction.winning_bid = 0;
        auction.total_deposited = 0;
        auction.total_refunded = 0;
        auction.created_at = Clock::get()?.unix_timestamp;
        auction.settled_at = 0;
        auction.bump = ctx.bumps.auction;
        auction.vault_bump = ctx.bumps.vault;

        let live = &mut ctx.accounts.live_auction;
        live.auction = auction.key();
        live.creator = auction.creator;
        live.reserve_price = reserve_price;
        live.min_increment = min_increment;
        live.ends_at = ends_at;
        live.highest_bid = 0;
        live.highest_bidder = Pubkey::default();
        live.bid_count = 0;
        live.closed = false;
        live.bump = ctx.bumps.live_auction;

        emit!(AuctionCreated {
            auction: auction.key(),
            live_auction: live.key(),
            creator: auction.creator,
            payment_mint: auction.payment_mint,
            auction_id,
            reserve_price,
            ends_at,
        });
        Ok(())
    }

    /// Locks a bidder's maximum spend on Solana before any ER bid is accepted.
    pub fn open_bid_escrow(ctx: Context<OpenBidEscrow>, max_amount: u64) -> Result<()> {
        require!(max_amount > 0, ClaimSpotError::InvalidDeposit);
        require!(
            ctx.accounts.auction.status == AuctionStatus::Live,
            ClaimSpotError::AuctionNotLive
        );
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                SplTransfer {
                    from: ctx.accounts.bidder_tokens.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.bidder.to_account_info(),
                },
            ),
            max_amount,
        )?;

        let bid = &mut ctx.accounts.bid_escrow;
        bid.auction = ctx.accounts.auction.key();
        bid.bidder = ctx.accounts.bidder.key();
        bid.deposited = max_amount;
        bid.current_bid = 0;
        bid.claimed = false;
        bid.bump = ctx.bumps.bid_escrow;
        ctx.accounts.auction.total_deposited = ctx
            .accounts
            .auction
            .total_deposited
            .checked_add(max_amount)
            .ok_or(ClaimSpotError::MathOverflow)?;
        emit!(BidEscrowOpened {
            auction: ctx.accounts.auction.key(),
            bidder: bid.bidder,
            max_amount
        });
        Ok(())
    }

    pub fn top_up_bid_escrow(ctx: Context<TopUpBidEscrow>, amount: u64) -> Result<()> {
        require!(amount > 0, ClaimSpotError::InvalidDeposit);
        require!(
            ctx.accounts.auction.status == AuctionStatus::Live,
            ClaimSpotError::AuctionNotLive
        );
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                SplTransfer {
                    from: ctx.accounts.bidder_tokens.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.bidder.to_account_info(),
                },
            ),
            amount,
        )?;
        ctx.accounts.bid_escrow.deposited = ctx
            .accounts
            .bid_escrow
            .deposited
            .checked_add(amount)
            .ok_or(ClaimSpotError::MathOverflow)?;
        ctx.accounts.auction.total_deposited = ctx
            .accounts
            .auction
            .total_deposited
            .checked_add(amount)
            .ok_or(ClaimSpotError::MathOverflow)?;
        Ok(())
    }

    pub fn delegate_live_auction(ctx: Context<DelegateLiveAuction>) -> Result<()> {
        let auction_key = ctx.accounts.auction.key();
        let validator = ctx.accounts.validator.as_ref().map(|account| account.key());
        ctx.accounts.delegate_live_auction(
            &ctx.accounts.payer,
            &[LIVE_AUCTION_SEED, auction_key.as_ref()],
            DelegateConfig {
                validator,
                ..Default::default()
            },
        )?;
        Ok(())
    }

    pub fn delegate_bid_escrow(ctx: Context<DelegateBidEscrow>) -> Result<()> {
        let auction_key = ctx.accounts.auction.key();
        let bidder_key = ctx.accounts.bidder.key();
        let validator = ctx.accounts.validator.as_ref().map(|account| account.key());
        ctx.accounts.delegate_bid_escrow(
            &ctx.accounts.payer,
            &[BID_SEED, auction_key.as_ref(), bidder_key.as_ref()],
            DelegateConfig {
                validator,
                ..Default::default()
            },
        )?;
        Ok(())
    }

    /// Runs on the hosted ER; the locked token balance remains on Solana.
    #[session_auth_or(
        ctx.accounts.bidder.key() == ctx.accounts.payer.key(),
        SessionError::InvalidToken
    )]
    pub fn place_bid(ctx: Context<PlaceBid>, amount: u64) -> Result<()> {
        let live = &mut ctx.accounts.live_auction;
        let bid = &mut ctx.accounts.bid_escrow;
        let now = Clock::get()?.unix_timestamp;
        require!(!live.closed, ClaimSpotError::AuctionNotLive);
        require!(now < live.ends_at, ClaimSpotError::AuctionEnded);
        require!(bid.deposited >= amount, ClaimSpotError::InsufficientEscrow);
        let minimum = if live.bid_count == 0 {
            live.reserve_price
        } else {
            live.highest_bid
                .checked_add(live.min_increment)
                .ok_or(ClaimSpotError::MathOverflow)?
        };
        require!(amount >= minimum, ClaimSpotError::BidTooLow);

        let previous_bidder = live.highest_bidder;
        live.highest_bid = amount;
        // Preserve the wallet identity as the public bidder even when a
        // short-lived session signer pays for and signs this ER transaction.
        live.highest_bidder = bid.bidder;
        live.bid_count = live
            .bid_count
            .checked_add(1)
            .ok_or(ClaimSpotError::MathOverflow)?;
        bid.current_bid = amount;
        if live.ends_at - now <= ANTI_SNIPE_WINDOW_SECONDS {
            live.ends_at = live
                .ends_at
                .checked_add(ANTI_SNIPE_EXTENSION_SECONDS)
                .ok_or(ClaimSpotError::MathOverflow)?;
        }
        emit!(BidPlaced {
            auction: live.auction,
            bidder: bid.bidder,
            previous_bidder,
            amount,
            bid_count: live.bid_count,
            ends_at: live.ends_at,
        });
        Ok(())
    }

    /// Final ER step: commit the shared result and winning escrow together.
    /// Losing bid escrows return independently when their owners claim refunds.
    pub fn close_and_undelegate(ctx: Context<CloseAndUndelegate>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(
            now >= ctx.accounts.live_auction.ends_at,
            ClaimSpotError::AuctionStillLive
        );
        require!(
            !ctx.accounts.live_auction.closed,
            ClaimSpotError::AuctionAlreadyClosed
        );
        ctx.accounts.live_auction.closed = true;
        ctx.accounts.live_auction.exit(&crate::ID)?;
        let mut accounts_to_return = vec![ctx.accounts.live_auction.to_account_info()];
        if ctx.accounts.live_auction.bid_count > 0 {
            let winner_bid = ctx
                .accounts
                .winner_bid
                .as_ref()
                .ok_or(ClaimSpotError::InvalidWinner)?;
            let expected = Pubkey::find_program_address(
                &[
                    BID_SEED,
                    ctx.accounts.live_auction.auction.as_ref(),
                    ctx.accounts.live_auction.highest_bidder.as_ref(),
                ],
                &crate::ID,
            )
            .0;
            require_keys_eq!(winner_bid.key(), expected, ClaimSpotError::InvalidWinner);
            require_keys_eq!(
                winner_bid.auction,
                ctx.accounts.live_auction.auction,
                ClaimSpotError::InvalidWinner
            );
            require_keys_eq!(
                winner_bid.bidder,
                ctx.accounts.live_auction.highest_bidder,
                ClaimSpotError::InvalidWinner
            );
            winner_bid.exit(&crate::ID)?;
            accounts_to_return.push(winner_bid.to_account_info());
        }
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&accounts_to_return)
        .build_and_invoke()?;
        Ok(())
    }

    pub fn undelegate_bid_escrow(ctx: Context<UndelegateBidEscrow>) -> Result<()> {
        ctx.accounts.bid_escrow.exit(&crate::ID)?;
        MagicIntentBundleBuilder::new(
            ctx.accounts.bidder.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.bid_escrow.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }

    /// Runs on Solana after the ER result is committed. Locks the winner and
    /// returns only their unused maximum budget. The winning amount remains in
    /// the vault until approved artwork and accepted fulfillment proof exist.
    pub fn finalize_auction(ctx: Context<FinalizeAuction>) -> Result<()> {
        require!(
            ctx.accounts.auction.status == AuctionStatus::Live,
            ClaimSpotError::AuctionNotLive
        );
        require!(
            ctx.accounts.live_auction.closed,
            ClaimSpotError::AuctionNotClosed
        );
        require!(
            ctx.accounts.live_auction.bid_count > 0,
            ClaimSpotError::NoBids
        );
        require_keys_eq!(
            ctx.accounts.live_auction.highest_bidder,
            ctx.accounts.winner_bid.bidder,
            ClaimSpotError::InvalidWinner
        );
        require!(
            ctx.accounts.winner_bid.deposited >= ctx.accounts.live_auction.highest_bid,
            ClaimSpotError::InsufficientEscrow
        );
        require!(
            !ctx.accounts.winner_bid.claimed,
            ClaimSpotError::AlreadyClaimed
        );

        let winning_bid = ctx.accounts.live_auction.highest_bid;
        let excess = ctx.accounts.winner_bid.deposited - winning_bid;
        let creator = ctx.accounts.auction.creator;
        let auction_id_bytes = ctx.accounts.auction.auction_id.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] = &[&[
            AUCTION_SEED,
            creator.as_ref(),
            auction_id_bytes.as_ref(),
            &[ctx.accounts.auction.bump],
        ]];
        if excess > 0 {
            transfer_from_vault(
                &ctx.accounts.token_program,
                &ctx.accounts.vault,
                &ctx.accounts.winner_tokens,
                &ctx.accounts.auction,
                signer_seeds,
                excess,
            )?;
            ctx.accounts.auction.total_refunded = ctx
                .accounts
                .auction
                .total_refunded
                .checked_add(excess)
                .ok_or(ClaimSpotError::MathOverflow)?;
        }

        let settled_at = Clock::get()?.unix_timestamp;
        ctx.accounts.winner_bid.claimed = true;
        ctx.accounts.auction.status = AuctionStatus::Settled;
        ctx.accounts.auction.winner = ctx.accounts.winner_bid.bidder;
        ctx.accounts.auction.winning_bid = winning_bid;
        ctx.accounts.auction.settled_at = settled_at;
        emit!(WinnerFinalized {
            auction: ctx.accounts.auction.key(),
            creator,
            winner: ctx.accounts.winner_bid.bidder,
            amount: winning_bid,
        });
        Ok(())
    }

    /// Releases the winning amount only after the winner's artwork has been
    /// approved and the winner has accepted the creator's fulfillment proof.
    pub fn release_payment(ctx: Context<ReleasePayment>) -> Result<()> {
        require!(
            ctx.accounts.auction.status == AuctionStatus::Settled,
            ClaimSpotError::AuctionNotSettled
        );
        require!(
            ctx.accounts.auction.winner != Pubkey::default(),
            ClaimSpotError::NoBids
        );
        require!(ctx.accounts.auction.winning_bid > 0, ClaimSpotError::NoBids);
        require!(
            ctx.accounts.creative.status == ReviewStatus::Approved,
            ClaimSpotError::ArtworkNotApproved
        );
        require!(
            ctx.accounts.proof.status == ProofStatus::Accepted,
            ClaimSpotError::FulfillmentNotAccepted
        );
        require_keys_eq!(
            ctx.accounts.creative.submitter,
            ctx.accounts.auction.winner,
            ClaimSpotError::InvalidWinner
        );
        require_keys_eq!(
            ctx.accounts.proof.reviewer,
            ctx.accounts.auction.winner,
            ClaimSpotError::InvalidWinner
        );

        let winning_bid = ctx.accounts.auction.winning_bid;
        let creator = ctx.accounts.auction.creator;
        let auction_id_bytes = ctx.accounts.auction.auction_id.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] = &[&[
            AUCTION_SEED,
            creator.as_ref(),
            auction_id_bytes.as_ref(),
            &[ctx.accounts.auction.bump],
        ]];
        transfer_from_vault(
            &ctx.accounts.token_program,
            &ctx.accounts.vault,
            &ctx.accounts.creator_tokens,
            &ctx.accounts.auction,
            signer_seeds,
            winning_bid,
        )?;

        let settled_at = Clock::get()?.unix_timestamp;
        let receipt = &mut ctx.accounts.receipt;
        receipt.auction = ctx.accounts.auction.key();
        receipt.creator = creator;
        receipt.winner = ctx.accounts.auction.winner;
        receipt.payment_mint = ctx.accounts.auction.payment_mint;
        receipt.amount = winning_bid;
        receipt.title_hash = ctx.accounts.auction.title_hash;
        receipt.settled_at = settled_at;
        receipt.bump = ctx.bumps.receipt;
        emit!(AuctionSettled {
            auction: ctx.accounts.auction.key(),
            creator,
            winner: receipt.winner,
            amount: winning_bid,
            receipt: receipt.key(),
        });
        Ok(())
    }

    pub fn finalize_no_bid_auction(ctx: Context<FinalizeNoBidAuction>) -> Result<()> {
        require!(
            ctx.accounts.auction.status == AuctionStatus::Live,
            ClaimSpotError::AuctionNotLive
        );
        require!(
            ctx.accounts.live_auction.closed,
            ClaimSpotError::AuctionNotClosed
        );
        require!(
            ctx.accounts.live_auction.bid_count == 0,
            ClaimSpotError::InvalidWinner
        );
        ctx.accounts.auction.status = AuctionStatus::Settled;
        ctx.accounts.auction.settled_at = Clock::get()?.unix_timestamp;
        emit!(AuctionClosedNoBid {
            auction: ctx.accounts.auction.key(),
            creator: ctx.accounts.auction.creator,
            settled_at: ctx.accounts.auction.settled_at,
        });
        Ok(())
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        require!(
            ctx.accounts.auction.status == AuctionStatus::Settled,
            ClaimSpotError::AuctionNotSettled
        );
        require!(
            ctx.accounts.bid_escrow.bidder != ctx.accounts.auction.winner,
            ClaimSpotError::WinnerAlreadyPaid
        );
        require!(
            !ctx.accounts.bid_escrow.claimed,
            ClaimSpotError::AlreadyClaimed
        );
        let amount = ctx.accounts.bid_escrow.deposited;
        let creator = ctx.accounts.auction.creator;
        let auction_id_bytes = ctx.accounts.auction.auction_id.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] = &[&[
            AUCTION_SEED,
            creator.as_ref(),
            auction_id_bytes.as_ref(),
            &[ctx.accounts.auction.bump],
        ]];
        transfer_from_vault(
            &ctx.accounts.token_program,
            &ctx.accounts.vault,
            &ctx.accounts.bidder_tokens,
            &ctx.accounts.auction,
            signer_seeds,
            amount,
        )?;
        ctx.accounts.bid_escrow.claimed = true;
        ctx.accounts.auction.total_refunded = ctx
            .accounts
            .auction
            .total_refunded
            .checked_add(amount)
            .ok_or(ClaimSpotError::MathOverflow)?;
        emit!(RefundClaimed {
            auction: ctx.accounts.auction.key(),
            bidder: ctx.accounts.bidder.key(),
            amount
        });
        Ok(())
    }
}

fn transfer_from_vault<'info>(
    token_program: &Program<'info, Token>,
    vault: &Account<'info, TokenAccount>,
    destination: &Account<'info, TokenAccount>,
    auction: &Account<'info, Auction>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    token::transfer(
        CpiContext::new_with_signer(
            token_program.key(),
            SplTransfer {
                from: vault.to_account_info(),
                to: destination.to_account_info(),
                authority: auction.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )
}

#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct CreateAuction<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    pub payment_mint: Account<'info, Mint>,
    #[account(init, payer = creator, space = Auction::SPACE,
        seeds = [AUCTION_SEED, creator.key().as_ref(), &auction_id.to_le_bytes()], bump)]
    pub auction: Box<Account<'info, Auction>>,
    #[account(init, payer = creator, space = LiveAuction::SPACE,
        seeds = [LIVE_AUCTION_SEED, auction.key().as_ref()], bump)]
    pub live_auction: Account<'info, LiveAuction>,
    #[account(init, payer = creator, seeds = [VAULT_SEED, auction.key().as_ref()], bump,
        token::mint = payment_mint, token::authority = auction)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct CreateCampaign<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    pub payment_mint: Account<'info, Mint>,
    #[account(init, payer = creator, space = Campaign::SPACE,
        seeds = [CAMPAIGN_SEED, creator.key().as_ref(), &campaign_id.to_le_bytes()], bump)]
    pub campaign: Account<'info, Campaign>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(lot_index: u16)]
pub struct RegisterCampaignLot<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut, has_one = creator, has_one = payment_mint)]
    pub campaign: Account<'info, Campaign>,
    pub payment_mint: Account<'info, Mint>,
    #[account(has_one = creator, has_one = payment_mint)]
    pub auction: Account<'info, Auction>,
    #[account(init, payer = creator, space = CampaignLot::SPACE,
        seeds = [CAMPAIGN_LOT_SEED, campaign.key().as_ref(), &lot_index.to_le_bytes()], bump)]
    pub campaign_lot: Account<'info, CampaignLot>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PublishCampaign<'info> {
    pub creator: Signer<'info>,
    #[account(mut, has_one = creator)]
    pub campaign: Account<'info, Campaign>,
}

#[derive(Accounts)]
pub struct SubmitCreative<'info> {
    #[account(mut)]
    pub submitter: Signer<'info>,
    pub auction: Account<'info, Auction>,
    #[account(init, payer = submitter, space = CreativeSubmission::SPACE,
        seeds = [CREATIVE_SEED, auction.key().as_ref(), submitter.key().as_ref()], bump)]
    pub creative: Account<'info, CreativeSubmission>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReviewCreative<'info> {
    pub moderator: Signer<'info>,
    #[account(has_one = moderator)]
    pub campaign: Account<'info, Campaign>,
    #[account(has_one = campaign, has_one = auction)]
    pub campaign_lot: Account<'info, CampaignLot>,
    pub auction: Account<'info, Auction>,
    #[account(mut, has_one = auction)]
    pub creative: Account<'info, CreativeSubmission>,
}

#[derive(Accounts)]
pub struct SubmitFulfillmentProof<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(has_one = creator)]
    pub auction: Account<'info, Auction>,
    #[account(init, payer = creator, space = FulfillmentProof::SPACE,
        seeds = [PROOF_SEED, auction.key().as_ref()], bump)]
    pub proof: Account<'info, FulfillmentProof>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReviewFulfillmentProof<'info> {
    pub winner: Signer<'info>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(has_one = campaign, has_one = auction)]
    pub campaign_lot: Account<'info, CampaignLot>,
    #[account(has_one = winner)]
    pub auction: Account<'info, Auction>,
    #[account(mut, has_one = auction)]
    pub proof: Account<'info, FulfillmentProof>,
}

#[derive(Accounts)]
pub struct OpenBidEscrow<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(mut, has_one = payment_mint, has_one = vault)]
    pub auction: Account<'info, Auction>,
    pub payment_mint: Account<'info, Mint>,
    #[account(init, payer = bidder, space = BidEscrow::SPACE,
        seeds = [BID_SEED, auction.key().as_ref(), bidder.key().as_ref()], bump)]
    pub bid_escrow: Account<'info, BidEscrow>,
    #[account(mut, constraint = bidder_tokens.owner == bidder.key() @ ClaimSpotError::Unauthorized,
        constraint = bidder_tokens.mint == payment_mint.key() @ ClaimSpotError::WrongMint)]
    pub bidder_tokens: Account<'info, TokenAccount>,
    #[account(mut, address = auction.vault)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TopUpBidEscrow<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(mut, has_one = payment_mint, has_one = vault)]
    pub auction: Account<'info, Auction>,
    pub payment_mint: Account<'info, Mint>,
    #[account(mut, seeds = [BID_SEED, auction.key().as_ref(), bidder.key().as_ref()],
        bump = bid_escrow.bump, has_one = auction, has_one = bidder)]
    pub bid_escrow: Account<'info, BidEscrow>,
    #[account(mut, constraint = bidder_tokens.owner == bidder.key() @ ClaimSpotError::Unauthorized,
        constraint = bidder_tokens.mint == payment_mint.key() @ ClaimSpotError::WrongMint)]
    pub bidder_tokens: Account<'info, TokenAccount>,
    #[account(mut, address = auction.vault)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateLiveAuction<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub creator: Signer<'info>,
    #[account(has_one = creator, has_one = live_auction)]
    pub auction: Account<'info, Auction>,
    /// CHECK: verified by relation and delegation macro
    #[account(mut, del, seeds = [LIVE_AUCTION_SEED, auction.key().as_ref()], bump)]
    pub live_auction: UncheckedAccount<'info>,
    /// CHECK: optional hosted ER validator identity
    pub validator: Option<UncheckedAccount<'info>>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateBidEscrow<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub bidder: Signer<'info>,
    /// CHECK: PDA seed only
    pub auction: UncheckedAccount<'info>,
    /// CHECK: verified by seeds and delegation macro
    #[account(mut, del, seeds = [BID_SEED, auction.key().as_ref(), bidder.key().as_ref()], bump)]
    pub bid_escrow: UncheckedAccount<'info>,
    /// CHECK: optional hosted ER validator identity
    pub validator: Option<UncheckedAccount<'info>>,
}

#[derive(Accounts, Session)]
pub struct PlaceBid<'info> {
    #[account(mut, has_one = auction)]
    pub live_auction: Account<'info, LiveAuction>,
    /// CHECK: relation checked by both state accounts
    pub auction: UncheckedAccount<'info>,
    #[account(mut, seeds = [BID_SEED, auction.key().as_ref(), bidder.key().as_ref()],
        bump = bid_escrow.bump, has_one = auction, has_one = bidder)]
    pub bid_escrow: Account<'info, BidEscrow>,
    /// CHECK: constrained by the BidEscrow relation and used as the durable
    /// public bidder identity. The actual signer may be this wallet or its
    /// valid, target-program-bound session key.
    pub bidder: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[session(signer = payer, authority = bidder.key())]
    pub session_token: Option<Account<'info, SessionTokenV2>>,
}

#[commit]
#[derive(Accounts)]
pub struct CloseAndUndelegate<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub live_auction: Account<'info, LiveAuction>,
    #[account(mut)]
    pub winner_bid: Option<Account<'info, BidEscrow>>,
}

#[commit]
#[derive(Accounts)]
pub struct UndelegateBidEscrow<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    /// CHECK: PDA seed only
    pub auction: UncheckedAccount<'info>,
    #[account(mut, seeds = [BID_SEED, auction.key().as_ref(), bidder.key().as_ref()],
        bump = bid_escrow.bump, has_one = auction, has_one = bidder)]
    pub bid_escrow: Account<'info, BidEscrow>,
}

#[derive(Accounts)]
pub struct FinalizeAuction<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, has_one = vault, has_one = live_auction)]
    pub auction: Box<Account<'info, Auction>>,
    #[account(address = auction.live_auction)]
    pub live_auction: Box<Account<'info, LiveAuction>>,
    #[account(mut, seeds = [BID_SEED, auction.key().as_ref(), live_auction.highest_bidder.as_ref()],
        bump = winner_bid.bump, has_one = auction)]
    pub winner_bid: Box<Account<'info, BidEscrow>>,
    #[account(mut, address = auction.vault)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = winner_tokens.owner == winner_bid.bidder @ ClaimSpotError::InvalidWinner,
        constraint = winner_tokens.mint == auction.payment_mint @ ClaimSpotError::WrongMint)]
    pub winner_tokens: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ReleasePayment<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, has_one = creator, has_one = payment_mint, has_one = vault)]
    pub auction: Box<Account<'info, Auction>>,
    /// CHECK: fixed by auction; creator does not need to sign the release
    pub creator: UncheckedAccount<'info>,
    pub payment_mint: Box<Account<'info, Mint>>,
    #[account(has_one = campaign, has_one = auction)]
    pub campaign_lot: Box<Account<'info, CampaignLot>>,
    pub campaign: Box<Account<'info, Campaign>>,
    #[account(has_one = auction)]
    pub creative: Box<Account<'info, CreativeSubmission>>,
    #[account(has_one = auction, has_one = creator)]
    pub proof: Box<Account<'info, FulfillmentProof>>,
    #[account(mut, address = auction.vault)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = creator_tokens.owner == creator.key() @ ClaimSpotError::Unauthorized,
        constraint = creator_tokens.mint == payment_mint.key() @ ClaimSpotError::WrongMint)]
    pub creator_tokens: Box<Account<'info, TokenAccount>>,
    #[account(init, payer = payer, space = SettlementReceipt::SPACE,
        seeds = [RECEIPT_SEED, auction.key().as_ref()], bump)]
    pub receipt: Box<Account<'info, SettlementReceipt>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeNoBidAuction<'info> {
    pub payer: Signer<'info>,
    #[account(mut, has_one = live_auction)]
    pub auction: Account<'info, Auction>,
    #[account(address = auction.live_auction)]
    pub live_auction: Account<'info, LiveAuction>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(mut, has_one = payment_mint, has_one = vault)]
    pub auction: Account<'info, Auction>,
    pub payment_mint: Account<'info, Mint>,
    #[account(mut, seeds = [BID_SEED, auction.key().as_ref(), bidder.key().as_ref()],
        bump = bid_escrow.bump, has_one = auction, has_one = bidder)]
    pub bid_escrow: Account<'info, BidEscrow>,
    #[account(mut, address = auction.vault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = bidder_tokens.owner == bidder.key() @ ClaimSpotError::Unauthorized,
        constraint = bidder_tokens.mint == payment_mint.key() @ ClaimSpotError::WrongMint)]
    pub bidder_tokens: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Campaign {
    pub creator: Pubkey,
    pub moderator: Pubkey,
    pub payment_mint: Pubkey,
    pub campaign_id: u64,
    pub title_hash: [u8; 32],
    pub details_hash: [u8; 32],
    pub status: CampaignStatus,
    pub lot_count: u16,
    pub accepted_proofs: u16,
    pub created_at: i64,
    pub published_at: i64,
    pub bump: u8,
}
impl Campaign {
    pub const SPACE: usize = 8 + 32 * 5 + 8 + 1 + 2 * 2 + 8 * 2 + 1;
}

#[account]
pub struct CampaignLot {
    pub campaign: Pubkey,
    pub auction: Pubkey,
    pub lot_index: u16,
    pub placement_hash: [u8; 32],
    pub creative_required: bool,
    pub bump: u8,
}
impl CampaignLot {
    pub const SPACE: usize = 8 + 32 * 3 + 2 + 1 + 1;
}

#[account]
pub struct CreativeSubmission {
    pub auction: Pubkey,
    pub submitter: Pubkey,
    pub content_hash: [u8; 32],
    pub status: ReviewStatus,
    pub reviewer: Pubkey,
    pub reason_hash: [u8; 32],
    pub submitted_at: i64,
    pub reviewed_at: i64,
    pub bump: u8,
}
impl CreativeSubmission {
    pub const SPACE: usize = 8 + 32 * 5 + 1 + 8 * 2 + 1;
}

#[account]
pub struct FulfillmentProof {
    pub auction: Pubkey,
    pub creator: Pubkey,
    pub content_hash: [u8; 32],
    pub status: ProofStatus,
    pub reviewer: Pubkey,
    pub submitted_at: i64,
    pub reviewed_at: i64,
    pub bump: u8,
}
impl FulfillmentProof {
    pub const SPACE: usize = 8 + 32 * 4 + 1 + 8 * 2 + 1;
}

#[account]
pub struct Auction {
    pub creator: Pubkey,
    pub payment_mint: Pubkey,
    pub vault: Pubkey,
    pub live_auction: Pubkey,
    pub auction_id: u64,
    pub title_hash: [u8; 32],
    pub status: AuctionStatus,
    pub winner: Pubkey,
    pub winning_bid: u64,
    pub total_deposited: u64,
    pub total_refunded: u64,
    pub created_at: i64,
    pub settled_at: i64,
    pub bump: u8,
    pub vault_bump: u8,
}
impl Auction {
    pub const SPACE: usize = 8 + 32 * 5 + 8 + 32 + 1 + 8 * 5 + 2;
}

#[account]
pub struct LiveAuction {
    pub auction: Pubkey,
    pub creator: Pubkey,
    pub reserve_price: u64,
    pub min_increment: u64,
    pub ends_at: i64,
    pub highest_bid: u64,
    pub highest_bidder: Pubkey,
    pub bid_count: u64,
    pub closed: bool,
    pub bump: u8,
}
impl LiveAuction {
    pub const SPACE: usize = 8 + 32 * 3 + 8 * 5 + 1 + 1;
}

#[account]
pub struct BidEscrow {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub deposited: u64,
    pub current_bid: u64,
    pub claimed: bool,
    pub bump: u8,
}
impl BidEscrow {
    pub const SPACE: usize = 8 + 32 * 2 + 8 * 2 + 1 + 1;
}

#[account]
pub struct SettlementReceipt {
    pub auction: Pubkey,
    pub creator: Pubkey,
    pub winner: Pubkey,
    pub payment_mint: Pubkey,
    pub amount: u64,
    pub title_hash: [u8; 32],
    pub settled_at: i64,
    pub bump: u8,
}
impl SettlementReceipt {
    pub const SPACE: usize = 8 + 32 * 5 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AuctionStatus {
    Live,
    Settled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CampaignStatus {
    Draft,
    Live,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ReviewStatus {
    Pending,
    Approved,
    Rejected,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ProofStatus {
    Pending,
    Accepted,
    Disputed,
}

#[event]
pub struct CampaignCreated {
    pub campaign: Pubkey,
    pub creator: Pubkey,
    pub moderator: Pubkey,
    pub payment_mint: Pubkey,
    pub campaign_id: u64,
}
#[event]
pub struct CampaignLotRegistered {
    pub campaign: Pubkey,
    pub auction: Pubkey,
    pub lot_index: u16,
    pub placement_hash: [u8; 32],
    pub creative_required: bool,
}
#[event]
pub struct CampaignPublished {
    pub campaign: Pubkey,
    pub lot_count: u16,
    pub published_at: i64,
}
#[event]
pub struct CreativeSubmitted {
    pub auction: Pubkey,
    pub creative: Pubkey,
    pub submitter: Pubkey,
    pub content_hash: [u8; 32],
    pub submitted_at: i64,
}
#[event]
pub struct CreativeReviewed {
    pub auction: Pubkey,
    pub creative: Pubkey,
    pub reviewer: Pubkey,
    pub approved: bool,
    pub reason_hash: [u8; 32],
    pub reviewed_at: i64,
}
#[event]
pub struct FulfillmentSubmitted {
    pub auction: Pubkey,
    pub proof: Pubkey,
    pub creator: Pubkey,
    pub content_hash: [u8; 32],
    pub submitted_at: i64,
}
#[event]
pub struct FulfillmentReviewed {
    pub auction: Pubkey,
    pub proof: Pubkey,
    pub reviewer: Pubkey,
    pub accepted: bool,
    pub reviewed_at: i64,
}
#[event]
pub struct AuctionClosedNoBid {
    pub auction: Pubkey,
    pub creator: Pubkey,
    pub settled_at: i64,
}

#[event]
pub struct AuctionCreated {
    pub auction: Pubkey,
    pub live_auction: Pubkey,
    pub creator: Pubkey,
    pub payment_mint: Pubkey,
    pub auction_id: u64,
    pub reserve_price: u64,
    pub ends_at: i64,
}
#[event]
pub struct BidEscrowOpened {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub max_amount: u64,
}
#[event]
pub struct BidPlaced {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub previous_bidder: Pubkey,
    pub amount: u64,
    pub bid_count: u64,
    pub ends_at: i64,
}
#[event]
pub struct AuctionSettled {
    pub auction: Pubkey,
    pub creator: Pubkey,
    pub winner: Pubkey,
    pub amount: u64,
    pub receipt: Pubkey,
}
#[event]
pub struct WinnerFinalized {
    pub auction: Pubkey,
    pub creator: Pubkey,
    pub winner: Pubkey,
    pub amount: u64,
}
#[event]
pub struct RefundClaimed {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum ClaimSpotError {
    #[msg("The auction end time must be in the future")]
    InvalidEndTime,
    #[msg("The reserve price must be greater than zero")]
    InvalidReserve,
    #[msg("The minimum increment must be greater than zero")]
    InvalidIncrement,
    #[msg("The escrow deposit must be greater than zero")]
    InvalidDeposit,
    #[msg("The auction is not live")]
    AuctionNotLive,
    #[msg("The auction has ended")]
    AuctionEnded,
    #[msg("The auction is still live")]
    AuctionStillLive,
    #[msg("The auction is already closed")]
    AuctionAlreadyClosed,
    #[msg("The auction has not been closed on the ER")]
    AuctionNotClosed,
    #[msg("The auction is not settled")]
    AuctionNotSettled,
    #[msg("The bid does not meet the current minimum")]
    BidTooLow,
    #[msg("The bid is larger than the bidder's locked balance")]
    InsufficientEscrow,
    #[msg("No valid bids were placed")]
    NoBids,
    #[msg("The supplied winner account does not match the auction result")]
    InvalidWinner,
    #[msg("This balance has already been claimed")]
    AlreadyClaimed,
    #[msg("The winner was already paid during settlement")]
    WinnerAlreadyPaid,
    #[msg("The token mint does not match the auction")]
    WrongMint,
    #[msg("The signer is not authorized")]
    Unauthorized,
    #[msg("The supplied content hash is invalid")]
    InvalidContentHash,
    #[msg("The campaign has already been published")]
    CampaignAlreadyPublished,
    #[msg("The campaign must contain at least one lot")]
    CampaignHasNoLots,
    #[msg("Campaign lots must be registered in order")]
    InvalidLotIndex,
    #[msg("This submission has already been reviewed")]
    AlreadyReviewed,
    #[msg("The winning artwork has not been approved")]
    ArtworkNotApproved,
    #[msg("The fulfillment proof has not been accepted by the winner")]
    FulfillmentNotAccepted,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}
