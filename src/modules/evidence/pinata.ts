import 'server-only'
import { z } from 'zod'
import { getEnv } from '@/lib/env'
import { DomainError } from '../domain/http'
export const cidSchema = z.string().regex(/^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,99})$/)
function token() {
  const value = getEnv('PINATA_JWT')
  if (!value) throw new DomainError(503, 'PINATA_NOT_CONFIGURED', 'Penyimpanan bukti belum dikonfigurasi.')
  return value
}
async function pinataFetch(url: string, init: RequestInit) {
  try {
    const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token()}` }, signal: AbortSignal.timeout(30000), cache: 'no-store' })
    if (!response.ok && !(init.method === 'DELETE' && response.status === 404)) throw new DomainError(503, 'PINATA_UNAVAILABLE', 'Layanan penyimpanan bukti tidak tersedia.')
    return response
  } catch (error) { if (error instanceof DomainError) throw error; throw new DomainError(503, 'PINATA_UNAVAILABLE', 'Layanan penyimpanan bukti tidak tersedia.') }
}
export const pinata = {
  async upload(bytes: Uint8Array, name: string, mime: string) {
    const form = new FormData()
    form.set('network', 'public')
    form.set('cid_version', 'v1')
    form.set('name', name)
    form.set('file', new Blob([new Uint8Array(bytes)], { type: mime }), name)
    const response = await pinataFetch('https://uploads.pinata.cloud/v3/files', { method: 'POST', body: form })
    const parsed = z.object({ data: z.object({ id: z.string().min(1).max(200), cid: cidSchema, is_duplicate: z.boolean().optional() }) }).safeParse(await response.json())
    if (!parsed.success) throw new DomainError(503, 'PINATA_INVALID_RESPONSE', 'Respons penyimpanan bukti tidak valid.')
    return { pinataId: parsed.data.data.id, cid: parsed.data.data.cid, duplicate: parsed.data.data.is_duplicate === true }
  },
  async unpin(fileId: string) {
    await pinataFetch(`https://api.pinata.cloud/v3/files/public/${encodeURIComponent(fileId)}`, { method: 'DELETE' })
  },
}
export function gatewayUrl(cid: string) {
  const base = getEnv('PINATA_GATEWAY') ?? 'https://gateway.pinata.cloud'
  const url = new URL(base)
  url.pathname = `${url.pathname.replace(/\/$/, '').replace(/\/ipfs$/, '')}/ipfs/${cidSchema.parse(cid)}`
  url.search = ''; url.hash = ''
  return url.toString()
}
