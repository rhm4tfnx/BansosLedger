import type { Hex } from '@/lib/blockchain/contract'

export type DisbursementRecord = {
  id: string
  identityHash: Hex
  createdBy: string
  idempotencyKey: string
} & (
  | { status: 'PENDING'; cid?: string }
  | { status: 'SUCCESS'; cid: string; txId: Hex; blockNumber: number }
)
// Adapter contract only: no connection or in-memory replacement for MongoDB.
export interface DisbursementRepository {
  createPending(record: Extract<DisbursementRecord, { status: 'PENDING' }>): Promise<DisbursementRecord>
  attachCid(id: string, cid: string): Promise<void>
  confirm(id: string, receipt: { cid: string; txId: Hex; blockNumber: number }): Promise<void>
  findById(id: string): Promise<DisbursementRecord | null>
}
export interface AuditRepository {
  append(event: { actorId: string; action: string; resourceId: string; occurredAt: Date }): Promise<void>
}
