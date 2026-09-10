'use client'

import { useState } from 'react'
import { ImagePlus, Loader2, Map, Radio, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toUsdcAtoms } from '@/lib/claimspot'
import { useClaimSpotProgram } from '@/lib/claimspot-program'

export function CreateAuctionDialog() {
  const { createAuction, wallet } = useClaimSpotProgram()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [reserve, setReserve] = useState('50')
  const [increment, setIncrement] = useState('5')
  const [hours, setHours] = useState('24')
  const [busy, setBusy] = useState(false)

  async function publish(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    if (!wallet.publicKey) return toast.error('Connect a devnet wallet first')
    try {
      setBusy(true)
      const auction = await createAuction(
        title.trim(),
        toUsdcAtoms(Number(reserve)),
        toUsdcAtoms(Number(increment)),
        Math.max(60, Number(hours) * 3600),
      )
      toast.success('Auction published and delegated', {
        description: `${auction.toBase58().slice(0, 8)}… is live on MagicBlock`,
      })
      setOpen(false)
      setTitle('')
    } catch (error) {
      toast.error('Could not publish auction', { description: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 rounded-full bg-black px-5 text-white hover:bg-black/80">Create an auction</Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden border-black/10 p-0 sm:max-w-xl">
        <div className="bg-[#f3ff84] px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-2xl tracking-tight">Turn your object into inventory.</DialogTitle>
            <DialogDescription className="text-black/65">
              Publish real auction terms on Solana, then delegate the live bid loop to MagicBlock.
            </DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={publish} className="space-y-5 px-6 pb-6">
          <div className="space-y-2">
            <Label htmlFor="auction-title">What are you putting up for sponsorship?</Label>
            <Input
              id="auction-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. My travel MacBook — 30 days"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="reserve">Reserve</Label>
              <Input
                id="reserve"
                inputMode="decimal"
                value={reserve}
                onChange={(event) => setReserve(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="increment">Min raise</Label>
              <Input
                id="increment"
                inputMode="decimal"
                value={increment}
                onChange={(event) => setIncrement(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Hours</Label>
              <Input id="hours" inputMode="numeric" value={hours} onChange={(event) => setHours(event.target.value)} />
            </div>
          </div>
          <ol className="grid gap-3 text-sm sm:grid-cols-3">
            {[
              [ImagePlus, '1. Define', 'Hash campaign terms'],
              [Map, '2. Escrow', 'Create USDC vault'],
              [Radio, '3. Go live', 'Delegate bid state'],
            ].map(([Icon, label, detail]) => {
              const StepIcon = Icon as typeof ImagePlus
              return (
                <li key={String(label)} className="rounded-xl border border-black/10 bg-neutral-50 p-3">
                  <StepIcon className="mb-3 size-4" />
                  <p className="font-semibold">{String(label)}</p>
                  <p className="text-neutral-500">{String(detail)}</p>
                </li>
              )
            })}
          </ol>
          <DialogFooter>
            <Button type="submit" disabled={!title.trim() || busy} className="w-full sm:w-auto">
              {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Publish on devnet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
