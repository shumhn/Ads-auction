import type { Metadata } from 'next'
import './globals.css'
import { AppProviders } from '@/components/app-providers'
import { AppLayout } from '@/components/app-layout'
import React from 'react'
import { DM_Mono, Manrope } from 'next/font/google'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'Atrium.ads — The P2P auction marketplace for ad space',
  description:
    'The peer-to-peer auction marketplace for physical and digital placements. List your space; advertisers bid live or buy instantly.',
  openGraph: {
    title: 'Atrium.ads — The P2P auction marketplace for ad space',
    description: 'Auction physical and digital sponsorship placements with live bidding and proof-backed settlement.',
    images: [
      {
        url: '/assets/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Atrium.ads sponsorship auction marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/assets/og-image.png'],
  },
}

const links: { label: string; path: string }[] = [
  { label: 'Auctions', path: '/auctions' },
  { label: 'My auctions', path: '/my-auctions' },
  { label: 'My bids', path: '/my-bids' },
  { label: 'Activity', path: '/activity' },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${manrope.variable} ${dmMono.variable} antialiased`} suppressHydrationWarning>
        <AppProviders>
          <AppLayout links={links}>{children}</AppLayout>
        </AppProviders>
      </body>
    </html>
  )
}
// Patch BigInt so we can log it using JSON.stringify without any errors
declare global {
  interface BigInt {
    toJSON(): string
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString()
}
