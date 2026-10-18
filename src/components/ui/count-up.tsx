'use client'

import { useEffect, useRef } from 'react'
import { animate, inView } from 'framer-motion'

const formatter = new Intl.NumberFormat('id-ID')

export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const formatted = formatter.format(value)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let stopAnimation = () => {}
    let stopWatching = () => {}
    let completed = false

    function setup() {
      stopWatching()
      stopAnimation()
      if (!element) return
      if (preference.matches || completed) {
        element.textContent = formatted
        completed = true
        return
      }
      element.textContent = '0'
      stopWatching = inView(
        element,
        () => {
          const controls = animate(0, value, {
            duration: 2.5,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (current) => {
              element.textContent = formatter.format(Math.round(current))
            },
            onComplete: () => {
              element.textContent = formatted
              completed = true
            },
          })
          stopAnimation = () => controls.stop()
        },
        { amount: 0.5 },
      )
    }

    setup()
    preference.addEventListener('change', setup)
    return () => {
      stopWatching()
      stopAnimation()
      preference.removeEventListener('change', setup)
    }
  }, [value, formatted])

  return (
    <>
      <span className="sr-only">{formatted}</span>
      <span
        ref={ref}
        aria-hidden="true"
        className="inline-block tabular-nums"
        style={{ minWidth: `${formatted.length}ch` }}
      >
        {formatted}
      </span>
    </>
  )
}
