'use client'

/* eslint-disable @typescript-eslint/no-explicit-any -- Anchor's generated dynamic account namespace is not exported as a stable public type. */

import { AnchorProvider, BN } from '@anchor-lang/core'
import { getBasicProgram, BASIC_PROGRAM_ID } from '@project/anchor'
import { ConnectionMagicRouter } from '@magicblock-labs/ephemeral-rollups-sdk'
import { SessionTokenManager } from '@magicblock-labs/gum-sdk'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { AnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { useCallback, useMemo, useState } from 'react'
import { encodeU16Le, encodeU64Le } from './integer-encoding'

export const CLAIMSPOT_PROGRAM_ID = BASIC_PROGRAM_ID
export const MAGICBLOCK_ROUTER_RPC = process.env.NEXT_PUBLIC_MAGIC_ROUTER_RPC ?? 'https://devnet-router.magicblock.app'
const CLAIMSPOT_BASE_FALLBACK_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC
export const CLAIMSPOT_PAYMENT_MINT = process.env.NEXT_PUBLIC_CLAIMSPOT_PAYMENT_MINT
  ? new PublicKey(process.env.NEXT_PUBLIC_CLAIMSPOT_PAYMENT_MINT)
  : null
export const DEVNET_USDC_FAUCET_PROGRAM_ID = new PublicKey('4sN8PnN2ki2W4TFXAfzR645FWs8nimmsYeNtxM8RBK6A')
export const DEVNET_USDC_FAUCET_URL = 'https://spl-token-faucet.com/?token-name=USDC'

const DELEGATION_PROPAGATION_ATTEMPTS = 20
const DELEGATION_PROPAGATION_DELAY_MS = 500

// Anchor discriminator for `global:airdrop` in the open-source Credix devnet faucet.
const FAUCET_AIRDROP_DISCRIMINATOR = [113, 173, 36, 238, 38, 152, 22, 117]

const AUCTION_SEED = Buffer.from('auction')
const LIVE_AUCTION_SEED = Buffer.from('live_auction')
const BID_SEED = Buffer.from('bid')
const VAULT_SEED = Buffer.from('vault')
const RECEIPT_SEED = Buffer.from('receipt')
const CAMPAIGN_SEED = Buffer.from('campaign')
const CAMPAIGN_LOT_SEED = Buffer.from('campaign_lot')
const CREATIVE_SEED = Buffer.from('creative')
const PROOF_SEED = Buffer.from('proof')
const SESSION_TOKEN_SEED = Buffer.from('session_token_v2')
const SESSION_DURATION_SECONDS = 60 * 60
const SESSION_TOP_UP_LAMPORTS = 5_000_000
const LOT_SIGNING_BATCH_SIZE = 4

export type BidSession = {
  signer: Keypair
  token: PublicKey
  authority: PublicKey
  expiresAt: number
  createSignature: string
}

export type CampaignLotInput = {
  title: string
  placement: string
  reserve: bigint
  increment: bigint
  durationSeconds: number
}

function u64Buffer(value: bigint) {
  return Buffer.from(encodeU64Le(value))
}

function u16Buffer(value: number) {
  return Buffer.from(encodeU16Le(value))
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

function simulationFailureMessage(error: unknown, logs: string[] | null, subject = 'Transaction') {
  const usefulLog = logs
    ?.slice()
    .reverse()
    .find(
      (line) =>
        line.includes('Error Message:') ||
        line.includes('Error Code:') ||
        line.includes('custom program error') ||
        line.includes('insufficient funds'),
    )

  return usefulLog
    ? `${subject} would fail: ${usefulLog.replace(/^Program log:\s*/, '')}`
    : `${subject} would fail during simulation: ${JSON.stringify(error)}`
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function isBlockhashFailure(error: unknown) {
  const message = errorMessage(error).toLowerCase()
  return (
    message.includes('blockhash not found') ||
    message.includes('blockhashnotfound') ||
    message.includes('block height exceeded') ||
    message.includes('blockheightexceeded')
  )
}

function isRetryableRpcFailure(error: unknown) {
  const message = errorMessage(error).toLowerCase()
  return (
    isBlockhashFailure(error) ||
    message.includes('429') ||
    message.includes('too many requests') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('timeout')
  )
}

export function auctionPda(creator: PublicKey, auctionId: bigint) {
  return PublicKey.findProgramAddressSync(
    [AUCTION_SEED, creator.toBuffer(), u64Buffer(auctionId)],
    CLAIMSPOT_PROGRAM_ID,
  )[0]
}

export function liveAuctionPda(auction: PublicKey) {
  return PublicKey.findProgramAddressSync([LIVE_AUCTION_SEED, auction.toBuffer()], CLAIMSPOT_PROGRAM_ID)[0]
}

export function bidEscrowPda(auction: PublicKey, bidder: PublicKey) {
  return PublicKey.findProgramAddressSync([BID_SEED, auction.toBuffer(), bidder.toBuffer()], CLAIMSPOT_PROGRAM_ID)[0]
}

export function vaultPda(auction: PublicKey) {
  return PublicKey.findProgramAddressSync([VAULT_SEED, auction.toBuffer()], CLAIMSPOT_PROGRAM_ID)[0]
}

export function receiptPda(auction: PublicKey) {
  return PublicKey.findProgramAddressSync([RECEIPT_SEED, auction.toBuffer()], CLAIMSPOT_PROGRAM_ID)[0]
}

export function campaignPda(creator: PublicKey, campaignId: bigint) {
  return PublicKey.findProgramAddressSync(
    [CAMPAIGN_SEED, creator.toBuffer(), u64Buffer(campaignId)],
    CLAIMSPOT_PROGRAM_ID,
  )[0]
}

export function campaignLotPda(campaign: PublicKey, lotIndex: number) {
  return PublicKey.findProgramAddressSync(
    [CAMPAIGN_LOT_SEED, campaign.toBuffer(), u16Buffer(lotIndex)],
    CLAIMSPOT_PROGRAM_ID,
  )[0]
}

export function creativePda(auction: PublicKey, submitter: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [CREATIVE_SEED, auction.toBuffer(), submitter.toBuffer()],
    CLAIMSPOT_PROGRAM_ID,
  )[0]
}

export function proofPda(auction: PublicKey) {
  return PublicKey.findProgramAddressSync([PROOF_SEED, auction.toBuffer()], CLAIMSPOT_PROGRAM_ID)[0]
}

export async function hashTitle(title: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(title))))
}

