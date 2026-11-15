'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ComponentProps, MouseEvent } from 'react'

export interface SmartBackLinkProps extends Omit<ComponentProps<typeof Link>, 'href'> {
  fallbackHref: string
}

function hasSameOriginHistory(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }
  if (window.history.length <= 1 || !document.referrer) {
    return false
  }
  try {
    const referrerUrl = new URL(document.referrer)
    return referrerUrl.origin === window.location.origin
  } catch {
    return false
  }
}

export function SmartBackLink({
  fallbackHref,
  onClick,
  children,
  ...props
}: SmartBackLinkProps) {
  const router = useRouter()

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    if (hasSameOriginHistory()) {
      event.preventDefault()
      router.back()
    }
  }

  return (
    <Link href={fallbackHref} onClick={handleClick} {...props}>
      {children}
    </Link>
  )
}
