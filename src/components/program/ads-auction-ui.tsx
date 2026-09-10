'use client'

import { useAdsAuctionProgram } from './ads-auction-data-access'

export function AdsAuctionProgram() {
  const { getProgramAccount } = useAdsAuctionProgram()

  if (getProgramAccount.isLoading) {
    return <p className="text-sm text-neutral-500">Checking program account…</p>
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }
  return (
    <div className={'space-y-6'}>
      <pre>{JSON.stringify(getProgramAccount.data.value, null, 2)}</pre>
    </div>
  )
}
