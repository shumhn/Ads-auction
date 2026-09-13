'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Radio, Wifi, WifiOff } from 'lucide-react'
import Link from 'next/link'
import { PublicKey } from '@solana/web3.js'
import { useEffect, useMemo, useState } from 'react'
import { AuctionPanel, BidHistoryTable, LiveSpot, MachineBoard } from '@/components/claimspot/live-auction'
import { WalletButton } from '@/components/solana/solana-provider'
import { Button } from '@/components/ui/button'
import { shortAddress, SPOT_METADATA } from '@/lib/claimspot'
import { CampaignMetadata } from '@/lib/campaign-metadata'
import { ChainAuction, useClaimSpotProgram } from '@/lib/claimspot-program'
import { useLiveBidFeed } from '@/lib/use-live-bid-feed'
import { useLiveAuctionStream } from '@/lib/use-live-auction-stream'
import { useLeaderBrandProfiles } from '@/lib/use-leader-brand-profiles'

function bytesToHex(bytes: number[]) {
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function statusLabel(auction: ChainAuction) {
  if (auction.status === 'settled') return 'Settled'
  if (auction.closed) return 'Closed'
  if (Number(auction.endsAt) <= Date.now() / 1_000) return 'Ended'
  return auction.delegated ? 'Live on MagicBlock' : 'Live on Solana'
}

export function CampaignPublicFeature({ campaignAddress }: { campaignAddress: string }) {
  const program = useClaimSpotProgram()
  const [selectedAuction, setSelectedAuction] = useState<string | null>(null)
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1_000))
  const validAddress = useMemo(() => {
    try {
      return new PublicKey(campaignAddress).toBase58()
    } catch {
      return null
    }
  }, [campaignAddress])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1_000)), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const copyQuery = useQuery({
    queryKey: ['claimspot-public-copy', validAddress],
    enabled: Boolean(validAddress),
    queryFn: async () => {
      const response = await fetch('/api/campaigns', { cache: 'no-store' })
      if (!response.ok) throw new Error('Campaign description could not be loaded')
      const data = (await response.json()) as { campaigns: CampaignMetadata[] }
      return data.campaigns.find((campaign) => campaign.campaign === validAddress) ?? null
    },
  })
  const chainQuery = useQuery({
    queryKey: ['claimspot-public-campaign', validAddress],
    enabled: Boolean(validAddress),
    refetchInterval: 30_000,
    queryFn: async () => {
      const [campaigns, campaignLots, auctions, creatives, proofs, receipts] = await Promise.all([
        program.fetchCampaigns(),
        program.fetchCampaignLots(),
        program.fetchAuctions(),
        program.fetchCreatives(),
        program.fetchProofs(),
        program.fetchReceipts(),
      ])
      const campaign = campaigns.find((row) => row.publicKey.toBase58() === validAddress) ?? null
      const lots = campaign
        ? campaignLots
            .filter((lot) => lot.campaign.equals(campaign.publicKey))
            .sort((left, right) => left.lotIndex - right.lotIndex)
        : []
      const auctionByAddress = new Map(auctions.map((auction) => [auction.publicKey.toBase58(), auction]))
      return { campaign, lots, auctionByAddress, creatives, proofs, receipts }
    },
  })

  const campaignAuctions = useMemo(() => {
    const chain = chainQuery.data
    if (!chain?.campaign) return []
    return chain.lots
      .map((lot) => chain.auctionByAddress.get(lot.auction.toBase58()))
      .filter((auction): auction is ChainAuction => Boolean(auction))
  }, [chainQuery.data])
  const liveStream = useLiveAuctionStream(campaignAuctions, program.subscribeLiveAuctions, program.readLiveAuctions)
  const streamedAuctions = liveStream.auctions
  const leaderBrands = useLeaderBrandProfiles(streamedAuctions)
  const streamedAuctionByAddress = useMemo(
    () => new Map(streamedAuctions.map((auction) => [auction.publicKey.toBase58(), auction])),
    [streamedAuctions],
  )

  const liveSpots = useMemo<LiveSpot[]>(() => {
    const copy = copyQuery.data
    const chain = chainQuery.data
    if (!chain?.campaign) return []
    const copyByAuction = new Map((copy?.lots ?? []).map((lot) => [lot.auction, lot]))
    return chain.lots.map((lot, index) => {
      const auctionAddress = lot.auction.toBase58()
      const auction = streamedAuctionByAddress.get(auctionAddress) ?? null
      const metadata = copyByAuction.get(auctionAddress)
      const fallbackGeometry = SPOT_METADATA[index] ?? SPOT_METADATA[SPOT_METADATA.length - 1]!
      const geometry = metadata?.geometry ? { ...fallbackGeometry, ...metadata.geometry } : fallbackGeometry
      const recordedLogo = chain.creatives.find(
        (creative) =>
          creative.auction.equals(lot.auction) &&
          Boolean(auction) &&
          creative.submitter.equals(auction!.status === 'settled' ? auction!.winner : auction!.highestBidder),
      )
      const leaderWallet =
        auction && auction.bidCount > 0n
          ? (auction.status === 'settled' ? auction.winner : auction.highestBidder).toBase58()
          : null
      const brand = leaderWallet ? leaderBrands.data?.[leaderWallet] : null
      return {
        id: index + 1,
        auctionId: auction ? Number(auction.auctionId) : index + 1,
        name: metadata?.name ?? `Spot ${index + 1}`,
        size: geometry.size,
        x: geometry.x,
        y: geometry.y,
        width: geometry.width,
        height: geometry.height,
        dimensions: geometry.dimensions,
        deliverable: metadata?.placement ?? geometry.deliverable,
        chain: auction,
        artworkUrl: recordedLogo
          ? `/api/uploads/${bytesToHex(recordedLogo.contentHash)}`
          : brand
            ? `/api/uploads/${brand.logoHash}`
            : null,
        artworkKind: recordedLogo?.status === 'approved' ? 'approved' : recordedLogo || brand ? 'leader-preview' : null,
        brandName: brand?.name ?? null,
      }
    })
  }, [chainQuery.data, copyQuery.data, streamedAuctionByAddress, leaderBrands.data])

  const effectiveSelectedAuction = selectedAuction ?? liveSpots[0]?.chain?.publicKey.toBase58() ?? null
  const selected =
    liveSpots.find((spot) => spot.chain?.publicKey.toBase58() === effectiveSelectedAuction) ?? liveSpots[0] ?? null
  const bidFeed = useLiveBidFeed(selected?.chain ?? null, program.subscribeBidEvents, liveStream.status)
  const escrowQuery = useQuery({
    queryKey: ['claimspot-public-escrow', selected?.chain?.publicKey.toBase58(), program.wallet.publicKey?.toBase58()],
    enabled: Boolean(selected?.chain && program.wallet.publicKey),
    refetchInterval: (query) => (query.state.data?.delegated === false ? 1_000 : false),
    retry: 2,
    queryFn: () => program.fetchBidEscrow(selected!.chain!.publicKey),
  })

  if (!validAddress) return <CampaignError message="That campaign address is not a valid Solana address." />
  if (chainQuery.isLoading || copyQuery.isLoading) return <CampaignLoading />
  if (chainQuery.isError || copyQuery.isError) {
    return (
      <CampaignError
        message="The campaign could not be read from devnet. This is usually a temporary RPC problem."
        onRetry={() => {
          void chainQuery.refetch()
          void copyQuery.refetch()
        }}
      />
    )
  }
  if (!chainQuery.data?.campaign) {
    return <CampaignError message="No verified Atrium.ads campaign exists at this address." />
  }

  const campaign = chainQuery.data.campaign
  const copy = copyQuery.data
  const campaignTitle = copy?.title ?? `On-chain campaign ${shortAddress(campaign.publicKey.toBase58())}`
  const campaignDetails =
    copy?.details ??
    'This campaign is live on devnet. Its original presentation metadata is unavailable, but every auction state below is read directly from the Atrium.ads auction program.'
  const liveCount = liveSpots.filter((spot) => spot.chain && statusLabel(spot.chain).startsWith('Live')).length
  const campaignProofs = chainQuery.data.proofs.filter((proof) =>
    liveSpots.some((spot) => spot.chain?.publicKey.equals(proof.auction)),
  )
  const finishedSpots = liveSpots.filter(
    (spot) => spot.chain && (spot.chain.status === 'settled' || spot.chain.closed || Number(spot.chain.endsAt) <= now),
  )

  return (
    <div className="min-h-screen bg-[#f4f4ef] px-4 py-8 text-black sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/15 bg-white px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/20"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Atrium.ads
          </Link>
          <WalletButton />
        </div>

        <header className="mt-10 border-b border-black/15 pb-10">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-green-700">
            <Radio className="size-4" aria-hidden="true" /> Public devnet campaign
          </div>
          <h1 className="mt-4 max-w-5xl text-[clamp(3rem,7vw,7rem)] font-black leading-[0.88] tracking-[-0.07em]">
            {campaignTitle}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-600">{campaignDetails}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-semibold text-neutral-600">
            <span>{liveSpots.length} MacBook spots</span>
            <span aria-hidden="true">·</span>
            <span>{liveCount} currently live</span>
            <span aria-hidden="true">·</span>
            <a
              href={`https://explorer.solana.com/address/${campaign.publicKey.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-1 underline decoration-black/25 underline-offset-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/20"
            >
              {shortAddress(campaign.publicKey.toBase58())} <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 ${
                liveStream.status === 'connected'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : liveStream.status === 'fallback'
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-black/10 bg-white text-neutral-600'
              }`}
            >
              {liveStream.status === 'connected' ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
              {liveStream.status === 'connected'
                ? 'MagicBlock ER push connected'
                : liveStream.status === 'fallback'
                  ? 'Reconnecting · 30s reconciliation active'
                  : liveStream.status === 'connecting'
                    ? 'Connecting to delegated ER…'
                    : 'No delegated live lots'}
            </span>
            {copy?.surface && (
              <span className="rounded-full border border-black/10 bg-white px-3 py-2">
                {copy.surface.model} · {copy.surface.finish} ·{' '}
                {copy.surface.fulfillmentMode === 'laser-etch' ? 'laser etched' : 'sticker placement'} ·{' '}
                {copy.surface.imageHash ? 'creator photo' : 'Atrium.ads template'}
                {copy.surface.displayDurationDays ? ` · ${copy.surface.displayDurationDays}-day display` : ''}
                {copy.surface.placementStartWithinDays
                  ? ` · starts within ${copy.surface.placementStartWithinDays} days of approval`
                  : ''}
              </span>
            )}
          </div>
        </header>

        {liveSpots.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-black/20 bg-white p-8">
            <h2 className="text-xl font-black">No lots published</h2>
            <p className="mt-2 text-sm text-neutral-600">
              This campaign exists on-chain but has no registered auctions.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)] xl:items-start">
            <section
              aria-labelledby="surface-map-title"
              className="rounded-3xl border border-black/10 bg-[#e5e5df] p-4 sm:p-6"
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-neutral-500">Creator surface</p>
                  <h2 id="surface-map-title" className="mt-1 text-2xl font-black tracking-[-0.04em]">
                    Pick a spot to bid
                  </h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black tabular-nums">
                  {liveSpots.length} spots
                </span>
              </div>
              <div className="mt-5">
                <MachineBoard
                  spots={liveSpots}
                  selectedAuctionId={selected?.auctionId ?? liveSpots[0].auctionId}
                  onSelect={(auctionId) => {
                    const spot = liveSpots.find((candidate) => candidate.auctionId === auctionId)
                    if (spot?.chain) setSelectedAuction(spot.chain.publicKey.toBase58())
                  }}
                  view="auction"
                  backgroundImageUrl={copy?.surface?.imageHash ? `/api/uploads/${copy.surface.imageHash}` : null}
                />
              </div>
            </section>

            {selected && (
              <AuctionPanel
                key={`${selected.chain?.publicKey.toBase58() ?? selected.id}`}
                spot={selected}
                escrow={escrowQuery.data}
                escrowLoading={escrowQuery.isLoading}
                now={now}
                onRefresh={() => chainQuery.refetch()}
                campaignAddress={validAddress ?? undefined}
              />
            )}
          </div>
        )}

        {selected?.chain && (
          <div className="mt-8">
            <BidHistoryTable
              records={bidFeed.records}
              realtimeStatus={bidFeed.status}
              loading={bidFeed.historyLoading}
            />
          </div>
        )}

        {finishedSpots.length > 0 && (
          <section className="mt-8 rounded-3xl border border-black/10 bg-white p-5 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-neutral-500">After the auction</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Delivery &amp; proof</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Creator placement evidence and escrow payment status appear here after bidding closes.
            </p>
            <div className="mt-5 overflow-x-auto rounded-xl border border-black/10">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <thead className="border-b border-black/10 bg-surface-soft font-mono text-[11px] uppercase tracking-[0.1em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Lot</th>
                    <th className="px-4 py-3">Auction</th>
                    <th className="px-4 py-3">Delivery proof</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3 text-right">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {finishedSpots.map((spot) => {
                    const auction = spot.chain!
                    const proof = campaignProofs.find((candidate) => candidate.auction.equals(auction.publicKey))
                    const paid = chainQuery.data.receipts.some((receipt) => receipt.auction.equals(auction.publicKey))
                    const hasWinner = !auction.winner.equals(PublicKey.default) || auction.bidCount > 0n
                    return (
                      <tr key={auction.publicKey.toBase58()}>
                        <td className="px-4 py-3.5 font-bold">{spot.name}</td>
                        <td className="px-4 py-3.5 text-neutral-600">
                          {auction.status === 'settled'
                            ? hasWinner
                              ? 'Winner locked'
                              : 'Closed · no bids'
                            : auction.closed
                              ? 'Ready to lock winner'
                              : 'Close ER result'}
                        </td>
                        <td className="px-4 py-3.5 font-semibold capitalize text-neutral-600">
                          {auction.status !== 'settled'
                            ? hasWinner
                              ? 'Available after winner lock'
                              : 'Not required'
                            : proof
                              ? proof.status
                              : hasWinner
                                ? 'Awaiting creator proof'
                                : 'Not required'}
                        </td>
                        <td className="px-4 py-3.5 font-semibold">
                          {paid
                            ? 'USDC paid'
                            : hasWinner
                              ? auction.status === 'settled'
                                ? 'Payment in vault'
                                : 'Bid held in vault'
                              : 'No payment'}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {proof ? (
                            <a
                              href={`/api/uploads/${bytesToHex(proof.contentHash)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-10 items-center gap-1 font-bold underline decoration-neutral-300 underline-offset-4 hover:text-neutral-600 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                            >
                              View proof <ExternalLink className="size-3.5" aria-hidden="true" />
                            </a>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function CampaignLoading() {
  return (
    <div className="min-h-screen bg-[#f4f4ef] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl animate-pulse motion-reduce:animate-none">
        <div className="h-10 w-32 rounded-full bg-neutral-200" />
        <div className="mt-12 h-20 max-w-3xl rounded-2xl bg-neutral-200" />
        <div className="mt-10 grid gap-6 xl:grid-cols-[1.55fr_.75fr]">
          <div className="aspect-[1.55/1] rounded-3xl bg-neutral-200" />
          <div className="h-96 rounded-3xl bg-neutral-200" />
        </div>
      </div>
    </div>
  )
}

function CampaignError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f4f4ef] px-4 text-black">
      <div className="max-w-lg rounded-3xl border border-red-200 bg-white p-8">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-red-700">Campaign unavailable</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">We could not open this surface.</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">{message}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {onRetry && <Button onClick={onRetry}>Try again</Button>}
          <Button asChild variant="outline">
            <Link href="/">Back to Atrium.ads</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
