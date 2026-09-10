'use client'

import { PublicKey } from '@solana/web3.js'
import { useEffect, useMemo, useState } from 'react'
import { ChainAuction, LiveAuctionRealtimeUpdate } from './claimspot-program'

export type LiveAuctionStreamStatus = 'idle' | 'connecting' | 'connected' | 'fallback'

type SubscribeLiveAuctions = (
  liveAuctions: PublicKey[],
  onUpdate: (update: LiveAuctionRealtimeUpdate) => void,
) => Promise<() => Promise<void>>

/**
 * Overlays MagicBlock ER WebSocket updates on the slower Solana reconciliation
 * query. The query remains authoritative for lifecycle changes such as final
 * settlement, while active bidding fields arrive as push updates.
 */
export function useLiveAuctionStream(auctions: ChainAuction[], subscribe: SubscribeLiveAuctions) {
  const [updates, setUpdates] = useState<Record<string, LiveAuctionRealtimeUpdate>>({})
  const [connectionState, setConnectionState] = useState<{
    key: string
    status: Exclude<LiveAuctionStreamStatus, 'idle' | 'connecting'>
  } | null>(null)
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null)
  const subscriptionKey = useMemo(
    () =>
      auctions
        .filter((auction) => auction.delegated && auction.status === 'live' && !auction.closed)
        .map((auction) => auction.liveAuction.toBase58())
        .sort()
        .join(','),
    [auctions],
  )

  useEffect(() => {
    const liveAuctions = subscriptionKey ? subscriptionKey.split(',').map((address) => new PublicKey(address)) : []
    if (liveAuctions.length === 0) return

    let active = true
    let unsubscribe: (() => Promise<void>) | null = null
    void subscribe(liveAuctions, (update) => {
      if (!active) return
      setUpdates((current) => ({ ...current, [update.liveAuction.toBase58()]: update }))
      setLastUpdateAt(Date.now())
    })
      .then((cleanup) => {
        if (active) {
          unsubscribe = cleanup
          setConnectionState({ key: subscriptionKey, status: 'connected' })
        } else void cleanup()
      })
      .catch(() => {
        // The component's periodic query remains the fallback if a WebSocket
        // cannot be established or the router is temporarily unavailable.
        if (active) setConnectionState({ key: subscriptionKey, status: 'fallback' })
      })

    return () => {
      active = false
      if (unsubscribe) void unsubscribe()
    }
  }, [subscribe, subscriptionKey])

  const streamedAuctions = useMemo(
    () =>
      auctions.map((auction) => {
        const update = updates[auction.liveAuction.toBase58()]
        return update ? { ...auction, ...update } : auction
      }),
    [auctions, updates],
  )

  const status: LiveAuctionStreamStatus = !subscriptionKey
    ? 'idle'
    : connectionState?.key === subscriptionKey
      ? connectionState.status
      : 'connecting'

  return { auctions: streamedAuctions, status, lastUpdateAt }
}
