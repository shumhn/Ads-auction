'use client'

import { WalletReadyState } from '@solana/wallet-adapter-base'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton, useWalletModal } from '@solana/wallet-adapter-react-ui'
import type { ComponentProps } from 'react'

export type SafeWalletButtonProps = ComponentProps<typeof WalletMultiButton>

export function SafeWalletButton(props: SafeWalletButtonProps) {
  const { select, wallet, wallets } = useWallet()
  const { setVisible } = useWalletModal()
  const walletIsReady =
    !wallet || wallet.readyState === WalletReadyState.Installed || wallet.readyState === WalletReadyState.Loadable

  if (wallets.length === 0) {
    return (
      <button
        type="button"
        className={`wallet-adapter-button wallet-adapter-button-trigger ${props.className ?? ''}`}
        disabled
        style={props.style}
        tabIndex={props.tabIndex}
        aria-label="Detecting installed Solana wallets"
      >
        Detecting wallet…
      </button>
    )
  }

  if (walletIsReady) {
    return <WalletMultiButton {...props} />
  }

  return (
    <button
      type="button"
      className={`wallet-adapter-button wallet-adapter-button-trigger ${props.className ?? ''}`}
      disabled={props.disabled}
      style={props.style}
      tabIndex={props.tabIndex}
      onClick={() => {
        select(null)
        setVisible(true)
      }}
    >
      {props.children ?? 'Select Wallet'}
    </button>
  )
}
