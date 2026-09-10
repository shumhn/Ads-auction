import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  ExternalLink,
  ImageIcon,
  Laptop,
  MonitorUp,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { CampaignMarketplace } from '@/components/claimspot/campaign-marketplace'

const storySteps = [
  {
    number: '01',
    title: 'Map the real object',
    copy: 'A creator uploads the MacBook, chooses the placements, and defines what every winning brand receives.',
    icon: Laptop,
  },
  {
    number: '02',
    title: 'Brands choose and bid',
    copy: 'An advertiser opens the surface, picks one visible spot, locks test USDC, and competes live.',
    icon: CircleDollarSign,
  },
  {
    number: '03',
    title: 'Place the artwork',
    copy: 'The winner submits a logo. The creator approves it and applies the promised sticker or laser etch.',
    icon: ImageIcon,
  },
  {
    number: '04',
    title: 'Prove the outcome',
    copy: 'Fulfilment proof is reviewed before payout is released and the campaign gets a public receipt.',
    icon: BadgeCheck,
  },
]

function SolanaLogo() {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="Solana">
      <svg className="h-6 w-6 shrink-0" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <path
          fill="url(#solana-gradient)"
          d="M86.619 69.036 74.403 82.101a2.837 2.837 0 0 1-2.075.899h-57.91a1.421 1.421 0 0 1-1.3-.85 1.411 1.411 0 0 1 .263-1.53l12.225-13.064a2.837 2.837 0 0 1 2.07-.899h57.906a1.423 1.423 0 0 1 1.3.85 1.412 1.412 0 0 1-.263 1.53ZM74.403 42.727a2.837 2.837 0 0 0-2.075-.898h-57.91a1.421 1.421 0 0 0-1.3.85 1.412 1.412 0 0 0 .263 1.529l12.225 13.065a2.84 2.84 0 0 0 2.07.898h57.906a1.422 1.422 0 0 0 1.3-.85 1.412 1.412 0 0 0-.263-1.529L74.403 42.727Zm-59.985-9.384h57.91a2.844 2.844 0 0 0 2.075-.899l12.216-13.065A1.414 1.414 0 0 0 85.582 17H27.676a2.845 2.845 0 0 0-2.07.899L13.384 30.964a1.412 1.412 0 0 0 1.034 2.379Z"
        />
        <defs>
          <linearGradient id="solana-gradient" x1="19.247" x2="79.786" y1="84.573" y2="16.138">
            <stop offset=".08" stopColor="#9945FF" />
            <stop offset=".5" stopColor="#5497D5" />
            <stop offset=".97" stopColor="#19FB9B" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-base font-black tracking-[-0.04em]">SOLANA</span>
    </span>
  )
}

function MagicBlockLogo() {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="MagicBlock">
      <span className="grid size-7 place-items-center rounded-md bg-foreground text-background">
        <svg className="size-5" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path
            d="M8.055 9.709c.224.584.65.987 1.174 1.21.367.156.783.15 1.155.003a42.85 42.85 0 0 1 4.505-1.487 41.98 41.98 0 0 1 5.474-1.132L8.691 3.104A1.24 1.24 0 0 0 6.959 4.244l.022 8.183a2.59 2.59 0 0 0 1.074-2.718Z"
            fill="currentColor"
          />
          <path
            d="M31.407 11.201c-.331-1.217-2.2-2.033-5.126-2.241a31.43 31.43 0 0 0-4.255.083 43.63 43.63 0 0 0-6.893 1.289 43.17 43.17 0 0 0-4.633 1.542c-.306.121-.568.336-.736.618a2.21 2.21 0 0 0-.22 1.797c-.101-.283-.239-.511-.407-.69-.462-.493-1.213-.588-1.813-.274-.908.475-1.745.971-2.489 1.485-1.128.777-2.327 1.713-2.993 2.942-.212.394-.37.839-.338 1.291.044.619.443 1.044.928 1.389.26.185.542.34.837.463.931.386 1.992.563 2.998.656v-2.584c0-.252.189-.477.44-.49a.465.465 0 0 1 .49.465v6.37c0 .577.309 1.116.808 1.406l6.213 3.613c.25.145.534.22.82.22.209 0 .418-.04.615-.121l9.102-3.731a1.624 1.624 0 0 0 1.011-1.505v-8.046l.102-.048c3.852-2.057 5.974-4.312 5.541-5.899Zm-12.144 9.256c0 .949-.302 1.5-.837 1.5s-.889-.51-.889-1.672v-1.847c0-.949.302-1.5.837-1.5s.889.51.889 1.672v1.847Zm3.729-.928c0 .948-.302 1.5-.837 1.5s-.89-.51-.89-1.672V17.51c0-.949.303-1.5.838-1.5s.889.51.889 1.672v1.847Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="text-base font-black tracking-[-0.04em]">MagicBlock</span>
    </span>
  )
}

