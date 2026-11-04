import { initialRows } from '@/mocks/disbursement-data'

export type Enrollment = { programCode: string; recipientId: string; status: 'ENROLLED' | 'REGISTERED_ONCHAIN' }
export const initialEnrollments: Enrollment[] = initialRows.filter(row => row.status === 'SUCCESS').reduce<Enrollment[]>((rows, row) => {
  if (!rows.some(item => item.programCode === row.program && item.recipientId === row.recipient)) rows.push({ programCode: row.program, recipientId: row.recipient, status: 'REGISTERED_ONCHAIN' })
  return rows
}, [])
