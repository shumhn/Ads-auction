'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Clock3, Laptop, LoaderCircle, Radio, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CampaignMetadata } from '@/lib/campaign-metadata'
import { formatUsdc, fromUsdcAtoms, shortAddress } from '@/lib/claimspot'
import { ChainAuction, ChainCampaign, ChainCampaignLot, useClaimSpotProgram } from '@/lib/claimspot-program'
import { useLiveAuctionStream } from '@/lib/use-live-auction-stream'

type MarketplaceData = {
  campaigns: ChainCampaign[]
  lots: ChainCampaignLot[]
  auctions: ChainAuction[]
  metadata: CampaignMetadata[]
}

function remainingLabel(endsAt: number, now: number) {
  const remaining = Math.max(0, endsAt - now)
  if (remaining === 0) return 'Ended — awaiting close'
  const days = Math.floor(remaining / 86_400)
  const hours = Math.floor((remaining % 86_400) / 3_600)
  const minutes = Math.floor((remaining % 3_600) / 60)
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${Math.max(1, minutes)}m left`
}

export function CampaignMarketplace({ variant = 'preview' }: { variant?: 'preview' | 'all' }) {
  const program = useClaimSpotProgram()
  const Heading = variant === 'all' ? 'h1' : 'h2'
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1_000))

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1_000)), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const marketplaceQuery = useQuery({
    queryKey: ['claimspot-campaign-marketplace'],
    refetchInterval: 30_000,
    retry: 2,
    queryFn: async (): Promise<MarketplaceData> => {
      const metadataRequest = fetch('/api/campaigns', { cache: 'no-store' }).then(async (response) => {
        if (!response.ok) throw new Error('Campaign descriptions could not be loaded')
        return ((await response.json()) as { campaigns: CampaignMetadata[] }).campaigns
      })
      const [campaigns, lots, auctions, metadata] = await Promise.all([
        program.fetchCampaigns(),
        program.fetchCampaignLots(),
        program.fetchAuctions(),
        metadataRequest,
      ])
      const publishedCampaigns = campaigns.filter((campaign) => campaign.status === 'live')
      const publishedAddresses = new Set(publishedCampaigns.map((campaign) => campaign.publicKey.toBase58()))
      const publishedLots = lots.filter((lot) => publishedAddresses.has(lot.campaign.toBase58()))
      const auctionAddresses = new Set(publishedLots.map((lot) => lot.auction.toBase58()))
      return {
        campaigns: publishedCampaigns,
        lots: publishedLots,
        auctions: auctions.filter((auction) => auctionAddresses.has(auction.publicKey.toBase58())),
        metadata,
      }
    },
  })

  const liveStream = useLiveAuctionStream(
    marketplaceQuery.data?.auctions ?? [],
    program.subscribeLiveAuctions,
    program.readLiveAuctions,
  )

  const campaignCards = useMemo(() => {
    const data = marketplaceQuery.data
    if (!data) return []
    const metadataByCampaign = new Map(data.metadata.map((row) => [row.campaign, row]))
    const auctionByAddress = new Map(liveStream.auctions.map((auction) => [auction.publicKey.toBase58(), auction]))

    return data.campaigns
      .map((campaign) => {
        const address = campaign.publicKey.toBase58()
        const campaignLots = data.lots
          .filter((lot) => lot.campaign.equals(campaign.publicKey))
          .sort((left, right) => left.lotIndex - right.lotIndex)
        const auctions = campaignLots
          .map((lot) => auctionByAddress.get(lot.auction.toBase58()))
          .filter((auction): auction is ChainAuction => Boolean(auction))
        const openAuctions = auctions.filter(
          (auction) => auction.status === 'live' && !auction.closed && Number(auction.endsAt) > now,
        )
        const latestEnd = Math.max(0, ...auctions.map((auction) => Number(auction.endsAt)))
        const currentValue = auctions.reduce((sum, auction) => sum + auction.highestBid, 0n)
        const bids = auctions.reduce((sum, auction) => sum + auction.bidCount, 0n)
        const delegated = openAuctions.filter((auction) => auction.delegated).length
        const copy = metadataByCampaign.get(address)
        const impact = /aid|relief|nepal/i.test(`${copy?.title ?? ''} ${copy?.details ?? ''}`)
        return {
          campaign,
          address,
          copy,
          lots: campaignLots.length,
          open: openAuctions.length,
          delegated,
          latestEnd,
          currentValue,
          bids,
          impact,
        }
      })
      .sort((left, right) => {
        if (left.open !== right.open) return right.open - left.open
        if (left.impact !== right.impact) return Number(right.impact) - Number(left.impact)
        return Number(right.campaign.createdAt - left.campaign.createdAt)
      })
  }, [liveStream.auctions, marketplaceQuery.data, now])

  const liveCampaignCards = campaignCards.filter((campaign) => campaign.open > 0)
  const visibleCampaignCards = variant === 'all' ? campaignCards : liveCampaignCards.slice(0, 3)
  const openCampaigns = liveCampaignCards.length
  const openLots = liveCampaignCards.reduce((sum, campaign) => sum + campaign.open, 0)
  const totalBids = liveCampaignCards.reduce((sum, campaign) => sum + campaign.bids, 0n)

  return (
    <section
      id="live"
      className="solana-section-wash scroll-mt-20 border-b border-black/10 px-4 py-14 sm:px-6 lg:px-8 lg:py-20"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-mono flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
              <Radio className="size-4" aria-hidden="true" /> {variant === 'all' ? 'Auction marketplace' : 'Live now'}
            </p>
            <Heading className="mt-4 max-w-4xl text-[clamp(2.5rem,5vw,5rem)] font-black leading-[0.92] tracking-[-0.065em]">
              {variant === 'all' ? 'Explore every auction.' : 'Live auctions, ready for bids.'}
            </Heading>
            <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600">
              {variant === 'all'
                ? 'Browse every published creator surface, compare available placements, and open the auction you want.'
                : 'A small selection of open creator surfaces. Choose a placement, lock test USDC, and bid live.'}
            </p>
          </div>
          <div className="font-mono flex items-center gap-2 text-xs font-medium uppercase tracking-[0.06em] text-neutral-600">
            {liveStream.status === 'connected' ? (
              <>
                <Wifi className="size-4 text-green-700" aria-hidden="true" /> ER push connected
              </>
            ) : liveStream.status === 'fallback' ? (
              <>
                <WifiOff className="size-4 text-amber-700" aria-hidden="true" /> Reconnecting · 30s recovery active
              </>
            ) : liveStream.status === 'connecting' ? (
              <>
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{' '}
                Connecting to ER
              </>
            ) : (
              <>
                <Radio className="size-4" aria-hidden="true" /> Waiting for an open auction
              </>
            )}
          </div>
        </div>

        <div className="mt-9 grid grid-cols-3 border-y border-black/15">
          <div className="border-r border-black/10 py-4 pr-4 sm:pr-6">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.06em] text-neutral-500">Live drops</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{openCampaigns}</p>
          </div>
          <div className="border-r border-black/10 px-4 py-4 sm:px-6">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.06em] text-neutral-500">Spots open now</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{openLots}</p>
          </div>
          <div className="py-4 pl-4 sm:pl-6">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.06em] text-neutral-500">Verified bids</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{totalBids.toString()}</p>
          </div>
        </div>

        <div id="lots" className="scroll-mt-24 pt-9">
          {marketplaceQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading creator auctions">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-xl border border-black/10 bg-white/70 motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : marketplaceQuery.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <h3 className="text-xl font-black">Live auctions could not be loaded</h3>
              <p className="mt-2 text-sm leading-6 text-red-800">
                The app did not replace devnet data with mock listings.
              </p>
              <Button className="mt-5" onClick={() => marketplaceQuery.refetch()}>
                <RefreshCw className="size-4" aria-hidden="true" /> Retry
              </Button>
            </div>
          ) : visibleCampaignCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/20 bg-white p-8 text-center">
              <h3 className="text-2xl font-black tracking-[-0.04em]">
                {variant === 'all' ? 'No auction has been published yet' : 'No live auction is open yet'}
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-600">
                Create and publish a surface auction. It will appear here from real devnet state.
              </p>
              <Button asChild className="mt-5">
                <Link href="/studio">Create auction</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleCampaignCards.map((card) => {
                const isOpen = card.open > 0
                const title = card.copy?.title ?? `Campaign ${shortAddress(card.address)}`
                const surface = card.copy?.surface
                return (
                  <article
                    key={card.address}
                    className="solana-panel group flex min-h-96 flex-col rounded-xl border border-black/15 p-5 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[0_20px_55px_-35px_rgba(0,0,0,.55)] motion-reduce:transition-none"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className={`font-mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${isOpen ? 'bg-[#efff31] text-black' : 'bg-neutral-100 text-neutral-600'}`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${isOpen ? 'animate-pulse bg-green-700 motion-reduce:animate-none' : 'bg-neutral-400'}`}
                        />
                        {isOpen ? 'Live now' : 'Awaiting close'}
                      </span>
                      <span className="text-xs font-bold text-neutral-500">
                        {card.open} {card.open === 1 ? 'spot' : 'spots'} open
                      </span>
                    </div>

                    <div className="relative mt-4 aspect-[1.65/1] overflow-hidden rounded-lg border border-black/10 bg-[linear-gradient(145deg,#e7e7e3,#bfc0bd_48%,#efefec)]">
                      {surface?.imageHash ? (
                        // Exact content-addressed creator media is kept outside image optimization in the devnet build.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/uploads/${surface.imageHash}`}
                          alt={`${title} MacBook surface`}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-black/30">
                          <Laptop className="size-12" aria-hidden="true" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-black/70 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                        <span>{card.impact ? 'Aid-linked drop' : 'Physical surface'}</span>
                        <span>{surface?.source === 'photo' ? 'Creator photo' : 'Mapped preview'}</span>
                      </div>
                    </div>

                    <h3 className="mt-5 line-clamp-2 text-2xl font-black leading-[1.02] tracking-[-0.045em]">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm font-semibold text-neutral-500">
                      {surface
                        ? `${surface.model} · ${surface.fulfillmentMode === 'laser-etch' ? 'laser etched' : 'sticker'}${surface.displayDurationDays ? ` · ${surface.displayDurationDays} days` : ''}`
                        : `Creator ${shortAddress(card.campaign.creator.toBase58())}`}
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-black/10">
                      <div className="bg-[#f7f7f4] p-3">
                        <p className="text-[11px] font-semibold text-neutral-500">Open spots</p>
                        <p className="mt-1 text-lg font-black tabular-nums">
                          {card.open} / {card.lots}
                        </p>
                      </div>
                      <div className="bg-[#f7f7f4] p-3">
                        <p className="text-[11px] font-semibold text-neutral-500">Current bids</p>
                        <p className="mt-1 text-lg font-black tabular-nums">
                          {formatUsdc(fromUsdcAtoms(card.currentValue))} USDC
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-neutral-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5" aria-hidden="true" /> {remainingLabel(card.latestEnd, now)}
                      </span>
                      <span>
                        {card.delegated}/{card.open} on ER
                      </span>
                    </div>
                    <Link
                      href={`/campaign/${card.address}`}
                      className="mt-auto flex min-h-11 items-center justify-between border-t border-black/10 pt-4 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/20"
                    >
                      {isOpen ? 'Choose a spot' : 'View auction result'}{' '}
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </article>
                )
              })}
            </div>
          )}
          {variant === 'preview' && liveCampaignCards.length > 0 && (
            <div className="mt-8 flex justify-center">
              <Button asChild variant="outline" className="min-h-11 rounded-full px-5">
                <Link href="/auctions">
                  View all auctions <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
