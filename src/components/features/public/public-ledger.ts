import 'server-only'
import { initialRows } from '@/mocks/disbursement-data'
import { initialRecipients } from '@/mocks/recipient-data'
import { transactions } from '@/mocks/explorer-data'

export const publicLedger = initialRows.filter(row => row.status === 'SUCCESS' && /^0x[0-9a-f]{64}$/i.test(row.hash ?? '')).map(row => ({
  ...transactions[0],
  id: row.block || transactions[0].id,
  hash: row.hash!,
  address: row.wallet,
  method: 'recordDisbursement',
  program: row.program,
  refId: row.id,
  periodId: row.periodId,
  amount: row.amount,
  timestamp: new Date(row.date).toISOString(),
  commitment: initialRecipients.find(r => r.id === row.recipient)?.identityHash || `0x${'0'.repeat(64)}`,
  cid: row.cid,
  evidenceWithdrawn: !!row.evidenceWithdrawn,
}))
