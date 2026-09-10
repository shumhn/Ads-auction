/* eslint-disable @typescript-eslint/no-explicit-any -- verification script consumes generated Anchor namespaces */
import { AnchorProvider, Program, Wallet } from '@anchor-lang/core'
import { ConnectionMagicRouter } from '@magicblock-labs/ephemeral-rollups-sdk'
import { readFileSync } from 'node:fs'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import idl from '../target/idl/ads_auction.json'

const rpc = process.env.SOLANA_RPC_URL
if (!rpc) throw new Error('SOLANA_RPC_URL is required')

const routerRpc = process.env.MAGIC_ROUTER_RPC ?? 'https://devnet-router.magicblock.app'
const programId = new PublicKey(idl.address)
const expectedMint = new PublicKey(process.env.PAYMENT_MINT ?? 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr')
const creator = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync('anchor/.keys/devnet-deployer.json', 'utf8'))),
)
const connection = new Connection(rpc, 'confirmed')
const router = new ConnectionMagicRouter(routerRpc, 'confirmed')
const baseProgram = new Program(
  idl as any,
  new AnchorProvider(connection, new Wallet(creator), { commitment: 'confirmed' }),
)
const routerProgram = new Program(
  idl as any,
  new AnchorProvider(router, new Wallet(creator), { commitment: 'confirmed' }),
)

function u64(value: bigint) {
  const out = Buffer.alloc(8)
  out.writeBigUInt64LE(value)
  return out
}

function auctionPda(id: bigint) {
  return PublicKey.findProgramAddressSync([Buffer.from('auction'), creator.publicKey.toBuffer(), u64(id)], programId)[0]
}

async function main() {
  const results = []
  for (let id = 201; id <= 222; id += 1) {
    const auction = auctionPda(BigInt(id))
    const auctionInfo = await connection.getAccountInfo(auction)
    if (!auctionInfo || !auctionInfo.owner.equals(programId)) {
      results.push({ id, auction: auction.toBase58(), published: false, delegated: false, readableOnRouter: false })
      continue
    }

    const auctionAccount = await (baseProgram.account as any).auction.fetch(auction)
    const paymentMint = new PublicKey(auctionAccount.paymentMint)
    const liveAuction = new PublicKey(auctionAccount.liveAuction)
    const status = await router.getDelegationStatus(liveAuction)
    let readableOnRouter = false
    try {
      const live = await (routerProgram.account as any).liveAuction.fetch(liveAuction)
      readableOnRouter = Number(live.endsAt) > 0 && new PublicKey(live.auction).equals(auction)
    } catch {
      readableOnRouter = false
    }

    results.push({
      id,
      auction: auction.toBase58(),
      liveAuction: liveAuction.toBase58(),
      published: true,
      paymentMint: paymentMint.toBase58(),
      correctPaymentMint: paymentMint.equals(expectedMint),
      delegated: status.isDelegated,
      readableOnRouter,
    })
  }

  const published = results.filter((result) => result.published).length
  const delegated = results.filter((result) => result.delegated).length
  const readableOnRouter = results.filter((result) => result.readableOnRouter).length
  const correctPaymentMint = results.filter((result) => result.correctPaymentMint).length
  console.log(
    JSON.stringify(
      {
        programId: programId.toBase58(),
        expectedMint: expectedMint.toBase58(),
        published,
        delegated,
        readableOnRouter,
        correctPaymentMint,
        results,
      },
      null,
      2,
    ),
  )

  if (published !== 22 || delegated !== 22 || readableOnRouter !== 22 || correctPaymentMint !== 22) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
