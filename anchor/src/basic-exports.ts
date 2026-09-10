// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@anchor-lang/core'
import { Cluster, PublicKey } from '@solana/web3.js'
import BasicIDL from '../target/idl/basic.json'
import type { Basic } from '../target/types/basic'

// Re-export the generated IDL and type
export { Basic, BasicIDL }

// The programId is imported from the program IDL.
export const BASIC_PROGRAM_ID = new PublicKey(BasicIDL.address)

// This is a helper function to get the Basic Anchor program.
export function getBasicProgram(provider: AnchorProvider, address?: PublicKey): Program<Basic> {
  return new Program({ ...BasicIDL, address: address ? address.toBase58() : BasicIDL.address } as Basic, provider)
}

// This is a helper function to get the program ID for the Basic program depending on the cluster.
export function getBasicProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
      return BASIC_PROGRAM_ID
    case 'testnet':
      return BASIC_PROGRAM_ID
    case 'mainnet-beta':
    default:
      return BASIC_PROGRAM_ID
  }
}
