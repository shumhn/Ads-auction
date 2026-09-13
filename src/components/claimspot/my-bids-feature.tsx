'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CircleDollarSign, ExternalLink, RefreshCw, WalletCards } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { WalletButton } from '@/components/solana/solana-provider'
import { Button } from '@/components/ui/button'
import { CampaignMetadata } from '@/lib/campaign-metadata'
import { formatUsdc, fromUsdcAtoms, shortAddress } from '@/lib/claimspot'
import { BidParticipation, ChainCampaign, ChainCampaignLot, useClaimSpotProgram } from '@/lib/claimspot-program'

type BidStatus = 'leading' | 'outbid' | 'won' | 'refund' | 'settled'

type ParticipationRow = BidParticipation & {
  campaign?: ChainCampaign
  lot?: ChainCampaignLot
  metadata?: CampaignMetadata
  lotMetadata?: CampaignMetadata['lots'][number]
}

function statusFor(participation: BidParticipation): BidStatus {
  const { auction, bid } = participation
  if (auction.status === 'settled') {
    if (auction.winner.equals(bid.bidder)) return 'won'
    if (!bid.claimed) return 'refund'
    return 'settled'
  }
  return auction.highestBidder.equals(bid.bidder) ? 'leading' : 'outbid'
}

const statusCopy: Record<BidStatus, { label: string; className: string }> = {
  leading: { label: 'Leading', className: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' },
  outbid: { label: 'Outbid', className: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
  won: { label: 'Won', className: 'bg-violet-500/12 text-violet-700 dark:text-violet-300' },
  refund: { label: 'Refund available', className: 'bg-sky-500/12 text-sky-700 dark:text-sky-300' },
  settled: { label: 'Settled', className: 'bg-muted text-muted-foreground' },
}

function timeRemaining(endsAt: bigint, now: number) {
  const remaining = Math.max(0, Number(endsAt) - now)
  if (remaining === 0) return 'Auction ended'
  const days = Math.floor(remaining / 86_400)
  const hours = Math.floor((remaining % 86_400) / 3_600)
  const minutes = Math.max(1, Math.floor((remaining % 3_600) / 60))
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

export function MyBidsFeature() {
  const program = useClaimSpotProgram()
  const walletAddress = program.wallet.publicKey?.toBase58() ?? null
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1_000))

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1_000)), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const query = useQuery({
    queryKey: ['claimspot-my-bids', walletAddress],
    enabled: Boolean(walletAddress),
    retry: 1,
    refetchInterval: 15_000,
    queryFn: async (): Promise<ParticipationRow[]> => {
      const [participations, campaigns, lots, metadataResult] = await Promise.all([
        program.fetchAuctionsForBidder(),
        program.fetchCampaigns(),
        program.fetchCampaignLots(),
        fetch('/api/campaigns', { cache: 'no-store' }),
      ])
      const metadata = metadataResult.ok
        ? ((await metadataResult.json()) as { campaigns: CampaignMetadata[] }).campaigns
        : []
      const campaignByAddress = new Map(campaigns.map((campaign) => [campaign.publicKey.toBase58(), campaign]))
      const lotByAuction = new Map(lots.map((lot) => [lot.auction.toBase58(), lot]))
      const metadataByCampaign = new Map(metadata.map((item) => [item.campaign, item]))

      return participations.map((participation) => {
        const auctionAddress = participation.auction.publicKey.toBase58()
        const lot = lotByAuction.get(auctionAddress)
        const campaign = lot ? campaignByAddress.get(lot.campaign.toBase58()) : undefined
        const campaignMetadata = campaign ? metadataByCampaign.get(campaign.publicKey.toBase58()) : undefined
        const lotMetadata = campaignMetadata?.lots.find((item) => item.auction === auctionAddress)
        return { ...participation, campaign, lot, metadata: campaignMetadata, lotMetadata }
      })
    },
  })

  const summary = useMemo(() => {
    const rows = query.data ?? []
    return {
      total: rows.length,
      active: rows.filter(({ auction }) => auction.status === 'live').length,
      committed: rows.reduce((total, { bid }) => total + bid.currentBid, 0n),
    }
  }, [query.data])

  return (
    <div className="solana-page-surface min-h-[75vh] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-foreground/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Bidder workspace</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] sm:text-6xl">My bids</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">
              Keep track of every auction you have entered, your current position, and what happens after close.
            </p>
          </div>
          <Button asChild variant="outline" className="min-h-11 shrink-0">
            <Link href="/auctions">
              Browse auctions <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {!walletAddress ? (
          <div className="mt-8 rounded-xl border border-dashed border-foreground/20 bg-card p-8 text-center">
            <WalletCards className="mx-auto size-8 text-ink-muted" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold">Connect your bidder wallet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
              Once connected, this page reads your bid escrow accounts from Solana devnet and lists every auction you
              joined.
            </p>
            <div className="mt-5 flex justify-center">
              <WalletButton />
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10 sm:grid-cols-3">
              <div className="bg-card p-5">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                  Participated
                </p>
                <p className="mt-2 text-3xl font-black tracking-[-0.05em]">{summary.total}</p>
              </div>
              <div className="bg-card p-5">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">Still live</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.05em]">{summary.active}</p>
              </div>
              <div className="bg-card p-5">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                  Current bid total
                </p>
                <p className="mt-2 text-3xl font-black tracking-[-0.05em]">
                  {formatUsdc(fromUsdcAtoms(summary.committed))} <span className="text-base font-bold">USDC</span>
                </p>
              </div>
            </div>

            <div className="mt-8">
              {query.isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading your bids">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-64 animate-pulse rounded-xl border bg-card motion-reduce:animate-none"
                    />
                  ))}
                </div>
              ) : query.isError ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
                  <h2 className="text-xl font-bold">Your bids could not be loaded</h2>
                  <p className="mt-2 text-sm text-ink-muted">
                    The bidder history is temporarily unavailable. Your escrow is not affected.
                  </p>
                  <Button variant="outline" className="mt-5" onClick={() => query.refetch()}>
                    <RefreshCw className="size-4" aria-hidden="true" /> Retry
                  </Button>
                </div>
              ) : query.data?.length === 0 ? (
                <div className="rounded-xl border border-dashed border-foreground/20 bg-card p-8 text-center">
                  <CircleDollarSign className="mx-auto size-8 text-ink-muted" aria-hidden="true" />
                  <h2 className="mt-4 text-2xl font-bold">No participated auctions yet</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
                    Pick a placement you believe in, fund your bid budget, and your first auction will appear here.
                  </p>
                  <Button asChild className="mt-5">
                    <Link href="/auctions">Find an auction</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {query.data?.map((row) => {
                    const address = row.auction.publicKey.toBase58()
                    const status = statusFor(row)
                    const statusInfo = statusCopy[status]
                    const title = row.metadata?.title ?? row.lotMetadata?.name ?? `Auction ${shortAddress(address)}`
                    const placement =
                      row.lotMetadata?.placement ??
                      (row.lot ? `Placement ${row.lot.lotIndex + 1}` : 'Auction placement')
                    return (
                      <article
                        key={address}
                        className="group flex min-h-64 flex-col rounded-xl border bg-card p-5 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                          <span className="font-mono text-xs text-ink-muted">{shortAddress(address)}</span>
                        </div>
                        <h2 className="mt-5 line-clamp-2 text-2xl font-bold leading-tight">{title}</h2>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">{placement}</p>
                        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-foreground/10">
                          <div className="bg-surface-soft p-3">
                            <p className="text-[11px] font-semibold text-ink-muted">Your bid</p>
                            <p className="mt-1 text-lg font-black tabular-nums">
                              {formatUsdc(fromUsdcAtoms(row.bid.currentBid))} <span className="text-xs">USDC</span>
                            </p>
                          </div>
                          <div className="bg-surface-soft p-3">
                            <p className="text-[11px] font-semibold text-ink-muted">Position</p>
                            <p className="mt-1 text-lg font-black">
                              {status === 'leading'
                                ? '1st'
                                : status === 'outbid'
                                  ? 'Outbid'
                                  : status === 'won'
                                    ? 'Won'
                                    : 'Closed'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-ink-muted">
                          <span>{timeRemaining(row.auction.endsAt, now)}</span>
                          <span>
                            {row.auction.status === 'live'
                              ? row.bid.delegated
                                ? 'MagicBlock live'
                                : 'Live on Solana'
                              : 'Solana settled'}
                          </span>
                        </div>
                        <Link
                          href={`/campaign/${address}`}
                          className="mt-auto flex min-h-11 items-center justify-between border-t border-foreground/10 pt-4 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
                        >
                          Open auction{' '}
                          <ExternalLink
                            className="size-4 transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </Link>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
