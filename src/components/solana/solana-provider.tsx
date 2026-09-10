'use client'

import { WalletAdapterNetwork, type Adapter, type WalletError } from '@solana/wallet-adapter-base'
import {
  AnchorWallet,
  ConnectionProvider,
  useConnection,
  useWallet,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import dynamic from 'next/dynamic'
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import '@solana/wallet-adapter-react-ui/styles.css'
import { AnchorProvider } from '@anchor-lang/core'

export const WalletButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, {
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
})

export function SolanaProvider({ children }: { children: ReactNode }) {
  const { cluster } = useCluster()
  const endpoint = useMemo(() => cluster.endpoint, [cluster])
  const [fallbackWallets, setFallbackWallets] = useState<Adapter[]>([])

  useEffect(() => {
    let cancelled = false

    // Phantom and Solflare normally register through Wallet Standard before
    // React hydrates. Keep their legacy adapters as a delayed fallback without
    // putting both wallet SDKs on the initial page-loading path.
    const timer = window.setTimeout(() => {
      void Promise.all([import('@solana/wallet-adapter-phantom'), import('@solana/wallet-adapter-solflare')]).then(
        ([{ PhantomWalletAdapter }, { SolflareWalletAdapter }]) => {
          if (!cancelled) {
            setFallbackWallets([
              new PhantomWalletAdapter(),
              new SolflareWalletAdapter({ network: WalletAdapterNetwork.Devnet }),
            ])
          }
        },
      )
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])
  const onError = useCallback((error: WalletError) => {
    console.error(error)
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={fallbackWallets} onError={onError} autoConnect={true}>
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
