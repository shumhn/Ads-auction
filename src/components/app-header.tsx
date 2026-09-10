'use client'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import { WalletButton } from '@/components/solana/solana-provider'

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/90 px-4 py-3 text-foreground backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-8">
          <Link className="flex shrink-0 items-center gap-2.5 text-[15px] font-bold tracking-[-0.035em]" href="/">
            <Image
              src="/atrium-logo.jpg"
              alt="Atrium.ads logo"
              width={28}
              height={28}
              className="size-7 rounded-md object-cover shadow-xs ring-1 ring-foreground/15 transition-transform duration-150 hover:scale-105"
            />
            <span className="font-bold tracking-tight text-foreground">Atrium.ads</span>
          </Link>
          <nav className="hidden lg:block" aria-label="Main navigation">
            <ul className="flex items-center gap-1">
              {links.map(({ label, path }) => (
                <li key={path}>
                  <Link
                    className={`rounded-md px-2.5 py-1.5 text-[13px] font-semibold text-ink-muted transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 ${isActive(path) ? 'text-foreground' : ''}`}
                    href={path}
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <span className="ml-2 inline-flex min-h-8 items-center rounded-full border border-foreground/10 bg-foreground/[0.035] px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                  Any-space auctions
                </span>
              </li>
            </ul>
          </nav>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={showMenu ? 'Close navigation' : 'Open navigation'}
          aria-expanded={showMenu}
          onClick={() => setShowMenu(!showMenu)}
        >
          {showMenu ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </Button>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/studio"
            className="rounded-md bg-foreground px-3.5 py-2 text-xs font-bold text-background transition-colors duration-150 hover:bg-foreground/80"
          >
            List a surface
          </Link>
          <WalletButton />
        </div>

        {showMenu && (
          <div className="fixed inset-x-0 bottom-0 top-[61px] bg-background/98 backdrop-blur-sm lg:hidden">
            <div className="flex flex-col gap-6 border-t border-foreground/10 p-5">
              <ul className="flex flex-col gap-2">
                {links.map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      className={`block rounded-md py-2 text-base font-semibold transition-colors duration-150 hover:text-ink-muted ${isActive(path) ? 'text-foreground' : 'text-ink-muted'} `}
                      href={path}
                      onClick={() => setShowMenu(false)}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
                <li className="mt-2 border-t border-foreground/10 pt-4 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
                  Any-space auction marketplace
                </li>
              </ul>
              <div className="flex flex-col gap-4">
                <WalletButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
