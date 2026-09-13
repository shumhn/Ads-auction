'use client'

import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Gavel, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { WalletButton } from '@/components/solana/solana-provider'
import { Button } from '@/components/ui/button'
import { CampaignMetadata } from '@/lib/campaign-metadata'
import { shortAddress } from '@/lib/claimspot'
import { ChainAuction, ChainCampaign, ChainCampaignLot, useClaimSpotProgram } from '@/lib/claimspot-program'

type CampaignLifecycle = {
  label: 'Draft' | 'Live' | 'Ended — finalize' | 'Settled'
  endedLots: number
}

function campaignLifecycle(
  campaign: ChainCampaign,
  lots: ChainCampaignLot[],
  auctions: ChainAuction[],
): CampaignLifecycle {
  if (campaign.status === 'draft') return { label: 'Draft', endedLots: 0 }

  const auctionKeys = new Set(
    lots.filter((lot) => lot.campaign.equals(campaign.publicKey)).map((lot) => lot.auction.toBase58()),
  )
  const campaignAuctions = auctions.filter((auction) => auctionKeys.has(auction.publicKey.toBase58()))
  const now = Math.floor(Date.now() / 1_000)
  const endedLots = campaignAuctions.filter(
    (auction) => auction.status !== 'settled' && (auction.closed || Number(auction.endsAt) <= now),
  ).length

  if (campaignAuctions.length > 0 && campaignAuctions.every((auction) => auction.status === 'settled')) {
    return { label: 'Settled', endedLots: 0 }
  }
  if (endedLots > 0) return { label: 'Ended — finalize', endedLots }
  return { label: 'Live', endedLots: 0 }
}

export function MyAuctionsFeature() {
  const program = useClaimSpotProgram()
  const walletAddress = program.wallet.publicKey?.toBase58() ?? null

  const campaignsQuery = useQuery({
    queryKey: ['claimspot-my-auctions', walletAddress],
    enabled: Boolean(walletAddress),
    retry: 1,
    refetchInterval: 15_000,
    queryFn: async () => {
      if (!program.wallet.publicKey) return []
      const [campaigns, lots, auctions, metadataResult] = await Promise.all([
        program.fetchCampaignsForCreator(program.wallet.publicKey),
        program.fetchCampaignLots(),
        program.fetchAuctionsForCreator(program.wallet.publicKey),
        fetch('/api/campaigns', { cache: 'no-store' }),
      ])
      // Presentation copy is helpful, but the creator's on-chain inventory must
      // still load if this local metadata file is temporarily unavailable.
      const metadata = metadataResult.ok
        ? ((await metadataResult.json()) as { campaigns: CampaignMetadata[] }).campaigns
        : []
      const metadataByCampaign = new Map(metadata.map((item) => [item.campaign, item]))

      return campaigns
        .sort((left, right) => Number(right.createdAt - left.createdAt))
        .map((campaign) => ({
          campaign,
          metadata: metadataByCampaign.get(campaign.publicKey.toBase58()),
          lifecycle: campaignLifecycle(campaign, lots, auctions),
        }))
    },
  })

  return (
    <div className="solana-page-surface min-h-[75vh] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-foreground/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Creator workspace</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] sm:text-6xl">My auctions</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">
              View the auctions created by your connected wallet, then open the public board or continue managing them.
            </p>
          </div>
          <Button asChild className="min-h-11 shrink-0">
            <Link href="/studio">
              <Gavel className="size-4" aria-hidden="true" /> Create auction
            </Link>
          </Button>
        </div>

        <div className="pt-8">
          {!walletAddress ? (
            <div className="rounded-xl border border-dashed border-foreground/20 bg-card p-8 text-center">
              <h2 className="text-2xl font-bold">Connect your creator wallet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
                Your auctions are filtered directly from devnet using the connected creator address.
              </p>
              <div className="mt-5 flex justify-center">
                <WalletButton />
              </div>
            </div>
          ) : campaignsQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2" aria-label="Loading your auctions">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-56 animate-pulse rounded-xl border bg-card motion-reduce:animate-none" />
              ))}
            </div>
          ) : campaignsQuery.isError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
              <h2 className="text-xl font-bold">Your auctions could not be loaded</h2>
              <p className="mt-2 text-sm text-ink-muted">
                This is usually a temporary devnet or metadata connection issue.
              </p>
              <Button variant="outline" className="mt-5" onClick={() => campaignsQuery.refetch()}>
                <RefreshCw className="size-4" aria-hidden="true" /> Retry
              </Button>
            </div>
          ) : campaignsQuery.data?.length === 0 ? (
            <div className="rounded-xl border border-dashed border-foreground/20 bg-card p-8 text-center">
              <h2 className="text-2xl font-bold">No auctions from this wallet yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
                Map your first surface, choose the spots and prices, then publish it to devnet.
              </p>
              <Button asChild className="mt-5">
                <Link href="/studio">Create your first auction</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {campaignsQuery.data?.map(({ campaign, metadata, lifecycle }) => {
                const address = campaign.publicKey.toBase58()
                return (
                  <article key={address} className="flex min-h-56 flex-col rounded-xl border bg-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-mono rounded-full bg-surface-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
                        {lifecycle.label}
                      </span>
                      <span className="text-xs font-semibold text-ink-muted">{campaign.lotCount} spots</span>
                    </div>
                    <h2 className="mt-5 text-2xl font-bold leading-tight">
                      {metadata?.title ?? `Auction ${shortAddress(address)}`}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
                      {metadata?.details ?? 'On-chain creator auction on Solana devnet.'}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-2 pt-6">
                      <Button asChild size="sm">
                        <Link href={`/campaign/${address}`}>
                          Open auction <ExternalLink className="size-4" aria-hidden="true" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/manage?campaign=${encodeURIComponent(address)}`}>
                          {lifecycle.endedLots > 0
                            ? `Finalize ${lifecycle.endedLots} spot${lifecycle.endedLots === 1 ? '' : 's'}`
                            : 'Manage workflow'}
                        </Link>
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
