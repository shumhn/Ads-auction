import { createHash } from 'node:crypto'
import { Connection, PublicKey } from '@solana/web3.js'
import { NextResponse } from 'next/server'
import { BASIC_PROGRAM_ID as CLAIMSPOT_PROGRAM_ID } from '@project/anchor'
import {
  CampaignDraftMetadata,
  CampaignLotMetadata,
  CampaignMetadata,
  campaignDetailsCommitment,
  LaptopSurfaceMetadata,
} from '@/lib/campaign-metadata'
import { readJson, writeJson } from '@/lib/server-store'

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function sanitizeGeometry(geometry: CampaignLotMetadata['geometry']) {
  const hasValidGeometry =
    geometry &&
    ['S', 'M', 'L', 'P'].includes(geometry.size) &&
    [geometry.x, geometry.y, geometry.width, geometry.height].every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 100,
    ) &&
    geometry.width > 0 &&
    geometry.height > 0 &&
    geometry.x + geometry.width <= 100 &&
    geometry.y + geometry.height <= 100 &&
    typeof geometry.dimensions === 'string'
  if (!hasValidGeometry) return null
  return {
    size: geometry.size,
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    dimensions: geometry.dimensions.slice(0, 40),
  }
}

function sanitizeDraft(draft: CampaignDraftMetadata | undefined): CampaignDraftMetadata | undefined {
  if (!draft) return undefined
  const moderator = new PublicKey(draft.moderator).toBase58()
  const durationSeconds = Number(draft.durationSeconds)
  if (
    !Number.isSafeInteger(durationSeconds) ||
    durationSeconds < 60 ||
    durationSeconds > 30 * 86_400 ||
    !['classic-7', 'grid-9', 'full-22', 'custom'].includes(draft.layoutId) ||
    !Array.isArray(draft.plannedLots) ||
    draft.plannedLots.length < 1 ||
    draft.plannedLots.length > 22
  ) {
    throw new Error('Valid draft recovery metadata is required')
  }
  const plannedLots = draft.plannedLots.map((lot) => {
    const reserve = Number(lot.reserve)
    const increment = Number(lot.increment)
    const geometry = sanitizeGeometry(lot.geometry)
    if (
      !lot.name?.trim() ||
      !lot.placement?.trim() ||
      !Number.isFinite(reserve) ||
      reserve <= 0 ||
      !Number.isFinite(increment) ||
      increment <= 0 ||
      !geometry
    ) {
      throw new Error('Every planned lot needs valid copy, pricing and geometry')
    }
    return {
      name: lot.name.trim().slice(0, 100),
      placement: lot.placement.trim().slice(0, 240),
      reserve: lot.reserve.slice(0, 40),
      increment: lot.increment.slice(0, 40),
      geometry,
    }
  })
  return { moderator, durationSeconds, layoutId: draft.layoutId, plannedLots }
}

export async function GET() {
  const campaigns = await readJson<Record<string, CampaignMetadata>>('campaigns.json', {})
  return NextResponse.json({ campaigns: Object.values(campaigns) })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CampaignMetadata> & {
      titleHash?: string
      detailsHash?: string
      surface?: LaptopSurfaceMetadata
    }
    if (!body.campaign || !body.creator || !body.title || !body.details || !Array.isArray(body.lots)) {
      return NextResponse.json({ error: 'Campaign, creator, title, details and lots are required' }, { status: 400 })
    }
    const detailsCommitment = campaignDetailsCommitment(body.details, body.surface)
    if (body.titleHash !== digest(body.title) || body.detailsHash !== digest(detailsCommitment)) {
      return NextResponse.json({ error: 'Human-readable metadata does not match submitted hashes' }, { status: 400 })
    }
    if (body.surface) {
      const source = body.surface.source ?? (body.surface.imageHash ? 'photo' : 'template')
      if (
        body.surface.kind !== 'macbook' ||
        !body.surface.model?.trim() ||
        !body.surface.finish?.trim() ||
        !['sticker', 'laser-etch'].includes(body.surface.fulfillmentMode) ||
        !['template', 'photo'].includes(source) ||
        (source === 'photo' && !/^[a-f0-9]{64}$/.test(body.surface.imageHash ?? '')) ||
        (source === 'template' && Boolean(body.surface.imageHash))
      ) {
        return NextResponse.json({ error: 'Valid MacBook surface metadata is required' }, { status: 400 })
      }
    }

    const campaignKey = new PublicKey(body.campaign)
    const creatorKey = new PublicKey(body.creator)
    const lotKeys = body.lots.map((lot) => new PublicKey(lot.auction))
    const rpc = process.env.NEXT_PUBLIC_MAGIC_BASE_RPC ?? 'https://rpc.magicblock.app/devnet'
    const connection = new Connection(rpc, 'confirmed')
    const accounts = await connection.getMultipleAccountsInfo([campaignKey, ...lotKeys])
    if (!accounts[0]?.owner.equals(CLAIMSPOT_PROGRAM_ID)) throw new Error('Campaign is not a ClaimSpot devnet account')
    if (accounts.slice(1).some((account) => !account?.owner.equals(CLAIMSPOT_PROGRAM_ID))) {
      throw new Error('One or more lots are not ClaimSpot devnet auctions')
    }

    const campaigns = await readJson<Record<string, CampaignMetadata>>('campaigns.json', {})
    const draft = sanitizeDraft(body.draft)
    campaigns[campaignKey.toBase58()] = {
      campaign: campaignKey.toBase58(),
      creator: creatorKey.toBase58(),
      title: body.title.slice(0, 120),
      details: body.details.slice(0, 1200),
      createdAt: new Date().toISOString(),
      surface: body.surface
        ? {
            kind: 'macbook',
            model: body.surface.model.slice(0, 120),
            finish: body.surface.finish.slice(0, 80),
            fulfillmentMode: body.surface.fulfillmentMode,
            source: body.surface.source ?? (body.surface.imageHash ? 'photo' : 'template'),
            ...(body.surface.imageHash ? { imageHash: body.surface.imageHash } : {}),
          }
        : undefined,
      lots: body.lots.map((lot) => {
        const legacySeconds = Number(lot.durationDays) * 86_400
        const requestedSeconds = Number(lot.durationSeconds)
        const sourceSeconds = Number.isFinite(requestedSeconds)
          ? requestedSeconds
          : Number.isFinite(legacySeconds)
            ? legacySeconds
            : 7 * 86_400
        const durationSeconds = Math.max(60, Math.min(30 * 86_400, sourceSeconds))
        const geometry = sanitizeGeometry(lot.geometry)
        return {
          auction: new PublicKey(lot.auction).toBase58(),
          name: lot.name.slice(0, 100),
          placement: lot.placement.slice(0, 240),
          durationSeconds,
          durationDays: durationSeconds / 86_400,
          ...(geometry ? { geometry } : {}),
        }
      }),
      ...(draft ? { draft } : {}),
    }
    await writeJson('campaigns.json', campaigns)
    return NextResponse.json({ campaign: campaigns[campaignKey.toBase58()] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Campaign metadata could not be saved' },
      { status: 500 },
    )
  }
}
