'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { WalletButton } from '../solana/solana-provider'
import { useAdsAuctionProgram } from './ads-auction-data-access'
import { AdsAuctionProgram } from './ads-auction-ui'
import { AppHero } from '../app-hero'
import { ellipsify } from '@/lib/utils'

export default function AdsAuctionFeature() {
  const { publicKey } = useWallet()
  const { programId } = useAdsAuctionProgram()

  return publicKey ? (
    <div>
      <AppHero
        title="Atrium.ads auction program"
        subtitle="Inspect the generated Anchor program account on the selected cluster."
      >
        <p className="mb-6">
          <ExplorerLink path={`account/${programId}`} label={ellipsify(programId.toString())} />
        </p>
      </AppHero>
      <AdsAuctionProgram />
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton className="btn btn-primary" />
        </div>
      </div>
    </div>
  )
}
