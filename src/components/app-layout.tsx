'use client'

import { Toaster } from './ui/sonner'
import { AppHeader } from '@/components/app-header'
import React from 'react'
import { AppFooter } from '@/components/app-footer'

export function AppLayout({
  children,
  links,
}: {
  children: React.ReactNode
  links: { label: string; path: string }[]
}) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-[100] rounded bg-black px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <div className="flex min-h-screen flex-col">
        <AppHeader links={links} />
        <main id="main-content" className="flex-grow">
          {children}
        </main>
        <AppFooter />
      </div>
      <Toaster />
    </>
  )
}