export const hashText = hashTitle

export type ChainAuction = {
  publicKey: PublicKey
  creator: PublicKey
  paymentMint: PublicKey
  vault: PublicKey
  liveAuction: PublicKey
  auctionId: bigint
  titleHash: number[]
  status: 'live' | 'settled'
  winner: PublicKey
  winningBid: bigint
  totalDeposited: bigint
  totalRefunded: bigint
  reservePrice: bigint
  minIncrement: bigint
  endsAt: bigint
  highestBid: bigint
  highestBidder: PublicKey
  bidCount: bigint
  closed: boolean
  delegated: boolean
}

export type ChainBidEscrow = {
  publicKey: PublicKey
  auction: PublicKey
  bidder: PublicKey
  deposited: bigint
  currentBid: bigint
  claimed: boolean
  delegated: boolean
}

export type LiveAuctionRealtimeUpdate = {
  liveAuction: PublicKey
  reservePrice: bigint
  minIncrement: bigint
  endsAt: bigint
  highestBid: bigint
  highestBidder: PublicKey
  bidCount: bigint
  closed: boolean
}

export type ChainCampaign = {
  publicKey: PublicKey
  creator: PublicKey
  moderator: PublicKey
  paymentMint: PublicKey
  campaignId: bigint
  titleHash: number[]
  detailsHash: number[]
  status: 'draft' | 'live'
  lotCount: number
  acceptedProofs: number
  createdAt: bigint
  publishedAt: bigint
}

export type ChainCampaignLot = {
  publicKey: PublicKey
  campaign: PublicKey
  auction: PublicKey
  lotIndex: number
  placementHash: number[]
  creativeRequired: boolean
}

export type ChainCreative = {
  publicKey: PublicKey
  auction: PublicKey
  submitter: PublicKey
  contentHash: number[]
  status: 'pending' | 'approved' | 'rejected'
  reviewer: PublicKey
  reasonHash: number[]
  submittedAt: bigint
  reviewedAt: bigint
}

export type ChainProof = {
  publicKey: PublicKey
  auction: PublicKey
  creator: PublicKey
  contentHash: number[]
  status: 'pending' | 'accepted' | 'disputed'
  reviewer: PublicKey
  submittedAt: bigint
  reviewedAt: bigint
}

export type ChainSettlementReceipt = {
  publicKey: PublicKey
  auction: PublicKey
  creator: PublicKey
  winner: PublicKey
  paymentMint: PublicKey
  amount: bigint
  titleHash: number[]
  settledAt: bigint
}

type MagicBlockDelegationStatus = {
  isDelegated: boolean
  fqdn?: string
}

function enumKey(value: Record<string, unknown>) {
  return Object.keys(value)[0]?.toLowerCase() ?? 'live'
}

