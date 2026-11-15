const rupiahNumberFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
})

const witaDateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Makassar',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const witaDateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Makassar',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0
  if (safe < 0) {
    return `-Rp ${rupiahNumberFormatter.format(Math.abs(safe))}`
  }
  return `Rp ${rupiahNumberFormatter.format(safe)}`
}

export function formatWitaDateTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const formatted = witaDateTimeFormatter.format(date).replace(/:/g, '.')
  return `${formatted} WITA`
}

export function ensureWitaSuffix(value: string | null | undefined): string {
  if (!value) return '—'
  const trimmed = value.trim()
  if (!trimmed || trimmed === '—' || trimmed === '-') return '—'
  return /\bWITA$/i.test(trimmed) ? trimmed : `${trimmed} WITA`
}

export function formatWitaDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return witaDateFormatter.format(date)
}

export function formatPeriodId(periodId: number | null | undefined): string {
  if (typeof periodId !== 'number' || !Number.isInteger(periodId)) return '—'
  const year = Math.floor(periodId / 100)
  const month = periodId % 100
  if (year < 1000 || year > 9999 || month < 1 || month > 12) return String(periodId)
  return `${MONTH_NAMES_ID[month - 1]} ${year}`
}

export function shortenHash(
  hash: string | null | undefined,
  prefixLength = 6,
  suffixLength = 4,
): string {
  if (!hash) return '—'
  if (hash.length <= prefixLength + suffixLength + 1) return hash
  return `${hash.slice(0, prefixLength)}…${hash.slice(-suffixLength)}`
}

