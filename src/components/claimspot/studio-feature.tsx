'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ExternalLink,
  FileCheck2,
  Gavel,
  Grid2X2,
  ImageUp,
  Laptop,
  LoaderCircle,
  Plus,
  Radio,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { PublicKey } from '@solana/web3.js'
import { FormEvent, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { LiveSpot, MachineBoard } from '@/components/claimspot/live-auction'
import { WalletButton } from '@/components/solana/solana-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChainAuction, ChainCampaign, hashText, useClaimSpotProgram } from '@/lib/claimspot-program'
import {
  CampaignDraftMetadata,
  CampaignMetadata,
  campaignDetailsCommitment,
  LaptopFulfillmentMode,
} from '@/lib/campaign-metadata'
import {
  customLaptopLayout,
  formatUsdc,
  fromUsdcAtoms,
  LAPTOP_LAYOUT_PRESETS,
  LaptopLayoutId,
  shortAddress,
  SpotMetadata,
  suggestedSpotPrice,
  toUsdcAtoms,
} from '@/lib/claimspot'

type LotDraft = {
  name: string
  placement: string
  reserve: string
  increment: string
  geometry: SpotMetadata
}
type DurationUnit = 'minutes' | 'hours' | 'days'
type SurfaceSource = 'template' | 'photo'
const MAX_LOTS = 22
const MAX_DURATION_SECONDS = 30 * 86_400
const DURATION_UNITS: Record<DurationUnit, number> = {
  minutes: 60,
  hours: 3_600,
  days: 86_400,
}
const DURATION_PRESETS = [
  { label: '15 min', value: '15', unit: 'minutes' },
  { label: '1 hour', value: '1', unit: 'hours' },
  { label: '1 day', value: '1', unit: 'days' },
  { label: '7 days', value: '7', unit: 'days' },
] as const

function readableDuration(seconds: number) {
  if (seconds % 86_400 === 0) return `${seconds / 86_400} ${seconds === 86_400 ? 'day' : 'days'}`
  if (seconds % 3_600 === 0) return `${seconds / 3_600} ${seconds === 3_600 ? 'hour' : 'hours'}`
  return `${Math.round(seconds / 60)} minutes`
}

function editableDuration(seconds: number): { value: string; unit: DurationUnit } {
  if (seconds % 86_400 === 0) return { value: String(seconds / 86_400), unit: 'days' }
  if (seconds % 3_600 === 0) return { value: String(seconds / 3_600), unit: 'hours' }
  return { value: String(Math.max(1, Math.round(seconds / 60))), unit: 'minutes' }
}

function draftLot(template: SpotMetadata, index: number): LotDraft {
  const pricing = suggestedSpotPrice(template.size)
  return {
    name: template.name ?? `Spot ${index + 1}`,
    placement: `${template.dimensions} · ${template.deliverable}`,
    reserve: pricing.reserve,
    increment: pricing.increment,
    geometry: template,
  }
}

function draftLots(spots: SpotMetadata[]) {
  return spots.map(draftLot)
}

function bytesToHex(bytes: number[]) {
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function equalBytes(left: number[], right: number[]) {
  return left.length === right.length && left.every((byte, index) => byte === right[index])
}

function hashHexToBytes(hash: string) {
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Upload returned an invalid SHA-256 hash')
  return Array.from(Buffer.from(hash, 'hex'))
}

async function uploadImage(file: File) {
  const form = new FormData()
  form.set('file', file)
  const response = await fetch('/api/uploads', { method: 'POST', body: form })
  const result = (await response.json()) as { hash?: string; url?: string; error?: string }
  if (!response.ok || !result.hash || !result.url) throw new Error(result.error ?? 'Upload failed')
  return { hash: result.hash, url: result.url }
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_24px_80px_-60px_rgba(0,0,0,.55)] sm:p-8">
      <p className="font-mono text-xs font-black uppercase tracking-[0.15em] text-neutral-500">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{title}</h2>
      <div className="mt-7">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/20 p-6 text-sm leading-6 text-neutral-600">
      {children}
    </div>
  )
}

function ImageTransaction({
  label,
  pending,
  onSubmit,
}: {
  label: string
  pending: boolean
  onSubmit: (file: File) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        className="max-w-xs"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <Button disabled={!file || pending} onClick={() => file && onSubmit(file)}>
        {pending ? <LoaderCircle className="animate-spin" /> : <ImageUp />}
        {label}
      </Button>
    </div>
  )
}

