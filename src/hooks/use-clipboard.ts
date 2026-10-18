'use client'

import { useState } from 'react'

export function useClipboard() {
  const [copied, setCopied] = useState('')

  async function copyText(text: string, success: string, failure: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(success)
    } catch {
      setCopied(failure)
    }
  }

  return { copied, copyText }
}
