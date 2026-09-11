'use client'

import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { ChainAuction, LiveBidRealtimeEvent } from './claimspot-program'
import { LiveAuctionStreamStatus } from './use-live-auction-stream'

export type BidRecord = {
  signature: string
  source: 'solana-devnet' | 'magicblock-er'
  bidder: string
  amount: bigint
  bidCount: bigint
  blockTime: number | null
  endpoint?: string
}

type ActivityResponse = {
  activities: Array<{
    id: string
    source: BidRecord['source']
    signature: string
    blockTime: number | null
    name: string
    data: Record<string, unknown>
    endpoint?: string
  }>
}

type SubscribeBidEvents = (
  auctions: Array<{ auction: PublicKey; liveAuction: PublicKey }>,
  onBid: (event: LiveBidRealtimeEvent) => void,
) => Promise<() => Promise<void>>

export function useLiveBidFeed(
  auction: ChainAuction | null,
  subscribeBidEvents: SubscribeBidEvents,
  accountStreamStatus: LiveAuctionStreamStatus,
) {
  const [pushedBidEvents, setPushedBidEvents] = useState<LiveBidRealtimeEvent[]>([])
  const [bidStreamState, setBidStreamState] = useState<{
    key: string
    status: 'connecting' | 'connected' | 'fallback'
  } | null>(null)
  const auctionKey = auction?.publicKey.toBase58() ?? ''
  const liveAuctionKey = auction?.liveAuction.toBase58() ?? ''
  const isDelegated = Boolean(auction?.delegated)
  const isClosed = Boolean(auction?.closed)

  useEffect(() => {
    if (!auctionKey || !liveAuctionKey || !isDelegated || isClosed) return
    let active = true
    let unsubscribe: (() => Promise<void>) | null = null
    void subscribeBidEvents(
      [{ auction: new PublicKey(auctionKey), liveAuction: new PublicKey(liveAuctionKey) }],
      (event) => {
        if (!active) return
        setPushedBidEvents((current) => {
          if (current.some((item) => item.signature === event.signature)) return current
          return [event, ...current].slice(0, 100)
        })
      },
    )
      .then((cleanup) => {
        if (active) {
          unsubscribe = cleanup
          setBidStreamState({ key: auctionKey, status: 'connected' })
        } else void cleanup()
      })
      .catch(() => {
        if (active) setBidStreamState({ key: auctionKey, status: 'fallback' })
      })
    return () => {
      active = false
      if (unsubscribe) void unsubscribe()
    }
  }, [auctionKey, isClosed, isDelegated, liveAuctionKey, subscribeBidEvents])

  const activityQuery = useQuery<ActivityResponse>({
    queryKey: ['claimspot-live-bid-history'],
    queryFn: async () => {
      const response = await fetch('/api/activity', { cache: 'no-store' })
      if (!response.ok) throw new Error('Bid history indexer request failed')
      return response.json()
    },
    refetchInterval: 5_000,
    retry: 1,
  })

  const records = useMemo<BidRecord[]>(() => {
    if (!auctionKey) return []
    const merged = new Map<string, BidRecord>()
    for (const activity of activityQuery.data?.activities ?? []) {
      if (activity.name !== 'BidPlaced' || String(activity.data.auction ?? '') !== auctionKey) continue
      try {
        merged.set(activity.signature, {
          signature: activity.signature,
          source: activity.source,
          bidder: String(activity.data.bidder),
          amount: BigInt(String(activity.data.amount)),
          bidCount: BigInt(String(activity.data.bidCount ?? activity.data.bid_count)),
          blockTime: activity.blockTime,
          endpoint: activity.endpoint,
        })
      } catch {
        // Ignore malformed cached records instead of inventing bid history.
      }
    }
    for (const event of pushedBidEvents) {
      if (event.auction.toBase58() !== auctionKey) continue
      merged.set(event.signature, {
        signature: event.signature,
        source: 'magicblock-er',
        bidder: event.bidder.toBase58(),
        amount: event.amount,
        bidCount: event.bidCount,
        blockTime: null,
        endpoint: event.endpoint,
      })
    }
    return Array.from(merged.values()).sort((left, right) => Number(right.bidCount - left.bidCount))
  }, [activityQuery.data?.activities, auctionKey, pushedBidEvents])

  const status: LiveAuctionStreamStatus = !auctionKey
    ? 'idle'
    : accountStreamStatus === 'connecting' || bidStreamState?.key !== auctionKey
      ? 'connecting'
      : accountStreamStatus === 'connected'
        ? bidStreamState.status
        : 'fallback'

  const historyLoading = records.length === 0 && activityQuery.isLoading

  return { records, status, historyLoading }
}
