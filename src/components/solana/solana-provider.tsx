'use client'

import {
  WalletNotReadyError,
  WalletSignTransactionError,
  type Adapter,
  type WalletError,
} from '@solana/wallet-adapter-base'
import {
  AnchorWallet,
  ConnectionProvider,
  useConnection,
  useWallet,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import dynamic from 'next/dynamic'
import { ReactNode, useCallback, useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import '@solana/wallet-adapter-react-ui/styles.css'
import { AnchorProvider } from '@anchor-lang/core'
import type { SafeWalletButtonProps } from './safe-wallet-button'

// Installed wallets are discovered through Wallet Standard. ER settlement uses
// a creator-authorized session signer, so the wallet never has to sign an ER
// transaction with its non-standard blockhash directly.
const NO_LEGACY_WALLETS: Adapter[] = []

export const WalletButton = dynamic<SafeWalletButtonProps>(
  async () => (await import('./safe-wallet-button')).SafeWalletButton,
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        disabled
        className="wallet-adapter-button wallet-adapter-button-trigger"
        aria-label="Detecting installed Solana wallets"
      >
        Detecting wallet…
      </button>
    ),
  },
)

export function SolanaProvider({ children }: { children: ReactNode }) {
  const { cluster } = useCluster()
  const endpoint = useMemo(() => cluster.endpoint, [cluster])
  const onError = useCallback((error: WalletError) => {
    if (error instanceof WalletNotReadyError) {
      console.warn('The selected wallet is not ready. Open the wallet selector and choose an installed wallet.')
      return
    }
    if (error instanceof WalletSignTransactionError && /user rejected/i.test(error.message)) {
      // Rejection is a normal cancellation path. The transaction workflow
      // reports it inline; logging it as an uncaught console error makes Next's
      // development overlay incorrectly present it as an application failure.
      return
    }
    console.error(error)
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={NO_LEGACY_WALLETS}
        localStorageKey="atrium-devnet-wallet"
        onError={onError}
        autoConnect={true}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export function useAnchorProvider() {
  const { connection } = useConnection()
  const wallet = useWallet()

  return new AnchorProvider(connection, wallet as AnchorWallet, { commitment: 'confirmed' })
}
