'use client'

import { useQuery } from '@tanstack/react-query'
import { ExternalLink, LoaderCircle, Radio, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { shortAddress } from '@/lib/claimspot'

type Activity = {
  id: string
  source: 'solana-devnet' | 'magicblock-er'
  signature: string
  slot: number
  blockTime: number | null
  name: string
  data: Record<string, unknown>
}

type ActivityResponse = {
  updatedAt: string | null
  activities: Activity[]
  health: Record<string, { ok: boolean; message: string }>
}

function eventTitle(name: string) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
}

function importantFields(data: Record<string, unknown>) {
  const preferred = ['campaign', 'auction', 'bidder', 'creator', 'winner', 'amount', 'lotIndex', 'approved', 'accepted']
  return preferred.flatMap((key) => (key in data ? [[key, String(data[key])]] : [])).slice(0, 4)
}

export function ActivityFeature() {
  const query = useQuery<ActivityResponse>({
    queryKey: ['claimspot-activity'],
    queryFn: async () => {
      const response = await fetch('/api/activity', { cache: 'no-store' })
      if (!response.ok) throw new Error('Activity indexer request failed')
      return response.json()
    },
    refetchInterval: 60_000,
  })

  return (
    <div className="min-h-screen bg-[#111] px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 border-b border-white/15 pb-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-[#efff61]">
              <Radio className="size-4" /> Verifiable activity
            </p>
            <h1 className="mt-4 text-[clamp(3.5rem,8vw,7rem)] font-black leading-[0.85] tracking-[-0.07em]">
              No fake feed.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
              ClaimSpot backfills and polls program transactions from Solana devnet and the regional MagicBlock ER
              discovered through the router, then decodes only valid Anchor events.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Sync chain
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {Object.entries(query.data?.health ?? {}).map(([source, health]) => (
            <div
              key={source}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${health.ok ? 'border-green-400/30 text-green-300' : 'border-red-400/30 text-red-300'}`}
            >
              {source}: {health.message}
            </div>
          ))}
          {query.data?.updatedAt && (
            <div className="px-3 py-1.5 text-xs text-neutral-500">
              Last sync {new Date(query.data.updatedAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="mt-10">
          {query.isLoading ? (
            <div className="flex items-center gap-3 text-neutral-400">
              <LoaderCircle className="animate-spin" /> Reading program history…
            </div>
          ) : query.isError ? (
            <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-6 text-red-200">
              {query.error.message}
            </div>
          ) : !query.data?.activities.length ? (
            <div className="rounded-2xl border border-dashed border-white/20 p-8 text-neutral-400">
              No decodable ClaimSpot events were returned by the configured RPCs.
            </div>
          ) : (
            <ol className="grid gap-3">
              {query.data.activities.map((activity) => (
                <li
                  key={activity.id}
                  className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:grid-cols-[150px_1fr_auto] sm:items-start"
                >
                  <div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${activity.source === 'magicblock-er' ? 'bg-purple-400/15 text-purple-200' : 'bg-green-400/15 text-green-200'}`}
                    >
                      {activity.source === 'magicblock-er' ? 'MagicBlock ER' : 'Solana devnet'}
                    </span>
                    <p className="mt-3 font-mono text-xs text-neutral-500">slot {activity.slot}</p>
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-[-0.03em]">{eventTitle(activity.name)}</h2>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-400">
                      {importantFields(activity.data).map(([key, value]) => (
                        <span key={key}>
                          <span className="text-neutral-600">{key}</span>{' '}
                          {value.length > 18 ? shortAddress(value) : value}
                        </span>
                      ))}
                    </div>
                    {activity.blockTime && (
                      <p className="mt-3 text-xs text-neutral-600">
                        {new Date(activity.blockTime * 1000).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <a
                    href={`https://explorer.solana.com/tx/${activity.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="grid size-9 place-items-center rounded-full border border-white/15 hover:bg-white/10"
                    aria-label="Open transaction in Solana Explorer"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
