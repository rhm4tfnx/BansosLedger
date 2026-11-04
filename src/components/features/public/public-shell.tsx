import Link from 'next/link'
import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/features/navigation/site-header'

export function PublicShell({ title, children }: { title: string; children: ReactNode }) {
  return <><a href="#main" className="sr-only focus:not-sr-only">Lewati ke konten</a><SiteHeader /><main id="main" data-transparency className="mx-auto flex max-w-7xl flex-col gap-12 px-5 py-10 sm:px-8 sm:py-12"><header><Link href="/transparansi" className="text-sm text-primary underline">Kembali ke ringkasan publik</Link><h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{title}</h1><p className="mt-4 text-sm text-body-copy">Data ilustrasi, bukan pembacaan jaringan live. Tanpa identitas penerima.</p></header>{children}</main></>
}
export const publicPanel = 'min-w-0 rounded-control border bg-white p-5 sm:p-6'
