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
})

export const metadata: Metadata = {
  title: 'ClaimSpot — P2P sponsorship auctions for impact',
  description:
    'Turn a real physical surface into sponsor spots, run live USDC auctions, and release payout after public proof.',
}

const links: { label: string; path: string }[] = [
  { label: 'Live drops', path: '/#live' },
  { label: 'The story', path: '/#story' },
  { label: 'Create a drop', path: '/studio' },
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
