'use client'

import { PublicKey } from '@solana/web3.js'
import { useEffect, useMemo, useState } from 'react'
import { ChainAuction, LiveAuctionRealtimeUpdate } from './claimspot-program'

export type LiveAuctionStreamStatus = 'idle' | 'connecting' | 'connected' | 'fallback'

type SubscribeLiveAuctions = (
  liveAuctions: PublicKey[],
  onUpdate: (update: LiveAuctionRealtimeUpdate) => void,
) => Promise<() => Promise<void>>

type ReadLiveAuctions = (liveAuctions: PublicKey[]) => Promise<LiveAuctionRealtimeUpdate[]>

/**
 * Overlays MagicBlock ER WebSocket updates on the slower Solana reconciliation
 * query. The query remains authoritative for lifecycle changes such as final
 * settlement, while active bidding fields arrive as push updates.
 */
export function useLiveAuctionStream(
  auctions: ChainAuction[],
  subscribe: SubscribeLiveAuctions,
  readLiveAuctions: ReadLiveAuctions,
) {
  const [updates, setUpdates] = useState<Record<string, LiveAuctionRealtimeUpdate>>({})
  const [connectionState, setConnectionState] = useState<{
    key: string
    status: Exclude<LiveAuctionStreamStatus, 'idle'>
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
    let reconnectTimer: number | null = null

    const connect = async () => {
      if (!active) return
      setConnectionState({ key: subscriptionKey, status: 'connecting' })
      try {
        const cleanup = await subscribe(liveAuctions, (update) => {
          if (!active) return
          setUpdates((current) => ({ ...current, [update.liveAuction.toBase58()]: update }))
          setLastUpdateAt(Date.now())
        })
        if (active) {
          unsubscribe = cleanup
          setConnectionState({ key: subscriptionKey, status: 'connected' })
        } else void cleanup()
      } catch {
        // A single failed lot subscription must not leave the remaining lots
        // looking healthy. Keep retrying while the page is open; the read
        // reconciliation below keeps the UI fresh during the retry window.
        if (!active) return
        setConnectionState({ key: subscriptionKey, status: 'fallback' })
        reconnectTimer = window.setTimeout(() => void connect(), 2_000)
      }
    }

    void connect()

    return () => {
      active = false
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer)
      if (unsubscribe) void unsubscribe()
    }
  }, [subscribe, subscriptionKey])

  useEffect(() => {
    const liveAuctions = subscriptionKey ? subscriptionKey.split(',').map((address) => new PublicKey(address)) : []
    if (liveAuctions.length === 0) return

    let active = true
    let reading = false

    const reconcile = async () => {
      if (!active || reading) return
      reading = true
      try {
        const snapshots = await readLiveAuctions(liveAuctions)
        if (!active) return
        if (snapshots.length > 0) {
          setUpdates((current) => {
            const next = { ...current }
            snapshots.forEach((snapshot) => {
              next[snapshot.liveAuction.toBase58()] = snapshot
            })
            return next
          })
          setLastUpdateAt(Date.now())
        }
      } catch {
        // The ER push connection or the next reconciliation attempt can still
        // recover. Keep the last verified value instead of blanking the board.
      } finally {
        reading = false
      }
    }

    // Do not wait for the first interval. This closes the gap for a browser
    // that missed the initial ER account notification while subscribing.
    void reconcile()
    const interval = window.setInterval(() => void reconcile(), 5_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [readLiveAuctions, subscriptionKey])

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
