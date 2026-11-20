import { WALLET_USER_REJECTED_MESSAGE } from './store'

export const WALLET_RPC_UNAVAILABLE_MESSAGE =
  'Koneksi ke jaringan blockchain (RPC Besu) sedang tidak tersedia. Periksa koneksi jaringan atau coba beberapa saat lagi.'

export const WALLET_PENDING_REQUEST_MESSAGE =
  'Permintaan MetaMask masih menunggu persetujuan. Buka ekstensi MetaMask Anda.'

export const WALLET_UNRECOGNIZED_CHAIN_MESSAGE =
  'Jaringan Hyperledger Besu belum terdaftar di MetaMask.'

function extractNestedErrorCode(err: unknown): number | string | null {
  if (typeof err !== 'object' || err === null) return null
  const record = err as Record<string, unknown>

  if (typeof record.code === 'number' || typeof record.code === 'string') {
    if (
      record.code === 4001 ||
      record.code === 4902 ||
      record.code === -32603 ||
      record.code === -32002 ||
      record.code === 'ACTION_REJECTED' ||
      record.code === 'NETWORK_ERROR' ||
      record.code === 'SERVER_ERROR' ||
      record.code === 'TIMEOUT'
    ) {
      return record.code
    }
  }

  if (typeof record.info === 'object' && record.info !== null) {
    const info = record.info as Record<string, unknown>
    if (typeof info.error === 'object' && info.error !== null) {
      const inner = info.error as Record<string, unknown>
      if (typeof inner.code === 'number' || typeof inner.code === 'string') {
        return inner.code
      }
    }
  }

  if (typeof record.data === 'object' && record.data !== null) {
    const data = record.data as Record<string, unknown>
    if (typeof data.originalError === 'object' && data.originalError !== null) {
      const orig = data.originalError as Record<string, unknown>
      if (typeof orig.code === 'number' || typeof orig.code === 'string') {
        return orig.code
      }
    }
  }

  if (typeof record.code === 'number' || typeof record.code === 'string') {
    return record.code
  }

  return null
}

function collectErrorText(err: unknown): string {
  if (typeof err === 'string') return err
  if (typeof err !== 'object' || err === null) return ''
  const record = err as Record<string, unknown>
  const parts: string[] = []
  if (typeof record.shortMessage === 'string') parts.push(record.shortMessage)
  if (typeof record.message === 'string') parts.push(record.message)
  if (typeof record.reason === 'string') parts.push(record.reason)
  if (typeof record.info === 'object' && record.info !== null) {
    const info = record.info as Record<string, unknown>
    if (typeof info.error === 'object' && info.error !== null) {
      const inner = info.error as Record<string, unknown>
      if (typeof inner.message === 'string') parts.push(inner.message)
    }
  }
  return parts.join(' ')
}

function looksLikeRawProviderError(text: string): boolean {
  return (
    /could not coalesce error/i.test(text) ||
    /payload=/i.test(text) ||
    /code=\w+/i.test(text) ||
    /version=6\./i.test(text) ||
    /json-?rpc/i.test(text) ||
    /\{\s*"code"\s*:/i.test(text)
  )
}

export function formatWalletError(
  err: unknown,
  fallback = 'Terjadi kesalahan saat berkomunikasi dengan wallet MetaMask.',
): string {
  const code = extractNestedErrorCode(err)
  const text = collectErrorText(err)

  if (
    code === 4001 ||
    code === '4001' ||
    code === 'ACTION_REJECTED' ||
    /user rejected|user denied|rejected the request/i.test(text)
  ) {
    return WALLET_USER_REJECTED_MESSAGE
  }

  if (
    code === -32603 ||
    code === '-32603' ||
    code === 'NETWORK_ERROR' ||
    code === 'SERVER_ERROR' ||
    code === 'TIMEOUT' ||
    /rpc endpoint not found or unavailable|could not coalesce error|failed to fetch|network_error|missing response|econnrefused|etimedout|timeout|bad gateway|service unavailable|502|503|504/i.test(
      text,
    )
  ) {
    return WALLET_RPC_UNAVAILABLE_MESSAGE
  }

  if (code === -32002 || code === '-32002' || /already pending/i.test(text)) {
    return WALLET_PENDING_REQUEST_MESSAGE
  }

  if (code === 4902 || code === '4902' || /unrecognized chain/i.test(text)) {
    return WALLET_UNRECOGNIZED_CHAIN_MESSAGE
  }

  if (err instanceof Error && err.message.trim() && !looksLikeRawProviderError(err.message)) {
    return err.message.trim()
  }

  return fallback
}