export function useClaimSpotProgram() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const baseProvider = useMemo(
    () => new AnchorProvider(connection, wallet as AnchorWallet, { commitment: 'confirmed' }),
    [connection, wallet],
  )
  const routerConnection = useMemo(() => new ConnectionMagicRouter(MAGICBLOCK_ROUTER_RPC, 'confirmed'), [])
  const baseWriteConnections = useMemo(() => {
    const endpoints = [connection.rpcEndpoint, CLAIMSPOT_BASE_FALLBACK_RPC ?? clusterApiUrl('devnet')].filter(
      (endpoint): endpoint is string => Boolean(endpoint),
    )
    return [...new Set(endpoints)].map((endpoint) =>
      endpoint === connection.rpcEndpoint ? connection : new Connection(endpoint, 'confirmed'),
    )
  }, [connection])
  const routerProvider = useMemo(
    () => new AnchorProvider(routerConnection, wallet as AnchorWallet, { commitment: 'confirmed' }),
    [routerConnection, wallet],
  )
  const baseProgram = useMemo(() => getBasicProgram(baseProvider), [baseProvider])
  const routerProgram = useMemo(() => getBasicProgram(routerProvider), [routerProvider])
  // Intentionally memory-only: this is a temporary hot key. Reloading the page
  // forgets it, and the on-chain authorization expires after one hour.
  const [bidSession, setBidSession] = useState<BidSession | null>(null)

  const requireWallet = useCallback(() => {
    if (!wallet.publicKey) throw new Error('Connect a devnet wallet first')
    return wallet.publicKey
  }, [wallet.publicKey])

  const requireMint = useCallback(() => {
    if (!CLAIMSPOT_PAYMENT_MINT) throw new Error('ClaimSpot devnet payment mint is not configured')
    return CLAIMSPOT_PAYMENT_MINT
  }, [])

  const signAndSendBaseTransaction = useCallback(
    async (transaction: Transaction, subject: string) => {
      const feePayer = requireWallet()
      if (!wallet.signTransaction) throw new Error('Connected wallet cannot sign transactions')

      const attempts = Math.max(3, baseWriteConnections.length)
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const writeConnection = baseWriteConnections[attempt % baseWriteConnections.length]
        try {
          const latest = await writeConnection.getLatestBlockhash('confirmed')
          transaction.signatures = []
          transaction.feePayer = feePayer
          transaction.recentBlockhash = latest.blockhash
          transaction.lastValidBlockHeight = latest.lastValidBlockHeight

          const simulation = await writeConnection.simulateTransaction(transaction)
          if (simulation.value.err) {
            if (isBlockhashFailure(simulation.value.err)) continue
            throw new Error(simulationFailureMessage(simulation.value.err, simulation.value.logs, subject))
          }

          const signed = await wallet.signTransaction(transaction)
          const signature = await writeConnection.sendRawTransaction(signed.serialize(), {
            maxRetries: 5,
            preflightCommitment: 'confirmed',
          })
          const confirmation = await writeConnection.confirmTransaction({ signature, ...latest }, 'confirmed')
          if (confirmation.value.err) {
            throw new Error(`${subject} failed on-chain: ${JSON.stringify(confirmation.value.err)}`)
          }
          return signature
        } catch (error) {
          if (!isRetryableRpcFailure(error) || attempt >= attempts - 1) throw error
        }
      }

      throw new Error(`${subject} could not obtain a usable devnet blockhash`)
    },
    [baseWriteConnections, requireWallet, wallet],
  )

  const signAndSendRouterTransaction = useCallback(
    async (transaction: Transaction, subject: string) => {
      const feePayer = requireWallet()
      if (!wallet.signTransaction) throw new Error('Connected wallet cannot sign transactions')

      for (let attempt = 0; attempt < 3; attempt += 1) {
        transaction.signatures = []
        transaction.feePayer = feePayer

        // A normal getLatestBlockhash() can come from a different bank than the
        // ER selected for this transaction. The router must choose the bank from
        // the writable accounts first, then provide that bank's blockhash.
        const latest = await routerConnection.getLatestBlockhashForTransaction(transaction, {
          commitment: 'confirmed',
        })
        transaction.recentBlockhash = latest.blockhash
        transaction.lastValidBlockHeight = latest.lastValidBlockHeight

        const simulation = await routerConnection.simulateTransaction(transaction)
        if (simulation.value.err) {
          if (isBlockhashFailure(simulation.value.err) && attempt < 2) continue
          throw new Error(simulationFailureMessage(simulation.value.err, simulation.value.logs, subject))
        }

        const signed = await wallet.signTransaction(transaction)
        try {
          const signature = await routerConnection.sendRawTransaction(signed.serialize(), {
            maxRetries: 5,
            preflightCommitment: 'confirmed',
          })
          const confirmation = await routerConnection.confirmTransaction({ signature, ...latest }, 'confirmed')
          if (confirmation.value.err) {
            throw new Error(`${subject} failed on-chain: ${JSON.stringify(confirmation.value.err)}`)
          }
          return signature
        } catch (error) {
          if (!isBlockhashFailure(error) || attempt >= 2) throw error
        }
      }

      throw new Error(`${subject} could not obtain a usable MagicBlock blockhash`)
    },
    [requireWallet, routerConnection, wallet],
  )

  const requestDevnetUsdc = useCallback(
    async (amount = 1_000n) => {
      const payer = requireWallet()
      const mint = requireMint()
      if (amount <= 0n) throw new Error('Faucet amount must be greater than zero')
      const [faucetMint, mintBump] = PublicKey.findProgramAddressSync(
        [Buffer.from('faucet-mint')],
        DEVNET_USDC_FAUCET_PROGRAM_ID,
      )
      if (!mint.equals(faucetMint)) {
        throw new Error('Configured payment mint is not supported by the shared devnet USDC faucet')
      }

      const destination = getAssociatedTokenAddressSync(mint, payer)
      const data = Buffer.alloc(17)
      data.set(FAUCET_AIRDROP_DISCRIMINATOR, 0)
      data[8] = mintBump
      data.set(encodeU64Le(amount * 1_000_000n), 9)

      const transaction = new Transaction().add(
        createAssociatedTokenAccountIdempotentInstruction(
          payer,
          destination,
          payer,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
        new TransactionInstruction({
          programId: DEVNET_USDC_FAUCET_PROGRAM_ID,
          keys: [
            { pubkey: mint, isSigner: false, isWritable: true },
            { pubkey: destination, isSigner: false, isWritable: true },
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: payer, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
          ],
          data,
        }),
      )
      const signature = await signAndSendBaseTransaction(transaction, 'Devnet USDC faucet request')
      return { signature, destination, amount }
    },
    [requireMint, requireWallet, signAndSendBaseTransaction],
  )

  const fetchSolBalance = useCallback(
    async () => connection.getBalance(requireWallet(), 'confirmed'),
    [connection, requireWallet],
  )

  const requestDevnetSol = useCallback(
    async (amount = 1) => {
      const recipient = requireWallet()
      if (!Number.isFinite(amount) || amount <= 0 || amount > 2) {
        throw new Error('Devnet SOL faucet amount must be between 0 and 2 SOL')
      }

      // Keep faucet traffic away from the application's metered RPC so a rate-limited
      // read endpoint cannot prevent a creator from obtaining devnet transaction fees.
      const faucetConnection = new Connection(clusterApiUrl('devnet'), 'confirmed')
      const signature = await faucetConnection.requestAirdrop(recipient, Math.round(amount * LAMPORTS_PER_SOL))
      await faucetConnection.confirmTransaction(signature, 'confirmed')
      return signature
    },
    [requireWallet],
  )

  const fetchAuctions = useCallback(
    async (auctionIds?: number[]): Promise<ChainAuction[]> => {
      const allRows = await (baseProgram.account as any).auction.all()
      const requested = auctionIds ? new Set(auctionIds) : null
      const rows = requested ? allRows.filter((row: any) => requested.has(Number(row.account.auctionId))) : allRows
      const liveKeys = rows.map((row: any) => new PublicKey(row.account.liveAuction))
      const [liveAccounts, baseInfos] = await Promise.all([
        (routerProgram.account as any).liveAuction.fetchMultiple(liveKeys),
        connection.getMultipleAccountsInfo(liveKeys, 'confirmed'),
      ])

      return rows.map((row: any, index: number) => {
        const account = row.account
        const liveKey = liveKeys[index]
        const live = liveAccounts[index]
        if (!live) throw new Error(`Live auction account ${liveKey.toBase58()} could not be loaded`)
        const baseInfo = baseInfos[index]
        const delegated = Boolean(baseInfo && !baseInfo.owner.equals(CLAIMSPOT_PROGRAM_ID))
        return {
          publicKey: row.publicKey,
          creator: new PublicKey(account.creator),
          paymentMint: new PublicKey(account.paymentMint),
          vault: new PublicKey(account.vault),
          liveAuction: liveKey,
          auctionId: BigInt(account.auctionId),
          titleHash: Array.from(account.titleHash),
          status: enumKey(account.status) as 'live' | 'settled',
          winner: new PublicKey(account.winner),
          winningBid: BigInt(account.winningBid),
          totalDeposited: BigInt(account.totalDeposited),
          totalRefunded: BigInt(account.totalRefunded),
          reservePrice: BigInt(live.reservePrice),
          minIncrement: BigInt(live.minIncrement),
          endsAt: BigInt(live.endsAt),
          highestBid: BigInt(live.highestBid),
          highestBidder: new PublicKey(live.highestBidder),
          bidCount: BigInt(live.bidCount),
          closed: live.closed,
          delegated,
        }
      })
    },
    [baseProgram.account, connection, routerProgram.account],
  )

  const subscribeLiveAuctions = useCallback(
    async (liveAuctions: PublicKey[], onUpdate: (update: LiveAuctionRealtimeUpdate) => void) => {
      const uniqueAccounts = Array.from(new Map(liveAuctions.map((account) => [account.toBase58(), account])).values())
      const statuses = await Promise.allSettled(
        uniqueAccounts.map(async (liveAuction) => ({
          liveAuction,
          status: (await routerConnection.getDelegationStatus(liveAuction)) as MagicBlockDelegationStatus,
        })),
      )
      const accountsByEndpoint = new Map<string, PublicKey[]>()
      for (const result of statuses) {
        if (result.status !== 'fulfilled' || !result.value.status.isDelegated || !result.value.status.fqdn) continue
        const accounts = accountsByEndpoint.get(result.value.status.fqdn) ?? []
        accounts.push(result.value.liveAuction)
        accountsByEndpoint.set(result.value.status.fqdn, accounts)
      }

      const listeners: Array<{ connection: Connection; id: number }> = []
      const publish = (liveAuction: PublicKey, data: Buffer) => {
        try {
          const live = (baseProgram.coder.accounts as any).decode('LiveAuction', data)
          onUpdate({
            liveAuction,
            reservePrice: BigInt(live.reservePrice),
            minIncrement: BigInt(live.minIncrement),
            endsAt: BigInt(live.endsAt),
            highestBid: BigInt(live.highestBid),
            highestBidder: new PublicKey(live.highestBidder),
            bidCount: BigInt(live.bidCount),
            closed: live.closed,
          })
        } catch {
          // A malformed or transient account update is ignored; the periodic
          // base query remains a slower reconciliation fallback.
        }
      }

      for (const [endpoint, accounts] of accountsByEndpoint) {
        const erConnection = new Connection(endpoint, 'confirmed')
        for (const liveAuction of accounts) {
          const id = erConnection.onAccountChange(
            liveAuction,
            (accountInfo) => publish(liveAuction, accountInfo.data),
            // ER state is already confined to the delegated account. Subscribe
            // at processed so the UI sees the validator's real account write
            // immediately; the 30s confirmed query still reconciles durable
            // lifecycle state and protects against a dropped socket message.
            'processed',
          )
          listeners.push({ connection: erConnection, id })
        }

        // Subscribing first and then reading closes the gap between the initial
        // page query and the first pushed account notification.
        try {
          const initialAccounts = await erConnection.getMultipleAccountsInfo(accounts, 'processed')
          initialAccounts.forEach((accountInfo, index) => {
            if (accountInfo) publish(accounts[index], accountInfo.data)
          })
        } catch {
          // The WebSocket listeners stay active and the fallback query can
          // reconcile initial state if this one HTTP read is unavailable.
        }
      }

      return async () => {
        await Promise.allSettled(
          listeners.map(({ connection: erConnection, id }) => erConnection.removeAccountChangeListener(id)),
        )
      }
    },
    [baseProgram.coder.accounts, routerConnection],
  )

  const createAuction = useCallback(
    async (title: string, reserve: bigint, increment: bigint, durationSeconds: number) => {
      const creator = requireWallet()
      const mint = requireMint()
      const auctionId = BigInt(Date.now())
      const auction = auctionPda(creator, auctionId)
      const liveAuction = liveAuctionPda(auction)
      const vault = vaultPda(auction)
      const endsAt = BigInt(Math.floor(Date.now() / 1000) + durationSeconds)
      const titleHash = await hashTitle(title)
      await (baseProgram.methods as any)
        .createAuction(
          new BN(auctionId.toString()),
          titleHash,
          new BN(reserve.toString()),
          new BN(increment.toString()),
          new BN(endsAt.toString()),
        )
        .accounts({
          creator,
          paymentMint: mint,
          auction,
          liveAuction,
          vault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc()
      await (baseProgram.methods as any)
        .delegateLiveAuction()
        .accountsPartial({ payer: creator, creator, auction, liveAuction, validator: null })
        .rpc()
      return auction
    },
    [baseProgram.methods, requireMint, requireWallet],
  )

  const createAndRegisterCampaignLots = useCallback(
    async (
      campaign: PublicKey,
      startingIndex: number,
      lots: CampaignLotInput[],
      onProgress?: (message: string) => void,
    ) => {
      const creator = requireWallet()
      const mint = requireMint()
      if (!wallet.signTransaction) throw new Error('Connected wallet cannot sign transactions')

      const idBase = BigInt(Date.now()) * 100n
      const prepared = await Promise.all(
        lots.map(async (lot, offset) => {
          const lotIndex = startingIndex + offset
          const auctionId = idBase + BigInt(lotIndex)
          const auction = auctionPda(creator, auctionId)
          const liveAuction = liveAuctionPda(auction)
          const vault = vaultPda(auction)
          const endsAt = BigInt(Math.floor(Date.now() / 1000) + lot.durationSeconds)
          const campaignLot = campaignLotPda(campaign, lotIndex)
          const createIx = await (baseProgram.methods as any)
            .createAuction(
              new BN(auctionId.toString()),
              await hashTitle(lot.title),
              new BN(lot.reserve.toString()),
              new BN(lot.increment.toString()),
              new BN(endsAt.toString()),
            )
            .accounts({
              creator,
              paymentMint: mint,
              auction,
              liveAuction,
              vault,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
              rent: SYSVAR_RENT_PUBKEY,
            })
            .instruction()
          const delegateIx = await (baseProgram.methods as any)
            .delegateLiveAuction()
            .accountsPartial({ payer: creator, creator, auction, liveAuction, validator: null })
            .instruction()
          const registerIx = await (baseProgram.methods as any)
            .registerCampaignLot(lotIndex, await hashText(lot.placement), true)
            .accounts({
              creator,
              campaign,
              paymentMint: mint,
              auction,
              campaignLot,
              systemProgram: SystemProgram.programId,
            })
            .instruction()
          return { auction, transaction: new Transaction().add(createIx, delegateIx, registerIx) }
        }),
      )

      const signatures: string[] = []
      for (let start = 0; start < prepared.length; start += LOT_SIGNING_BATCH_SIZE) {
        const batch = prepared.slice(start, start + LOT_SIGNING_BATCH_SIZE)
        let completedInBatch = 0
        let blockhashRefreshes = 0

        // Lot indexes must land in order. If wallet approval or earlier confirms
        // consume the blockhash lifetime, preserve completed lots and re-sign only
        // the remaining suffix with a fresh blockhash.
        while (completedInBatch < batch.length) {
          const remaining = batch.slice(completedInBatch)
          const writeConnection = baseWriteConnections[blockhashRefreshes % baseWriteConnections.length]
          const latest = await writeConnection.getLatestBlockhash('confirmed')
          remaining.forEach(({ transaction }) => {
            transaction.signatures = []
            transaction.feePayer = creator
            transaction.recentBlockhash = latest.blockhash
            transaction.lastValidBlockHeight = latest.lastValidBlockHeight
          })
          const routeSimulation = await writeConnection.simulateTransaction(remaining[0].transaction)
          if (routeSimulation.value.err) {
            if (isBlockhashFailure(routeSimulation.value.err) && blockhashRefreshes < 3) {
              blockhashRefreshes += 1
              continue
            }
            throw new Error(
              simulationFailureMessage(routeSimulation.value.err, routeSimulation.value.logs, 'Campaign lot batch'),
            )
          }
          const firstLot = startingIndex + start + completedInBatch + 1
          const lastLot = startingIndex + start + batch.length
          onProgress?.(
            blockhashRefreshes > 0
              ? `Blockhash refreshed — approve remaining lots ${firstLot}–${lastLot}`
              : `Approve lots ${firstLot}–${lastLot} in one wallet batch`,
          )
          const signed = wallet.signAllTransactions
            ? await wallet.signAllTransactions(remaining.map(({ transaction }) => transaction))
            : await Promise.all(remaining.map(({ transaction }) => wallet.signTransaction!(transaction)))

          let refreshBlockhash = false
          for (let offset = 0; offset < signed.length; offset += 1) {
            const absoluteLot = startingIndex + start + completedInBatch + 1
            onProgress?.(`Confirming lot ${absoluteLot} of ${startingIndex + lots.length}`)
            try {
              const signature = await writeConnection.sendRawTransaction(signed[offset].serialize(), {
                maxRetries: 5,
                preflightCommitment: 'confirmed',
              })
              const confirmation = await writeConnection.confirmTransaction({ signature, ...latest }, 'confirmed')
              if (confirmation.value.err) {
                throw new Error(`Lot ${absoluteLot} failed on-chain: ${JSON.stringify(confirmation.value.err)}`)
              }
              signatures.push(signature)
              completedInBatch += 1
            } catch (error) {
              if (!isRetryableRpcFailure(error) || blockhashRefreshes >= 3) throw error
              blockhashRefreshes += 1
              refreshBlockhash = true
              break
            }
          }
          if (!refreshBlockhash) break
        }
      }

      return { auctions: prepared.map(({ auction }) => auction), signatures }
    },
    [baseProgram.methods, baseWriteConnections, requireMint, requireWallet, wallet],
  )

  const createBidSession = useCallback(async () => {
    const authority = requireWallet()
    if (!wallet.signTransaction) throw new Error('Connected wallet cannot create a bidding session')
    const signer = Keypair.generate()
    const manager = new SessionTokenManager(wallet as any, connection)
    const token = PublicKey.findProgramAddressSync(
      [SESSION_TOKEN_SEED, CLAIMSPOT_PROGRAM_ID.toBuffer(), signer.publicKey.toBuffer(), authority.toBuffer()],
      manager.program.programId,
    )[0]
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS
    const transaction = await (manager.program.methods as any)
      .createSessionV2(true, new BN(expiresAt), new BN(SESSION_TOP_UP_LAMPORTS))
      .accounts({
        targetProgram: CLAIMSPOT_PROGRAM_ID,
        sessionSigner: signer.publicKey,
        feePayer: authority,
        authority,
      })
      .transaction()
    const latest = await connection.getLatestBlockhash('confirmed')
    transaction.feePayer = authority
    transaction.recentBlockhash = latest.blockhash
    transaction.partialSign(signer)
    const signed = await wallet.signTransaction(transaction)
    const createSignature = await connection.sendRawTransaction(signed.serialize(), { maxRetries: 5 })
    await connection.confirmTransaction({ signature: createSignature, ...latest }, 'confirmed')
    const session = { signer, token, authority, expiresAt, createSignature }
    setBidSession(session)
    return session
  }, [connection, requireWallet, wallet])

  const revokeBidSession = useCallback(async () => {
    const authority = requireWallet()
    if (!bidSession || !bidSession.authority.equals(authority)) return null
    if (!wallet.signTransaction) throw new Error('Connected wallet cannot revoke the bidding session')
    const manager = new SessionTokenManager(wallet as any, connection)
    const transaction = await (manager.program.methods as any)
      .revokeSessionV2()
      .accounts({
        sessionToken: bidSession.token,
        feePayer: authority,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .transaction()
    const latest = await connection.getLatestBlockhash('confirmed')
    transaction.feePayer = authority
    transaction.recentBlockhash = latest.blockhash
    const signed = await wallet.signTransaction(transaction)
    const signature = await connection.sendRawTransaction(signed.serialize(), { maxRetries: 5 })
    await connection.confirmTransaction({ signature, ...latest }, 'confirmed')
    setBidSession(null)
    return signature
  }, [bidSession, connection, requireWallet, wallet])

  const fundAndDelegateBid = useCallback(
    async (auction: ChainAuction, maxAmount: bigint) => {
      const bidder = requireWallet()
      const mint = requireMint()
      const bidEscrow = bidEscrowPda(auction.publicKey, bidder)
      const bidderTokens = getAssociatedTokenAddressSync(mint, bidder)
      const existing = await connection.getAccountInfo(bidEscrow)
      if (existing) throw new Error('Bid budget already exists. Undelegate it before topping up.')

      const openIx = await (baseProgram.methods as any)
        .openBidEscrow(new BN(maxAmount.toString()))
        .accounts({
          bidder,
          auction: auction.publicKey,
          paymentMint: mint,
          bidEscrow,
          bidderTokens,
          vault: auction.vault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
      const delegateIx = await (baseProgram.methods as any)
        .delegateBidEscrow()
        .accountsPartial({
          payer: bidder,
          bidder,
          auction: auction.publicKey,
          bidEscrow,
          validator: null,
        })
        .instruction()
      const transaction = new Transaction().add(
        createAssociatedTokenAccountIdempotentInstruction(
          bidder,
          bidderTokens,
          bidder,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
        openIx,
        delegateIx,
      )
      const latest = await connection.getLatestBlockhash('confirmed')
      transaction.feePayer = bidder
      transaction.recentBlockhash = latest.blockhash

      // Phantom's sendTransaction path can collapse wallet/RPC failures into the
      // unhelpful `WalletSendTransactionError: Unexpected error`. Simulate the
      // complete base-layer transaction ourselves, then ask the wallet only to
      // sign and submit the signed bytes through the configured RPC.
      const simulation = await connection.simulateTransaction(transaction)
      if (simulation.value.err) {
        throw new Error(simulationFailureMessage(simulation.value.err, simulation.value.logs, 'Budget transaction'))
      }
      if (!wallet.signTransaction) throw new Error('Connected wallet cannot sign this budget transaction')
      const signed = await wallet.signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        maxRetries: 5,
        preflightCommitment: 'confirmed',
      })
      await connection.confirmTransaction({ signature, ...latest }, 'confirmed')

      // A confirmed base-layer delegation can take a few seconds to appear in
      // the router and in the selected ER bank. Do not tell the UI that bidding
      // is ready until both surfaces can see the delegated account.
      let delegationReady = false
      for (let attempt = 0; attempt < DELEGATION_PROPAGATION_ATTEMPTS; attempt += 1) {
        try {
          const status = (await routerConnection.getDelegationStatus(bidEscrow)) as MagicBlockDelegationStatus
          if (status.isDelegated && status.fqdn) {
            const erProvider = new AnchorProvider(new Connection(status.fqdn, 'confirmed'), wallet as AnchorWallet, {
              commitment: 'confirmed',
            })
            const erProgram = getBasicProgram(erProvider)
            const account = await (erProgram.account as any).bidEscrow.fetchNullable(bidEscrow)
            if (account) {
              delegationReady = true
              break
            }
          }
        } catch {
          // Router/ER propagation is eventually consistent; retry below.
        }
        if (attempt < DELEGATION_PROPAGATION_ATTEMPTS - 1) {
          await wait(DELEGATION_PROPAGATION_DELAY_MS)
        }
      }

      return { bidEscrow, openSignature: signature, delegateSignature: signature, delegationReady }
    },
    [baseProgram.methods, connection, requireMint, requireWallet, routerConnection, wallet],
  )

  const placeBid = useCallback(
    async (auction: ChainAuction, amount: bigint) => {
      const bidder = requireWallet()
      const activeSession =
        bidSession && bidSession.authority.equals(bidder) && bidSession.expiresAt > Math.floor(Date.now() / 1000) + 15
          ? bidSession
          : null
      if (!activeSession) {
        const transaction = await (routerProgram.methods as any)
          .placeBid(new BN(amount.toString()))
          .accounts({
            liveAuction: auction.liveAuction,
            auction: auction.publicKey,
            bidEscrow: bidEscrowPda(auction.publicKey, bidder),
            bidder,
            payer: bidder,
            sessionToken: null,
          })
          .transaction()
        return signAndSendRouterTransaction(transaction, 'MagicBlock bid')
      }

      const transaction = await (routerProgram.methods as any)
        .placeBid(new BN(amount.toString()))
        .accounts({
          liveAuction: auction.liveAuction,
          auction: auction.publicKey,
          bidEscrow: bidEscrowPda(auction.publicKey, bidder),
          bidder,
          payer: activeSession.signer.publicKey,
          sessionToken: activeSession.token,
        })
        .transaction()
      const latest = await routerConnection.getLatestBlockhash('confirmed')
      transaction.feePayer = activeSession.signer.publicKey
      transaction.recentBlockhash = latest.blockhash
      transaction.sign(activeSession.signer)
      const signature = await routerConnection.sendRawTransaction(transaction.serialize(), {
        maxRetries: 5,
        preflightCommitment: 'confirmed',
      })
      await routerConnection.confirmTransaction({ signature, ...latest }, 'confirmed')
      return signature
    },
    [bidSession, requireWallet, routerConnection, routerProgram.methods, signAndSendRouterTransaction],
  )

  const fetchBidEscrow = useCallback(
    async (auction: PublicKey): Promise<ChainBidEscrow | null> => {
      if (!wallet.publicKey) return null
      const publicKey = bidEscrowPda(auction, wallet.publicKey)
      try {
        const status = (await routerConnection.getDelegationStatus(publicKey)) as MagicBlockDelegationStatus
        if (status.isDelegated && status.fqdn) {
          // Read from the exact ER selected by the router. During propagation,
          // the router can know the delegation slightly before the clone is
          // readable, so fall through to the base copy instead of failing the
          // React Query and leaving stale UI state behind.
          const erProvider = new AnchorProvider(new Connection(status.fqdn, 'confirmed'), wallet as AnchorWallet, {
            commitment: 'confirmed',
          })
          const erProgram = getBasicProgram(erProvider)
          const account = await (erProgram.account as any).bidEscrow.fetchNullable(publicKey)
          if (account) {
            return {
              publicKey,
              auction,
              bidder: wallet.publicKey,
              deposited: BigInt(account.deposited),
              currentBid: BigInt(account.currentBid),
              claimed: account.claimed,
              delegated: true,
            }
          }
        }
      } catch {
        // A base-layer read below keeps the pending delegation visible while
        // the router or ER is briefly unavailable.
      }

      const baseInfo = await connection.getAccountInfo(publicKey)
      if (!baseInfo) return null
      const account = await (baseProgram.account as any).bidEscrow.fetch(publicKey)
      return {
        publicKey,
        auction,
        bidder: wallet.publicKey,
        deposited: BigInt(account.deposited),
        currentBid: BigInt(account.currentBid),
        claimed: account.claimed,
        delegated: false,
      }
    },
    [baseProgram.account, connection, routerConnection, wallet],
  )

  const fetchUndelegatedBidEscrows = useCallback(async (): Promise<ChainBidEscrow[]> => {
    if (!wallet.publicKey) return []
    const rows = await (baseProgram.account as any).bidEscrow.all([
      { memcmp: { offset: 40, bytes: wallet.publicKey.toBase58() } },
    ])
    return rows.map((row: any) => ({
      publicKey: row.publicKey,
      auction: new PublicKey(row.account.auction),
      bidder: new PublicKey(row.account.bidder),
      deposited: BigInt(row.account.deposited),
      currentBid: BigInt(row.account.currentBid),
      claimed: row.account.claimed,
      delegated: false,
    }))
  }, [baseProgram.account, wallet.publicKey])

  const fetchCampaigns = useCallback(async (): Promise<ChainCampaign[]> => {
    const rows = await (baseProgram.account as any).campaign.all()
    return rows.map((row: any) => ({
      publicKey: row.publicKey,
      creator: new PublicKey(row.account.creator),
      moderator: new PublicKey(row.account.moderator),
      paymentMint: new PublicKey(row.account.paymentMint),
      campaignId: BigInt(row.account.campaignId),
      titleHash: Array.from(row.account.titleHash),
      detailsHash: Array.from(row.account.detailsHash),
      status: enumKey(row.account.status) as 'draft' | 'live',
      lotCount: row.account.lotCount,
      acceptedProofs: row.account.acceptedProofs,
      createdAt: BigInt(row.account.createdAt),
      publishedAt: BigInt(row.account.publishedAt),
    }))
  }, [baseProgram.account])

  const fetchCampaignLots = useCallback(async (): Promise<ChainCampaignLot[]> => {
    const rows = await (baseProgram.account as any).campaignLot.all()
    return rows.map((row: any) => ({
      publicKey: row.publicKey,
      campaign: new PublicKey(row.account.campaign),
      auction: new PublicKey(row.account.auction),
      lotIndex: row.account.lotIndex,
      placementHash: Array.from(row.account.placementHash),
      creativeRequired: row.account.creativeRequired,
    }))
  }, [baseProgram.account])

  const fetchCreatives = useCallback(async (): Promise<ChainCreative[]> => {
    const rows = await (baseProgram.account as any).creativeSubmission.all()
    return rows.map((row: any) => ({
      publicKey: row.publicKey,
      auction: new PublicKey(row.account.auction),
      submitter: new PublicKey(row.account.submitter),
      contentHash: Array.from(row.account.contentHash),
      status: enumKey(row.account.status) as ChainCreative['status'],
      reviewer: new PublicKey(row.account.reviewer),
      reasonHash: Array.from(row.account.reasonHash),
      submittedAt: BigInt(row.account.submittedAt),
      reviewedAt: BigInt(row.account.reviewedAt),
    }))
  }, [baseProgram.account])

  const fetchProofs = useCallback(async (): Promise<ChainProof[]> => {
    const rows = await (baseProgram.account as any).fulfillmentProof.all()
    return rows.map((row: any) => ({
      publicKey: row.publicKey,
      auction: new PublicKey(row.account.auction),
      creator: new PublicKey(row.account.creator),
      contentHash: Array.from(row.account.contentHash),
      status: enumKey(row.account.status) as ChainProof['status'],
      reviewer: new PublicKey(row.account.reviewer),
      submittedAt: BigInt(row.account.submittedAt),
      reviewedAt: BigInt(row.account.reviewedAt),
    }))
  }, [baseProgram.account])

  const fetchReceipts = useCallback(async (): Promise<ChainSettlementReceipt[]> => {
    const rows = await (baseProgram.account as any).settlementReceipt.all()
    return rows.map((row: any) => ({
      publicKey: row.publicKey,
      auction: new PublicKey(row.account.auction),
      creator: new PublicKey(row.account.creator),
      winner: new PublicKey(row.account.winner),
      paymentMint: new PublicKey(row.account.paymentMint),
      amount: BigInt(row.account.amount),
      titleHash: Array.from(row.account.titleHash),
      settledAt: BigInt(row.account.settledAt),
    }))
  }, [baseProgram.account])

  const createCampaign = useCallback(
    async (title: string, details: string, moderator?: PublicKey) => {
      const creator = requireWallet()
      const mint = requireMint()
      const campaignId = BigInt(Date.now())
      const campaign = campaignPda(creator, campaignId)
      const instruction = await (baseProgram.methods as any)
        .createCampaign(
          new BN(campaignId.toString()),
          await hashText(title),
          await hashText(details),
          moderator ?? creator,
        )
        .accounts({ creator, paymentMint: mint, campaign, systemProgram: SystemProgram.programId })
        .instruction()
      const signature = await signAndSendBaseTransaction(new Transaction().add(instruction), 'Campaign creation')
      return { campaign, campaignId, signature }
    },
    [baseProgram.methods, requireMint, requireWallet, signAndSendBaseTransaction],
  )

  const registerCampaignLot = useCallback(
    async (campaign: PublicKey, auction: PublicKey, lotIndex: number, placement: string, creativeRequired = true) => {
      const creator = requireWallet()
      const paymentMint = requireMint()
      const campaignLot = campaignLotPda(campaign, lotIndex)
      const signature = await (baseProgram.methods as any)
        .registerCampaignLot(lotIndex, await hashText(placement), creativeRequired)
        .accounts({
          creator,
          campaign,
          paymentMint,
          auction,
          campaignLot,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      return { campaignLot, signature }
    },
    [baseProgram.methods, requireMint, requireWallet],
  )

  const publishCampaign = useCallback(
    async (campaign: PublicKey) => {
      const creator = requireWallet()
      const instruction = await (baseProgram.methods as any)
        .publishCampaign()
        .accounts({ creator, campaign })
        .instruction()
      return signAndSendBaseTransaction(new Transaction().add(instruction), 'Campaign publication')
    },
    [baseProgram.methods, requireWallet, signAndSendBaseTransaction],
  )

  const submitCreative = useCallback(
    async (auction: PublicKey, contentHash: number[]) => {
      const submitter = requireWallet()
      const creative = creativePda(auction, submitter)
      const signature = await (baseProgram.methods as any)
        .submitCreative(contentHash)
        .accounts({ submitter, auction, creative, systemProgram: SystemProgram.programId })
        .rpc()
      return { creative, signature }
    },
    [baseProgram.methods, requireWallet],
  )

  const reviewCreative = useCallback(
    async (
      campaign: PublicKey,
      campaignLot: PublicKey,
      auction: PublicKey,
      creative: PublicKey,
      approved: boolean,
      reason: string,
    ) => {
      const moderator = requireWallet()
      const reasonHash = approved ? new Array(32).fill(0) : await hashText(reason)
      return (baseProgram.methods as any)
        .reviewCreative(approved, reasonHash)
        .accounts({ moderator, campaign, campaignLot, auction, creative })
        .rpc()
    },
    [baseProgram.methods, requireWallet],
  )

  const submitProof = useCallback(
    async (auction: PublicKey, contentHash: number[]) => {
      const creator = requireWallet()
      const proof = proofPda(auction)
      const signature = await (baseProgram.methods as any)
        .submitFulfillmentProof(contentHash)
        .accounts({ creator, auction, proof, systemProgram: SystemProgram.programId })
        .rpc()
      return { proof, signature }
    },
    [baseProgram.methods, requireWallet],
  )

  const reviewProof = useCallback(
    async (campaign: PublicKey, campaignLot: PublicKey, auction: PublicKey, proof: PublicKey, accepted: boolean) => {
      const winner = requireWallet()
      return (baseProgram.methods as any)
        .reviewFulfillmentProof(accepted)
        .accounts({ winner, campaign, campaignLot, auction, proof })
        .rpc()
    },
    [baseProgram.methods, requireWallet],
  )

  const closeAuction = useCallback(
    async (auction: ChainAuction) => {
      const payer = requireWallet()
      const transaction = await (routerProgram.methods as any)
        .closeAndUndelegate()
        .accountsPartial({
          payer,
          liveAuction: auction.liveAuction,
          winnerBid:
            auction.bidCount > 0n && !auction.highestBidder.equals(PublicKey.default)
              ? bidEscrowPda(auction.publicKey, auction.highestBidder)
              : null,
        })
        .transaction()
      return signAndSendRouterTransaction(transaction, 'Auction close and return')
    },
    [requireWallet, routerProgram.methods, signAndSendRouterTransaction],
  )

  const undelegateMyBid = useCallback(
    async (auction: PublicKey) => {
      const bidder = requireWallet()
      const transaction = await (routerProgram.methods as any)
        .undelegateBidEscrow()
        .accounts({ bidder, auction, bidEscrow: bidEscrowPda(auction, bidder) })
        .transaction()
      return signAndSendRouterTransaction(transaction, 'Bid escrow return')
    },
    [requireWallet, routerProgram.methods, signAndSendRouterTransaction],
  )

  const finalizeNoBid = useCallback(
    async (auction: ChainAuction) => {
      const payer = requireWallet()
      return (baseProgram.methods as any)
        .finalizeNoBidAuction()
        .accounts({ payer, auction: auction.publicKey, liveAuction: auction.liveAuction })
        .rpc()
    },
    [baseProgram.methods, requireWallet],
  )

  const finalizeAuction = useCallback(
    async (auction: ChainAuction) => {
      const payer = requireWallet()
      if (auction.highestBidder.equals(PublicKey.default)) throw new Error('Auction has no winner')
      const winnerTokens = getAssociatedTokenAddressSync(auction.paymentMint, auction.highestBidder)
      return (baseProgram.methods as any)
        .finalizeAuction()
        .accounts({
          payer,
          auction: auction.publicKey,
          liveAuction: auction.liveAuction,
          winnerBid: bidEscrowPda(auction.publicKey, auction.highestBidder),
          vault: auction.vault,
          winnerTokens,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .preInstructions([
          createAssociatedTokenAccountIdempotentInstruction(
            payer,
            winnerTokens,
            auction.highestBidder,
            auction.paymentMint,
          ),
        ])
        .rpc()
    },
    [baseProgram.methods, requireWallet],
  )

  const releasePayment = useCallback(
    async (
      auction: ChainAuction,
      campaign: PublicKey,
      campaignLot: PublicKey,
      creative: PublicKey,
      proof: PublicKey,
    ) => {
      const payer = requireWallet()
      const creatorTokens = getAssociatedTokenAddressSync(auction.paymentMint, auction.creator)
      return (baseProgram.methods as any)
        .releasePayment()
        .accounts({
          payer,
          auction: auction.publicKey,
          creator: auction.creator,
          paymentMint: auction.paymentMint,
          campaignLot,
          campaign,
          creative,
          proof,
          vault: auction.vault,
          creatorTokens,
          receipt: receiptPda(auction.publicKey),
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions([
          createAssociatedTokenAccountIdempotentInstruction(payer, creatorTokens, auction.creator, auction.paymentMint),
        ])
        .rpc()
    },
    [baseProgram.methods, requireWallet],
  )

  const claimRefund = useCallback(
    async (auction: ChainAuction) => {
      const bidder = requireWallet()
      const bidderTokens = getAssociatedTokenAddressSync(auction.paymentMint, bidder)
      return (baseProgram.methods as any)
        .claimRefund()
        .accounts({
          bidder,
          auction: auction.publicKey,
          paymentMint: auction.paymentMint,
          bidEscrow: bidEscrowPda(auction.publicKey, bidder),
          vault: auction.vault,
          bidderTokens,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .preInstructions([
          createAssociatedTokenAccountIdempotentInstruction(bidder, bidderTokens, bidder, auction.paymentMint),
        ])
        .rpc()
    },
    [baseProgram.methods, requireWallet],
  )

  return {
    baseProgram,
    routerProgram,
    wallet,
    requestDevnetUsdc,
    requestDevnetSol,
    fetchSolBalance,
    fetchAuctions,
    subscribeLiveAuctions,
    createAuction,
    createAndRegisterCampaignLots,
    bidSession,
    createBidSession,
    revokeBidSession,
    fundAndDelegateBid,
    placeBid,
    fetchBidEscrow,
    fetchUndelegatedBidEscrows,
    fetchCampaigns,
    fetchCampaignLots,
    fetchCreatives,
    fetchProofs,
    fetchReceipts,
    createCampaign,
    registerCampaignLot,
    publishCampaign,
    submitCreative,
    reviewCreative,
    submitProof,
    reviewProof,
    closeAuction,
    undelegateMyBid,
    finalizeNoBid,
    finalizeAuction,
    releasePayment,
    claimRefund,
  }
}
