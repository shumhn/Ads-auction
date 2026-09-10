/* eslint-disable @typescript-eslint/no-explicit-any -- E2E script consumes generated Anchor namespaces */
import { AnchorProvider, BN, Program, Wallet } from '@anchor-lang/core'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { ConnectionMagicRouter } from '@magicblock-labs/ephemeral-rollups-sdk'
import { SessionTokenManager } from '@magicblock-labs/gum-sdk'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import idl from '../target/idl/ads_auction.json'
import { DEVNET_USDC_MINT, requestDevnetUsdc } from './devnet-usdc'

const baseRpc = process.env.SOLANA_RPC_URL
if (!baseRpc) throw new Error('SOLANA_RPC_URL is required')
const routerRpc = process.env.MAGIC_ROUTER_RPC ?? 'https://devnet-router.magicblock.app'
const programId = new PublicKey(idl.address)
const mint = new PublicKey(process.env.PAYMENT_MINT ?? DEVNET_USDC_MINT.toBase58())
const atoms = (usdc: number) => BigInt(Math.round(usdc * 1_000_000))
const bn = (value: bigint) => new BN(value.toString())
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function load(name: string) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(`anchor/.keys/${name}.json`, 'utf8'))))
}

function client(connection: Connection, signer: Keypair) {
  return new Program(idl as any, new AnchorProvider(connection, new Wallet(signer), { commitment: 'confirmed' }))
}

function u64(value: bigint) {
  const out = Buffer.alloc(8)
  out.writeBigUInt64LE(value)
  return out
}

function auctionPdas(creator: PublicKey, id: bigint) {
  const auction = PublicKey.findProgramAddressSync([Buffer.from('auction'), creator.toBuffer(), u64(id)], programId)[0]
  return {
    auction,
    liveAuction: PublicKey.findProgramAddressSync([Buffer.from('live_auction'), auction.toBuffer()], programId)[0],
    vault: PublicKey.findProgramAddressSync([Buffer.from('vault'), auction.toBuffer()], programId)[0],
    receipt: PublicKey.findProgramAddressSync([Buffer.from('receipt'), auction.toBuffer()], programId)[0],
  }
}

function bidPda(auction: PublicKey, bidder: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from('bid'), auction.toBuffer(), bidder.toBuffer()], programId)[0]
}

async function waitForBaseOwner(connection: Connection, address: PublicKey, seconds = 120) {
  for (let index = 0; index < seconds; index += 1) {
    const account = await connection.getAccountInfo(address, 'confirmed')
    if (account?.owner.equals(programId)) return
    await sleep(1_000)
  }
  throw new Error(`Timed out waiting for ${address.toBase58()} to return to base ownership`)
}

async function fundSigner(connection: Connection, payer: Keypair, recipient: Keypair) {
  if ((await connection.getBalance(recipient.publicKey)) < 0.03 * LAMPORTS_PER_SOL) {
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: recipient.publicKey,
          lamports: 0.05 * LAMPORTS_PER_SOL,
        }),
      ),
      [payer],
    )
  }
  const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, recipient.publicKey)
  if ((await getAccount(connection, ata.address)).amount < atoms(500)) {
    if (!mint.equals(DEVNET_USDC_MINT)) throw new Error('Automatic E2E funding only supports shared devnet USDC')
    const faucet = await requestDevnetUsdc(connection, payer, recipient.publicKey, 1_000n)
    console.log('faucet', recipient.publicKey.toBase58(), faucet.signature)
  }
  return ata.address
}

