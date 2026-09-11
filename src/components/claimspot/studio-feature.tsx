'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileCheck2,
  Gavel,
  Grid2X2,
  ImageUp,
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ChainAuction, ChainCampaign, hashText, useClaimSpotProgram } from '@/lib/claimspot-program'
import { CampaignDraftMetadata, CampaignMetadata, campaignDetailsCommitment } from '@/lib/campaign-metadata'
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
const BUILDER_STEPS = [
  { label: 'Spots', description: 'Map the inventory' },
  { label: 'Campaign', description: 'Set the promise' },
  { label: 'Pricing', description: 'Price every spot' },
  { label: 'Review', description: 'Confirm and publish' },
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

function readableSavedAt(metadata: CampaignMetadata | undefined, campaign: ChainCampaign) {
  const timestamp = metadata?.createdAt ? Date.parse(metadata.createdAt) : Number(campaign.createdAt) * 1_000
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 'Saved on devnet'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp)
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

export function StudioFeature({ mode = 'create' }: { mode?: 'create' | 'operations' }) {
  const program = useClaimSpotProgram()
  const queryClient = useQueryClient()
  const walletAddress = program.wallet.publicKey?.toBase58() ?? null
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [moderator, setModerator] = useState('')
  const [durationValue, setDurationValue] = useState('7')
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('days')
  const [layoutId, setLayoutId] = useState<LaptopLayoutId | 'custom'>('classic-7')
  const [lots, setLots] = useState<LotDraft[]>(() => draftLots(LAPTOP_LAYOUT_PRESETS[0].spots))
  const [customLotCount, setCustomLotCount] = useState('7')
  const [selectedLot, setSelectedLot] = useState(0)
  const [builderStep, setBuilderStep] = useState('Ready')
  const [pending, setPending] = useState<string | null>(null)
  const [releasedAuctionKeys, setReleasedAuctionKeys] = useState<Set<string>>(() => new Set())
  const [resumeCampaignKey, setResumeCampaignKey] = useState<string | null>(null)
  const [legacyRecovery, setLegacyRecovery] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [draftManagerOpen, setDraftManagerOpen] = useState(false)

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
    setDraftManagerOpen(false)
    const draft = copy.draft
    const duration = editableDuration(draft.durationSeconds)
    setTitle(copy.title)
    setDetails(copy.details)
    setModerator(draft.moderator === walletAddress ? '' : draft.moderator)
    setDurationValue(duration.value)
    setDurationUnit(duration.unit)
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
    setWizardStep(BUILDER_STEPS.length - 1)
    setBuilderStep(`Ready to resume ${shortAddress(campaignKey)}`)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('campaign-builder')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
    window.setTimeout(() => document.getElementById('campaign-title')?.focus({ preventScroll: true }), 350)
  }

  function recoverLegacyDraft(campaign: ChainCampaign) {
    setDraftManagerOpen(false)
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

    setTitle('')
    setDetails('')
    setModerator(campaign.moderator.equals(campaign.creator) ? '' : campaign.moderator.toBase58())
    setDurationValue(duration.value)
    setDurationUnit(duration.unit)
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
    setWizardStep(BUILDER_STEPS.length - 1)
    setBuilderStep('Enter the exact original title and winner promise, then retry')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('campaign-builder')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
    window.setTimeout(() => document.getElementById('campaign-title')?.focus({ preventScroll: true }), 350)
  }

  function startNewAuction() {
    setDraftManagerOpen(false)
    setTitle('')
    setDetails('')
    setModerator('')
    setDurationValue('7')
    setDurationUnit('days')
    setLayoutId('classic-7')
    setLots(draftLots(LAPTOP_LAYOUT_PRESETS[0].spots))
    setCustomLotCount('7')
    setSelectedLot(0)
    setResumeCampaignKey(null)
    setLegacyRecovery(false)
    setWizardStep(0)
    setBuilderStep('Ready')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('campaign-builder')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  async function buildCampaign(event: FormEvent) {
    event.preventDefault()
    if (!program.wallet.publicKey) return toast.error('Connect a devnet wallet first')
    if (!title.trim() || !details.trim()) return toast.error('Campaign title and delivery promise are required')
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

      setBuilderStep('Preparing the MacBook template')
      const surface = {
        kind: 'macbook' as const,
        model: 'MacBook Pro',
        finish: 'Silver',
        fulfillmentMode: 'sticker' as const,
        source: 'template' as const,
      }
      const committedDetails = campaignDetailsCommitment(details, surface)
      const moderatorKey = moderator.trim() ? new PublicKey(moderator.trim()) : program.wallet.publicKey

      // Run balance check, hashing, and chain refetch ALL in parallel
      // so the wallet popup appears as fast as possible.
      const [balanceLamports, titleHash, detailsHash, latestQuery] = await Promise.all([
        program.fetchSolBalance(),
        hashText(title.trim()),
        hashText(committedDetails),
        chainQuery.refetch(),
      ])
      if (balanceLamports < recommendedSol * 1_000_000_000) {
        throw new Error(
          `Creator wallet needs about ${recommendedSol.toFixed(2)} devnet SOL for ${lots.length} lots. Use the devnet SOL button, then resume.`,
        )
      }
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
      setLayoutId('classic-7')
      setLots(draftLots(LAPTOP_LAYOUT_PRESETS[0].spots))
      setCustomLotCount('7')
      setSelectedLot(0)
      setDurationValue('7')
      setDurationUnit('days')
      setBuilderStep('Published')
      setResumeCampaignKey(null)
      setLegacyRecovery(false)
      setWizardStep(0)
      await refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Campaign transaction failed'
      const isBlockhash = message.toLowerCase().includes('blockhash') || message.toLowerCase().includes('block height')
      toast.error(
        isBlockhash
          ? 'Transaction expired — the network was slow. Your progress is saved. Hit the button again to resume.'
          : message,
      )
      setBuilderStep(
        isBlockhash
          ? 'Network was slow — tap the button to resume from where it stopped'
          : 'Stopped at the failed transaction; completed transactions remain on devnet',
      )
      await refresh()
    } finally {
      setPending(null)
    }
  }

  async function run(key: string, action: () => Promise<unknown>, success: string, onSuccess?: () => void) {
    try {
      setPending(key)
      const signature = await action()
      toast.success(success, {
        description: typeof signature === 'string' ? shortAddress(signature) : 'Confirmed on devnet',
      })
      onSuccess?.()
      await refresh()
      // ER commits can take a moment to become visible on the base layer. Recheck
      // automatically so the next finalization step appears without a manual reload.
      window.setTimeout(() => void refresh(), 2_500)
      window.setTimeout(() => void refresh(), 7_000)
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
  const draftCampaigns = myCampaigns
    .filter((campaign) => campaign.status === 'draft')
    .sort((left, right) => Number(right.createdAt - left.createdAt))
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
  const creatorFinalizeQueue = settlementAuctions
    .filter(
      (auction) =>
        auction.creator.toBase58() === walletAddress &&
        Number(auction.endsAt) <= nowSeconds &&
        auction.status === 'live',
    )
    .sort((left, right) => {
      const leftHasBid = left.bidCount > 0n
      const rightHasBid = right.bidCount > 0n
      if (leftHasBid !== rightHasBid) return rightHasBid ? 1 : -1
      return left.auctionId < right.auctionId ? -1 : left.auctionId > right.auctionId ? 1 : 0
    })
  const creatorDeliveryQueue = settlementAuctions.filter(
    (auction) =>
      auction.creator.toBase58() === walletAddress &&
      auction.status === 'settled' &&
      !auction.winner.equals(PublicKey.default) &&
      !receiptByAuction.has(auction.publicKey.toBase58()) &&
      !releasedAuctionKeys.has(auction.publicKey.toBase58()),
  )

  function auctionNames(auction: ChainAuction) {
    const auctionKey = auction.publicKey.toBase58()
    const lot = lotByAuction.get(auctionKey)
    const campaign = lot ? campaignByKey.get(lot.campaign.toBase58()) : undefined
    const copy = campaign ? copyByCampaign.get(campaign.publicKey.toBase58()) : undefined
    const lotCopy = copy?.lots.find((item) => item.auction === auctionKey)
    return {
      campaignName: copy?.title ?? (campaign ? shortAddress(campaign.publicKey.toBase58()) : 'Campaign'),
      lotName: lotCopy?.name ?? (lot ? `Lot ${lot.lotIndex + 1}` : `Auction #${auction.auctionId.toString()}`),
    }
  }
  const durationAmount = Number(durationValue)
  const durationSeconds = durationAmount * DURATION_UNITS[durationUnit]
  const validDuration =
    Number.isInteger(durationAmount) &&
    durationAmount >= 1 &&
    Number.isSafeInteger(durationSeconds) &&
    durationSeconds <= MAX_DURATION_SECONDS
  const validLots = lots.every(
    (lot) =>
      lot.name.trim() &&
      lot.placement.trim() &&
      Number(lot.reserve) >= 0 &&
      Number(lot.increment) > 0 &&
      Number.isFinite(Number(lot.reserve)) &&
      Number.isFinite(Number(lot.increment)),
  )
  const canContinue =
    wizardStep === 0
      ? lots.length > 0
      : wizardStep === 1
        ? Boolean(title.trim() && details.trim() && validDuration)
        : wizardStep === 2
          ? validLots
          : true

  return (
    <div className="min-h-screen bg-[#f4f4ef] px-4 py-12 text-black sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 border-b border-black/15 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="font-mono flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-green-700">
              <Radio className="size-4" /> Devnet studio
            </div>
            <h1 className="mt-4 max-w-3xl text-[clamp(2.75rem,5vw,5rem)] font-black leading-[0.94] tracking-[-0.055em]">
              {mode === 'create' ? 'Create your auction.' : 'Manage your auctions.'}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
              {mode === 'create'
                ? 'One clear step at a time: map the spots, set the promise, price the inventory, and publish.'
                : 'Review artwork, prove delivery, close auctions, and complete settlement from one operational workspace.'}
            </p>
            <div className="mt-6 flex min-h-11 flex-wrap items-center gap-6" aria-label="Solana and MagicBlock">
              <a
                href="https://solana.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center rounded-md px-1 opacity-85 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                aria-label="Solana"
              >
                {/* Official Solana brand asset. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://solana.com/src/img/branding/solanaLogo.svg" alt="Solana" className="h-6 w-auto" />
              </a>
              <a
                href="https://www.magicblock.xyz"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center rounded-md px-1 opacity-85 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                aria-label="MagicBlock"
              >
                {/* Official MagicBlock brand asset. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://cdn.prod.website-files.com/67dd3f471f62a240dd544dd8/681b42ddc650fd1bca046be8_logo.webp"
                  alt="MagicBlock"
                  className="h-6 w-auto invert"
                />
              </a>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === 'create' && draftCampaigns.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 border-black/15 bg-white px-4 shadow-sm"
                onClick={() => setDraftManagerOpen(true)}
              >
                <FileCheck2 className="size-4" aria-hidden="true" />
                Drafts
                <span className="font-mono grid min-w-6 place-items-center rounded-full bg-black px-1.5 py-0.5 text-[11px] font-black text-white">
                  {draftCampaigns.length}
                </span>
              </Button>
            )}
            {!walletAddress && <WalletButton />}
          </div>
        </div>

        <div className="mt-8 grid gap-8">
          {mode === 'create' && (
            <>
              {draftCampaigns.length > 0 && (
                <Dialog open={draftManagerOpen} onOpenChange={setDraftManagerOpen}>
                  <DialogContent className="max-h-[85vh] gap-0 overflow-hidden border-black/15 bg-white p-0 sm:max-w-4xl">
                    <DialogHeader className="border-b border-black/10 p-5 pr-14 text-left sm:p-6 sm:pr-16">
                      <div className="flex items-start gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
                          <FileCheck2 className="size-5" aria-hidden="true" />
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <DialogTitle className="text-xl font-black tracking-[-0.03em]">Saved drafts</DialogTitle>
                            <span className="font-mono rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-600">
                              {draftCampaigns.length}
                            </span>
                          </div>
                          <DialogDescription className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">
                            Continue from the last confirmed lot. Completed devnet transactions remain safely on-chain.
                          </DialogDescription>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {copyQuery.isError && (
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-10 shrink-0"
                            disabled={copyQuery.isFetching}
                            onClick={() => void copyQuery.refetch()}
                          >
                            {copyQuery.isFetching && (
                              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                            )}
                            Retry draft details
                          </Button>
                        )}
                        {resumeCampaignKey && (
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-10 shrink-0"
                            onClick={startNewAuction}
                          >
                            <Plus className="size-4" aria-hidden="true" /> Start new auction
                          </Button>
                        )}
                      </div>
                    </DialogHeader>

                    <div className="grid max-h-[calc(85vh-9rem)] gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
                      {draftCampaigns.map((campaign) => {
                        const campaignKey = campaign.publicKey.toBase58()
                        const copy = copyByCampaign.get(campaignKey)
                        const plannedLots = copy?.draft?.plannedLots.length ?? Math.max(campaign.lotCount, 1)
                        const completedLots = Math.min(campaign.lotCount, plannedLots)
                        const progress = Math.round((completedLots / plannedLots) * 100)
                        const active = resumeCampaignKey === campaignKey
                        const recoverable = Boolean(copy?.draft)
                        const detailsLoading = copyQuery.isLoading
                        const detailsUnavailable = copyQuery.isError

                        return (
                          <article
                            key={campaignKey}
                            className={`rounded-2xl border p-4 sm:p-5 ${
                              active ? 'border-black bg-neutral-100' : 'border-black/10 bg-neutral-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`font-mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${
                                      active
                                        ? 'bg-black text-white'
                                        : recoverable
                                          ? 'bg-amber-100 text-amber-900'
                                          : 'bg-neutral-200 text-neutral-700'
                                    }`}
                                  >
                                    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                                    {active
                                      ? 'Editing now'
                                      : detailsLoading
                                        ? 'Loading details'
                                        : detailsUnavailable
                                          ? 'Details unavailable'
                                          : recoverable
                                            ? 'Ready to resume'
                                            : 'Legacy recovery'}
                                  </span>
                                </div>
                                <h3 className="mt-3 truncate text-lg font-black tracking-[-0.025em]">
                                  {copy?.title ?? 'Untitled auction draft'}
                                </h3>
                                <p className="font-mono mt-1 text-xs text-neutral-500">{shortAddress(campaignKey)}</p>
                              </div>
                              <a
                                href={`https://explorer.solana.com/address/${campaignKey}?cluster=devnet`}
                                target="_blank"
                                rel="noreferrer"
                                className="grid size-10 shrink-0 place-items-center rounded-full border border-black/15 bg-white transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                                aria-label={`Open ${copy?.title ?? 'draft'} in Solana Explorer`}
                              >
                                <ExternalLink className="size-4" aria-hidden="true" />
                              </a>
                            </div>

                            <div className="mt-5">
                              <div className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="font-bold">Publication progress</span>
                                <span className="font-mono text-xs font-bold text-neutral-600">
                                  {completedLots}/{plannedLots} lots confirmed
                                </span>
                              </div>
                              <div
                                className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10"
                                role="progressbar"
                                aria-label={`${copy?.title ?? 'Draft'} publication progress`}
                                aria-valuemin={0}
                                aria-valuemax={plannedLots}
                                aria-valuenow={completedLots}
                              >
                                <div className="h-full rounded-full bg-black" style={{ width: `${progress}%` }} />
                              </div>
                            </div>

                            <div className="mt-5 flex flex-col gap-3 border-t border-black/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="text-xs leading-5 text-neutral-600">
                                <p>{readableSavedAt(copy, campaign)}</p>
                                <p>
                                  {detailsLoading
                                    ? 'Checking the saved setup and pricing'
                                    : detailsUnavailable
                                      ? 'Retry before continuing this draft'
                                      : recoverable
                                        ? 'Exact setup and pricing saved'
                                        : 'Original copy must be re-entered'}
                                </p>
                              </div>
                              <Button
                                type="button"
                                className="min-h-10 shrink-0"
                                variant={active ? 'outline' : 'default'}
                                disabled={active || detailsLoading || detailsUnavailable}
                                onClick={() =>
                                  copy?.draft ? resumeDraft(campaignKey, copy) : recoverLegacyDraft(campaign)
                                }
                              >
                                {active ? (
                                  <>
                                    <Check className="size-4" aria-hidden="true" /> Loaded in builder
                                  </>
                                ) : (
                                  <>
                                    Continue draft <ChevronRight className="size-4" aria-hidden="true" />
                                  </>
                                )}
                              </Button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Section eyebrow="Creator campaign builder" title={BUILDER_STEPS[wizardStep].description}>
                <form
                  id="campaign-builder"
                  onSubmit={(event) => {
                    if (wizardStep < BUILDER_STEPS.length - 1) {
                      event.preventDefault()
                      if (canContinue) setWizardStep((current) => Math.min(BUILDER_STEPS.length - 1, current + 1))
                      return
                    }
                    void buildCampaign(event)
                  }}
                  className="grid gap-6"
                >
                  <nav aria-label="Auction creation progress" className="overflow-x-auto pb-1">
                    <ol className="grid min-w-[520px] grid-cols-4 gap-2">
                      {BUILDER_STEPS.map((step, index) => {
                        const active = index === wizardStep
                        const complete = index < wizardStep
                        return (
                          <li key={step.label}>
                            <button
                              type="button"
                              onClick={() => index <= wizardStep && setWizardStep(index)}
                              disabled={index > wizardStep}
                              aria-current={active ? 'step' : undefined}
                              className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                                active
                                  ? 'border-black bg-black text-white'
                                  : complete
                                    ? 'border-black/20 bg-neutral-100 text-black hover:border-black/40'
                                    : 'border-black/10 bg-white text-neutral-400'
                              }`}
                            >
                              <span
                                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                                  active ? 'bg-white text-black' : complete ? 'bg-black text-white' : 'bg-neutral-100'
                                }`}
                              >
                                {complete ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                              </span>
                              <span className="text-sm font-black">{step.label}</span>
                            </button>
                          </li>
                        )
                      })}
                    </ol>
                  </nav>
                  {resumeCampaignKey && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
                      <div>
                        <p className="font-black">
                          {legacyRecovery ? 'Recovering legacy draft' : 'Resuming saved draft'}{' '}
                          {shortAddress(resumeCampaignKey)}
                        </p>
                        <p className="mt-1 text-amber-800">
                          {legacyRecovery
                            ? 'Existing lots and prices came from devnet. Re-enter the exact original title, winner promise and MacBook setup so their on-chain hashes can be verified.'
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
                  <fieldset
                    disabled={pending === 'builder'}
                    className={`grid gap-4 ${wizardStep === 0 ? '' : 'hidden'}`}
                  >
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

                  <div
                    className={`grid gap-5 rounded-2xl border border-black/10 bg-[#e8e8e3] p-4 lg:grid-cols-[1fr_280px] lg:p-5 ${
                      wizardStep === 0 || wizardStep === 3 ? '' : 'hidden'
                    }`}
                  >
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
                          backgroundImageUrl={null}
                          builder
                        />
                      </div>
                    </div>
                    <div className="grid content-start gap-3 rounded-xl bg-white p-4">
                      <Grid2X2 className="size-5" aria-hidden="true" />
                      <p className="font-black">One campaign, {lots.length} price discoveries.</p>
                      <p className="text-sm leading-6 text-neutral-600">
                        Every spot gets its own reserve, bidder escrow and winner. MagicBlock keeps each live bid loop
                        fast; Solana keeps custody and settlement canonical.
                      </p>
                    </div>
                  </div>

                  <div className="grid items-start gap-4 md:grid-cols-2">
                    <label className={`grid content-start gap-2 text-sm font-bold ${wizardStep === 1 ? '' : 'hidden'}`}>
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
                    <label className={`grid content-start gap-2 text-sm font-bold ${wizardStep === 1 ? '' : 'hidden'}`}>
                      Moderator wallet
                      <Input
                        id="moderator-wallet"
                        value={moderator}
                        autoComplete="off"
                        spellCheck={false}
                        aria-describedby="moderator-wallet-hint"
                        onChange={(event) => setModerator(event.target.value)}
                        placeholder="Solana address"
                      />
                      <span id="moderator-wallet-hint" className="text-xs font-normal text-neutral-500">
                        Optional · defaults to the creator wallet
                      </span>
                    </label>
                    <label className={`grid gap-2 text-sm font-bold md:col-span-2 ${wizardStep === 1 ? '' : 'hidden'}`}>
                      What the winner receives
                      <textarea
                        className="min-h-28 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        value={details}
                        maxLength={1200}
                        onChange={(event) => setDetails(event.target.value)}
                        placeholder="Logo displayed on my MacBook lid for the selected duration, with dated photo proof."
                      />
                    </label>
                    <fieldset className={`grid gap-3 md:col-span-2 ${wizardStep === 1 ? '' : 'hidden'}`}>
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

                  <div className={`grid gap-3 ${wizardStep === 2 ? '' : 'hidden'}`}>
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
                  {wizardStep === 2 && (
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={lots.length >= MAX_LOTS || pending === 'builder'}
                        onClick={() => resizeLots(lots.length + 1)}
                      >
                        <Plus /> Add lot
                      </Button>
                    </div>
                  )}

                  {wizardStep === 3 && (
                    <div className="grid gap-4 rounded-2xl border border-black/10 bg-[#fafaf7] p-5 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-neutral-500">
                          Surface
                        </p>
                        <p className="mt-2 font-black">MacBook template</p>
                        <p className="mt-1 text-xs text-neutral-500">Removable sticker</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-neutral-500">
                          Campaign
                        </p>
                        <p className="mt-2 font-black">{title || 'Untitled auction'}</p>
                        <p className="mt-1 text-xs text-neutral-500">{readableDuration(durationSeconds)}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-neutral-500">
                          Inventory
                        </p>
                        <p className="mt-2 font-black">{lots.length} auction spots</p>
                        <p className="mt-1 text-xs text-neutral-500">Independent prices and winners</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-neutral-500">
                          Publish
                        </p>
                        <p className="mt-2 font-black">Solana devnet</p>
                        <p className="mt-1 text-xs text-neutral-500">Live bids delegated to MagicBlock</p>
                      </div>
                    </div>
                  )}

                  {walletAddress && wizardStep === 3 && (
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

                  <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={wizardStep === 0 || pending === 'builder'}
                        onClick={() => setWizardStep((current) => Math.max(0, current - 1))}
                      >
                        <ChevronLeft className="size-4" aria-hidden="true" /> Back
                      </Button>
                      <span className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-neutral-500">
                        Step {wizardStep + 1} of {BUILDER_STEPS.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {pending === 'builder' && <span className="text-sm text-neutral-500">{builderStep}</span>}
                      {wizardStep < BUILDER_STEPS.length - 1 ? (
                        <Button type="submit" disabled={!canContinue || pending === 'builder'}>
                          Continue <ChevronRight className="size-4" aria-hidden="true" />
                        </Button>
                      ) : !walletAddress ? (
                        <WalletButton />
                      ) : (
                        <Button type="submit" disabled={pending === 'builder' || !canContinue}>
                          {pending === 'builder' ? <LoaderCircle className="animate-spin" /> : <Gavel />}{' '}
                          {resumeCampaignKey ? 'Resume & publish' : 'Create, delegate & publish'}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </Section>
            </>
          )}

          {mode === 'operations' && (
            <>
              <div id="creator-actions" className="mb-8">
                <Section eyebrow="Creator workflow" title="Your next auction actions">
                  {!walletAddress ? (
                    <Empty>Connect the creator wallet to see the next required action.</Empty>
                  ) : chainQuery.isLoading ? (
                    <div className="flex items-center gap-3 text-sm font-bold text-neutral-600">
                      <LoaderCircle className="size-5 animate-spin" /> Checking ended auctions…
                    </div>
                  ) : creatorFinalizeQueue.length === 0 && creatorDeliveryQueue.length === 0 ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <Check className="mt-0.5 size-5 text-emerald-700" />
                      <div>
                        <p className="font-black text-emerald-950">Nothing needs your attention right now.</p>
                        <p className="mt-1 text-sm leading-6 text-emerald-800">
                          Ended auctions and delivery steps will appear here automatically.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {creatorFinalizeQueue.length > 0 && (
                        <div>
                          <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-neutral-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="max-w-2xl text-sm leading-6 text-neutral-700">
                              Each ended lot takes up to two transactions: return its live MagicBlock result to Solana,
                              then lock the winner. Lots with bids are shown first.
                            </p>
                            <span className="w-fit shrink-0 rounded-full bg-black px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white">
                              {creatorFinalizeQueue.length} pending
                            </span>
                          </div>
                          <div className="grid gap-4">
                            {creatorFinalizeQueue.map((auction, index) => {
                              const { campaignName, lotName } = auctionNames(auction)
                              const hasBid = auction.bidCount > 0n
                              const waitingForBaseLayer = auction.closed && auction.delegated
                              const readyToFinalize = auction.closed && !auction.delegated
                              const closeKey = `close-${auction.publicKey}`
                              const finalizeKey = hasBid ? `settle-${auction.publicKey}` : `no-bid-${auction.publicKey}`

                              return (
                                <article
                                  key={auction.publicKey.toBase58()}
                                  className="grid gap-5 rounded-2xl border border-black/10 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                                >
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                                        Priority {index + 1}
                                      </span>
                                      {hasBid ? (
                                        <span className="rounded-full bg-[#fff21c] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                                          Winning bid
                                        </span>
                                      ) : (
                                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-neutral-600">
                                          No bids
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                                      {campaignName}
                                    </p>
                                    <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">{lotName}</h3>
                                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                                      {hasBid
                                        ? `${formatUsdc(fromUsdcAtoms(auction.highestBid))} USDC top bid · provisional winner ${shortAddress(auction.highestBidder.toBase58())}`
                                        : 'Bidding ended without a bid. Close this lot so it is marked complete.'}
                                    </p>
                                    <p className="mt-3 font-mono text-[11px] text-neutral-400">
                                      Auction #{auction.auctionId.toString()}
                                    </p>
                                  </div>

                                  <div className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] p-4 lg:w-[330px]">
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-neutral-500">
                                      {readyToFinalize ? 'Step 2 of 2' : 'Step 1 of 2'}
                                    </p>
                                    <p className="mt-1 font-black">
                                      {waitingForBaseLayer
                                        ? 'Returning result to Solana'
                                        : readyToFinalize
                                          ? hasBid
                                            ? 'Lock the winner'
                                            : 'Finalize without a winner'
                                          : 'Return the MagicBlock result'}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                                      {waitingForBaseLayer
                                        ? 'Commit submitted. This page will unlock the next step automatically.'
                                        : readyToFinalize
                                          ? hasBid
                                            ? 'This confirms the highest bidder and moves the lot into delivery.'
                                            : 'This closes the empty lot with no payment or delivery required.'
                                          : 'Commit the final ER state back to Solana before settlement.'}
                                    </p>

                                    {waitingForBaseLayer ? (
                                      <Button className="mt-4 w-full" disabled>
                                        <LoaderCircle className="animate-spin" /> Waiting for Solana
                                      </Button>
                                    ) : readyToFinalize ? (
                                      <Button
                                        className="mt-4 w-full"
                                        disabled={Boolean(pending)}
                                        onClick={() =>
                                          run(
                                            finalizeKey,
                                            () =>
                                              hasBid
                                                ? program.finalizeAuction(auction)
                                                : program.finalizeNoBid(auction),
                                            hasBid
                                              ? 'Winner locked; the lot is ready for delivery'
                                              : 'No-bid lot finalized',
                                          )
                                        }
                                      >
                                        {pending === finalizeKey && <LoaderCircle className="animate-spin" />}
                                        {hasBid ? 'Lock winner' : 'Finalize no bids'}
                                      </Button>
                                    ) : (
                                      <Button
                                        className="mt-4 w-full"
                                        disabled={Boolean(pending)}
                                        onClick={() =>
                                          run(
                                            closeKey,
                                            () => program.closeAuction(auction),
                                            'MagicBlock result is returning to Solana',
                                          )
                                        }
                                      >
                                        {pending === closeKey && <LoaderCircle className="animate-spin" />}
                                        Return result to Solana
                                      </Button>
                                    )}
                                  </div>
                                </article>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {creatorDeliveryQueue.length > 0 && (
                        <div>
                          <div className="mb-4">
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-neutral-500">
                              After finalization
                            </p>
                            <h3 className="mt-1 text-xl font-black tracking-[-0.03em]">Winner delivery workflow</h3>
                          </div>
                          <div className="grid gap-4">
                            {creatorDeliveryQueue.map((auction) => {
                              const { campaignName, lotName } = auctionNames(auction)
                              const winnerCreative = (data?.creatives ?? []).find(
                                (creative) =>
                                  creative.auction.equals(auction.publicKey) &&
                                  creative.submitter.equals(auction.winner),
                              )
                              const proof = proofByAuction.get(auction.publicKey.toBase58())
                              const creativeApproved = winnerCreative?.status === 'approved'
                              const proofAccepted = proof?.status === 'accepted'
                              const nextTitle = !winnerCreative
                                ? 'Waiting for winner artwork'
                                : !creativeApproved
                                  ? winnerCreative.status === 'rejected'
                                    ? 'Winner must replace rejected artwork'
                                    : 'Artwork needs moderator approval'
                                  : !proof
                                    ? 'Place the artwork and upload proof'
                                    : !proofAccepted
                                      ? proof.status === 'disputed'
                                        ? 'Delivery proof was disputed'
                                        : 'Waiting for winner proof review'
                                      : 'Release your payment'
                              const nextDescription = !winnerCreative
                                ? `Winner ${shortAddress(auction.winner.toBase58())} must submit the winning creative from their wallet.`
                                : !creativeApproved
                                  ? 'The submitted creative must be approved before physical placement begins.'
                                  : !proof
                                    ? 'Complete the promised placement, then upload dated evidence for the winner.'
                                    : !proofAccepted
                                      ? 'Payment stays secured until the winner accepts the placement evidence.'
                                      : `${formatUsdc(fromUsdcAtoms(auction.winningBid))} USDC is ready to release from escrow.`

                              return (
                                <article
                                  key={auction.publicKey.toBase58()}
                                  className="flex flex-col gap-4 rounded-2xl border border-black/10 p-5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                                      {campaignName} · {lotName}
                                    </p>
                                    <p className="mt-2 text-lg font-black">{nextTitle}</p>
                                    <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">
                                      {nextDescription}
                                    </p>
                                  </div>
                                  {!winnerCreative || (proof && !proofAccepted) ? (
                                    <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-neutral-100 px-3 py-2 text-xs font-black uppercase tracking-wide text-neutral-600">
                                      <LoaderCircle className="size-4 animate-spin" /> Waiting
                                    </span>
                                  ) : !creativeApproved ? (
                                    <Button asChild variant="outline" className="shrink-0">
                                      <a href="#moderator-actions">Review artwork</a>
                                    </Button>
                                  ) : !proof ? (
                                    <Button asChild className="shrink-0">
                                      <a href="#fulfillment-actions">Upload placement proof</a>
                                    </Button>
                                  ) : (
                                    <Button asChild className="shrink-0">
                                      <a href="#settlement-records">Release payment</a>
                                    </Button>
                                  )}
                                </article>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Section>
              </div>

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
                                  {campaign.lotCount} lots · {campaign.acceptedProofs} proofs accepted ·{' '}
                                  {campaign.status}
                                </p>
                                {campaign.status === 'draft' && (
                                  <p className="mt-2 max-w-md text-xs leading-5 text-amber-700">
                                    {copy?.draft
                                      ? 'Recovery checkpoint saved. Resume restores the exact setup and reuses every completed devnet lot.'
                                      : 'Legacy draft: existing lots can be recovered from devnet, but you must re-enter the exact original title, winner promise and MacBook setup.'}
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
                                <Button asChild>
                                  <Link href="/studio">Continue in creator studio</Link>
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
                            creative.auction.equals(auction.publicKey) &&
                            creative.submitter.toBase58() === walletAddress,
                        )
                        return (
                          <div key={auction.publicKey.toBase58()} className="rounded-2xl border border-black/10 p-4">
                            <p className="font-black">Auction #{auction.auctionId.toString()}</p>
                            <p className="mt-1 text-sm text-neutral-500">
                              {shortAddress(auction.publicKey.toBase58())}
                            </p>
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

                <div id="moderator-actions" className="scroll-mt-24">
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
                </div>

                <div id="fulfillment-actions" className="scroll-mt-24">
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
              </div>

              <div id="settlement-records" className="mt-8">
                <Section eyebrow="Settlement records" title="All lots and refunds">
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
                            const released = Boolean(receipt) || releasedAuctionKeys.has(auction.publicKey.toBase58())
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
                              !released &&
                              Boolean(lot) &&
                              proof?.status === 'accepted' &&
                              Boolean(approvedWinnerCreative)
                            return (
                              <tr key={auction.publicKey.toBase58()} className="border-b last:border-0">
                                <td className="px-3 py-4">
                                  <span className="block font-bold">{auctionNames(auction).lotName}</span>
                                  <span className="mt-1 block font-mono text-[11px] text-neutral-400">
                                    #{auction.auctionId.toString()}
                                  </span>
                                </td>
                                <td className="px-3 py-4">
                                  {released
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
                                    {creator && ended && auction.status === 'live' && (
                                      <a
                                        href="#creator-actions"
                                        className="text-xs font-bold underline underline-offset-4"
                                      >
                                        Complete in action queue
                                      </a>
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
                                            () =>
                                              setReleasedAuctionKeys((current) => {
                                                const next = new Set(current)
                                                next.add(auction.publicKey.toBase58())
                                                return next
                                              }),
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
                                    {released && (
                                      <span className="inline-flex items-center gap-1.5 px-2 font-bold text-green-700">
                                        <ShieldCheck className="size-4" /> Paid & complete
                                      </span>
                                    )}
                                    {auction.status === 'settled' &&
                                      !released &&
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
