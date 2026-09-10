/* eslint-disable @typescript-eslint/no-explicit-any -- the generated Anchor namespaces are intentionally dynamic */
import { AnchorProvider, BN, Program, Wallet } from '@anchor-lang/core'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { ConnectionMagicRouter } from '@magicblock-labs/ephemeral-rollups-sdk'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Connection, Keypair, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram } from '@solana/web3.js'
import idl from '../anchor/target/idl/basic.json'
import { DEVNET_USDC_MINT } from './devnet-usdc'

const rpc = process.env.SOLANA_RPC_URL
if (!rpc) throw new Error('SOLANA_RPC_URL is required')
const routerRpc = process.env.MAGIC_ROUTER_RPC ?? 'https://devnet-router.magicblock.app'
const programId = new PublicKey(idl.address)
const mint = new PublicKey(process.env.PAYMENT_MINT ?? DEVNET_USDC_MINT.toBase58())

function u64(value: bigint) {
  const output = Buffer.alloc(8)
  output.writeBigUInt64LE(value)
  return output
}

function client(connection: Connection, signer: Keypair) {
  return new Program(idl as any, new AnchorProvider(connection, new Wallet(signer), { commitment: 'confirmed' }))
}

async function waitForBase(connection: Connection, address: PublicKey) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const info = await connection.getAccountInfo(address, 'confirmed')
    if (info?.owner.equals(programId)) return
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }
  throw new Error('Timed out waiting for no-bid result to return to Solana')
}

async function main() {
  const creator = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync('anchor/.keys/devnet-deployer.json', 'utf8'))),
  )
  const base = new Connection(rpc!, 'confirmed')
  const router = new ConnectionMagicRouter(routerRpc, 'confirmed')
  const baseProgram = client(base, creator)
  const routerProgram = client(router, creator)
  const auctionId = BigInt(Date.now())
  const auction = PublicKey.findProgramAddressSync(
    [Buffer.from('auction'), creator.publicKey.toBuffer(), u64(auctionId)],
    programId,
  )[0]
  const liveAuction = PublicKey.findProgramAddressSync([Buffer.from('live_auction'), auction.toBuffer()], programId)[0]
  const vault = PublicKey.findProgramAddressSync([Buffer.from('vault'), auction.toBuffer()], programId)[0]
  const endsAt = BigInt(Math.floor(Date.now() / 1_000) + 8)
  const titleHash = Array.from(createHash('sha256').update('ClaimSpot no-bid settlement E2E').digest())

  await (baseProgram.methods as any)
    .createAuction(
      new BN(auctionId.toString()),
      titleHash,
      new BN(1_000_000),
      new BN(100_000),
      new BN(endsAt.toString()),
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
    .signers([creator])
    .rpc()
  await (baseProgram.methods as any)
    .delegateLiveAuction()
    .accountsPartial({ payer: creator.publicKey, creator: creator.publicKey, auction, liveAuction, validator: null })
    .signers([creator])
    .rpc()

  await new Promise((resolve) => setTimeout(resolve, 9_000))
  const closeSignature = await (routerProgram.methods as any)
    .closeAndUndelegate()
    .accountsPartial({ payer: creator.publicKey, liveAuction, winnerBid: null })
    .signers([creator])
    .rpc()
  await waitForBase(base, liveAuction)
  const finalizeSignature = await (baseProgram.methods as any)
    .finalizeNoBidAuction()
    .accounts({ payer: creator.publicKey, auction, liveAuction })
    .signers([creator])
    .rpc()

  const state = await (baseProgram.account as any).auction.fetch(auction)
  if (!Object.hasOwn(state.status, 'settled') || !new PublicKey(state.winner).equals(PublicKey.default)) {
    throw new Error('No-bid settlement state mismatch')
  }
  console.log('NO-BID E2E PASS')
  console.log('auction', auction.toBase58())
  console.log('close', closeSignature)
  console.log('finalize', finalizeSignature)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
