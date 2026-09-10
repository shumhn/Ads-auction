/* eslint-disable @typescript-eslint/no-explicit-any -- the generated Anchor namespaces are intentionally dynamic */
import { AnchorProvider, BN, Program, Wallet } from '@anchor-lang/core'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { getAccount, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import idl from '../anchor/target/idl/basic.json'

const rpcUrl = process.env.SOLANA_RPC_URL
if (!rpcUrl) throw new Error('SOLANA_RPC_URL is required')
const settledAuctionAddress = process.env.SETTLED_AUCTION
if (!settledAuctionAddress) throw new Error('SETTLED_AUCTION is required; use the fresh auction from e2e:devnet')

const programId = new PublicKey(idl.address)
const settledAuction = new PublicKey(settledAuctionAddress)

function load(name: string) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(`anchor/.keys/${name}.json`, 'utf8'))))
}

function u64(value: bigint) {
  const output = Buffer.alloc(8)
  output.writeBigUInt64LE(value)
  return output
}

function u16(value: number) {
  const output = Buffer.alloc(2)
  output.writeUInt16LE(value)
  return output
}

function digest(value: string) {
  return Array.from(createHash('sha256').update(value).digest())
}

function contentDigest(envName: 'CREATIVE_HASH_HEX' | 'PROOF_HASH_HEX', fallback: string) {
  const value = process.env[envName]
  if (!value) return digest(fallback)
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error(`${envName} must be a lowercase SHA-256 hex digest`)
  return Array.from(Buffer.from(value, 'hex'))
}

function campaignPda(creator: PublicKey, id: bigint) {
  return PublicKey.findProgramAddressSync([Buffer.from('campaign'), creator.toBuffer(), u64(id)], programId)[0]
}

function campaignLotPda(campaign: PublicKey, index: number) {
  return PublicKey.findProgramAddressSync([Buffer.from('campaign_lot'), campaign.toBuffer(), u16(index)], programId)[0]
}

function creativePda(auction: PublicKey, submitter: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('creative'), auction.toBuffer(), submitter.toBuffer()],
    programId,
  )[0]
}

function proofPda(auction: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from('proof'), auction.toBuffer()], programId)[0]
}

function receiptPda(auction: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from('receipt'), auction.toBuffer()], programId)[0]
}

function client(connection: Connection, signer: Keypair) {
  return new Program(idl as any, new AnchorProvider(connection, new Wallet(signer), { commitment: 'confirmed' }))
}

