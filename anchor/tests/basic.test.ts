import * as anchor from '@anchor-lang/core'
import { Program } from '@anchor-lang/core'
import { Basic } from '../target/types/basic'
import { PublicKey } from '@solana/web3.js'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('basic', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.Basic as Program<Basic>

  it('creates a spot and accepts a valid base-layer bid', async () => {
    const authority = program.provider.publicKey
    if (!authority) throw new Error('Anchor provider has no public key')

    const spotId = new anchor.BN(Date.now())
    const reserve = new anchor.BN(100_000_000)
    const minIncrement = new anchor.BN(10_000_000)
    const endsAt = new anchor.BN(Math.floor(Date.now() / 1000) + 3_600)
    const [auctionSpot] = PublicKey.findProgramAddressSync(
      [Buffer.from('auction_spot'), spotId.toArrayLike(Buffer, 'le', 8)],
      program.programId,
    )

    await program.methods.createAuctionSpot(spotId, reserve, minIncrement, endsAt).accounts({ authority }).rpc()

    await program.methods.placeBid(spotId, reserve).accounts({ bidder: authority }).rpc()

    const state = await program.account.auctionSpot.fetch(auctionSpot)
    assert.equal(state.highestBid.toString(), reserve.toString())
    assert.equal(state.highestBidder.toBase58(), authority.toBase58())
    assert.equal(state.bidCount.toString(), '1')
  })
})
