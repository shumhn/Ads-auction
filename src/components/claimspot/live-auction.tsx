'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, LoaderCircle, Radio, ShieldCheck, TimerReset, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WalletButton } from '@/components/solana/solana-provider'
import { useCluster } from '@/components/cluster/cluster-data-access'
import {
  ChainAuction,
  ChainBidEscrow,
  CLAIMSPOT_PAYMENT_MINT,
  CLAIMSPOT_PROGRAM_ID,
  DEVNET_USDC_FAUCET_URL,
  useClaimSpotProgram,
} from '@/lib/claimspot-program'
import {
  FEATURED_AUCTION_IDS,
  formatUsdc,
  fromUsdcAtoms,
  shortAddress,
  SPOT_METADATA,
  SpotMetadata,
  toUsdcAtoms,
} from '@/lib/claimspot'
import { useLiveAuctionStream } from '@/lib/use-live-auction-stream'

export type LiveSpot = SpotMetadata & { chain: ChainAuction | null; artworkUrl?: string | null; draftPrice?: number }

function minimumBid(auction: ChainAuction) {
  return auction.bidCount === 0n ? auction.reservePrice : auction.highestBid + auction.minIncrement
}

function auctionState(auction: ChainAuction, now: number) {
  if (auction.status === 'settled') return 'Settled'
  if (auction.closed) return 'Closed'
  if (Number(auction.endsAt) <= now) return 'Ended'
  return auction.delegated ? 'Live on MagicBlock' : 'Live on Solana'
}

function walletDeclined(error: unknown) {
  return error instanceof Error && /reject|declin|cancel/i.test(error.message)
}

