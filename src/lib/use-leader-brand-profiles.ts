import { useQuery } from '@tanstack/react-query'
import { fetchBrandProfiles } from '@/lib/brand-profile'
import { ChainAuction } from '@/lib/claimspot-program'

export function useLeaderBrandProfiles(auctions: ChainAuction[]) {
  const wallets = [
    ...new Set(
      auctions
        .filter((auction) => auction.bidCount > 0n)
        .map((auction) => (auction.status === 'settled' ? auction.winner : auction.highestBidder).toBase58()),
    ),
  ].sort()
  const key = wallets.join(',')
  return useQuery({
    queryKey: ['brand-profiles', key],
    queryFn: () => fetchBrandProfiles(wallets),
    enabled: wallets.length > 0,
    refetchInterval: 15_000,
    staleTime: 5_000,
  })
}
