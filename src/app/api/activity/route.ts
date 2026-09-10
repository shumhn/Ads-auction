import { BorshCoder, EventParser, Idl } from '@anchor-lang/core'
import { ConnectionMagicRouter } from '@magicblock-labs/ephemeral-rollups-sdk'
import { Connection, PublicKey } from '@solana/web3.js'
import { NextResponse } from 'next/server'
import idl from '../../../../anchor/target/idl/basic.json'
import { BASIC_PROGRAM_ID } from '@project/anchor'
import { readJson, writeJson } from '@/lib/server-store'

export const dynamic = 'force-dynamic'

type IndexedActivity = {
  id: string
  source: 'solana-devnet' | 'magicblock-er'
  signature: string
  slot: number
  blockTime: number | null
  eventIndex: number
  name: string
  data: Record<string, unknown>
}

type ActivityStore = {
  updatedAt: string | null
  activities: IndexedActivity[]
  health: Record<string, { ok: boolean; message: string }>
}

function jsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (value && typeof value === 'object') {
    if ((value as { constructor?: { name?: string } }).constructor?.name === 'BN') return String(value)
    if ('toBase58' in value && typeof (value as { toBase58?: unknown }).toBase58 === 'function') {
      return (value as { toBase58: () => string }).toBase58()
    }
    if (Array.isArray(value)) return value.map(jsonSafe)
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, jsonSafe(nested)]))
  }
  return value
}

async function ingestSource(connection: Connection, source: IndexedActivity['source']) {
  // This route is a lightweight devnet read model, not a full historical
  // indexer. Keep each request bounded so public RPC rate limits cannot stall
  // the Activity page.
  const signatures = await connection.getSignaturesForAddress(BASIC_PROGRAM_ID, { limit: 30 }, 'confirmed')
  const parser = new EventParser(BASIC_PROGRAM_ID, new BorshCoder(idl as Idl))
  const records: IndexedActivity[] = []

  for (let offset = 0; offset < signatures.length; offset += 5) {
    const batch = signatures.slice(offset, offset + 5)
    const transactions = await Promise.all(
      batch.map((signature) =>
        connection.getTransaction(signature.signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        }),
      ),
    )
    transactions.forEach((transaction, transactionIndex) => {
      const signatureInfo = batch[transactionIndex]
      const logs = transaction?.meta?.logMessages
      if (!logs) return
      let eventIndex = 0
      for (const event of parser.parseLogs(logs)) {
        records.push({
          id: `${source}:${signatureInfo.signature}:${eventIndex}`,
          source,
          signature: signatureInfo.signature,
          slot: signatureInfo.slot,
          blockTime: signatureInfo.blockTime ?? null,
          eventIndex,
          name: event.name,
          data: jsonSafe(event.data) as Record<string, unknown>,
        })
        eventIndex += 1
      }
    })
  }
  return records
}

async function discoverEphemeralEndpoints(base: Connection, routerEndpoint: string) {
  const coder = new BorshCoder(idl as Idl)
  const programAccounts = await base.getProgramAccounts(BASIC_PROGRAM_ID, {
    commitment: 'confirmed',
    filters: [{ dataSize: 251 }],
  })
  const liveAuctions = programAccounts.flatMap(({ account }) => {
    try {
      const auction = coder.accounts.decode('Auction', account.data) as { live_auction: PublicKey }
      return [auction.live_auction]
    } catch {
      return []
    }
  })
  const router = new ConnectionMagicRouter(routerEndpoint, 'confirmed')
  const statuses = await Promise.all(
    liveAuctions.map(async (liveAuction) => {
      try {
        return (await router.getDelegationStatus(liveAuction)) as { isDelegated: boolean; fqdn?: string }
      } catch {
        return null
      }
    }),
  )
  return Array.from(
    new Set(
      statuses.flatMap((status) =>
        status?.isDelegated && typeof status.fqdn === 'string' && status.fqdn ? [status.fqdn] : [],
      ),
    ),
  )
}

export async function GET() {
  const store = await readJson<ActivityStore>('activity.json', { updatedAt: null, activities: [], health: {} })
  const updatedAt = store.updatedAt ? Date.parse(store.updatedAt) : 0
  if (updatedAt > 0 && Date.now() - updatedAt < 30_000) {
    return NextResponse.json(store, {
      headers: { 'Cache-Control': 'no-store', 'X-ClaimSpot-Indexer': 'fresh-cache' },
    })
  }
  const baseEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC
  const routerEndpoint = process.env.NEXT_PUBLIC_MAGIC_ROUTER_RPC ?? 'https://devnet-router.magicblock.app'
  const batches: Array<{
    source: IndexedActivity['source']
    records: IndexedActivity[]
    error: string | null
  }> = []

  if (!baseEndpoint) {
    batches.push({ source: 'solana-devnet', records: [], error: 'RPC is not configured' })
  } else {
    const base = new Connection(baseEndpoint, 'confirmed')
    try {
      batches.push({ source: 'solana-devnet', records: await ingestSource(base, 'solana-devnet'), error: null })
    } catch (error) {
      batches.push({
        source: 'solana-devnet',
        records: [],
        error: error instanceof Error ? error.message : 'RPC query failed',
      })
    }

    try {
      const ephemeralEndpoints = await discoverEphemeralEndpoints(base, routerEndpoint)
      const ephemeralBatches = await Promise.all(
        ephemeralEndpoints.map((endpoint) => ingestSource(new Connection(endpoint, 'confirmed'), 'magicblock-er')),
      )
      const records = Array.from(new Map(ephemeralBatches.flat().map((record) => [record.id, record])).values())
      batches.push({
        source: 'magicblock-er',
        records,
        error: ephemeralEndpoints.length ? null : 'No delegated ER endpoint was discoverable',
      })
    } catch (error) {
      batches.push({
        source: 'magicblock-er',
        records: [],
        error: error instanceof Error ? error.message : 'ER discovery failed',
      })
    }
  }

  const merged = new Map(store.activities.map((activity) => [activity.id, activity]))
  for (const batch of batches) {
    for (const record of batch.records) merged.set(record.id, record)
    store.health[batch.source] = {
      ok: !batch.error,
      message: batch.error ?? `${batch.records.length} events read in this backfill window`,
    }
  }
  store.activities = Array.from(merged.values())
    .sort((left, right) => right.slot - left.slot || right.eventIndex - left.eventIndex)
    .slice(0, 1_000)
  store.updatedAt = new Date().toISOString()
  await writeJson('activity.json', store)

  return NextResponse.json(store, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
