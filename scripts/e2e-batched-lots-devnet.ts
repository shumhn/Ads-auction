/* eslint-disable @typescript-eslint/no-explicit-any -- generated Anchor namespaces are dynamic */
import { AnchorProvider, BN, Program, Wallet } from '@anchor-lang/core'
import { ConnectionMagicRouter } from '@magicblock-labs/ephemeral-rollups-sdk'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import idl from '../target/idl/ads_auction.json'
import { DEVNET_USDC_MINT } from './devnet-usdc'

const rpcUrl = process.env.SOLANA_RPC_URL
if (!rpcUrl) throw new Error('SOLANA_RPC_URL is required')
const routerUrl = process.env.MAGIC_ROUTER_RPC ?? 'https://devnet-router.magicblock.app'
const programId = new PublicKey(idl.address)

const creator = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync('anchor/.keys/devnet-deployer.json', 'utf8'))),
)
const connection = new Connection(rpcUrl, 'confirmed')
const router = new ConnectionMagicRouter(routerUrl, 'confirmed')
const program = new Program(
  idl as any,
  new AnchorProvider(connection, new Wallet(creator), { commitment: 'confirmed' }),
)
const mint = new PublicKey(process.env.PAYMENT_MINT ?? DEVNET_USDC_MINT.toBase58())

function digest(value: string) {
  return Array.from(createHash('sha256').update(value).digest())
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

async function main() {
  const campaignId = BigInt(Date.now())
  const campaign = PublicKey.findProgramAddressSync(
    [Buffer.from('campaign'), creator.publicKey.toBuffer(), u64(campaignId)],
    programId,
  )[0]
  const createCampaignSignature = await (program.methods as any)
    .createCampaign(
      new BN(campaignId.toString()),
      digest('Batch signature E2E'),
      digest('Four real composed devnet lots'),
      creator.publicKey,
    )
    .accounts({ creator: creator.publicKey, paymentMint: mint, campaign, systemProgram: SystemProgram.programId })
    .signers([creator])
    .rpc()

  const liveAuctions: PublicKey[] = []
  const lotSignatures: string[] = []
  for (let index = 0; index < 4; index += 1) {
    const auctionId = campaignId * 100n + BigInt(index)
    const auction = PublicKey.findProgramAddressSync(
      [Buffer.from('auction'), creator.publicKey.toBuffer(), u64(auctionId)],
      programId,
    )[0]
    const liveAuction = PublicKey.findProgramAddressSync(
      [Buffer.from('live_auction'), auction.toBuffer()],
      programId,
    )[0]
    const vault = PublicKey.findProgramAddressSync([Buffer.from('vault'), auction.toBuffer()], programId)[0]
    const campaignLot = PublicKey.findProgramAddressSync(
      [Buffer.from('campaign_lot'), campaign.toBuffer(), u16(index)],
      programId,
    )[0]
    const createIx = await (program.methods as any)
      .createAuction(
        new BN(auctionId.toString()),
        digest(`Batch signature E2E · spot ${index + 1}`),
        new BN(50_000_000),
        new BN(5_000_000),
        new BN(Math.floor(Date.now() / 1000) + 86_400),
      )
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
      .instruction()
    const delegateIx = await (program.methods as any)
      .delegateLiveAuction()
      .accountsPartial({
        payer: creator.publicKey,
        creator: creator.publicKey,
        auction,
        liveAuction,
        validator: null,
      })
      .instruction()
    const registerIx = await (program.methods as any)
      .registerCampaignLot(index, digest(`MacBook lid position ${index + 1}`), true)
      .accounts({
        creator: creator.publicKey,
        campaign,
        paymentMint: mint,
        auction,
        campaignLot,
        systemProgram: SystemProgram.programId,
      })
      .instruction()
    const transaction = new Transaction().add(createIx, delegateIx, registerIx)
    const signature = await sendAndConfirmTransaction(connection, transaction, [creator], { commitment: 'confirmed' })
    lotSignatures.push(signature)
    liveAuctions.push(liveAuction)
  }

  const publishSignature = await (program.methods as any)
    .publishCampaign()
    .accounts({ creator: creator.publicKey, campaign })
    .signers([creator])
    .rpc()

  await new Promise((resolve) => setTimeout(resolve, 3_000))
  const statuses = await Promise.all(liveAuctions.map((liveAuction) => router.getDelegationStatus(liveAuction)))
  if (statuses.some((status: any) => !status.isDelegated || !status.fqdn)) {
    throw new Error('At least one composed lot did not reach a MagicBlock ER')
  }
  const campaignAccount = await (program.account as any).campaign.fetch(campaign)
  if (campaignAccount.lotCount !== 4 || !Object.hasOwn(campaignAccount.status, 'live')) {
    throw new Error('Campaign was not published with exactly four lots')
  }

  console.log('BATCHED LOT E2E PASS')
  console.log('campaign', campaign.toBase58())
  console.log('create', createCampaignSignature)
  console.log('lots', lotSignatures.join(','))
  console.log('publish', publishSignature)
  console.log('ER endpoints', statuses.map((status: any) => status.fqdn).join(','))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
