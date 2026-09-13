export type SpotMetadata = {
  id: number
  auctionId: number
  name: string
  size: 'S' | 'M' | 'L' | 'P'
  x: number
  y: number
  width: number
  height: number
  dimensions: string
  deliverable: string
}

export type LaptopLayoutId = 'classic-7' | 'grid-9' | 'full-22'

export type LaptopLayoutPreset = {
  id: LaptopLayoutId
  name: string
  description: string
  spots: SpotMetadata[]
}

const topRow = [
  { x: 5, name: 'Top left' },
  { x: 28, name: 'Top centre-left' },
  { x: 51, name: 'Top centre-right' },
  { x: 74, name: 'Top right' },
]

const upperStrip = [
  { x: 5, name: 'Upper strip · far left' },
  { x: 23, name: 'Upper strip · left' },
  { x: 41, name: 'Directly above the mark' },
  { x: 59, name: 'Upper strip · right' },
  { x: 77, name: 'Upper strip · far right' },
]

const middleRow = [
  { x: 5, name: 'Left of the mark' },
  { x: 27, name: 'Beside the mark · left' },
  { x: 56, name: 'Beside the mark · right' },
  { x: 75, name: 'Right of the mark' },
]

const lowerStrip = [
  { x: 5, name: 'Lower strip · far left' },
  { x: 23, name: 'Lower strip · left' },
  { x: 41, name: 'Directly below the mark' },
  { x: 59, name: 'Lower strip · right' },
  { x: 77, name: 'Lower strip · far right' },
]

const bottomRow = [
  { x: 5, name: 'Bottom left' },
  { x: 28, name: 'Bottom centre-left' },
  { x: 51, name: 'Bottom centre-right' },
  { x: 74, name: 'Bottom right' },
]

const createSpots = (): SpotMetadata[] => {
  const spots: SpotMetadata[] = []
  let id = 1

  for (const spot of topRow) {
    spots.push({
      id,
      auctionId: 200 + id,
      name: spot.name,
      size: 'L',
      x: spot.x,
      y: 6,
      width: 21,
      height: 18,
      dimensions: '7 × 4.2 cm',
      deliverable: 'Permanent large-format placement plus campaign media',
    })
    id += 1
  }

  for (const spot of upperStrip) {
    spots.push({
      id,
      auctionId: 200 + id,
      name: spot.name,
      size: id === 7 ? 'M' : 'S',
      x: spot.x,
      y: 28,
      width: 16,
      height: 10,
      dimensions: '5.5 × 2.3 cm',
      deliverable: 'Permanent strip placement plus finished-lid photography',
    })
    id += 1
  }

  for (const spot of middleRow) {
    spots.push({
      id,
      auctionId: 200 + id,
      name: spot.name,
      size: 'P',
      x: spot.x,
      y: 42,
      width: spot.x === 27 || spot.x === 56 ? 17 : 20,
      height: 20,
      dimensions: '5.5 × 5.3 cm',
      deliverable: 'Premium permanent placement beside the centre mark',
    })
    id += 1
  }

  for (const spot of lowerStrip) {
    spots.push({
      id,
      auctionId: 200 + id,
      name: spot.name,
      size: id === 16 ? 'M' : 'S',
      x: spot.x,
      y: 66,
      width: 16,
      height: 10,
      dimensions: '5.5 × 2.3 cm',
      deliverable: 'Permanent strip placement plus finished-lid photography',
    })
    id += 1
  }

  for (const spot of bottomRow) {
    spots.push({
      id,
      auctionId: 200 + id,
      name: spot.name,
      size: 'L',
      x: spot.x,
      y: 80,
      width: 21,
      height: 14,
      dimensions: '7 × 4.2 cm',
      deliverable: 'Permanent large-format placement plus campaign media',
    })
    id += 1
  }

  return spots
}

function layoutSpot(
  id: number,
  name: string,
  size: SpotMetadata['size'],
  x: number,
  y: number,
  width: number,
  height: number,
): SpotMetadata {
  const dimensions =
    size === 'P' ? '9.5 × 5.5 cm' : size === 'L' ? '7 × 4.2 cm' : size === 'M' ? '5.5 × 3.5 cm' : '5.5 × 2.3 cm'
  const deliverable =
    size === 'P'
      ? 'Premium placement plus campaign media'
      : size === 'L'
        ? 'Large placement plus finished-lid photography'
        : size === 'M'
          ? 'Medium placement plus finished-lid photography'
          : 'Compact placement plus finished-lid photography'
  return { id, auctionId: id, name, size, x, y, width, height, dimensions, deliverable }
}

const classicSeven = [
  layoutSpot(1, 'Top marquee', 'P', 26, 6, 47, 23),
  layoutSpot(2, 'Bottom marquee', 'P', 26, 71, 47, 22),
  layoutSpot(3, 'Top right', 'L', 76, 6, 19, 29),
  layoutSpot(4, 'Bottom right', 'L', 76, 40, 19, 29),
  layoutSpot(5, 'Left strip · top', 'S', 5, 6, 18, 13),
  layoutSpot(6, 'Left strip · middle', 'S', 5, 23, 18, 13),
  layoutSpot(7, 'Left strip · bottom', 'S', 5, 40, 18, 13),
]

const gridNine = [
  layoutSpot(1, 'Top left', 'L', 5, 6, 27, 20),
  layoutSpot(2, 'Top centre', 'P', 36, 6, 28, 20),
  layoutSpot(3, 'Top right', 'L', 68, 6, 27, 20),
  layoutSpot(4, 'Middle left', 'M', 5, 31, 25, 34),
  layoutSpot(5, 'Middle right', 'M', 70, 31, 25, 34),
  layoutSpot(6, 'Bottom left', 'S', 5, 71, 20, 20),
  layoutSpot(7, 'Bottom centre-left', 'S', 28, 71, 20, 20),
  layoutSpot(8, 'Bottom centre-right', 'S', 52, 71, 20, 20),
  layoutSpot(9, 'Bottom right', 'S', 75, 71, 20, 20),
]

