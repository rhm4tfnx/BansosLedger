import { route } from '@/modules/domain/http'
import { detail, update, softDelete } from '@/modules/recipients/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = route('recipient:read', detail)
export const PATCH = route('recipient:update', update, true)
export const DELETE = route('recipient:soft-delete', softDelete, true)
