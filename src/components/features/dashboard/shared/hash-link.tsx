'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Copy, ExternalLink } from 'lucide-react'
import s from './states.module.css'

/** Shortened hash with a copy button and an explorer link (PRD 13.2). */
export function HashLink({
  hash,
  short,
  kind = 'tx',
}: {
  hash: string | null
  short: string
  kind?: 'tx' | 'address'
}) {
  const [copied, setCopied] = useState(false)
  if (!hash) return <span>-</span>
  async function copy() {
    try {
      await navigator.clipboard.writeText(hash ?? '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }
  return (
    <span className={s.hash}>
      <span title={hash}>{short}</span>
      <button type="button" onClick={copy} aria-label="Salin hash">
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Tersalin' : ''}
      </span>
      <Link href={`/explorer/${kind}/${hash}`} aria-label="Buka di explorer">
        <ExternalLink size={14} />
      </Link>
    </span>
  )
}