export function StudioFeature() {
  const program = useClaimSpotProgram()
  const queryClient = useQueryClient()
  const walletAddress = program.wallet.publicKey?.toBase58() ?? null
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [moderator, setModerator] = useState('')
  const [durationValue, setDurationValue] = useState('7')
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('days')
  const [laptopModel, setLaptopModel] = useState('Generic laptop')
  const [laptopFinish, setLaptopFinish] = useState('Silver')
  const [fulfillmentMode, setFulfillmentMode] = useState<LaptopFulfillmentMode>('sticker')
  const [surfaceSource, setSurfaceSource] = useState<SurfaceSource>('template')
  const [surfaceFile, setSurfaceFile] = useState<File | null>(null)
  const [surfaceImageHash, setSurfaceImageHash] = useState<string | null>(null)
  const [surfacePreviewUrl, setSurfacePreviewUrl] = useState<string | null>(null)
  const [layoutId, setLayoutId] = useState<LaptopLayoutId | 'custom'>('classic-7')
  const [lots, setLots] = useState<LotDraft[]>(() => draftLots(LAPTOP_LAYOUT_PRESETS[0].spots))
  const [customLotCount, setCustomLotCount] = useState('7')
  const [selectedLot, setSelectedLot] = useState(0)
  const [builderStep, setBuilderStep] = useState('Ready')
  const [pending, setPending] = useState<string | null>(null)
  const [resumeCampaignKey, setResumeCampaignKey] = useState<string | null>(null)
  const [legacyRecovery, setLegacyRecovery] = useState(false)

  const chainQuery = useQuery({
    queryKey: ['claimspot-studio-chain', walletAddress],
    queryFn: async () => {
      const [campaigns, campaignLots, creatives, proofs, receipts, auctions, undelegatedEscrows, solBalance] =
        await Promise.all([
          program.fetchCampaigns(),
          program.fetchCampaignLots(),
          program.fetchCreatives(),
          program.fetchProofs(),
          program.fetchReceipts(),
          program.fetchAuctions(),
          program.fetchUndelegatedBidEscrows(),
          program.fetchSolBalance(),
        ])
      const escrowByAuction = new Map(undelegatedEscrows.map((escrow) => [escrow.auction.toBase58(), escrow] as const))
      if (walletAddress) {
        const activeEscrowAuctions = auctions.filter(
          (auction) =>
            !escrowByAuction.has(auction.publicKey.toBase58()) &&
            (auction.highestBidder.toBase58() === walletAddress || auction.winner.toBase58() === walletAddress),
        )
        const activeEscrows = await Promise.all(
          activeEscrowAuctions.map(async (auction) => {
            try {
              return await program.fetchBidEscrow(auction.publicKey)
            } catch {
              return null
            }
          }),
        )
        activeEscrows.forEach((escrow) => escrow && escrowByAuction.set(escrow.auction.toBase58(), escrow))
      }
      return {
        campaigns,
        campaignLots,
        creatives,
        proofs,
        receipts,
        auctions,
        escrowEntries: Array.from(escrowByAuction.entries()),
        solBalance,
      }
    },
    enabled: Boolean(walletAddress),
    refetchInterval: false,
    retry: 1,
  })
  const copyQuery = useQuery({
    queryKey: ['claimspot-campaign-copy'],
    queryFn: async () => {
      const response = await fetch('/api/campaigns', { cache: 'no-store' })
      if (!response.ok) throw new Error('Campaign metadata could not be loaded')
      return (await response.json()) as { campaigns: CampaignMetadata[] }
    },
  })

  const data = chainQuery.data
  const nowSeconds = Math.floor(chainQuery.dataUpdatedAt / 1_000)
  const copyByCampaign = useMemo(
    () => new Map((copyQuery.data?.campaigns ?? []).map((campaign) => [campaign.campaign, campaign])),
    [copyQuery.data],
  )
  const campaignByKey = useMemo(
    () => new Map((data?.campaigns ?? []).map((campaign) => [campaign.publicKey.toBase58(), campaign])),
    [data?.campaigns],
  )
  const lotByAuction = useMemo(
    () => new Map((data?.campaignLots ?? []).map((lot) => [lot.auction.toBase58(), lot])),
    [data?.campaignLots],
  )
  const proofByAuction = useMemo(
    () => new Map((data?.proofs ?? []).map((proof) => [proof.auction.toBase58(), proof])),
    [data?.proofs],
  )
  const receiptByAuction = useMemo(
    () => new Map((data?.receipts ?? []).map((receipt) => [receipt.auction.toBase58(), receipt])),
    [data?.receipts],
  )
  const myEscrowByAuction = useMemo(() => new Map(data?.escrowEntries ?? []), [data?.escrowEntries])

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['claimspot-studio-chain'] }),
      queryClient.invalidateQueries({ queryKey: ['claimspot-campaign-copy'] }),
      queryClient.invalidateQueries({ queryKey: ['claimspot-auctions'] }),
    ])
  }

  function updateLot(index: number, patch: Partial<LotDraft>) {
    setLots((current) => current.map((lot, lotIndex) => (lotIndex === index ? { ...lot, ...patch } : lot)))
  }

  function resizeLots(nextCount: number) {
    const count = Math.min(MAX_LOTS, Math.max(1, Math.trunc(nextCount)))
    const geometry = customLaptopLayout(count)
    setLots(draftLots(geometry))
    setLayoutId('custom')
    setCustomLotCount(String(count))
    setSelectedLot((current) => Math.min(current, count - 1))
  }

  function selectLayout(nextLayoutId: LaptopLayoutId) {
    const layout = LAPTOP_LAYOUT_PRESETS.find((preset) => preset.id === nextLayoutId)
    if (!layout) return
    setLayoutId(nextLayoutId)
    setLots(draftLots(layout.spots))
    setCustomLotCount(String(layout.spots.length))
    setSelectedLot(0)
  }

  async function saveCampaignMetadata({
    campaign,
    titleHash,
    detailsHash,
    surface,
    createdLots,
    draft,
  }: {
    campaign: PublicKey
    titleHash: number[]
    detailsHash: number[]
    surface: NonNullable<CampaignMetadata['surface']>
    createdLots: CampaignMetadata['lots']
    draft?: CampaignDraftMetadata
  }) {
    const response = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        campaign: campaign.toBase58(),
        creator: program.wallet.publicKey!.toBase58(),
        title: title.trim(),
        details: details.trim(),
        surface,
        titleHash: bytesToHex(titleHash),
        detailsHash: bytesToHex(detailsHash),
        lots: createdLots,
        ...(draft ? { draft } : {}),
      }),
    })
    const result = (await response.json()) as { error?: string }
    if (!response.ok) throw new Error(result.error ?? 'Campaign recovery metadata could not be saved')
  }

  function resumeDraft(campaignKey: string, copy: CampaignMetadata) {
    if (!copy.draft) {
      toast.error(
        'This legacy draft predates automatic recovery. Re-enter its exact original title and promise to retry.',
      )
      return
    }
    const draft = copy.draft
    const duration = editableDuration(draft.durationSeconds)
    const source = copy.surface?.source ?? (copy.surface?.imageHash ? 'photo' : 'template')

    if (surfacePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(surfacePreviewUrl)
    setTitle(copy.title)
    setDetails(copy.details)
    setModerator(draft.moderator === walletAddress ? '' : draft.moderator)
    setDurationValue(duration.value)
    setDurationUnit(duration.unit)
    setLaptopModel(copy.surface?.model ?? 'Generic laptop')
    setLaptopFinish(copy.surface?.finish ?? 'Silver')
    setFulfillmentMode(copy.surface?.fulfillmentMode ?? 'sticker')
    setSurfaceSource(source)
    setSurfaceFile(null)
    setSurfaceImageHash(copy.surface?.imageHash ?? null)
    setSurfacePreviewUrl(copy.surface?.imageHash ? `/api/uploads/${copy.surface.imageHash}` : null)
    setLayoutId(draft.layoutId)
    setLots(
      draft.plannedLots.map((lot, index) => ({
        name: lot.name,
        placement: lot.placement,
        reserve: lot.reserve,
        increment: lot.increment,
        geometry: {
          ...lot.geometry,
          id: index + 1,
          auctionId: index + 1,
          name: lot.name,
          deliverable: lot.placement,
        },
      })),
    )
    setCustomLotCount(String(draft.plannedLots.length))
    setSelectedLot(0)
    setResumeCampaignKey(campaignKey)
    setLegacyRecovery(false)
    setBuilderStep(`Ready to resume ${shortAddress(campaignKey)}`)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('campaign-builder')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
    window.setTimeout(() => document.getElementById('campaign-title')?.focus({ preventScroll: true }), 350)
  }

  function recoverLegacyDraft(campaign: ChainCampaign) {
    const registeredLots = (data?.campaignLots ?? [])
      .filter((lot) => lot.campaign.equals(campaign.publicKey))
      .sort((left, right) => left.lotIndex - right.lotIndex)
    const auctionByKey = new Map((data?.auctions ?? []).map((auction) => [auction.publicKey.toBase58(), auction]))
    const preset = LAPTOP_LAYOUT_PRESETS.find((layout) => layout.spots.length === registeredLots.length)
    const geometry = preset?.spots ?? customLaptopLayout(Math.max(1, registeredLots.length))
    const firstAuction = registeredLots[0] ? auctionByKey.get(registeredLots[0].auction.toBase58()) : null
    const inferredSeconds = firstAuction
      ? Math.max(60, Math.round((Number(firstAuction.endsAt) - Number(campaign.createdAt)) / 60) * 60)
      : 7 * 86_400
    const duration = editableDuration(Math.min(MAX_DURATION_SECONDS, inferredSeconds))

    if (surfacePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(surfacePreviewUrl)
    setTitle('')
    setDetails('')
    setModerator(campaign.moderator.equals(campaign.creator) ? '' : campaign.moderator.toBase58())
    setDurationValue(duration.value)
    setDurationUnit(duration.unit)
    setLaptopModel('Generic laptop')
    setLaptopFinish('Silver')
    setFulfillmentMode('sticker')
    setSurfaceSource('template')
    setSurfaceFile(null)
    setSurfaceImageHash(null)
    setSurfacePreviewUrl(null)
    setLayoutId(preset?.id ?? 'custom')
    setLots(
      geometry.map((spot, index) => {
        const registered = registeredLots[index]
        const auction = registered ? auctionByKey.get(registered.auction.toBase58()) : null
        const pricing = suggestedSpotPrice(spot.size)
        return {
          name: spot.name || `Spot ${index + 1}`,
          placement: `${spot.dimensions} · ${spot.deliverable}`,
          reserve: auction ? String(fromUsdcAtoms(auction.reservePrice)) : pricing.reserve,
          increment: auction ? String(fromUsdcAtoms(auction.minIncrement)) : pricing.increment,
          geometry: spot,
        }
      }),
    )
    setCustomLotCount(String(geometry.length))
    setSelectedLot(0)
    setResumeCampaignKey(campaign.publicKey.toBase58())
    setLegacyRecovery(true)
    setBuilderStep('Enter the exact original title and winner promise, then retry')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('campaign-builder')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
    window.setTimeout(() => document.getElementById('campaign-title')?.focus({ preventScroll: true }), 350)
  }

  async function buildCampaign(event: FormEvent) {
    event.preventDefault()
    if (!program.wallet.publicKey) return toast.error('Connect a devnet wallet first')
    if (!title.trim() || !details.trim()) return toast.error('Campaign title and delivery promise are required')
    if (surfaceSource === 'photo' && !surfaceFile && !surfaceImageHash)
      return toast.error('Choose a laptop photo or use our template')
    if (lots.some((lot) => !lot.name.trim() || !lot.placement.trim()))
      return toast.error('Every lot needs a name and placement')
    const durationAmount = Number(durationValue)
    const durationSeconds = durationAmount * DURATION_UNITS[durationUnit]
    if (
      !Number.isInteger(durationAmount) ||
      durationAmount < 1 ||
      !Number.isSafeInteger(durationSeconds) ||
      durationSeconds > MAX_DURATION_SECONDS
    ) {
      return toast.error('Choose a whole-number duration between 1 minute and 30 days')
    }

    try {
      setPending('builder')
      const recommendedSol = 0.03 + lots.length * 0.02
      const balanceLamports = await program.fetchSolBalance()
      if (balanceLamports < recommendedSol * 1_000_000_000) {
        throw new Error(
          `Creator wallet needs about ${recommendedSol.toFixed(2)} devnet SOL for ${lots.length} lots. Use the devnet SOL button, then resume.`,
        )
      }

      setBuilderStep(surfaceSource === 'photo' ? 'Storing the laptop photo' : 'Preparing the laptop template')
      const uploadedSurface = surfaceSource === 'photo' && surfaceFile ? await uploadImage(surfaceFile) : null
      const imageHash = uploadedSurface?.hash ?? surfaceImageHash
      const surface = {
        kind: 'macbook' as const,
        model: surfaceSource === 'template' ? 'Generic laptop' : laptopModel.trim() || 'Creator laptop',
        finish: surfaceSource === 'template' ? 'Silver' : laptopFinish.trim() || 'As pictured',
        fulfillmentMode,
        source: surfaceSource,
        ...(imageHash ? { imageHash } : {}),
      }
      const committedDetails = campaignDetailsCommitment(details, surface)
      const moderatorKey = moderator.trim() ? new PublicKey(moderator.trim()) : program.wallet.publicKey
      const [titleHash, detailsHash, latestQuery] = await Promise.all([
        hashText(title.trim()),
        hashText(committedDetails),
        chainQuery.refetch(),
      ])
      const latestData = latestQuery.data ?? data
      const resumableCampaign = (latestData?.campaigns ?? [])
        .filter(
          (campaign) =>
            (!resumeCampaignKey || campaign.publicKey.toBase58() === resumeCampaignKey) &&
            campaign.creator.equals(program.wallet.publicKey!) &&
            campaign.moderator.equals(moderatorKey) &&
            campaign.status === 'draft' &&
            equalBytes(campaign.titleHash, titleHash) &&
            equalBytes(campaign.detailsHash, detailsHash) &&
            campaign.lotCount <= lots.length,
        )
        .sort((left, right) => Number(right.createdAt - left.createdAt))[0]

      if (resumeCampaignKey && !resumableCampaign) {
        throw new Error('Saved recovery data no longer matches this on-chain draft. Reload the draft and try again.')
      }

      const created = resumableCampaign
        ? { campaign: resumableCampaign.publicKey, campaignId: resumableCampaign.campaignId }
        : await (async () => {
            setBuilderStep('Creating campaign account')
            return program.createCampaign(title.trim(), committedDetails, moderatorKey)
          })()
      if (resumableCampaign) setBuilderStep(`Resuming draft ${shortAddress(created.campaign.toBase58())}`)

      const createdLots: CampaignMetadata['lots'] = []
      const registeredLots = new Map(
        (latestData?.campaignLots ?? [])
          .filter((lot) => lot.campaign.equals(created.campaign))
          .map((lot) => [lot.lotIndex, lot] as const),
      )
      const completedCount = Number(resumableCampaign?.lotCount ?? 0)
      for (let index = 0; index < completedCount; index += 1) {
        const registered = registeredLots.get(index)
        if (!registered) throw new Error(`Draft is missing its registered lot ${index + 1}`)
        createdLots.push({
          auction: registered.auction.toBase58(),
          name: lots[index].name.trim(),
          placement: lots[index].placement.trim(),
          durationSeconds,
          durationDays: durationSeconds / 86_400,
          geometry: {
            size: lots[index].geometry.size,
            x: lots[index].geometry.x,
            y: lots[index].geometry.y,
            width: lots[index].geometry.width,
            height: lots[index].geometry.height,
            dimensions: lots[index].geometry.dimensions,
          },
        })
      }

      const draft: CampaignDraftMetadata = {
        moderator: moderatorKey.toBase58(),
        durationSeconds,
        layoutId,
        plannedLots: lots.map((lot) => ({
          name: lot.name.trim(),
          placement: lot.placement.trim(),
          reserve: lot.reserve,
          increment: lot.increment,
          geometry: {
            size: lot.geometry.size,
            x: lot.geometry.x,
            y: lot.geometry.y,
            width: lot.geometry.width,
            height: lot.geometry.height,
            dimensions: lot.geometry.dimensions,
          },
        })),
      }
      setBuilderStep('Saving recovery checkpoint')
      await saveCampaignMetadata({
        campaign: created.campaign,
        titleHash,
        detailsHash,
        surface,
        createdLots,
        draft,
      })

      if (completedCount < lots.length) {
        const pendingLots = lots.slice(completedCount)
        const batched = await program.createAndRegisterCampaignLots(
          created.campaign,
          completedCount,
          pendingLots.map((lot) => ({
            title: `${title.trim()} · ${lot.name.trim()}`,
            placement: lot.placement.trim(),
            reserve: toUsdcAtoms(Number(lot.reserve)),
            increment: toUsdcAtoms(Number(lot.increment)),
            durationSeconds,
          })),
          setBuilderStep,
        )
        batched.auctions.forEach((auction, offset) => {
          const lot = pendingLots[offset]
          createdLots.push({
            auction: auction.toBase58(),
            name: lot.name.trim(),
            placement: lot.placement.trim(),
            durationSeconds,
            durationDays: durationSeconds / 86_400,
            geometry: {
              size: lot.geometry.size,
              x: lot.geometry.x,
              y: lot.geometry.y,
              width: lot.geometry.width,
              height: lot.geometry.height,
              dimensions: lot.geometry.dimensions,
            },
          })
        })
      }

      setBuilderStep('Saving completed lots')
      await saveCampaignMetadata({
        campaign: created.campaign,
        titleHash,
        detailsHash,
        surface,
        createdLots,
        draft,
      })
      setBuilderStep('Publishing campaign')
      await program.publishCampaign(created.campaign)
      await saveCampaignMetadata({ campaign: created.campaign, titleHash, detailsHash, surface, createdLots })

      toast.success('Campaign is live on devnet', {
        description: `${createdLots.length} auction ${createdLots.length === 1 ? 'lot is' : 'lots are'} delegated to MagicBlock.`,
      })
      setTitle('')
      setDetails('')
      setSurfaceSource('template')
      setLaptopModel('Generic laptop')
      setLaptopFinish('Silver')
      setFulfillmentMode('sticker')
      setSurfaceFile(null)
      setSurfaceImageHash(null)
      if (surfacePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(surfacePreviewUrl)
      setSurfacePreviewUrl(null)
      setLayoutId('classic-7')
      setLots(draftLots(LAPTOP_LAYOUT_PRESETS[0].spots))
      setCustomLotCount('7')
      setSelectedLot(0)
      setDurationValue('7')
      setDurationUnit('days')
      setBuilderStep('Published')
      setResumeCampaignKey(null)
      setLegacyRecovery(false)
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Campaign transaction failed')
      setBuilderStep('Stopped at the failed transaction; completed transactions remain on devnet')
      await refresh()
    } finally {
      setPending(null)
    }
  }

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    try {
      setPending(key)
      const signature = await action()
      toast.success(success, {
        description: typeof signature === 'string' ? shortAddress(signature) : 'Confirmed on devnet',
      })
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Transaction failed')
    } finally {
      setPending(null)
    }
  }

  async function topUpDevnetSol() {
    await run('sol-airdrop', () => program.requestDevnetSol(1), '1 devnet SOL added to the creator wallet')
  }

  async function submitArtwork(auction: ChainAuction, file: File) {
    const uploaded = await uploadImage(file)
    await run(
      `creative-${auction.publicKey}`,
      () => program.submitCreative(auction.publicKey, hashHexToBytes(uploaded.hash)),
      'Artwork hash submitted on devnet',
    )
  }

  async function submitFulfillment(auction: ChainAuction, file: File) {
    const uploaded = await uploadImage(file)
    await run(
      `proof-${auction.publicKey}`,
      () => program.submitProof(auction.publicKey, hashHexToBytes(uploaded.hash)),
      'Fulfillment proof submitted on devnet',
    )
  }

  const myCampaigns = (data?.campaigns ?? []).filter((campaign) => campaign.creator.toBase58() === walletAddress)
  const eligibleArtwork = (data?.auctions ?? []).filter(
    (auction) =>
      auction.highestBidder.toBase58() === walletAddress ||
      (auction.status === 'settled' && auction.winner.toBase58() === walletAddress),
  )
  const pendingModeration = (data?.creatives ?? []).filter((creative) => {
    const lot = lotByAuction.get(creative.auction.toBase58())
    const campaign = lot ? campaignByKey.get(lot.campaign.toBase58()) : null
    return creative.status === 'pending' && campaign?.moderator.toBase58() === walletAddress
  })
  const creatorProofs = (data?.auctions ?? []).filter(
    (auction) =>
      auction.creator.toBase58() === walletAddress &&
      auction.status === 'settled' &&
      !proofByAuction.has(auction.publicKey.toBase58()) &&
      !auction.winner.equals(PublicKey.default),
  )
  const winnerProofs = (data?.proofs ?? []).filter((proof) => {
    const auction = data?.auctions.find((row) => row.publicKey.equals(proof.auction))
    return proof.status === 'pending' && auction?.winner.toBase58() === walletAddress
  })
  const settlementAuctions = (data?.auctions ?? []).filter(
    (auction) =>
      auction.creator.toBase58() === walletAddress || Boolean(myEscrowByAuction.get(auction.publicKey.toBase58())),
  )

  return (
    <div className="min-h-screen bg-[#f4f4ef] px-4 py-12 text-black sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 border-b border-black/15 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="font-mono flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-green-700">
              <Radio className="size-4" /> Devnet studio
            </div>
            <h1 className="mt-4 max-w-4xl text-[clamp(3rem,7vw,7rem)] font-black leading-[0.88] tracking-[-0.07em]">
              Create it. Auction it. Prove it.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-650">
              Every campaign, lot, review and fulfillment decision below is a real ClaimSpot program account. Artwork
              bytes are content-addressed; their SHA-256 hashes are committed on-chain.
            </p>
          </div>
          {!walletAddress && <WalletButton />}
        </div>

        <div className="mt-8 grid gap-8">
          <Section eyebrow="01 · Creator campaign builder" title="Launch a surface drop">
            <form id="campaign-builder" onSubmit={buildCampaign} className="grid gap-6">
              {resumeCampaignKey && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
                  <div>
                    <p className="font-black">
                      {legacyRecovery ? 'Recovering legacy draft' : 'Resuming saved draft'}{' '}
                      {shortAddress(resumeCampaignKey)}
                    </p>
                    <p className="mt-1 text-amber-800">
                      {legacyRecovery
                        ? 'Existing lots and prices came from devnet. Re-enter the exact original title, winner promise and laptop setup so their on-chain hashes can be verified.'
                        : 'Completed devnet lots will be reused; only unfinished steps will run.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setResumeCampaignKey(null)
                      setLegacyRecovery(false)
                      setBuilderStep('Ready')
                    }}
                  >
                    Cancel resume
                  </Button>
                </div>
              )}
              <fieldset disabled={pending === 'builder'} className="grid gap-4">
                <legend className="text-sm font-bold">Choose a spot layout</legend>
                <p className="text-sm text-neutral-600">
                  Larger placements start higher. You can edit every reserve and increment below.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {LAPTOP_LAYOUT_PRESETS.map((preset) => {
                    const active = layoutId === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => selectLayout(preset.id)}
                        className={`rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/20 ${
                          active
                            ? 'border-black bg-black text-white'
                            : 'border-black/15 bg-[#fafaf7] hover:border-black/40'
                        }`}
                      >
                        <span
                          className={`relative block aspect-[1.52/1] overflow-hidden rounded-lg border ${active ? 'border-white/20 bg-white/10' : 'border-black/10 bg-neutral-200/70'}`}
                        >
                          {preset.spots.map((spot) => (
                            <span
                              key={spot.id}
                              className={`absolute rounded-[2px] border ${active ? 'border-white/55 bg-white/10' : 'border-black/30 bg-white/40'}`}
                              style={{
                                left: `${spot.x}%`,
                                top: `${spot.y}%`,
                                width: `${spot.width}%`,
                                height: `${spot.height}%`,
                              }}
                            />
                          ))}
                          <span
                            className={`absolute left-1/2 top-1/2 size-[16%] -translate-x-1/2 -translate-y-1/2 rounded-full border ${active ? 'border-white/25' : 'border-black/15'}`}
                          />
                        </span>
                        <span className="mt-3 flex items-center justify-between gap-2">
                          <span className="font-black">{preset.name}</span>
                          <span
                            className={`text-xs font-black tabular-nums ${active ? 'text-white/70' : 'text-neutral-500'}`}
                          >
                            {preset.spots.length} spots
                          </span>
                        </span>
                        <span className={`mt-1 block text-xs ${active ? 'text-white/70' : 'text-neutral-500'}`}>
                          {preset.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <label
                    htmlFor="custom-lot-count"
                    className="font-mono grid gap-2 text-xs font-black uppercase tracking-wide"
                  >
                    Custom grid · 1–{MAX_LOTS}
                    <Input
                      id="custom-lot-count"
                      className="w-32"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={customLotCount}
                      onChange={(event) => setCustomLotCount(event.target.value.replace(/\D/g, ''))}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    disabled={!customLotCount || Number(customLotCount) < 1 || Number(customLotCount) > MAX_LOTS}
                    onClick={() => resizeLots(Number(customLotCount))}
                  >
                    Build custom grid
                  </Button>
                  <p className="pb-2 text-xs text-neutral-500">
                    {lots.length} independent auctions · {lots.length + 2} atomic devnet transactions · about{' '}
                    {Math.ceil(lots.length / 4) + 2} wallet approval phases with batch signing
                  </p>
                </div>
              </fieldset>

              <div className="grid gap-5 rounded-2xl border border-black/10 bg-[#e8e8e3] p-4 lg:grid-cols-[1fr_280px] lg:p-5">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-black uppercase tracking-[0.12em] text-neutral-500">
                        Live layout preview
                      </p>
                      <p className="mt-1 text-sm text-neutral-600">Tap a spot to edit its details below.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black tabular-nums">
                      {lots.length} spots
                    </span>
                  </div>
                  <div className="mt-4">
                    <MachineBoard
                      spots={lots.map((lot, index) => {
                        return {
                          ...lot.geometry,
                          id: index + 1,
                          auctionId: index + 1,
                          name: lot.name,
                          deliverable: lot.placement,
                          chain: null,
                          draftPrice: Number(lot.reserve),
                        } satisfies LiveSpot
                      })}
                      selectedAuctionId={selectedLot + 1}
                      onSelect={(auctionId) => {
                        const index = auctionId - 1
                        setSelectedLot(index)
                        document.getElementById(`lot-name-${index}`)?.focus({ preventScroll: false })
                      }}
                      view="auction"
                      backgroundImageUrl={surfaceSource === 'photo' ? surfacePreviewUrl : null}
                      builder
                    />
                  </div>
                </div>
                <div className="grid content-start gap-3 rounded-xl bg-white p-4">
                  <Grid2X2 className="size-5" aria-hidden="true" />
                  <p className="font-black">One campaign, {lots.length} price discoveries.</p>
                  <p className="text-sm leading-6 text-neutral-600">
                    Every spot gets its own reserve, bidder escrow and winner. MagicBlock keeps each live bid loop fast;
                    Solana keeps custody and settlement canonical.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <fieldset className="grid gap-3 md:col-span-2">
                  <legend className="text-sm font-bold">Choose your laptop</legend>
                  <p className="text-sm text-neutral-600">Start with our template, or show buyers your own laptop.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      aria-pressed={surfaceSource === 'template'}
                      onClick={() => {
                        setSurfaceSource('template')
                        setLaptopModel('Generic laptop')
                        setLaptopFinish('Silver')
                        setSurfaceFile(null)
                        setSurfaceImageHash(null)
                        if (surfacePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(surfacePreviewUrl)
                        setSurfacePreviewUrl(null)
                      }}
                      className={`flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/20 ${
                        surfaceSource === 'template'
                          ? 'border-black bg-black text-white'
                          : 'border-black/15 bg-[#fafaf7] hover:border-black/40'
                      }`}
                    >
                      <span
                        className={`grid size-11 shrink-0 place-items-center rounded-full ${surfaceSource === 'template' ? 'bg-white/15' : 'bg-neutral-200'}`}
                      >
                        <Laptop className="size-5" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block font-black">Use our template</span>
                        <span
                          className={`mt-1 block text-xs ${surfaceSource === 'template' ? 'text-white/70' : 'text-neutral-500'}`}
                        >
                          No photo needed
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={surfaceSource === 'photo'}
                      onClick={() => {
                        setSurfaceSource('photo')
                        if (laptopModel === 'Generic laptop') setLaptopModel('Creator laptop')
                        if (laptopFinish === 'Silver') setLaptopFinish('As pictured')
                      }}
                      className={`flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/20 ${
                        surfaceSource === 'photo'
                          ? 'border-black bg-black text-white'
                          : 'border-black/15 bg-[#fafaf7] hover:border-black/40'
                      }`}
                    >
                      <span
                        className={`grid size-11 shrink-0 place-items-center rounded-full ${surfaceSource === 'photo' ? 'bg-white/15' : 'bg-neutral-200'}`}
                      >
                        <ImageUp className="size-5" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block font-black">Upload my photo</span>
                        <span
                          className={`mt-1 block text-xs ${surfaceSource === 'photo' ? 'text-white/70' : 'text-neutral-500'}`}
                        >
                          PNG, JPG or WebP
                        </span>
                      </span>
                    </button>
                  </div>
                  {surfaceSource === 'photo' && (
                    <label
                      className="grid gap-2 rounded-2xl border border-black/10 bg-[#fafaf7] p-4 text-sm font-bold"
                      htmlFor="laptop-photo"
                    >
                      Laptop photo
                      <Input
                        id="laptop-photo"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => {
                          if (surfacePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(surfacePreviewUrl)
                          const file = event.target.files?.[0] ?? null
                          setSurfaceFile(file)
                          setSurfaceImageHash(null)
                          setSurfacePreviewUrl(file ? URL.createObjectURL(file) : null)
                        }}
                      />
                      <span className="text-xs font-normal leading-5 text-neutral-500">
                        This exact photo appears behind the auction spots. Maximum 5 MB.
                      </span>
                    </label>
                  )}
                </fieldset>
                {surfaceSource === 'photo' && (
                  <>
                    <label className="grid gap-2 text-sm font-bold">
                      Laptop model <span className="font-normal text-neutral-500">optional</span>
                      <Input
                        value={laptopModel}
                        maxLength={120}
                        onChange={(event) => setLaptopModel(event.target.value)}
                        placeholder="Creator laptop"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-bold">
                      Finish <span className="font-normal text-neutral-500">optional</span>
                      <Input
                        value={laptopFinish}
                        maxLength={80}
                        onChange={(event) => setLaptopFinish(event.target.value)}
                        placeholder="As pictured"
                      />
                    </label>
                  </>
                )}
                <label className="grid gap-2 text-sm font-bold">
                  Placement method
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={fulfillmentMode}
                    onChange={(event) => setFulfillmentMode(event.target.value as LaptopFulfillmentMode)}
                  >
                    <option value="sticker">Removable sticker</option>
                    <option value="laser-etch">Permanent laser etch</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Campaign title
                  <Input
                    id="campaign-title"
                    value={title}
                    maxLength={120}
                    autoComplete="off"
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Nepal Relief Creator Surfaces"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Moderator wallet <span className="font-normal text-neutral-500">blank = creator</span>
                  <Input
                    value={moderator}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => setModerator(event.target.value)}
                    placeholder="Solana address"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold md:col-span-2">
                  What the winner receives
                  <textarea
                    className="min-h-28 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={details}
                    maxLength={1200}
                    onChange={(event) => setDetails(event.target.value)}
                    placeholder="Logo displayed on my MacBook lid for the selected duration, with dated photo proof."
                  />
                </label>
                <fieldset className="grid gap-3 md:col-span-2">
                  <legend className="text-sm font-bold">Auction duration</legend>
                  <div className="flex max-w-lg flex-col gap-2 sm:flex-row">
                    <label className="sr-only" htmlFor="duration-value">
                      Duration value
                    </label>
                    <Input
                      id="duration-value"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={durationValue}
                      onChange={(event) => setDurationValue(event.target.value.replace(/\D/g, ''))}
                      className="sm:max-w-40"
                    />
                    <label className="sr-only" htmlFor="duration-unit">
                      Duration unit
                    </label>
                    <select
                      id="duration-unit"
                      value={durationUnit}
                      onChange={(event) => setDurationUnit(event.target.value as DurationUnit)}
                      className="min-h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_PRESETS.map((preset) => {
                      const active = durationValue === preset.value && durationUnit === preset.unit
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setDurationValue(preset.value)
                            setDurationUnit(preset.unit)
                          }}
                          className={`min-h-10 rounded-md border px-3 text-xs font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                            active
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-input bg-background text-ink-muted hover:text-foreground'
                          }`}
                        >
                          {preset.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-ink-muted">
                    Custom from 1 minute to 30 days
                    {Number(durationValue) > 0 &&
                    Number(durationValue) * DURATION_UNITS[durationUnit] <= MAX_DURATION_SECONDS
                      ? ` · Ends ${readableDuration(Number(durationValue) * DURATION_UNITS[durationUnit])} after publishing`
                      : ''}
                  </p>
                </fieldset>
              </div>

              <div className="grid gap-3">
                {lots.map((lot, index) => (
                  <div
                    key={index}
                    className={`grid gap-3 rounded-2xl border bg-[#fafaf7] p-4 md:grid-cols-[1fr_1.4fr_.55fr_.55fr_auto] md:items-end ${
                      selectedLot === index ? 'border-black shadow-sm' : 'border-black/10'
                    }`}
                  >
                    <label className="grid gap-2 text-xs font-black uppercase tracking-wide">
                      Lot name
                      <Input
                        id={`lot-name-${index}`}
                        value={lot.name}
                        autoComplete="off"
                        onFocus={() => setSelectedLot(index)}
                        onChange={(event) => updateLot(index, { name: event.target.value })}
                        placeholder="MacBook lid"
                      />
                    </label>
                    <label className="grid gap-2 text-xs font-black uppercase tracking-wide">
                      Placement + deliverable
                      <Input
                        value={lot.placement}
                        autoComplete="off"
                        onFocus={() => setSelectedLot(index)}
                        onChange={(event) => updateLot(index, { placement: event.target.value })}
                        placeholder="9.5 × 5.5 cm, top-left"
                      />
                    </label>
                    <label className="grid gap-2 text-xs font-black uppercase tracking-wide">
                      Reserve USDC (devnet)
                      <Input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={lot.reserve}
                        onFocus={() => setSelectedLot(index)}
                        onChange={(event) => updateLot(index, { reserve: event.target.value })}
                      />
                    </label>
                    <label className="grid gap-2 text-xs font-black uppercase tracking-wide">
                      Increment
                      <Input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={lot.increment}
                        onFocus={() => setSelectedLot(index)}
                        onChange={(event) => updateLot(index, { increment: event.target.value })}
                      />
                    </label>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove lot ${index + 1}`}
                      disabled={lots.length === 1 || pending === 'builder'}
                      onClick={() => {
                        setLots((current) => current.filter((_, row) => row !== index))
                        setCustomLotCount(String(lots.length - 1))
                        setSelectedLot((current) => Math.max(0, Math.min(current, lots.length - 2)))
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={lots.length >= MAX_LOTS || pending === 'builder'}
                  onClick={() => resizeLots(lots.length + 1)}
                >
                  <Plus /> Add lot
                </Button>
                <Button type="submit" disabled={pending === 'builder' || !walletAddress}>
                  {pending === 'builder' ? <LoaderCircle className="animate-spin" /> : <Gavel />}{' '}
                  {resumeCampaignKey ? 'Resume & publish' : 'Create, delegate & publish'}
                </Button>
                <span className="text-sm text-neutral-500">{builderStep}</span>
              </div>
              {walletAddress && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm">
                  <span className="font-bold">
                    Creator fee balance:{' '}
                    {typeof data?.solBalance === 'number'
                      ? `${(data.solBalance / 1_000_000_000).toFixed(3)} devnet SOL`
                      : 'checking…'}
                  </span>
                  <span className="text-neutral-500">
                    Recommended for {lots.length} lots: {(0.03 + lots.length * 0.02).toFixed(2)} SOL
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending === 'sol-airdrop'}
                    onClick={topUpDevnetSol}
                  >
                    {pending === 'sol-airdrop' && <LoaderCircle className="animate-spin" />} Get 1 devnet SOL
                  </Button>
                </div>
              )}
            </form>
          </Section>

          <div className="grid gap-8 lg:grid-cols-2">
            <Section eyebrow="02 · Real campaigns" title="Your on-chain drops">
              {!walletAddress ? (
                <Empty>Connect the creator wallet to filter its campaigns.</Empty>
              ) : chainQuery.isLoading ? (
                <LoaderCircle className="animate-spin" />
              ) : myCampaigns.length === 0 ? (
                <Empty>No campaign account exists for this wallet yet.</Empty>
              ) : (
                <div className="grid gap-3">
                  {myCampaigns.map((campaign) => {
                    const copy = copyByCampaign.get(campaign.publicKey.toBase58())
                    return (
                      <div key={campaign.publicKey.toBase58()} className="rounded-2xl border border-black/10 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-black">
                              {copy?.title ?? shortAddress(campaign.publicKey.toBase58())}
                            </h3>
                            <p className="mt-1 text-sm text-neutral-600">
                              {campaign.lotCount} lots · {campaign.acceptedProofs} proofs accepted · {campaign.status}
                            </p>
                            {campaign.status === 'draft' && (
                              <p className="mt-2 max-w-md text-xs leading-5 text-amber-700">
                                {copy?.draft
                                  ? 'Recovery checkpoint saved. Resume restores the exact setup and reuses every completed devnet lot.'
                                  : 'Legacy draft: existing lots can be recovered from devnet, but you must re-enter the exact original title, winner promise and laptop setup.'}
                              </p>
                            )}
                          </div>
                          <a
                            href={`https://explorer.solana.com/address/${campaign.publicKey.toBase58()}?cluster=devnet`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border p-2"
                            aria-label="Open campaign in explorer"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        </div>
                        {copy?.details && <p className="mt-3 text-sm leading-6 text-neutral-600">{copy.details}</p>}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {campaign.status === 'draft' && (
                            <Button
                              type="button"
                              onClick={() =>
                                copy?.draft
                                  ? resumeDraft(campaign.publicKey.toBase58(), copy)
                                  : recoverLegacyDraft(campaign)
                              }
                            >
                              {copy?.draft ? 'Resume setup' : 'Recover draft'}
                            </Button>
                          )}
                          <Button asChild variant="outline" className="min-h-10">
                            <Link href={`/campaign/${campaign.publicKey.toBase58()}`}>
                              Open public auction <ExternalLink className="size-4" aria-hidden="true" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>

            <Section eyebrow="03 · Bidder artwork" title="Submit winning creative">
              {!walletAddress ? (
                <Empty>Connect the bidder wallet to see eligible lots.</Empty>
              ) : eligibleArtwork.length === 0 ? (
                <Empty>This wallet is not the current leader or settled winner of a lot.</Empty>
              ) : (
                <div className="grid gap-4">
                  {eligibleArtwork.map((auction) => {
                    const existing = data?.creatives.find(
                      (creative) =>
                        creative.auction.equals(auction.publicKey) && creative.submitter.toBase58() === walletAddress,
                    )
                    return (
                      <div key={auction.publicKey.toBase58()} className="rounded-2xl border border-black/10 p-4">
                        <p className="font-black">Auction #{auction.auctionId.toString()}</p>
                        <p className="mt-1 text-sm text-neutral-500">{shortAddress(auction.publicKey.toBase58())}</p>
                        {existing ? (
                          <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold">
                            <FileCheck2 className="size-4" /> Artwork {existing.status}
                          </p>
                        ) : (
                          <div className="mt-4">
                            <ImageTransaction
                              label="Upload & submit"
                              pending={pending === `creative-${auction.publicKey}`}
                              onSubmit={(file) => submitArtwork(auction, file)}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>

            <Section eyebrow="04 · Moderator queue" title="Approve actual artwork">
              {pendingModeration.length === 0 ? (
                <Empty>No pending creative assigned to this moderator wallet.</Empty>
              ) : (
                <div className="grid gap-4">
                  {pendingModeration.map((creative) => {
                    const lot = lotByAuction.get(creative.auction.toBase58())!
                    const hash = bytesToHex(creative.contentHash)
                    return (
                      <div
                        key={creative.publicKey.toBase58()}
                        className="grid gap-4 rounded-2xl border border-black/10 p-4 sm:grid-cols-[112px_1fr]"
                      >
                        <Image
                          src={`/api/uploads/${hash}`}
                          alt="Submitted sponsor artwork"
                          width={112}
                          height={112}
                          unoptimized
                          className="aspect-square w-28 rounded-xl border object-contain"
                        />
                        <div>
                          <p className="font-black">From {shortAddress(creative.submitter.toBase58())}</p>
                          <p className="mt-1 font-mono text-xs text-neutral-500">SHA-256 {hash.slice(0, 16)}…</p>
                          <div className="mt-4 flex gap-2">
                            <Button
                              size="sm"
                              disabled={Boolean(pending)}
                              onClick={() =>
                                run(
                                  `review-${creative.publicKey}`,
                                  () =>
                                    program.reviewCreative(
                                      lot.campaign,
                                      lot.publicKey,
                                      creative.auction,
                                      creative.publicKey,
                                      true,
                                      '',
                                    ),
                                  'Artwork approved on devnet',
                                )
                              }
                            >
                              <Check /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={Boolean(pending)}
                              onClick={() =>
                                run(
                                  `review-${creative.publicKey}`,
                                  () =>
                                    program.reviewCreative(
                                      lot.campaign,
                                      lot.publicKey,
                                      creative.auction,
                                      creative.publicKey,
                                      false,
                                      'Does not meet campaign requirements',
                                    ),
                                  'Artwork rejected on devnet',
                                )
                              }
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>

            <Section eyebrow="05 · Fulfillment" title="Prove the placement">
              {creatorProofs.length === 0 ? (
                <Empty>No settled winning lot is waiting for creator proof.</Empty>
              ) : (
                <div className="grid gap-4">
                  {creatorProofs.map((auction) => (
                    <div key={auction.publicKey.toBase58()} className="rounded-2xl border border-black/10 p-4">
                      <p className="font-black">
                        {formatUsdc(fromUsdcAtoms(auction.winningBid))} USDC secured for delivery
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        Upload dated placement proof. Payment remains in the vault until the winner accepts it.
                      </p>
                      <div className="mt-4">
                        <ImageTransaction
                          label="Upload proof"
                          pending={pending === `proof-${auction.publicKey}`}
                          onSubmit={(file) => submitFulfillment(auction, file)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {winnerProofs.length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <p className="mb-3 text-xs font-black uppercase tracking-wide">Awaiting your winner review</p>
                  <div className="grid gap-4">
                    {winnerProofs.map((proof) => {
                      const lot = lotByAuction.get(proof.auction.toBase58())
                      if (!lot) return null
                      const hash = bytesToHex(proof.contentHash)
                      return (
                        <div
                          key={proof.publicKey.toBase58()}
                          className="grid gap-4 rounded-2xl border border-black/10 p-4 sm:grid-cols-[112px_1fr]"
                        >
                          <Image
                            src={`/api/uploads/${hash}`}
                            alt="Creator fulfillment proof"
                            width={112}
                            height={112}
                            unoptimized
                            className="aspect-square w-28 rounded-xl border object-cover"
                          />
                          <div>
                            <p className="font-black">Delivery proof</p>
                            <div className="mt-4 flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  run(
                                    `proof-review-${proof.publicKey}`,
                                    () =>
                                      program.reviewProof(
                                        lot.campaign,
                                        lot.publicKey,
                                        proof.auction,
                                        proof.publicKey,
                                        true,
                                      ),
                                    'Fulfillment accepted on devnet',
                                  )
                                }
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  run(
                                    `proof-review-${proof.publicKey}`,
                                    () =>
                                      program.reviewProof(
                                        lot.campaign,
                                        lot.publicKey,
                                        proof.auction,
                                        proof.publicKey,
                                        false,
                                      ),
                                    'Fulfillment disputed on devnet',
                                  )
                                }
                              >
                                Dispute
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Section>
          </div>

          <Section eyebrow="06 · Settlement desk" title="Close, settle and refund">
            {settlementAuctions.length === 0 ? (
              <Empty>No creator, leader or winner auctions were found for this wallet.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wide text-neutral-500">
                      <th className="px-3 py-3">Auction</th>
                      <th className="px-3 py-3">State</th>
                      <th className="px-3 py-3">Top bid</th>
                      <th className="px-3 py-3">MagicBlock</th>
                      <th className="px-3 py-3">Available action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlementAuctions.map((auction) => {
                      const creator = auction.creator.toBase58() === walletAddress
                      const winner =
                        auction.highestBidder.toBase58() === walletAddress ||
                        auction.winner.toBase58() === walletAddress
                      const myEscrow = myEscrowByAuction.get(auction.publicKey.toBase58())
                      const ended = Number(auction.endsAt) <= nowSeconds
                      const receipt = receiptByAuction.get(auction.publicKey.toBase58())
                      const lot = lotByAuction.get(auction.publicKey.toBase58())
                      const proof = proofByAuction.get(auction.publicKey.toBase58())
                      const approvedWinnerCreative = (data?.creatives ?? []).find(
                        (creative) =>
                          creative.auction.equals(auction.publicKey) &&
                          creative.submitter.equals(auction.winner) &&
                          creative.status === 'approved',
                      )
                      const paymentReady =
                        creator &&
                        auction.status === 'settled' &&
                        !receipt &&
                        Boolean(lot) &&
                        proof?.status === 'accepted' &&
                        Boolean(approvedWinnerCreative)
                      return (
                        <tr key={auction.publicKey.toBase58()} className="border-b last:border-0">
                          <td className="px-3 py-4 font-mono">#{auction.auctionId.toString()}</td>
                          <td className="px-3 py-4">
                            {receipt
                              ? 'Paid'
                              : auction.status === 'settled' && !auction.winner.equals(PublicKey.default)
                                ? 'Delivery escrow'
                                : auction.status === 'settled'
                                  ? 'Closed · no bids'
                                  : auction.closed
                                    ? 'Closed'
                                    : ended
                                      ? 'Ended'
                                      : 'Live'}
                          </td>
                          <td className="px-3 py-4">{formatUsdc(fromUsdcAtoms(auction.highestBid))} USDC</td>
                          <td className="px-3 py-4">{auction.delegated ? 'Delegated' : 'Base layer'}</td>
                          <td className="px-3 py-4">
                            <div className="flex flex-wrap gap-2">
                              {creator && ended && !auction.closed && auction.delegated && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    run(
                                      `close-${auction.publicKey}`,
                                      () => program.closeAuction(auction),
                                      'Result committed from MagicBlock',
                                    )
                                  }
                                >
                                  Close & return
                                </Button>
                              )}
                              {creator &&
                                auction.closed &&
                                auction.status === 'live' &&
                                auction.bidCount === 0n &&
                                !auction.delegated && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      run(
                                        `no-bid-${auction.publicKey}`,
                                        () => program.finalizeNoBid(auction),
                                        'No-bid auction finalized',
                                      )
                                    }
                                  >
                                    Finalize no bids
                                  </Button>
                                )}
                              {myEscrow?.delegated && !winner && auction.closed && auction.status === 'live' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    run(
                                      `undelegate-${auction.publicKey}`,
                                      () => program.undelegateMyBid(auction.publicKey),
                                      'Bid escrow returned to Solana',
                                    )
                                  }
                                >
                                  Return my escrow
                                </Button>
                              )}
                              {creator &&
                                auction.closed &&
                                auction.status === 'live' &&
                                auction.bidCount > 0n &&
                                !auction.delegated && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      run(
                                        `settle-${auction.publicKey}`,
                                        () => program.finalizeAuction(auction),
                                        'Winner locked; excess returned. Payment awaits accepted proof.',
                                      )
                                    }
                                  >
                                    Lock winner
                                  </Button>
                                )}
                              {paymentReady && lot && proof && approvedWinnerCreative && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    run(
                                      `release-${auction.publicKey}`,
                                      () =>
                                        program.releasePayment(
                                          auction,
                                          lot.campaign,
                                          lot.publicKey,
                                          approvedWinnerCreative.publicKey,
                                          proof.publicKey,
                                        ),
                                      'Proof accepted; USDC released to creator',
                                    )
                                  }
                                >
                                  Release payment
                                </Button>
                              )}
                              {auction.status === 'settled' &&
                                myEscrow &&
                                !myEscrow.delegated &&
                                !myEscrow.claimed &&
                                auction.winner.toBase58() !== walletAddress && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      run(
                                        `refund-${auction.publicKey}`,
                                        () => program.claimRefund(auction),
                                        'Loser refund claimed',
                                      )
                                    }
                                  >
                                    Claim refund
                                  </Button>
                                )}
                              {auction.status === 'settled' && myEscrow?.delegated && !winner && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    run(
                                      `undelegate-${auction.publicKey}`,
                                      () => program.undelegateMyBid(auction.publicKey),
                                      'Bid escrow returned to Solana',
                                    )
                                  }
                                >
                                  Return escrow before refund
                                </Button>
                              )}
                              {receipt && (
                                <span className="inline-flex items-center gap-1.5 px-2 font-bold text-green-700">
                                  <ShieldCheck className="size-4" /> Paid & complete
                                </span>
                              )}
                              {auction.status === 'settled' &&
                                !receipt &&
                                !auction.winner.equals(PublicKey.default) && (
                                  <span className="inline-flex items-center gap-1.5 px-2 font-bold text-amber-700">
                                    <ShieldCheck className="size-4" /> Awaiting delivery acceptance
                                  </span>
                                )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}