function LaptopStoryVisual() {
  const spots = [
    { pos: 'col-start-1 row-start-1', id: '01', bid: '125 USDC' },
    { pos: 'col-start-2 row-start-1', id: '02', bid: '100 USDC' },
    { pos: 'col-start-3 row-start-1', id: '03', bid: '75 USDC' },
    { pos: 'col-start-4 row-start-1', id: '04', bid: '80 USDC' },
    { pos: 'col-start-1 row-start-2', id: '05', bid: '110 USDC' },
    { pos: 'col-start-4 row-start-2', id: '06', bid: '95 USDC' },
    { pos: 'col-start-1 row-start-3', id: '07', bid: '60 USDC' },
    { pos: 'col-start-2 row-start-3', id: '08', bid: '70 USDC' },
    { pos: 'col-start-3 row-start-3', id: '09', bid: '85 USDC' },
    { pos: 'col-start-4 row-start-3', id: '10', bid: '90 USDC' },
  ]

  return (
    <div className="relative mx-auto w-full max-w-3xl lg:max-w-4xl">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-tr from-foreground/[0.04] to-foreground/[0.09] blur-3xl dark:from-white/[0.03] dark:to-white/[0.08]" />

      <div className="relative rounded-3xl border border-foreground/12 bg-surface-soft/90 p-4 shadow-2xl backdrop-blur-md sm:p-6">
        {/* Hardware Status Header */}
        <div className="flex items-center justify-between gap-3 px-1 pb-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          <span className="flex items-center gap-2 text-foreground font-semibold">
            <span className="size-2 rounded-full bg-foreground/60" />
            Physical Drop 01 · Live Board
          </span>
          <span className="inline-flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Solana Devnet Live
          </span>
        </div>

        {/* MacBook Lid Hardware Chassis */}
        <div className="relative aspect-[1.58/1] w-full rounded-2xl border border-foreground/15 bg-gradient-to-b from-[#e7e8e5] via-[#d0d2ce] to-[#c2c3be] p-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_24px_50px_-15px_rgba(0,0,0,0.35)] dark:from-[#2a2b2f] dark:via-[#202125] dark:to-[#17181a] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_28px_56px_-15px_rgba(0,0,0,0.8)] sm:p-6">
          {/* Subtle aluminum brushed reflection */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_36%,rgba(255,255,255,0.5)_0%,transparent_65%)] dark:bg-[radial-gradient(circle_at_50%_36%,rgba(255,255,255,0.07)_0%,transparent_65%)]" />

          {/* Grid of spots */}
          <div className="relative grid size-full grid-cols-4 grid-rows-3 gap-2.5 sm:gap-3.5">
            {/* Center MacBook emblem */}
            <div className="col-start-2 col-span-2 row-start-2 z-10 flex flex-col items-center justify-center">
              <div className="relative grid size-12 place-items-center rounded-full border border-foreground/20 bg-background/65 shadow-md backdrop-blur-md transition-transform duration-300 hover:scale-105 sm:size-16">
                <Laptop className="size-5 text-foreground/75 sm:size-7" aria-hidden="true" />
              </div>
              <span className="mt-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-muted sm:text-[10px]">
                MacBook Pro 16&quot;
              </span>
            </div>

            {spots.map((spot) => (
              <a
                key={spot.id}
                href="#live"
                className={`${spot.pos} group relative z-10 flex flex-col items-center justify-center rounded-xl border border-foreground/15 bg-background/85 px-2 py-2 text-center shadow-xs backdrop-blur-md transition-all duration-150 hover:scale-[1.03] hover:border-foreground/40 hover:bg-background hover:shadow-md sm:py-3`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground sm:text-xs">
                    Spot {spot.id}
                  </span>
                </div>
                <span className="font-mono mt-1 text-[9px] font-semibold text-ink-muted group-hover:text-foreground sm:text-[11px]">
                  {spot.bid}
                </span>
              </a>
            ))}
          </div>

          {/* Recessed thumb notch on bottom edge */}
          <div className="absolute -bottom-2 left-1/2 h-2 w-24 -translate-x-1/2 rounded-b-lg bg-[#959691] dark:bg-[#0b0c0d]" />
        </div>

        {/* Micro Specs strip */}
        <div className="mt-5 grid grid-cols-3 divide-x divide-foreground/10 border-t border-foreground/10 pt-3.5 text-center">
          <div className="px-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">Surface</p>
            <p className="mt-0.5 text-xs font-bold sm:text-sm">MacBook Pro 16&quot;</p>
          </div>
          <div className="px-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">Inventory</p>
            <p className="mt-0.5 text-xs font-bold sm:text-sm">10 Featured Spots</p>
          </div>
          <div className="px-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">Release</p>
            <p className="mt-0.5 text-xs font-bold sm:text-sm">Proof-Gated Escrow</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MarketProofSection() {
  return (
    <section className="solana-section-wash border-b border-foreground/10 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end lg:gap-20">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
              The market signal
            </p>
            <h2 className="mt-4 text-[clamp(2.25rem,4.5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.04em]">
              The behavior is already here.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-ink-muted sm:text-lg sm:leading-8">
            People already put logos, banners, channels, reach, and real-world surfaces to work. Atrium.ads gives brands
            a way to bid on that attention—and gives every space owner a transparent way to create opportunity.
          </p>
        </div>

        <div className="solana-panel mt-12 grid overflow-hidden rounded-3xl border border-foreground/15 lg:grid-cols-[1.22fr_.78fr]">
          <article className="relative overflow-hidden border-b border-foreground/10 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div
              className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full opacity-10 blur-3xl"
              style={{ backgroundColor: 'var(--solana-purple)' }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-28 left-12 size-64 rounded-full opacity-10 blur-3xl"
              style={{ backgroundColor: 'var(--solana-green)' }}
              aria-hidden="true"
            />
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <SolanaLogo />
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Nepal flood relief · 2026
                </span>
              </div>
              <p className="mt-12 text-[clamp(3.4rem,8vw,7rem)] font-black leading-none tracking-[-0.075em]">$167K</p>
              <h3 className="mt-5 max-w-2xl text-2xl font-bold leading-tight tracking-[-0.04em] sm:text-3xl">
                Raised by auctioning nine ad spots on one logo.
              </h3>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-ink-muted sm:text-base sm:leading-7">
                Solana raised exactly $166,946.50 in USDC within 24 hours, with proceeds directed to Nepal flood relief.
                A familiar digital surface became measurable sponsor inventory—and funded something real.
              </p>
              <a
                href="https://x.com/solana/status/2095173372158394780"
                target="_blank"
                rel="noreferrer"
                className="mt-7 inline-flex min-h-10 items-center gap-2 text-sm font-bold underline decoration-foreground/25 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
              >
                View the original result <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </div>
          </article>

          <div className="grid sm:grid-cols-2 lg:grid-cols-1">
            <article className="border-b border-foreground/10 p-6 sm:border-b-0 sm:border-r sm:p-8 lg:border-b lg:border-r-0">
              <MonitorUp className="size-5" aria-hidden="true" />
              <p className="mt-8 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
                Digital space
              </p>
              <h3 className="mt-3 text-xl font-bold tracking-[-0.035em]">Creators auction their X banners.</h3>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                Seven placements across one profile banner, sold as a time-bound campaign to an existing audience.
              </p>
              <a
                href="https://x.com/FabianoSolana"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
              >
                See the creator example <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </article>
            <article className="p-6 sm:p-8">
              <Laptop className="size-5" aria-hidden="true" />
              <p className="mt-8 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
                Physical space
              </p>
              <h3 className="mt-3 text-xl font-bold tracking-[-0.035em]">We start with one real MacBook.</h3>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                Twenty-two mapped placements, live bidding, artwork approval, public proof, and payout after delivery.
              </p>
              <a
                href="#live"
                className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
              >
                Explore our first auction <ArrowDown className="size-4" aria-hidden="true" />
              </a>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}

function StorySection() {
  return (
    <section
      id="story"
      className="solana-section-wash scroll-mt-20 border-b border-foreground/10 px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[.82fr_1.18fr] lg:items-end lg:gap-20">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">The story</p>
            <h2 className="mt-4 text-[clamp(2.25rem,4.5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.04em]">
              The MacBook is our first proof.
            </h2>
          </div>
          <div className="max-w-2xl lg:pb-1">
            <p className="text-base leading-7 text-ink-muted sm:text-lg sm:leading-8">
              Atrium.ads gives creators, founders, influencers, and communities a way to auction any digital or physical
              space—from a logo or banner to an event surface or real object. Brands get a credible way to sponsor
              attention; space owners turn visibility into opportunity, support, or funding with public proof.
            </p>
          </div>
        </div>

        <div className="mt-12 grid border-y border-foreground/15 md:grid-cols-2 xl:grid-cols-4">
          {storySteps.map((step, index) => {
            const Icon = step.icon
            return (
              <article
                key={step.number}
                className={`py-7 md:px-6 xl:min-h-64 xl:py-8 ${index % 2 === 0 ? 'md:border-r' : ''} ${index < 2 ? 'border-b xl:border-b-0' : ''} ${index > 0 ? 'xl:border-l' : ''} border-foreground/10`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs font-medium text-ink-muted">{step.number} / 04</span>
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mt-10 text-xl font-bold tracking-[-0.035em]">{step.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-ink-muted">{step.copy}</p>
              </article>
            )
          })}
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <a
            href="#live"
            className="group flex min-h-28 items-end justify-between gap-6 rounded-2xl bg-foreground p-6 text-background transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/25"
          >
            <span>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-background/60">For brands</span>
              <span className="mt-2 block text-2xl font-bold tracking-[-0.035em]">I want a MacBook spot</span>
            </span>
            <ArrowDown
              className="size-6 shrink-0 transition-transform duration-150 group-hover:translate-y-1 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </a>
          <Link
            href="/studio"
            className="solana-panel group flex min-h-28 items-end justify-between gap-6 rounded-2xl border border-foreground/15 p-6 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
          >
            <span>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                For surface owners
              </span>
              <span className="mt-2 block text-2xl font-bold tracking-[-0.035em]">I have a surface to auction</span>
            </span>
            <ArrowRight
              className="size-6 shrink-0 transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  )
}

function ProofSection() {
  return (
    <section className="solana-section-wash border-t border-foreground/10 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">Under the story</p>
          <h2 className="mt-4 text-[clamp(2.25rem,4.5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.04em]">
            Fast to use.
            <br />
            Public to verify.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-muted">
            The interface tells the human story first. Solana and MagicBlock sit underneath it to make every bid,
            refund, winner, and payout inspectable.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5 border-y border-foreground/10 py-5">
            <a
              href="https://solana.com"
              target="_blank"
              rel="noreferrer"
              className="rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
            >
              <SolanaLogo />
            </a>
            <span className="text-foreground/20" aria-hidden="true">
              ×
            </span>
            <a
              href="https://www.magicblock.xyz"
              target="_blank"
              rel="noreferrer"
              className="rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
            >
              <MagicBlockLogo />
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background transition-all duration-150 hover:bg-foreground/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
            >
              Open 22-spot devnet demo <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/activity"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-foreground/15 bg-background px-5 text-sm font-bold transition-all duration-150 hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
            >
              View public activity <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="border-y border-foreground/15">
          <div className="grid gap-4 border-b border-foreground/10 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <Zap className="size-5" aria-hidden="true" />
            <div>
              <h3 className="font-bold">Live bidding without the waiting</h3>
              <p className="mt-1 text-sm leading-6 text-ink-muted">MagicBlock handles the rapid auction loop.</p>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">Ephemeral rollup</span>
          </div>
          <div className="grid gap-4 border-b border-foreground/10 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <ShieldCheck className="size-5" aria-hidden="true" />
            <div>
              <h3 className="font-bold">Budgets and outcomes return to Solana</h3>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                Escrow, winner, refunds, and payout stay auditable.
              </p>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">On-chain settlement</span>
          </div>
          <div className="grid gap-4 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <Sparkles className="size-5" aria-hidden="true" />
            <div>
              <h3 className="font-bold">Proof comes before creator payout</h3>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                The winning placement must be delivered and accepted.
              </p>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">Proof-gated release</span>
          </div>
        </div>
      </div>

      <div className="solana-panel mx-auto mt-16 max-w-7xl rounded-2xl border border-foreground/15 px-6 py-8 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
            The opportunity
          </p>
          <p className="mt-2 max-w-2xl text-xl font-bold tracking-[-0.035em]">
            Any person. Any physical or digital surface. One open auction layer.
          </p>
        </div>
        <span className="mt-5 inline-flex rounded-full border border-foreground/15 px-4 py-2 text-xs font-bold sm:mt-0">
          Auction any space
        </span>
      </div>
    </section>
  )
}

export function DashboardFeature() {
  return (
    <div className="solana-page-surface bg-background text-foreground">
      {/* Hero Section: Centered Editorial Headline + Generous Showcase Laptop */}
      <section className="solana-hero-surface relative overflow-hidden border-b border-foreground/10 px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-14">
        <div
          className="pointer-events-none absolute -left-32 -top-48 size-[32rem] rounded-full opacity-[0.1] blur-3xl"
          style={{ backgroundColor: 'var(--solana-purple)' }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-32 top-12 size-[30rem] rounded-full opacity-[0.08] blur-3xl"
          style={{ backgroundColor: 'var(--solana-green)' }}
          aria-hidden="true"
        />
        <div className="mx-auto max-w-4xl text-center">
          {/* Top Status Header */}
          <div className="font-mono flex flex-wrap items-center justify-center gap-3 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-foreground/60" />
              Atrium.ads · P2P Ad Space Auctions
            </span>
            <span className="hidden sm:inline text-foreground/30">•</span>
            <span className="inline-flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Solana Devnet Live
            </span>
          </div>

          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-surface-soft px-4 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-ink-muted sm:text-[11px]">
            <Sparkles className="size-3.5 text-foreground" />
            First Drop · Physical MacBook Pro
          </div>

          <h1 className="mt-6 text-[clamp(2.75rem,6.5vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.04em]">
            Where any space becomes ad space.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg sm:leading-8">
            The peer-to-peer auction marketplace for physical and digital placements. Space owners list their
            visibility; brands bid live or buy instantly.
          </p>

          <p className="mx-auto mt-4 max-w-2xl font-mono text-xs font-medium uppercase leading-5 tracking-[0.08em] text-ink-muted">
            Creators, founders, influencers, and communities can auction a logo, banner, channel, event, or physical
            surface to make their visibility valuable—to find sponsors, create opportunities, or raise for a cause. Live
            now: 22 spots on one real MacBook.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <a
              href="#live"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-bold text-background transition-all duration-150 hover:bg-foreground/85 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
            >
              Bid on a MacBook spot <ArrowDown className="size-4" aria-hidden="true" />
            </a>
            <Link
              href="#story"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-foreground/15 bg-background px-6 text-sm font-semibold transition-all duration-150 hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
            >
              See how it works <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          {/* Micro Trust Signals */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2.5 text-xs text-ink-muted">
            <div className="flex items-center gap-2">
              <Zap className="size-3.5 text-foreground" />
              <span>Sub-second MagicBlock bids</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-foreground" />
              <span>Proof-gated Solana escrow</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="size-3.5 text-foreground" />
              <span>100% loser refunds</span>
            </div>
          </div>
        </div>

        {/* Generous Showcase Laptop Mockup */}
        <div className="mt-12 sm:mt-16">
          <LaptopStoryVisual />
        </div>
      </section>

      <MarketProofSection />
      <StorySection />
      <CampaignMarketplace />
      <ProofSection />
    </div>
  )
}
