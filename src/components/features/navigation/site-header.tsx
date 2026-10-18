'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Menu, X } from 'lucide-react'

const linkVisibility = ['min-[769px]:flex', 'min-[769px]:flex', 'min-[1025px]:flex']
const overflowVisibility = ['min-[769px]:hidden', 'min-[769px]:hidden', '']

const links = [
  { label: 'Home', href: '/' },
  { label: 'Transparansi', href: '/transparansi' },
  { label: 'Cek Bansos', href: '/cek-bansos' },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const close = () => setOpen(false)

  return (
    <header
      className="sticky top-0 z-40 border-b bg-background"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          close()
          toggle.current?.focus()
        }
      }}
    >
      <div className="flex min-h-16 items-stretch min-[641px]:min-h-18 min-[1025px]:min-h-20">
        <Link
          href="/"
          onClick={close}
          aria-label="BansosLedger — Beranda"
          className="flex shrink-0 items-center gap-2 px-4 text-lg font-bold tracking-tight min-[769px]:border-r min-[1025px]:px-6"
        >
          <span
            className="relative block w-36 overflow-hidden mix-blend-multiply min-[1025px]:w-40"
            style={{ aspectRatio: '1590 / 325' }}
          >
            <img
              src="/images/bansosledger-logo.png"
              alt="BansosLedger"
              width={2145}
              height={733}
              fetchPriority="high"
              className="absolute h-auto max-w-none"
              style={{ width: '134.91%', left: '-17.61%', top: '-58.46%' }}
            />
          </span>
        </Link>
        <nav
          aria-label="Navigasi utama"
          className="ml-auto hidden min-w-0 min-[641px]:flex min-[769px]:flex-1"
        >
          {links.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              aria-current={pathname === link.href ? 'page' : undefined}
              className={`hidden items-center whitespace-nowrap border-r px-4 text-sm font-medium transition-colors aria-[current=page]:bg-secondary aria-[current=page]:text-primary hover:bg-secondary focus-visible:-outline-offset-4 min-[1025px]:px-5 xl:px-7 xl:text-base ${linkVisibility[i]} ${i === links.length - 1 ? 'flex-1' : 'xl:min-w-36'}`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/explorer"
            onClick={close}
            className="ml-auto flex shrink-0 items-center gap-3 whitespace-nowrap bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:-outline-offset-4 min-[1025px]:ml-0 min-[1025px]:gap-4 min-[1025px]:px-6 xl:text-base"
          >
            Explorer
            <ArrowUpRight size={18} />
          </Link>
        </nav>
        <button
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          onClick={() => setOpen(!open)}
          className="ml-auto flex w-16 shrink-0 items-center justify-center border-l text-primary transition-colors hover:bg-secondary focus-visible:-outline-offset-4 min-[641px]:ml-0 min-[1025px]:hidden"
        >
          {open ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>
      <nav
        id="mobile-navigation"
        aria-label="Navigasi seluler"
        hidden={!open}
        className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t min-[641px]:max-h-[calc(100dvh-4.5rem)] min-[1025px]:hidden"
      >
        {links.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={close}
            aria-current={pathname === link.href ? 'page' : undefined}
            className={`flex min-h-12 items-center justify-between border-b px-5 text-sm font-medium hover:bg-secondary ${overflowVisibility[i]}`}
          >
            {link.label}
            <ArrowUpRight size={15} className="text-muted-foreground" />
          </Link>
        ))}
        <Link
          href="/explorer"
          onClick={close}
          className="flex min-h-14 items-center justify-between bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover min-[641px]:hidden"
        >
          Explorer
          <ArrowUpRight size={18} />
        </Link>
      </nav>
    </header>
  )
}
