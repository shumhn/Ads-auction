/* eslint-disable @typescript-eslint/no-explicit-any -- deployment script consumes generated Anchor namespaces */
import { AnchorProvider, BN, Program, Wallet } from '@anchor-lang/core'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Connection, Keypair, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import idl from '../target/idl/ads_auction.json'

const rpc = process.env.SOLANA_RPC_URL
if (!rpc) throw new Error('SOLANA_RPC_URL is required')

const programId = new PublicKey(idl.address)
const mint = new PublicKey(process.env.PAYMENT_MINT ?? 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr')
const creator = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync('anchor/.keys/devnet-deployer.json', 'utf8'))),
)
const connection = new Connection(rpc, 'confirmed')
const provider = new AnchorProvider(connection, new Wallet(creator), { commitment: 'confirmed' })
const program = new Program(idl as any, provider)

const lots = [
  ['Top left', 100],
  ['Top centre-left', 100],
  ['Top centre-right', 100],
  ['Top right', 100],
  ['Upper strip · far left', 30],
  ['Upper strip · left', 30],
  ['Directly above the mark', 35],
  ['Upper strip · right', 30],
  ['Upper strip · far right', 30],
  ['Left of the mark', 175],
  ['Beside the mark · left', 175],
  ['Beside the mark · right', 175],
  ['Right of the mark', 175],
  ['Lower strip · far left', 30],
  ['Lower strip · left', 30],
  ['Directly below the mark', 35],
  ['Lower strip · right', 30],
  ['Lower strip · far right', 30],
  ['Bottom left', 100],
  ['Bottom centre-left', 100],
  ['Bottom centre-right', 100],
  ['Bottom right', 100],
] as const

function u64(value: bigint) {
  const out = Buffer.alloc(8)
  out.writeBigUInt64LE(value)
  return out
}

function pdas(id: bigint) {
  const auction = PublicKey.findProgramAddressSync(
    [Buffer.from('auction'), creator.publicKey.toBuffer(), u64(id)],
    programId,
  )[0]
  const liveAuction = PublicKey.findProgramAddressSync([Buffer.from('live_auction'), auction.toBuffer()], programId)[0]
  const vault = PublicKey.findProgramAddressSync([Buffer.from('vault'), auction.toBuffer()], programId)[0]
  return { auction, liveAuction, vault }
}

async function main() {
  const endsAt = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 3600)
  for (let index = 0; index < lots.length; index += 1) {
    const [title, reserve] = lots[index]
    const id = BigInt(index + 201)
    const { auction, liveAuction, vault } = pdas(id)
    if (!(await connection.getAccountInfo(auction))) {
      const titleHash = Array.from(createHash('sha256').update(title).digest())
      const signature = await (program.methods as any)
        .createAuction(
          new BN(id.toString()),
          titleHash,
          new BN(String(reserve * 1_000_000)),
          new BN('5000000'),
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
      console.log(`created lot ${index + 1} ${auction.toBase58()} ${signature}`)
    } else {
      const existing = await (program.account as any).auction.fetch(auction)
      if (!new PublicKey(existing.paymentMint).equals(mint)) {
        throw new Error(`lot ${index + 1} already exists with a different payment mint`)
      }
    }

    const liveInfo = await connection.getAccountInfo(liveAuction)
    if (liveInfo?.owner.equals(programId)) {
      const signature = await (program.methods as any)
        .delegateLiveAuction()
        .accountsPartial({
          payer: creator.publicKey,
          creator: creator.publicKey,
          auction,
          liveAuction,
          validator: null,
        })
        .signers([creator])
        .rpc()
      console.log(`delegated lot ${index + 1} ${signature}`)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
