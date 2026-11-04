import { route, publicRoute } from '@/modules/domain/http'
import { upload, publicEvidence } from '@/modules/evidence/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = route('evidence:upload', upload, true)
export const GET = publicRoute(publicEvidence)
