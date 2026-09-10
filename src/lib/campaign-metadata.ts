export type LaptopFulfillmentMode = 'sticker' | 'laser-etch'

export type LaptopSurfaceMetadata = {
  kind: 'macbook'
  model: string
  finish: string
  fulfillmentMode: LaptopFulfillmentMode
  source?: 'template' | 'photo'
  imageHash?: string
}

export type CampaignLotMetadata = {
  auction: string
  name: string
  placement: string
  /** Exact duration used by the on-chain auction. */
  durationSeconds?: number
  /** Legacy/readable value retained for existing locally stored campaigns. */
  durationDays?: number
  geometry?: {
    size: 'S' | 'M' | 'L' | 'P'
    x: number
    y: number
    width: number
    height: number
    dimensions: string
  }
}

export type CampaignDraftLotMetadata = {
  name: string
  placement: string
  /** Human-readable USDC amount, preserved exactly for builder recovery. */
  reserve: string
  /** Human-readable USDC amount, preserved exactly for builder recovery. */
  increment: string
  geometry: NonNullable<CampaignLotMetadata['geometry']>
}

export type CampaignDraftMetadata = {
  moderator: string
  durationSeconds: number
  layoutId: 'classic-7' | 'grid-9' | 'full-22' | 'custom'
  plannedLots: CampaignDraftLotMetadata[]
}

export type CampaignMetadata = {
  campaign: string
  creator: string
  title: string
  details: string
  createdAt?: string
  surface?: LaptopSurfaceMetadata
  lots: CampaignLotMetadata[]
  /** Present while publication is incomplete; removed after the campaign is live. */
  draft?: CampaignDraftMetadata
}

export function campaignDetailsCommitment(details: string, surface?: LaptopSurfaceMetadata) {
  const cleanDetails = details.trim()
  if (!surface) return cleanDetails

  return JSON.stringify({
    version: 1,
    details: cleanDetails,
    surface: {
      kind: surface.kind,
      model: surface.model.trim(),
      finish: surface.finish.trim(),
      fulfillmentMode: surface.fulfillmentMode,
      source: surface.source ?? (surface.imageHash ? 'photo' : 'template'),
      ...(surface.imageHash ? { imageHash: surface.imageHash } : {}),
    },
  })
}
