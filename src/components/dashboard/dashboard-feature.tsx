import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  ExternalLink,
  ImageIcon,
  Laptop,
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
    copy: 'A creator uploads the laptop, chooses the placements, and defines what every winning brand receives.',
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

function LaptopStoryVisual() {
  const spots = [
    'col-start-1 row-start-1',
    'col-start-2 row-start-1',
    'col-start-3 row-start-1',
    'col-start-4 row-start-1',
    'col-start-1 row-start-2',
    'col-start-4 row-start-2',
    'col-start-1 row-start-3',
    'col-start-2 row-start-3',
    'col-start-3 row-start-3',
    'col-start-4 row-start-3',
  ]

  return (
    <div className="rounded-3xl border border-foreground/15 bg-surface-soft p-3 sm:p-5">
      <div className="font-mono flex items-center justify-between gap-3 px-1 pb-4 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
        <span>First drop / physical</span>
        <span className="inline-flex items-center gap-2 text-foreground">
          <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden="true" /> Devnet live
        </span>
      </div>
      <div className="relative aspect-[1.52/1] rounded-2xl border border-foreground/20 bg-[linear-gradient(145deg,#e8e8e4_0%,#bfc0bd_48%,#efefec_100%)] p-3 shadow-[0_28px_70px_-48px_rgba(0,0,0,.55)] sm:p-5">
        <div className="relative grid size-full grid-cols-4 grid-rows-3 gap-2 overflow-hidden rounded-xl border border-foreground/15 bg-[linear-gradient(145deg,#c9cac7,#f1f1ee,#b8b9b7)] p-4 sm:gap-3 sm:p-6">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_center,transparent_0,transparent_35%,rgba(255,255,255,.9)_100%)]" />
          <div className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-dashed border-foreground/20 bg-background/30 text-foreground/40 sm:size-24">
            <Laptop className="size-7 sm:size-9" aria-hidden="true" />
          </div>
          {spots.map((position, index) => (
            <div
              key={position}
              className={`${position} z-10 grid min-h-10 place-items-center rounded-md border border-foreground/15 bg-background/75 text-center shadow-sm`}
            >
              <span className="font-mono text-[9px] font-medium uppercase tracking-[0.08em] sm:text-[11px]">
                Spot {String(index + 1).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>
        <div className="absolute -bottom-2 left-1/2 h-2 w-[88%] -translate-x-1/2 rounded-b-xl border-x border-b border-foreground/20 bg-surface-silver" />
      </div>
      <div className="mt-5 grid grid-cols-3 divide-x divide-foreground/10 border-y border-foreground/10 py-3">
        <div className="px-2 first:pl-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">Surface</p>
          <p className="mt-1 text-xs font-bold sm:text-sm">Real laptop</p>
        </div>
        <div className="px-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">Inventory</p>
          <p className="mt-1 text-xs font-bold sm:text-sm">1–22 spots</p>
        </div>
        <div className="px-3 pr-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">Release</p>
          <p className="mt-1 text-xs font-bold sm:text-sm">After proof</p>
        </div>
      </div>
    </div>
  )
}

function StorySection() {
  return (
    <section id="story" className="scroll-mt-20 border-b border-foreground/10 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[.82fr_1.18fr] lg:items-end lg:gap-20">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">The story</p>
            <h2 className="mt-4 text-[clamp(2.5rem,5vw,5rem)] font-black leading-[0.92] tracking-[-0.06em]">
              The laptop is the first chapter.
            </h2>
          </div>
          <div className="max-w-2xl lg:pb-1">
            <p className="text-lg leading-8 text-ink-muted">
              The future is a peer-to-peer marketplace for any physical or digital ad space. This release proves the
              hardest part first: turning one real object into sponsor inventory, running the auction, and completing
              the promise with public proof.
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
            className="group flex min-h-32 items-end justify-between gap-6 rounded-2xl bg-foreground p-6 text-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/25"
          >
            <span>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-background/60">For brands</span>
              <span className="mt-2 block text-2xl font-bold tracking-[-0.04em]">I want a laptop spot</span>
            </span>
            <ArrowDown className="size-6 shrink-0 transition-transform duration-150 group-hover:translate-y-1 motion-reduce:transition-none" aria-hidden="true" />
          </a>
          <Link
            href="/studio"
            className="group flex min-h-32 items-end justify-between gap-6 rounded-2xl border border-foreground/15 bg-surface-soft p-6 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
          >
            <span>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">For surface owners</span>
              <span className="mt-2 block text-2xl font-bold tracking-[-0.04em]">I have a surface to auction</span>
            </span>
            <ArrowRight className="size-6 shrink-0 transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function ProofSection() {
  return (
    <section className="border-t border-foreground/10 bg-surface-soft px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">Under the story</p>
          <h2 className="mt-4 text-[clamp(2.4rem,4.7vw,4.75rem)] font-black leading-[0.92] tracking-[-0.06em]">
            Fast to use.
            <br />
            Public to verify.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-ink-muted">
            The interface tells the human story first. Solana and MagicBlock sit underneath it to make every bid,
            refund, winner, and payout inspectable.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-bold text-background transition-colors duration-150 hover:bg-foreground/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
            >
              Open 22-spot devnet demo <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/activity"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-foreground/15 bg-background px-4 text-sm font-bold transition-colors duration-150 hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
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
              <p className="mt-1 text-sm leading-6 text-ink-muted">Escrow, winner, refunds, and payout stay auditable.</p>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">On-chain settlement</span>
          </div>
          <div className="grid gap-4 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <Sparkles className="size-5" aria-hidden="true" />
            <div>
              <h3 className="font-bold">Proof comes before creator payout</h3>
              <p className="mt-1 text-sm leading-6 text-ink-muted">The winning placement must be delivered and accepted.</p>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">Proof-gated release</span>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-7xl rounded-2xl border border-foreground/15 bg-background px-6 py-8 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">Next chapter</p>
          <p className="mt-2 max-w-2xl text-xl font-bold tracking-[-0.035em]">
            Any person. Any physical or digital surface. One global marketplace.
          </p>
        </div>
        <span className="mt-5 inline-flex rounded-full border border-foreground/15 px-4 py-2 text-xs font-bold sm:mt-0">
          Marketplace coming soon
        </span>
      </div>
    </section>
  )
}

export function DashboardFeature() {
  return (
    <div className="bg-background text-foreground">
      <section className="border-b border-foreground/10 px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="mx-auto max-w-6xl">
          <div className="font-mono flex flex-wrap items-center justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
            <span>ClaimSpot / P2P sponsorship auctions</span>
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
              Live proof of concept · Solana devnet
            </span>
          </div>

          <div className="mt-14">
            <div className="max-w-5xl">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                The first drop · a physical laptop
              </p>
              <h1 className="mt-5 text-[clamp(3.25rem,7vw,5rem)] font-black leading-[0.88] tracking-[-0.07em]">
                A laptop can fund something bigger.
              </h1>
              <p className="mt-8 max-w-3xl text-base leading-7 text-ink-muted sm:text-lg sm:leading-8">
                We turn one real laptop into sponsor spots. Brands choose a placement, bid live in USDC, and receive
                public proof when their artwork is applied. The first story is built for aid; the marketplace comes
                next.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#live"
                  className="inline-flex min-h-12 items-center gap-2 rounded-md bg-foreground px-5 text-sm font-bold text-background transition-colors duration-150 hover:bg-foreground/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
                >
                  Bid on a laptop spot <ArrowDown className="size-4" aria-hidden="true" />
                </a>
                <a
                  href="#story"
                  className="inline-flex min-h-12 items-center gap-2 rounded-md border border-foreground/15 px-5 text-sm font-bold transition-colors duration-150 hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
                >
                  See how the story works <ArrowRight className="size-4" aria-hidden="true" />
                </a>
              </div>
              <p className="mt-5 text-xs leading-5 text-ink-muted">
                Devnet demo only — test USDC has no monetary value and beneficiary routing is not live yet.
              </p>
            </div>
            <div className="mt-14 lg:mt-16">
              <LaptopStoryVisual />
            </div>
          </div>
        </div>
      </section>

      <StorySection />
      <CampaignMarketplace />
      <ProofSection />
    </div>
  )
}