function Countdown({ endsAt, now }: { endsAt: bigint; now: number }) {
  const remaining = Math.max(0, Number(endsAt) - now)
  const days = Math.floor(remaining / 86400)
  const hours = Math.floor((remaining % 86400) / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60

  return (
    <span className="font-mono tabular-nums">
      {days > 0 ? `${days}d ` : ''}
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  )
}

export function MachineBoard({
  spots,
  selectedAuctionId,
  onSelect,
  view,
  backgroundImageUrl,
  builder = false,
}: {
  spots: LiveSpot[]
  selectedAuctionId: number
  onSelect: (auctionId: number) => void
  view: 'auction' | 'result'
  backgroundImageUrl?: string | null
  builder?: boolean
}) {
  return (
    <div className="relative mx-auto aspect-[1.52/1] w-full max-w-4xl rounded-[1.15rem] border border-black/20 bg-[linear-gradient(145deg,#e7e7e3_0%,#bfc0bd_48%,#eeeeeb_100%)] p-2 shadow-[0_35px_90px_-50px_rgba(0,0,0,0.7)] sm:rounded-[1.35rem] sm:p-3">
      <div className="relative h-full overflow-hidden rounded-[0.8rem] border border-black/15 bg-[linear-gradient(145deg,#c9cac7,#eee,#b8b9b7)] sm:rounded-[1rem]">
        {backgroundImageUrl && (
          // Content-addressed creator media is intentionally rendered without
          // Next Image optimization so local/devnet upload URLs remain exact.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundImageUrl}
            alt="Creator MacBook surface"
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {backgroundImageUrl && <div className="pointer-events-none absolute inset-0 bg-white/20" />}
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_center,transparent_0,transparent_38%,rgba(255,255,255,.9)_100%)]" />
        <div className="font-mono pointer-events-none absolute left-1/2 top-1/2 grid size-[18%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-dashed border-black/15 bg-white/20 text-[clamp(.5rem,1.4vw,.75rem)] font-black uppercase tracking-[0.08em] text-black/35">
          Reserved
        </div>

        {spots.map((spot) => {
          const selected = spot.auctionId === selectedAuctionId
          const hasBid = Boolean(spot.chain && spot.chain.bidCount > 0n)
          const value = spot.chain
            ? spot.chain.highestBid > 0n
              ? fromUsdcAtoms(spot.chain.highestBid)
              : fromUsdcAtoms(spot.chain.reservePrice)
            : null
          const winner = spot.chain?.highestBidder.toBase58()

          return (
            <button
              key={spot.id}
              type="button"
              aria-label={`${spot.name}${value === null ? ', not published' : `, ${hasBid ? 'top bid' : 'reserve'} ${formatUsdc(value)} devnet USDC`}`}
              onClick={() => onSelect(spot.auctionId)}
              className={`absolute flex min-h-10 flex-col items-center justify-center overflow-hidden rounded-md border px-1 text-center transition-transform duration-150 active:scale-[0.98] focus-visible:z-20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/30 sm:rounded-lg ${
                selected
                  ? 'z-10 scale-[1.035] border-black bg-signal text-black shadow-lg'
                  : spot.chain
                    ? 'border-black/20 bg-white/68 text-black hover:scale-[1.025] hover:bg-white'
                    : 'border-dashed border-black/25 bg-transparent text-black/40'
              }`}
              style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${spot.width}%`, height: `${spot.height}%` }}
            >
              {spot.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={spot.artworkUrl}
                  alt={`${spot.name} approved artwork`}
                  className="size-full object-contain p-1"
                />
              ) : builder ? (
                <>
                  <span className="font-mono text-[8px] font-black uppercase tracking-[0.08em] sm:text-[10px]">
                    #{spot.id} · {spot.size}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[8px] font-semibold leading-none sm:text-[11px]">
                    {spot.name}
                  </span>
                  {typeof spot.draftPrice === 'number' && (
                    <span className="mt-1 text-[8px] font-black tabular-nums sm:text-[10px]">
                      from {formatUsdc(spot.draftPrice)} USDC
                    </span>
                  )}
                </>
              ) : view === 'result' && hasBid && winner ? (
                <>
                  <span className="font-mono text-[8px] font-black uppercase tracking-[0.08em] sm:text-[10px]">
                    Leader
                  </span>
                  <span className="mt-0.5 font-mono text-[8px] sm:text-xs">{shortAddress(winner)}</span>
                </>
              ) : (
                <>
                  <span className="font-mono text-[8px] font-black uppercase tracking-[0.08em] sm:text-[10px]">
                    #{spot.id}
                  </span>
                  <span className="mt-0.5 text-[8px] font-semibold leading-none sm:text-[11px]">
                    {value === null ? 'Not live' : `${formatUsdc(value)} USDC`}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
      <div className="absolute -bottom-2 left-1/2 h-2 w-[88%] -translate-x-1/2 rounded-b-[1rem] border-x border-b border-black/20 bg-[#a9aaa7]" />
    </div>
  )
}

export function AuctionPanel({
  spot,
  escrow,
  escrowLoading,
  now,
  onRefresh,
}: {
  spot: LiveSpot
  escrow: ChainBidEscrow | null | undefined
  escrowLoading: boolean
  now: number
  onRefresh: () => Promise<unknown>
}) {
  const { wallet, requestDevnetUsdc, fundAndDelegateBid, placeBid, bidSession, createBidSession, revokeBidSession } =
    useClaimSpotProgram()
  const { getExplorerUrl } = useCluster()
  const queryClient = useQueryClient()
  const chain = spot.chain
  const minBid = chain ? fromUsdcAtoms(minimumBid(chain)) : 0
  const [budget, setBudget] = useState(() => formatUsdc(minBid))
  const [amount, setAmount] = useState(() => formatUsdc(minBid))
  const [pending, setPending] = useState<'faucet' | 'budget' | 'session' | 'bid' | null>(null)
  const sessionActive = Boolean(
    bidSession && wallet.publicKey && bidSession.authority.equals(wallet.publicKey) && bidSession.expiresAt > now,
  )

  async function requestDevnetTokens() {
    if (!wallet.publicKey) return
    try {
      setPending('faucet')
      const result = await requestDevnetUsdc(1_000n)
      toast.success('1,000 devnet USDC received', {
        description: 'Minted by the shared on-chain faucet. These test tokens have no monetary value.',
        action: {
          label: 'Transaction',
          onClick: () => window.open(getExplorerUrl(`tx/${result.signature}`), '_blank', 'noopener,noreferrer'),
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Devnet faucet request failed')
    } finally {
      setPending(null)
    }
  }

  async function lockBudget() {
    if (!chain) return
    const value = Number(budget)
    if (!Number.isFinite(value) || value < minBid) {
      toast.error(`Budget must be at least ${formatUsdc(minBid)} devnet USDC`)
      return
    }
    try {
      setPending('budget')
      const result = await fundAndDelegateBid(chain, toUsdcAtoms(value))
      toast.success(result.delegationReady ? 'Real devnet budget ready' : 'Real devnet budget locked', {
        description: result.delegationReady
          ? `Escrow ${shortAddress(result.bidEscrow.toBase58())} is live on MagicBlock.`
          : `Escrow ${shortAddress(result.bidEscrow.toBase58())} is confirming on MagicBlock. Bidding unlocks automatically.`,
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['claimspot-public-escrow'] }),
        queryClient.invalidateQueries({ queryKey: ['claimspot-escrow'] }),
      ])
    } catch (error) {
      if (walletDeclined(error)) return
      toast.error(error instanceof Error ? error.message : 'Budget transaction failed')
    } finally {
      setPending(null)
    }
  }

  async function submitBid() {
    if (!chain) return
    const value = Number(amount)
    if (!Number.isFinite(value) || value < minBid) {
      toast.error(`Bid must be at least ${formatUsdc(minBid)} devnet USDC`)
      return
    }
    if (!escrow || toUsdcAtoms(value) > escrow.deposited) {
      toast.error('Bid exceeds your locked devnet USDC budget')
      return
    }
    try {
      setPending('bid')
      const signature = await placeBid(chain, toUsdcAtoms(value))
      toast.success('Bid accepted by MagicBlock', {
        action: {
          label: 'Transaction',
          onClick: () => window.open(getExplorerUrl(`tx/${signature}`), '_blank', 'noopener,noreferrer'),
        },
      })
      await onRefresh()
      await queryClient.invalidateQueries({ queryKey: ['claimspot-escrow'] })
    } catch (error) {
      if (walletDeclined(error)) return
      toast.error(error instanceof Error ? error.message : 'Bid transaction failed')
    } finally {
      setPending(null)
    }
  }

  async function toggleBidSession() {
    try {
      setPending('session')
      if (sessionActive) {
        const signature = await revokeBidSession()
        toast.success('One-click bidding session revoked', {
          action: signature
            ? {
                label: 'Transaction',
                onClick: () => window.open(getExplorerUrl(`tx/${signature}`), '_blank', 'noopener,noreferrer'),
              }
            : undefined,
        })
      } else {
        const session = await createBidSession()
        toast.success('One-click bids enabled for one hour', {
          description: 'The temporary key can only place bids as this wallet; it cannot move USDC or settle auctions.',
          action: {
            label: 'Transaction',
            onClick: () =>
              window.open(getExplorerUrl(`tx/${session.createSignature}`), '_blank', 'noopener,noreferrer'),
          },
        })
      }
    } catch (error) {
      if (walletDeclined(error)) return
      toast.error(error instanceof Error ? error.message : 'Bidding session transaction failed')
    } finally {
      setPending(null)
    }
  }

  if (!chain) {
    return (
      <aside className="rounded-xl border border-dashed border-black/25 bg-white p-5">
        <p className="font-mono text-xs font-black uppercase tracking-[0.14em] text-neutral-500">Lot #{spot.id}</p>
        <h3 className="mt-3 text-xl font-black tracking-[-0.04em]">Not published yet</h3>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          There is no devnet account for this lot, so Atrium.ads does not display invented auction data.
        </p>
      </aside>
    )
  }

  const isOpen = chain.status === 'live' && !chain.closed && Number(chain.endsAt) > now

  return (
    <aside className="rounded-xl border border-black/15 bg-white p-4 shadow-[0_20px_60px_-45px_rgba(0,0,0,.65)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            Lot #{spot.id} · {spot.size}
          </p>
          <h3 className="mt-2 text-xl font-black tracking-[-0.04em]">{spot.name}</h3>
        </div>
        <span
          className={`font-mono rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${
            chain.delegated ? 'bg-signal text-black' : 'bg-neutral-100 text-neutral-600'
          }`}
        >
          {auctionState(chain, now)}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-black/10 bg-black/10">
        <div className="bg-surface-soft p-3.5">
          <dt className="text-xs font-semibold text-neutral-500">Current top bid</dt>
          <dd className="mt-1 text-lg font-black tabular-nums">
            {chain.highestBid > 0n ? formatUsdc(fromUsdcAtoms(chain.highestBid)) : '—'} USDC
          </dd>
        </div>
        <div className="bg-surface-soft p-3.5">
          <dt className="text-xs font-semibold text-neutral-500">Next valid bid</dt>
          <dd className="mt-1 text-lg font-black tabular-nums">{formatUsdc(minBid)} USDC</dd>
        </div>
        <div className="bg-surface-soft p-3.5">
          <dt className="text-xs font-semibold text-neutral-500">Bids</dt>
          <dd className="mt-1 text-lg font-black tabular-nums">{chain.bidCount.toString()}</dd>
        </div>
        <div className="bg-surface-soft p-3.5">
          <dt className="text-xs font-semibold text-neutral-500">Time left</dt>
          <dd className="mt-1 text-lg font-black">
            <Countdown endsAt={chain.endsAt} now={now} />
          </dd>
        </div>
      </dl>

      <p className="mt-5 text-sm leading-6 text-neutral-600">
        {spot.deliverable}. Artwork approval and physical fulfilment are creator responsibilities in this devnet
        release.
      </p>

      <a
        href={getExplorerUrl(`address/${chain.publicKey.toBase58()}`)}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 underline decoration-neutral-300 underline-offset-4 hover:text-black"
      >
        Verify auction account <ExternalLink className="size-3" />
      </a>

      <div className="mt-6 border-t border-black/10 pt-5">
        {!wallet.connected ? (
          <div>
            <p className="mb-3 text-sm text-neutral-600">Connect a Solana devnet wallet to lock a budget and bid.</p>
            <WalletButton />
          </div>
        ) : !isOpen ? (
          <p className="rounded-md bg-neutral-100 p-3 text-sm font-semibold text-neutral-700">
            This lot is not accepting bids.
          </p>
        ) : escrowLoading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <LoaderCircle className="size-4 animate-spin" /> Reading your on-chain escrow…
          </div>
        ) : !escrow ? (
          <div>
            <label htmlFor="budget" className="text-sm font-bold">
              1. Lock maximum budget
            </label>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              Shared devnet USDC moves into this lot&apos;s Solana vault, then your bid account is delegated.
            </p>
            <button
              type="button"
              onClick={requestDevnetTokens}
              disabled={pending !== null}
              className="mt-1 inline-flex min-h-10 items-center gap-1 text-xs font-bold underline decoration-neutral-300 underline-offset-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/20 disabled:opacity-50"
            >
              {pending === 'faucet' && <LoaderCircle className="size-3 animate-spin" />}
              Get 1,000 test USDC from the shared devnet faucet
            </button>
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="budget"
                  type="text"
                  autoComplete="off"
                  inputMode="decimal"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  className="h-11 pr-16 font-mono"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">
                  USDC
                </span>
              </div>
              <Button
                onClick={lockBudget}
                disabled={pending !== null}
                className="h-11 rounded-md bg-black px-5 text-white"
              >
                {pending === 'budget' ? <LoaderCircle className="size-4 animate-spin" /> : 'Lock budget'}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between rounded-md bg-surface-soft px-3 py-2 text-xs">
              <span className="font-semibold text-neutral-600">MagicBlock bid budget</span>
              <span className="font-black tabular-nums">{formatUsdc(fromUsdcAtoms(escrow.deposited))} USDC</span>
            </div>
            <label htmlFor="bid-amount" className="text-sm font-bold">
              2. Place real-time bid
            </label>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-black/10 bg-white px-3 py-2.5">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold">
                  <Zap className="size-3.5" /> One-click bids
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-neutral-500">
                  {sessionActive
                    ? 'Active for this tab; bids need no wallet popup.'
                    : 'One wallet approval enables bids for 1 hour.'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleBidSession}
                disabled={pending !== null || !escrow.delegated}
                className="shrink-0 rounded-md"
              >
                {pending === 'session' ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : sessionActive ? (
                  'Revoke'
                ) : (
                  'Enable'
                )}
              </Button>
            </div>
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="bid-amount"
                  type="text"
                  autoComplete="off"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="h-11 pr-16 font-mono"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">
                  USDC
                </span>
              </div>
              <Button
                onClick={submitBid}
                disabled={pending !== null || !escrow.delegated}
                className="h-11 rounded-md bg-signal px-5 text-black hover:bg-signal/80"
              >
                {pending === 'bid' ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : sessionActive ? (
                  'Bid instantly'
                ) : (
                  'Bid now'
                )}
              </Button>
            </div>
            {!escrow.delegated && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
                <LoaderCircle className="size-3 animate-spin" /> Finalizing MagicBlock delegation. Bidding unlocks
                automatically.
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

export function LiveAuction() {
  const { fetchAuctions, fetchBidEscrow, subscribeLiveAuctions, wallet } = useClaimSpotProgram()
  const { getExplorerUrl } = useCluster()
  const [selectedAuctionId, setSelectedAuctionId] = useState(FEATURED_AUCTION_IDS[0])
  const [view, setView] = useState<'auction' | 'result'>('auction')
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const auctionsQuery = useQuery({
    queryKey: ['claimspot-featured-auctions'],
    queryFn: () => fetchAuctions(FEATURED_AUCTION_IDS),
    refetchInterval: 30_000,
    retry: 2,
  })

  const { auctions: streamedAuctions } = useLiveAuctionStream(auctionsQuery.data ?? [], subscribeLiveAuctions)

  const spots = useMemo<LiveSpot[]>(() => {
    const byId = new Map(streamedAuctions.map((auction) => [Number(auction.auctionId), auction]))
    return SPOT_METADATA.map((spot) => ({ ...spot, chain: byId.get(spot.auctionId) ?? null }))
  }, [streamedAuctions])

  const selected = spots.find((spot) => spot.auctionId === selectedAuctionId) ?? spots[0]
  const escrowQuery = useQuery({
    queryKey: ['claimspot-escrow', selected?.chain?.publicKey.toBase58(), wallet.publicKey?.toBase58()],
    queryFn: () => fetchBidEscrow(selected.chain!.publicKey),
    enabled: Boolean(selected?.chain && wallet.publicKey),
    refetchInterval: (query) => (query.state.data?.delegated === false ? 1000 : false),
    retry: 2,
  })

  const published = spots.filter((spot) => spot.chain)
  const delegated = published.filter((spot) => spot.chain?.delegated)
  const totalBids = published.reduce((sum, spot) => sum + (spot.chain?.bidCount ?? 0n), 0n)
  const leadingValue = published.reduce((sum, spot) => sum + (spot.chain?.highestBid ?? 0n), 0n)

  return (
    <section
      id="featured"
      className="scroll-mt-20 border-t border-black/10 bg-surface-soft px-4 py-14 sm:px-6 lg:px-8 lg:py-20"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="font-mono flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
              <span className="size-2 animate-pulse rounded-full bg-green-600 motion-reduce:animate-none" /> Real devnet
              campaign
            </div>
            <h2 className="mt-4 max-w-4xl text-[clamp(2.4rem,5.2vw,5.25rem)] font-black leading-[0.9] tracking-[-0.07em]">
              Reference 22-lot devnet board.
            </h2>
          </div>
          <a
            href={getExplorerUrl(`address/${CLAIMSPOT_PROGRAM_ID.toBase58()}`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold underline decoration-black/25 underline-offset-4 hover:decoration-black"
          >
            Verify deployed program <ExternalLink className="size-4" />
          </a>
        </div>

        <div className="mt-9 grid grid-cols-2 border-y border-black/15 sm:grid-cols-4">
          <div className="border-b border-black/10 py-3.5 pr-4 sm:border-b-0 sm:border-r sm:py-4 sm:pr-5">
            <p className="text-xs font-semibold text-neutral-500">Published lots</p>
            <p className="mt-1 text-xl font-black tabular-nums">
              {published.length} / {SPOT_METADATA.length}
            </p>
          </div>
          <div className="border-b border-black/10 py-3.5 pr-4 sm:border-b-0 sm:border-r sm:px-5 sm:py-4">
            <p className="text-xs font-semibold text-neutral-500">MagicBlock delegated</p>
            <p className="mt-1 text-xl font-black tabular-nums">
              {delegated.length} / {published.length || 0}
            </p>
          </div>
          <div className="border-b border-black/10 py-3.5 pr-4 sm:border-b-0 sm:border-r sm:px-5 sm:py-4">
            <p className="text-xs font-semibold text-neutral-500">Verified bids</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{totalBids.toString()}</p>
          </div>
          <div className="py-3.5 sm:py-4 sm:pl-5">
            <p className="text-xs font-semibold text-neutral-500">Live top bids</p>
            <p className="mt-1 text-xl font-black tabular-nums">
              {formatUsdc(fromUsdcAtoms(leadingValue))} <span className="text-sm">USDC</span>
            </p>
          </div>
        </div>

        {auctionsQuery.isLoading ? (
          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.75fr)]">
            <div className="aspect-[1.52/1] animate-pulse rounded-xl border border-black/10 bg-neutral-200 motion-reduce:animate-none" />
            <div className="rounded-xl border border-black/10 bg-white p-5">
              <div className="h-3 w-20 animate-pulse rounded bg-neutral-200 motion-reduce:animate-none" />
              <div className="mt-4 h-8 w-48 animate-pulse rounded bg-neutral-200 motion-reduce:animate-none" />
              <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-neutral-200">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse bg-neutral-100 motion-reduce:animate-none" />
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-neutral-500">
                <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" /> Reading 22 devnet accounts…
              </div>
            </div>
          </div>
        ) : auctionsQuery.isError ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
            <h3 className="text-xl font-black">Devnet data could not be verified</h3>
            <p className="mt-2 text-sm text-red-800">No fallback or mock auction data is being shown.</p>
            <Button onClick={() => auctionsQuery.refetch()} className="mt-5">
              Retry
            </Button>
          </div>
        ) : (
          <>
            {published.length !== SPOT_METADATA.length && (
              <div className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                Only {published.length} of {SPOT_METADATA.length} real devnet lots are currently available. Missing lots
                remain visibly unpublished.
              </div>
            )}

            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.75fr)] xl:items-start">
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-600">
                    Select a physical placement to inspect its live account.
                  </p>
                  <div className="inline-flex rounded-md bg-black/5 p-0.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setView('auction')}
                      className={`min-h-9 rounded px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${view === 'auction' ? 'bg-white shadow-sm' : 'text-neutral-500'}`}
                    >
                      Live auction
                    </button>
                    <button
                      type="button"
                      onClick={() => setView('result')}
                      className={`min-h-9 rounded px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${view === 'result' ? 'bg-white shadow-sm' : 'text-neutral-500'}`}
                    >
                      Current leaders
                    </button>
                  </div>
                </div>
                <MachineBoard
                  spots={spots}
                  selectedAuctionId={selectedAuctionId}
                  onSelect={setSelectedAuctionId}
                  view={view}
                />
              </div>
              <AuctionPanel
                key={`${selected.chain?.publicKey.toBase58() ?? `unpublished-${selected.id}`}-${selected.chain ? minimumBid(selected.chain).toString() : '0'}`}
                spot={selected}
                escrow={escrowQuery.data}
                escrowLoading={escrowQuery.isLoading}
                now={now}
                onRefresh={() => auctionsQuery.refetch()}
              />
            </div>

            <div id="featured-lots" className="mt-16 scroll-mt-24">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="font-mono text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                    On-chain inventory
                  </p>
                  <h3 className="mt-2 text-3xl font-black tracking-[-0.05em]">All 22 lots</h3>
                </div>
                <p className="max-w-lg text-sm leading-6 text-neutral-600">
                  Every price and bidder below is read from the deployed program. Empty means no real bid has been
                  placed.
                </p>
              </div>
              <div className="mt-6 overflow-x-auto rounded-lg border border-black/10 bg-white">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="font-mono border-b border-black/10 bg-[#f7f7f4] text-xs uppercase tracking-[0.1em] text-neutral-500">
                    <tr>
                      <th className="px-4 py-3">Lot</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3">Leader</th>
                      <th className="px-4 py-3">Current / reserve</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {spots.map((spot) => {
                      const chain = spot.chain
                      const bidder = chain && chain.bidCount > 0n ? shortAddress(chain.highestBidder.toBase58()) : '—'
                      const value = chain
                        ? fromUsdcAtoms(chain.highestBid > 0n ? chain.highestBid : chain.reservePrice)
                        : null
                      return (
                        <tr key={spot.id} className="border-b border-black/5 last:border-0 hover:bg-[#fafaf7]">
                          <td className="px-4 py-4 font-bold">
                            #{spot.id} · {spot.name}
                          </td>
                          <td className="px-4 py-4 text-neutral-500">
                            {spot.size} · {spot.dimensions}
                          </td>
                          <td className="px-4 py-4 font-mono">{bidder}</td>
                          <td className="px-4 py-4 font-black tabular-nums">
                            {value === null ? 'Unpublished' : `${formatUsdc(value)} USDC`}
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className={`size-1.5 rounded-full ${chain?.delegated ? 'bg-green-600' : 'bg-neutral-300'}`}
                              />
                              {chain ? auctionState(chain, now) : 'Not live'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <Button
                              className="min-h-10"
                              variant="outline"
                              onClick={() => {
                                setSelectedAuctionId(spot.auctionId)
                                document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' })
                              }}
                              disabled={!chain}
                            >
                              Inspect
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div id="how-it-works" className="mt-20 scroll-mt-24 border-t border-black/10 pt-14">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                Why MagicBlock is here
              </p>
              <h3 className="mt-3 text-3xl font-black tracking-[-0.05em]">
                Money stays on Solana. Bidding moves at live-event speed.
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-black/10 bg-white p-5">
                <ShieldCheck className="size-5" />
                <h4 className="mt-5 font-black">1. Lock</h4>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  A bidder deposits shared devnet USDC into the lot&apos;s program vault.
                </p>
              </div>
              <div className="rounded-lg border border-black/10 bg-white p-5">
                <Zap className="size-5" />
                <h4 className="mt-5 font-black">2. Compete</h4>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Delegated bid state executes through MagicBlock&apos;s Ephemeral Rollup.
                </p>
              </div>
              <div className="rounded-lg border border-black/10 bg-white p-5">
                <TimerReset className="size-5" />
                <h4 className="mt-5 font-black">3. Settle</h4>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  The winner, amount, payout, refund and receipt settle back on Solana.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-8 flex items-start gap-2 rounded-lg border border-black/10 bg-white p-4 text-sm leading-6 text-neutral-600">
            <Radio className="mt-0.5 size-4 shrink-0" />
            <p>
              <strong className="text-black">Devnet scope:</strong> bidding and settlement are enforced by the deployed
              program using shared faucet USDC mint{' '}
              {CLAIMSPOT_PAYMENT_MINT ? shortAddress(CLAIMSPOT_PAYMENT_MINT.toBase58()) : 'not configured'}. It is a
              dummy devnet asset with no monetary value. If the embedded faucet is unavailable, use{' '}
              <a className="font-bold underline" href={DEVNET_USDC_FAUCET_URL} target="_blank" rel="noreferrer">
                the public faucet
              </a>
              . Artwork moderation, creator identity, and physical delivery are operational workflows and are not yet
              enforced on-chain.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