async function main() {
  const connection = new Connection(rpcUrl!, 'confirmed')
  const creator = load('devnet-deployer')
  const winner = load('devnet-bidder-b')
  const creatorProgram = client(connection, creator)
  const winnerProgram = client(connection, winner)

  const auction = await (creatorProgram.account as any).auction.fetch(settledAuction)
  const paymentMint = new PublicKey(auction.paymentMint)
  if (!new PublicKey(auction.creator).equals(creator.publicKey)) throw new Error('Fixture auction creator mismatch')
  if (!new PublicKey(auction.winner).equals(winner.publicKey)) throw new Error('Fixture auction winner mismatch')
  if (!Object.hasOwn(auction.status, 'settled')) throw new Error('Fixture auction is not settled')

  const campaignId = BigInt(Date.now())
  const campaign = campaignPda(creator.publicKey, campaignId)
  const campaignLot = campaignLotPda(campaign, 0)
  const creative = creativePda(settledAuction, winner.publicKey)
  const proof = proofPda(settledAuction)
  const receipt = receiptPda(settledAuction)

  const createSignature = await (creatorProgram.methods as any)
    .createCampaign(
      new BN(campaignId.toString()),
      digest('Nepal Relief Creator Surfaces'),
      digest('Seven-day creator sponsorship campaign with proof-backed delivery'),
      creator.publicKey,
    )
    .accounts({
      creator: creator.publicKey,
      paymentMint,
      campaign,
      systemProgram: SystemProgram.programId,
    })
    .signers([creator])
    .rpc()

  const registerSignature = await (creatorProgram.methods as any)
    .registerCampaignLot(0, digest('MacBook lid · 9.5 × 5.5 cm · seven days'), true)
    .accounts({
      creator: creator.publicKey,
      campaign,
      paymentMint,
      auction: settledAuction,
      campaignLot,
      systemProgram: SystemProgram.programId,
    })
    .signers([creator])
    .rpc()

  const publishSignature = await (creatorProgram.methods as any)
    .publishCampaign()
    .accounts({ creator: creator.publicKey, campaign })
    .signers([creator])
    .rpc()

  const creativeSignature = await (winnerProgram.methods as any)
    .submitCreative(contentDigest('CREATIVE_HASH_HEX', 'claimspot-real-devnet-winning-creative'))
    .accounts({
      submitter: winner.publicKey,
      auction: settledAuction,
      creative,
      systemProgram: SystemProgram.programId,
    })
    .signers([winner])
    .rpc()

  const reviewCreativeSignature = await (creatorProgram.methods as any)
    .reviewCreative(true, new Array(32).fill(0))
    .accounts({
      moderator: creator.publicKey,
      campaign,
      campaignLot,
      auction: settledAuction,
      creative,
    })
    .signers([creator])
    .rpc()

  const proofSignature = await (creatorProgram.methods as any)
    .submitFulfillmentProof(contentDigest('PROOF_HASH_HEX', 'claimspot-real-devnet-fulfillment-proof'))
    .accounts({ creator: creator.publicKey, auction: settledAuction, proof, systemProgram: SystemProgram.programId })
    .signers([creator])
    .rpc()

  const reviewProofSignature = await (winnerProgram.methods as any)
    .reviewFulfillmentProof(true)
    .accounts({ winner: winner.publicKey, campaign, campaignLot, auction: settledAuction, proof })
    .signers([winner])
    .rpc()

  const creatorTokens = (await getOrCreateAssociatedTokenAccount(connection, creator, paymentMint, creator.publicKey))
    .address
  const creatorBefore = (await getAccount(connection, creatorTokens)).amount
  const releaseSignature = await (creatorProgram.methods as any)
    .releasePayment()
    .accounts({
      payer: creator.publicKey,
      auction: settledAuction,
      creator: creator.publicKey,
      paymentMint,
      campaignLot,
      campaign,
      creative,
      proof,
      vault: new PublicKey(auction.vault),
      creatorTokens,
      receipt,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([creator])
    .rpc()
  const creatorAfter = (await getAccount(connection, creatorTokens)).amount

  const [campaignAccount, lotAccount, creativeAccount, proofAccount, receiptAccount] = await Promise.all([
    (creatorProgram.account as any).campaign.fetch(campaign),
    (creatorProgram.account as any).campaignLot.fetch(campaignLot),
    (creatorProgram.account as any).creativeSubmission.fetch(creative),
    (creatorProgram.account as any).fulfillmentProof.fetch(proof),
    (creatorProgram.account as any).settlementReceipt.fetch(receipt),
  ])

  if (!Object.hasOwn(campaignAccount.status, 'live') || campaignAccount.lotCount !== 1) {
    throw new Error('Campaign publish verification failed')
  }
  if (!new PublicKey(lotAccount.auction).equals(settledAuction)) throw new Error('Lot verification failed')
  if (!Object.hasOwn(creativeAccount.status, 'approved')) throw new Error('Creative approval verification failed')
  if (!Object.hasOwn(proofAccount.status, 'accepted') || campaignAccount.acceptedProofs !== 1) {
    throw new Error('Fulfillment acceptance verification failed')
  }
  if (
    creatorAfter - creatorBefore !== BigInt(auction.winningBid) ||
    !new PublicKey(receiptAccount.auction).equals(settledAuction) ||
    BigInt(receiptAccount.amount) !== BigInt(auction.winningBid)
  ) {
    throw new Error('Proof-gated creator payment verification failed')
  }

  console.log('CAMPAIGN E2E PASS — accepted proof released creator payment')
  console.log('campaign', campaign.toBase58())
  console.log('campaign lot', campaignLot.toBase58())
  console.log('creative', creative.toBase58())
  console.log('proof', proof.toBase58())
  console.log('create', createSignature)
  console.log('register', registerSignature)
  console.log('publish', publishSignature)
  console.log('submit creative', creativeSignature)
  console.log('approve creative', reviewCreativeSignature)
  console.log('submit proof', proofSignature)
  console.log('accept proof', reviewProofSignature)
  console.log('release payment', releaseSignature)
  console.log(`receipt https://explorer.solana.com/address/${receipt.toBase58()}?cluster=devnet`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