async function main() {
  const base = new Connection(baseRpc!, 'confirmed')
  const router = new ConnectionMagicRouter(routerRpc, 'confirmed')
  const creator = load('devnet-deployer')
  const bidderA = load('devnet-bidder-a')
  const bidderB = load('devnet-bidder-b')
  const bidderAtaA = await fundSigner(base, creator, bidderA)
  const bidderAtaB = await fundSigner(base, creator, bidderB)

  const id = BigInt(Date.now())
  const { auction, liveAuction, vault, receipt } = auctionPdas(creator.publicKey, id)
  const bidA = bidPda(auction, bidderA.publicKey)
  const bidB = bidPda(auction, bidderB.publicKey)
  const endsAt = BigInt(Math.floor(Date.now() / 1000) + 55)
  const titleHash = Array.from(createHash('sha256').update('ClaimSpot real devnet E2E').digest())
  const creatorBase = client(base, creator)

  const createSig = await (creatorBase.methods as any)
    .createAuction(bn(id), titleHash, bn(atoms(50)), bn(atoms(5)), bn(endsAt))
    .accounts({
      creator: creator.publicKey,
      paymentMint: mint,
      auction,
      liveAuction,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([creator])
    .rpc()
  console.log('create', createSig)
  await (creatorBase.methods as any)
    .delegateLiveAuction()
    .accountsPartial({ payer: creator.publicKey, creator: creator.publicKey, auction, liveAuction, validator: null })
    .signers([creator])
    .rpc()

  for (const [bidder, bidderTokens, bidEscrow, budget] of [
    [bidderA, bidderAtaA, bidA, atoms(200)],
    [bidderB, bidderAtaB, bidB, atoms(250)],
  ] as const) {
    const bidderBase = client(base, bidder)
    const openIx = await (bidderBase.methods as any)
      .openBidEscrow(bn(budget))
      .accounts({
        bidder: bidder.publicKey,
        auction,
        paymentMint: mint,
        bidEscrow,
        bidderTokens,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction()
    const delegateIx = await (bidderBase.methods as any)
      .delegateBidEscrow()
      .accountsPartial({ payer: bidder.publicKey, bidder: bidder.publicKey, auction, bidEscrow, validator: null })
      .instruction()
    await sendAndConfirmTransaction(
      base,
      new Transaction().add(
        createAssociatedTokenAccountIdempotentInstruction(bidder.publicKey, bidderTokens, bidder.publicKey, mint),
        openIx,
        delegateIx,
      ),
      [bidder],
      { commitment: 'confirmed' },
    )
  }

  await sleep(2_000)
  const delegation = (await router.getDelegationStatus(liveAuction)) as { isDelegated: boolean; fqdn?: string }
  if (!delegation.isDelegated || !delegation.fqdn) throw new Error('Live auction has no router-selected ER endpoint')
  const erConnection = new Connection(delegation.fqdn, 'confirmed')
  let pushCount = 0
  let resolvePushes: (() => void) | null = null
  const pushedTwice = new Promise<void>((resolve) => {
    resolvePushes = resolve
  })
  const subscriptionId = erConnection.onAccountChange(
    liveAuction,
    () => {
      pushCount += 1
      if (pushCount >= 2) resolvePushes?.()
    },
    'confirmed',
  )
  await sleep(750)
  const bidderARouter = client(router, bidderA)
  const bidderBRouter = client(router, bidderB)
  const bidSigA = await (bidderARouter.methods as any)
    .placeBid(bn(atoms(100)))
    .accounts({
      liveAuction,
      auction,
      bidEscrow: bidA,
      bidder: bidderA.publicKey,
      payer: bidderA.publicKey,
      sessionToken: null,
    })
    .signers([bidderA])
    .rpc()
  const sessionSigner = Keypair.generate()
  const sessionManager = new SessionTokenManager(new Wallet(bidderB) as any, base)
  const sessionToken = PublicKey.findProgramAddressSync(
    [
      Buffer.from('session_token_v2'),
      programId.toBuffer(),
      sessionSigner.publicKey.toBuffer(),
      bidderB.publicKey.toBuffer(),
    ],
    sessionManager.program.programId,
  )[0]
  const createSessionTx = await (sessionManager.program.methods as any)
    .createSessionV2(true, bn(BigInt(Math.floor(Date.now() / 1000) + 3600)), bn(5_000_000n))
    .accounts({
      targetProgram: programId,
      sessionSigner: sessionSigner.publicKey,
      feePayer: bidderB.publicKey,
      authority: bidderB.publicKey,
    })
    .transaction()
  const sessionSig = await sendAndConfirmTransaction(base, createSessionTx, [bidderB, sessionSigner], {
    commitment: 'confirmed',
  })
  const bidSessionTx = await (bidderBRouter.methods as any)
    .placeBid(bn(atoms(125)))
    .accounts({
      liveAuction,
      auction,
      bidEscrow: bidB,
      bidder: bidderB.publicKey,
      payer: sessionSigner.publicKey,
      sessionToken,
    })
    .transaction()
  const sessionLatest = await router.getLatestBlockhash('confirmed')
  bidSessionTx.feePayer = sessionSigner.publicKey
  bidSessionTx.recentBlockhash = sessionLatest.blockhash
  bidSessionTx.sign(sessionSigner)
  const bidSigB = await router.sendRawTransaction(bidSessionTx.serialize(), { maxRetries: 5 })
  await router.confirmTransaction({ signature: bidSigB, ...sessionLatest }, 'confirmed')
  await Promise.race([
    pushedTwice,
    sleep(10_000).then(() => {
      throw new Error(`Expected two ER WebSocket pushes, received ${pushCount}`)
    }),
  ])
  await erConnection.removeAccountChangeListener(subscriptionId)
  console.log('ER bids', bidSigA, bidSigB)
  console.log('session create', sessionSig, 'token', sessionToken.toBase58())
  console.log('ER websocket pushes', pushCount, delegation.fqdn)

  const creatorRouter = client(router, creator)
  const live = await (creatorRouter.account as any).liveAuction.fetch(liveAuction)
  const actualEndsAt = Number(live.endsAt)
  const waitMs = Math.max(0, actualEndsAt * 1_000 - Date.now() + 1_000)
  console.log(`waiting ${Math.ceil(waitMs / 1_000)}s for close`)
  await sleep(waitMs)

  const winner = new PublicKey(live.highestBidder)
  const winnerBid = bidPda(auction, winner)
  const closeSig = await (creatorRouter.methods as any)
    .closeAndUndelegate()
    .accountsPartial({ payer: creator.publicKey, liveAuction, winnerBid })
    .signers([creator])
    .rpc()
  console.log('close+undelegate', closeSig)
  await Promise.all([waitForBaseOwner(base, liveAuction), waitForBaseOwner(base, winnerBid)])

  const winnerAta = winner.equals(bidderA.publicKey) ? bidderAtaA : bidderAtaB
  const winnerBefore = (await getAccount(base, winnerAta)).amount
  const finalizeSig = await (creatorBase.methods as any)
    .finalizeAuction()
    .accounts({
      payer: creator.publicKey,
      auction,
      liveAuction,
      winnerBid,
      vault,
      winnerTokens: winnerAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([creator])
    .rpc()
  const winnerAfter = (await getAccount(base, winnerAta)).amount
  console.log(
    'lock winner',
    finalizeSig,
    'winner excess returned',
    Number(winnerAfter - winnerBefore) / 1_000_000,
    'USDC',
  )

  const loser = winner.equals(bidderA.publicKey) ? bidderB : bidderA
  const loserAta = winner.equals(bidderA.publicKey) ? bidderAtaB : bidderAtaA
  const loserBid = bidPda(auction, loser.publicKey)
  const loserRouter = client(router, loser)
  await (loserRouter.methods as any)
    .undelegateBidEscrow()
    .accounts({ bidder: loser.publicKey, auction, bidEscrow: loserBid })
    .signers([loser])
    .rpc()
  await waitForBaseOwner(base, loserBid)
  const loserBefore = (await getAccount(base, loserAta)).amount
  const refundSig = await (client(base, loser).methods as any)
    .claimRefund()
    .accounts({
      bidder: loser.publicKey,
      auction,
      paymentMint: mint,
      bidEscrow: loserBid,
      vault,
      bidderTokens: loserAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([loser])
    .rpc()
  const loserAfter = (await getAccount(base, loserAta)).amount
  const receiptInfo = await base.getAccountInfo(receipt)
  const vaultAfter = (await getAccount(base, vault)).amount
  if (receiptInfo || winnerAfter <= winnerBefore || loserAfter <= loserBefore || vaultAfter !== atoms(125)) {
    throw new Error('Winner lock/refund proof mismatch')
  }

  console.log('refund', refundSig, Number(loserAfter - loserBefore) / 1_000_000, 'USDC')
  console.log('AUCTION E2E PASS — winning USDC remains proof-gated in the vault')
  console.log(`SETTLED_AUCTION=${auction.toBase58()}`)
  console.log(`auction https://explorer.solana.com/address/${auction.toBase58()}?cluster=devnet`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
