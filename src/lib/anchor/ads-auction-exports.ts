// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@anchor-lang/core'
import { Cluster, PublicKey } from '@solana/web3.js'
import AdsAuctionIDL from '../../../target/idl/ads_auction.json'
import type { AdsAuction } from '../../../target/types/ads_auction'

// Re-export the generated IDL and type
export { AdsAuction, AdsAuctionIDL }

// The programId is imported from the program IDL.
export const ADS_AUCTION_PROGRAM_ID = new PublicKey(AdsAuctionIDL.address)

// Create a typed client for the Atrium.ads Anchor program.
export function getAdsAuctionProgram(provider: AnchorProvider, address?: PublicKey): Program<AdsAuction> {
  return new Program(
    { ...AdsAuctionIDL, address: address ? address.toBase58() : AdsAuctionIDL.address } as AdsAuction,
    provider,
  )
}

// Resolve the deployed Atrium.ads program ID for the selected cluster.
export function getAdsAuctionProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
      return ADS_AUCTION_PROGRAM_ID
    case 'testnet':
      return ADS_AUCTION_PROGRAM_ID
    case 'mainnet-beta':
    default:
      return ADS_AUCTION_PROGRAM_ID
  }
}
