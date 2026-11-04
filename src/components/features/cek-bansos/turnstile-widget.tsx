'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'

type Turnstile = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': () => void
      'response-field': boolean
    },
  ) => string
  remove: (id: string) => void
}

export function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
  const isDev = process.env.NODE_ENV !== 'production'
  const container = useRef<HTMLDivElement>(null)
  const verify = useRef(onVerify)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    verify.current = onVerify
  }, [onVerify])

  useEffect(() => {
    if (!ready || !siteKey || !container.current) return
    const api = (window as Window & { turnstile?: Turnstile }).turnstile
    if (!api) return
    const id = api.render(container.current, {
      sitekey: siteKey,
      callback: (token) => {
        setFailed(false)
        verify.current(token)
      },
      'expired-callback': () => verify.current(''),
      'error-callback': () => {
        setFailed(true)
        verify.current('')
      },
      'response-field': false,
    })
    return () => {
      api.remove(id)
    }
  }, [ready, siteKey])

  if (!siteKey) {
    if (!isDev) {
      return (
        <p role="alert" className="mt-3 font-mono text-xs text-red-700">
          Verifikasi CAPTCHA belum dikonfigurasi.
        </p>
      )
    }
    return (
      <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 font-sans text-sm font-medium">
        <input
          type="checkbox"
          className="size-4 border bg-background accent-primary"
          onChange={(event) => onVerify(event.target.checked ? 'demo' : '')}
        />
        Saya bukan robot (mode demo)
      </label>
    )
  }

  return (
    <div className="mt-3">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
        onError={() => {
          setFailed(true)
          verify.current('')
        }}
      />
      <div ref={container} />
      {failed && (
        <p role="alert" className="mt-3 font-mono text-xs text-body-copy">
          Verifikasi CAPTCHA tidak tersedia. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}
    </div>
  )
}
