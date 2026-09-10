import { Connection, PublicKey } from '@solana/web3.js'
import { ConnectionMagicRouter } from '@magicblock-labs/ephemeral-rollups-sdk'

export const CLAIMSPOT_NETWORK = {
  baseRpc: process.env.NEXT_PUBLIC_MAGIC_BASE_RPC ?? 'https://rpc.magicblock.app/devnet',
  routerRpc: process.env.NEXT_PUBLIC_MAGIC_ROUTER_RPC ?? 'https://devnet-router.magicblock.app',
} as const

/**
 * ClaimSpot keeps listing creation, escrow and final settlement on Solana.
 * Only the frequently-mutated AuctionSpot PDA is delegated. The router inspects
 * writable accounts and sends delegated writes to the correct ER automatically.
 */
export function createClaimSpotConnections() {
  return {
    base: new Connection(CLAIMSPOT_NETWORK.baseRpc, 'confirmed'),
    router: new ConnectionMagicRouter(CLAIMSPOT_NETWORK.routerRpc, 'confirmed'),
  }
}

export async function inspectAuctionExecution(auctionSpot: PublicKey | string) {
  const { router } = createClaimSpotConnections()
  const [delegation, validator] = await Promise.all([
    router.getDelegationStatus(auctionSpot),
    router.getClosestValidator(),
  ])

  return {
    execution: delegation.isDelegated ? ('ephemeral-rollup' as const) : ('solana-base' as const),
    delegated: delegation.isDelegated,
    validator,
  }
}