export const LAPTOP_LAYOUT_PRESETS: LaptopLayoutPreset[] = [
  { id: 'classic-7', name: 'Classic 7', description: 'Mixed premium inventory', spots: classicSeven },
  { id: 'grid-9', name: 'Grid 9', description: 'Balanced around the mark', spots: gridNine },
  { id: 'full-22', name: 'Full 22', description: 'Maximum inventory', spots: createSpots() },
]

function reindexSpots(spots: SpotMetadata[]) {
  return spots.map((spot, index) => ({ ...spot, id: index + 1, auctionId: index + 1 }))
}

const smallCustomLayouts: Record<number, SpotMetadata[]> = {
  1: [layoutSpot(1, 'Top marquee', 'P', 17, 7, 66, 27)],
  2: [layoutSpot(1, 'Top marquee', 'P', 17, 7, 66, 23), layoutSpot(2, 'Bottom marquee', 'P', 17, 70, 66, 23)],
  3: [
    layoutSpot(1, 'Top marquee', 'P', 17, 7, 66, 23),
    layoutSpot(2, 'Bottom left', 'L', 5, 69, 43, 24),
    layoutSpot(3, 'Bottom right', 'L', 52, 69, 43, 24),
  ],
  4: [
    layoutSpot(1, 'Top left', 'L', 5, 7, 41, 25),
    layoutSpot(2, 'Top right', 'L', 54, 7, 41, 25),
    layoutSpot(3, 'Bottom left', 'L', 5, 68, 41, 25),
    layoutSpot(4, 'Bottom right', 'L', 54, 68, 41, 25),
  ],
  5: [
    layoutSpot(1, 'Top marquee', 'P', 22, 7, 56, 23),
    layoutSpot(2, 'Middle left', 'L', 5, 35, 24, 30),
    layoutSpot(3, 'Middle right', 'L', 71, 35, 24, 30),
    layoutSpot(4, 'Bottom left', 'M', 22, 71, 26, 22),
    layoutSpot(5, 'Bottom right', 'M', 52, 71, 26, 22),
  ],
  6: [
    layoutSpot(1, 'Top left', 'L', 5, 7, 43, 23),
    layoutSpot(2, 'Top right', 'L', 52, 7, 43, 23),
    layoutSpot(3, 'Middle left', 'M', 5, 35, 22, 30),
    layoutSpot(4, 'Middle right', 'M', 73, 35, 22, 30),
    layoutSpot(5, 'Bottom left', 'L', 5, 70, 43, 23),
    layoutSpot(6, 'Bottom right', 'L', 52, 70, 43, 23),
  ],
  8: [
    layoutSpot(1, 'Top left', 'L', 5, 7, 28, 23),
    layoutSpot(2, 'Top centre', 'P', 36, 7, 28, 23),
    layoutSpot(3, 'Top right', 'L', 67, 7, 28, 23),
    layoutSpot(4, 'Middle left', 'M', 5, 35, 22, 30),
    layoutSpot(5, 'Middle right', 'M', 73, 35, 22, 30),
    layoutSpot(6, 'Bottom left', 'S', 5, 70, 28, 23),
    layoutSpot(7, 'Bottom centre', 'M', 36, 70, 28, 23),
    layoutSpot(8, 'Bottom right', 'S', 67, 70, 28, 23),
  ],
}

// Full inventory is revealed in balanced pairs around the reserved centre mark.
// This keeps every intermediate custom count looking like a deliberate laptop
// composition instead of a generic spreadsheet grid.
const fullLayoutRevealOrder = [1, 4, 19, 22, 2, 3, 20, 21, 10, 13, 7, 16, 11, 12, 5, 9, 14, 18, 6, 8, 15, 17]

export function customLaptopLayout(count: number): SpotMetadata[] {
  const safeCount = Math.min(22, Math.max(1, Math.trunc(count)))
  if (safeCount === 7) return reindexSpots(classicSeven)
  if (safeCount === 9) return reindexSpots(gridNine)
  if (smallCustomLayouts[safeCount]) return reindexSpots(smallCustomLayouts[safeCount])

  const fullLayout = createSpots()
  const byId = new Map(fullLayout.map((spot) => [spot.id, spot]))
  return reindexSpots(
    fullLayoutRevealOrder
      .slice(0, safeCount)
      .map((id) => byId.get(id))
      .filter((spot): spot is SpotMetadata => Boolean(spot)),
  )
}

export function suggestedSpotPrice(size: SpotMetadata['size']) {
  if (size === 'P') return { reserve: '100', increment: '10' }
  if (size === 'L') return { reserve: '75', increment: '10' }
  if (size === 'M') return { reserve: '50', increment: '5' }
  return { reserve: '25', increment: '5' }
}

// Geometry and fulfilment copy are presentation metadata. Bid amount, bidder,
// bid count, timing, delegation, and settlement state are read from devnet.
export const SPOT_METADATA = createSpots()
export const FEATURED_AUCTION_IDS = SPOT_METADATA.map((spot) => spot.auctionId)

export const USDC_DECIMALS = 6
export const toUsdcAtoms = (value: number) => BigInt(Math.round(value * 10 ** USDC_DECIMALS))
export const fromUsdcAtoms = (value: bigint) => Number(value) / 10 ** USDC_DECIMALS
export const formatUsdc = (value: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)

export function shortAddress(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}
