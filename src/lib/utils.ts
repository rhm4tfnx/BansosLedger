import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { periodIdFromYYYYMM } from '@/lib/blockchain/chain-keys'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPeriod(yyyymm: number): string {
  periodIdFromYYYYMM(yyyymm)
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(Math.floor(yyyymm / 100), yyyymm % 100 - 1, 1)))
}

export function formatPeriodRange(start: number, end: number): string {
  const first = formatPeriod(start)
  const last = formatPeriod(end)
  if (start > end) throw new Error('Rentang periode tidak valid')
  if (start === end) return first
  return Math.floor(start / 100) === Math.floor(end / 100) ? `${first.replace(/ \d{4}$/, '')} – ${last}` : `${first} – ${last}`
}

export function formatHexAddress(value: string) {
  return `${value.slice(0, 10)}…${value.slice(-6)}`
}
