import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { LiveAuction } from '@/components/claimspot/live-auction'

export const metadata: Metadata = {
  title: '22-spot devnet demo — Atrium.ads',
  description: 'Inspect and test Atrium.ads’s full 22-spot physical MacBook auction on Solana devnet.',
}

export default function DemoPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="border-b border-foreground/10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-bold text-ink-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/20"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to the Atrium.ads story
          </Link>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.65fr] lg:items-end">
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
                Product proof / devnet
              </p>
              <h1 className="mt-4 max-w-4xl text-[clamp(3rem,6vw,6rem)] font-black leading-[0.88] tracking-[-0.07em]">
                The complete 22-spot auction.
              </h1>
            </div>
            <p className="max-w-xl text-base leading-7 text-ink-muted">
              This is the technical proof behind the story: select a mapped MacBook placement, inspect its live account,
              request test USDC, and run the full MagicBlock bidding flow.
            </p>
          </div>
        </div>
      </section>
      <LiveAuction />
    </main>
  )
}
