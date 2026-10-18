'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { animate, inView } from 'framer-motion'

export function ScrollReveal({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = root.current
    if (!container) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let cleanup = () => {}

    function setup() {
      cleanup()
      if (!container || preference.matches) return
      const seen = new Set<HTMLElement>()
      const disposers: (() => void)[] = []
      const selector =
        'main > section > header, main article, main details, main form, main li, main [data-reveal], footer'
      function register() {
        container!.querySelectorAll<HTMLElement>(selector).forEach((element) => {
          if (seen.has(element)) return
          seen.add(element)
          const originalOpacity = element.style.opacity
          const originalTransform = element.style.transform
          element.style.opacity = '0'
          element.style.transform = 'translateY(24px) scale(0.985)'
          let stopAnimation = () => {}
          const stopWatching = inView(
            element,
            () => {
              const siblings = element.parentElement
                ? Array.from(element.parentElement.children)
                : []
              const delay = Math.min(Math.max(siblings.indexOf(element), 0), 3) * 0.06
              const animation = animate(
                element,
                { opacity: 1, transform: 'translateY(0px) scale(1)' },
                {
                  duration: 0.6,
                  delay,
                  ease: [0.22, 1, 0.36, 1],
                  onComplete: () => {
                    element.style.transform = originalTransform
                  },
                },
              )
              stopAnimation = () => animation.stop()
            },
            { amount: 'some', margin: '0px 0px -24px 0px' },
          )
          disposers.push(() => {
            stopWatching()
            stopAnimation()
            element.style.opacity = originalOpacity
            element.style.transform = originalTransform
          })
        })
      }
      register()
      const observer = new MutationObserver(register)
      observer.observe(container, { childList: true, subtree: true })
      cleanup = () => {
        observer.disconnect()
        disposers.forEach((dispose) => dispose())
      }
    }
    setup()
    preference.addEventListener('change', setup)
    return () => {
      cleanup()
      preference.removeEventListener('change', setup)
    }
  }, [])

  return <div ref={root}>{children}</div>
}
