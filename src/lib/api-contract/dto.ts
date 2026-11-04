import { z } from 'zod'

export const RECIPIENT_STATUSES = ['DRAFT', 'FINAL'] as const
export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number]

export const PROGRAM_STATUSES = ['DRAFT', 'ACTIVE', 'CLOSED'] as const
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number]

export const PROGRAM_KINDS = ['TUNAI', 'BARANG'] as const
export type ProgramKind = (typeof PROGRAM_KINDS)[number]

export const ENROLLMENT_STATUSES = ['ENROLLED', 'REGISTERED_ONCHAIN'] as const
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export const DISBURSEMENT_STATUSES = ['DRAFT', 'PENDING', 'SUCCESS', 'FAILED'] as const
export type DisbursementStatus = (typeof DISBURSEMENT_STATUSES)[number]

export const EVIDENCE_STATUSES = ['ACTIVE', 'WITHDRAWN'] as const
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number]

export const NETWORK_STATUSES = ['Normal', 'Terganggu', 'Berhenti'] as const
export type NetworkStatusType = (typeof NETWORK_STATUSES)[number]

export const AUTH_ROLES = ['OPERATOR', 'OPERATOR_KELURAHAN', 'KECAMATAN', 'DINAS_SOSIAL'] as const
export type AuthRole = (typeof AUTH_ROLES)[number]

export function listEnvelope<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }).strict()
}

export type ListEnvelope<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// 1. RecipientDto
export const recipientDtoSchema = z.object({
  id: z.string(),
  nikMasked: z.string(),
  name: z.string(),
  address: z.object({
    dusun: z.string(),
    rt: z.string(),
    rw: z.string(),
  }).strict(),
  phone: z.string().nullable(),
  status: z.enum(RECIPIENT_STATUSES),
  commitment: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  finalizedAt: z.string().nullable(),
}).strict()
export type RecipientDto = z.infer<typeof recipientDtoSchema>

// 2. ProgramDto
export const programDtoSchema = z.object({
  id: z.string(),
  code: z.string(),
  programId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  fundSource: z.string(),
  kind: z.enum(PROGRAM_KINDS),
  amountPerRecipient: z.number().int().nonnegative(),
  totalBudget: z.number().int().nonnegative(),
  startPeriod: z.number().int(),
  endPeriod: z.number().int(),
  status: z.enum(PROGRAM_STATUSES),
  chain: z.object({
    createTxHash: z.string().nullable(),
    blockNumber: z.number().nullable(),
  }).strict().nullable(),
  isPublic: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict()
export type ProgramDto = z.infer<typeof programDtoSchema>

// 3. EnrollmentDto
export const enrollmentDtoSchema = z.object({
  id: z.string(),
  programId: z.string(),
  recipientId: z.string(),
  status: z.enum(ENROLLMENT_STATUSES),
  registerTxHash: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict()
export type EnrollmentDto = z.infer<typeof enrollmentDtoSchema>

// 4. EvidenceDto
export const evidenceDtoSchema = z.object({
  cid: z.string(),
  mime: z.string(),
  size: z.number().int().nonnegative(),
  sha256: z.string(),
  name: z.string(),
  access: z.literal('PUBLIC'),
  status: z.enum(EVIDENCE_STATUSES),
  withdrawnAt: z.string().nullable(),
  withdrawReason: z.string().nullable(),
}).strict()
export type EvidenceDto = z.infer<typeof evidenceDtoSchema>

// 5. AttemptDto
export const attemptDtoSchema = z.object({
  at: z.string(),
  txHash: z.string().nullable(),
  outcome: z.string(),
  errorCode: z.string().nullable(),
  by: z.string().nullable(),
}).strict()
export type AttemptDto = z.infer<typeof attemptDtoSchema>

// 6. DisbursementDto
export const disbursementDtoSchema = z.object({
  id: z.string(),
  refId: z.string(),
  programId: z.string(),
  recipientId: z.string(),
  periodId: z.number().int(),
  commitment: z.string().nullable(),
  amount: z.number().int().nonnegative(),
  disbursedDate: z.string().nullable(),
  note: z.string(),
  status: z.enum(DISBURSEMENT_STATUSES),
  evidence: z.array(evidenceDtoSchema),
  chain: z.object({
    txHash: z.string().nullable(),
    blockNumber: z.number().nullable(),
    logIndex: z.number().nullable(),
    blockTimestamp: z.string().nullable(),
    from: z.string().nullable(),
    confirmedAt: z.string().nullable(),
  }).strict().nullable(),
  attempts: z.array(attemptDtoSchema),
  lastError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict()
export type DisbursementDto = z.infer<typeof disbursementDtoSchema>

// 7. AuditLogDto
export const auditLogDtoSchema = z.object({
  id: z.string(),
  seq: z.number().int().positive(),
  prevHash: z.string(),
  hash: z.string(),
  actorId: z.string(),
  role: z.string(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string(),
  diff: z.unknown(),
  ip: z.string(),
  userAgent: z.string(),
  requestId: z.string(),
  at: z.string(),
  note: z.enum(['GAP']).nullable(),
}).strict()
export type AuditLogDto = z.infer<typeof auditLogDtoSchema>

// 8. RealizationReportDto
export const realizationItemDtoSchema = z.object({
  id: z.string(),
  programId: z.string(),
  refId: z.string(),
  periodId: z.number().int(),
  amount: z.number().int().nonnegative(),
  disbursedDate: z.string().nullable(),
  txHash: z.string().nullable(),
  recipient: z.object({
    name: z.string(),
    nikMasked: z.string(),
  }).strict().nullable(),
}).strict()
export type RealizationItemDto = z.infer<typeof realizationItemDtoSchema>

export const realizationReportDtoSchema = z.object({
  filters: z.object({
    programId: z.string().optional(),
    period: z.number().int().optional(),
  }).strict(),
  summary: z.object({
    pagu: z.number().int().nonnegative(),
    target: z.number().int().nonnegative(),
    realisasi: z.object({
      count: z.number().int().nonnegative(),
      rupiah: z.number().int().nonnegative(),
    }).strict(),
    sisa: z.number().int(),
    percentage: z.number(),
  }).strict(),
  data: z.array(realizationItemDtoSchema),
  txHashes: z.array(z.string()),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
}).strict()
export type RealizationReportDto = z.infer<typeof realizationReportDtoSchema>

// 9. ReconciliationDto
export const reconciliationDtoSchema = z.object({
  db: z.object({
    count: z.number().int().nonnegative(),
    amount: z.number().int().nonnegative(),
  }).strict(),
  chain: z.object({
    count: z.number().int().nonnegative(),
    amount: z.number().int().nonnegative(),
  }).strict(),
  indexedThrough: z.number().int(),
  anomalies: z.object({
    missingEvents: z.array(z.object({
      refId: z.string(),
      txHash: z.string().nullable(),
      code: z.string(),
    }).strict()),
    inconsistentEvents: z.array(z.object({
      refId: z.string(),
      txHash: z.string(),
      code: z.string(),
    }).strict()),
    page: z.number().int().positive(),
    limitPerCategory: z.number().int().positive(),
  }).strict(),
}).strict()
export type ReconciliationDto = z.infer<typeof reconciliationDtoSchema>

// 10. NetworkStatusDto
export const networkStatusDtoSchema = z.object({
  status: z.enum(NETWORK_STATUSES),
  latestBlock: z.number().int().nonnegative(),
  timestamp: z.number().int().nonnegative(),
  ageSeconds: z.number().int().nonnegative(),
  validatorCount: z.number().int().nonnegative().nullable(),
  validators: z.array(z.object({
    address: z.string(),
    institution: z.string().nullable(),
  }).strict()).optional(),
}).strict()
export type NetworkStatusDto = z.infer<typeof networkStatusDtoSchema>

// 11. DashboardSummaryDto
export const dashboardSummaryDtoSchema = z.object({
  activePrograms: z.number().int().nonnegative(),
  finalRecipients: z.number().int().nonnegative(),
  pagu: z.number().int().nonnegative(),
  realisasi: z.object({
    count: z.number().int().nonnegative(),
    rupiah: z.number().int().nonnegative(),
  }).strict(),
  percentage: z.number(),
  pending: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  network: networkStatusDtoSchema,
  recentTransactions: z.array(z.object({
    id: z.string(),
    refId: z.string(),
    programId: z.string(),
    periodId: z.number().int(),
    amount: z.number().int().nonnegative(),
    status: z.string(),
    chain: z.unknown().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }).strict()),
}).strict()
export type DashboardSummaryDto = z.infer<typeof dashboardSummaryDtoSchema>

// 12. WalletStatusDto
export const walletStatusDtoSchema = z.object({
  authorizedWallet: z.string().nullable(),
  owner: z.string().nullable(),
  chainId: z.number().int().nullable(),
  paused: z.boolean().nullable(),
  networkOk: z.boolean().nullable(),
  boundWallet: z.string().nullable().optional(),
}).strict()
export type WalletStatusDto = z.infer<typeof walletStatusDtoSchema>

// 13. AuthMeDto
export const authMeDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  institution: z.string(),
  email: z.string(),
  role: z.enum(AUTH_ROLES),
  mustChangePassword: z.boolean(),
  walletVerified: z.boolean(),
  boundWalletAddress: z.string().nullable(),
  expiresAt: z.number().int(),
}).strict()
export type AuthMeDto = z.infer<typeof authMeDtoSchema>

// 14. ProblemDto (RFC 9457)
export const problemDtoSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
}).strict()
export type ProblemDto = z.infer<typeof problemDtoSchema>

// 15. SafeEventDto
export const safeEventDtoSchema = z.object({
  refId: z.string(),
  programId: z.string(),
  period: z.number().int(),
  amount: z.string(),
  commitment: z.string(),
  cid: z.string(),
  gatewayUrl: z.string().nullable(),
  recordedBy: z.string(),
  utc: z.string().nullable(),
  wita: z.string().nullable(),
}).strict()
export type SafeEventDto = z.infer<typeof safeEventDtoSchema>

// 16. ExplorerBlockDto & List
export const explorerBlockDtoSchema = z.object({
  number: z.number().int().nonnegative(),
  hash: z.string(),
  parentHash: z.string(),
  timestamp: z.number().int(),
  proposer: z.string(),
  transactionCount: z.number().int().nonnegative(),
}).strict()
export type ExplorerBlockDto = z.infer<typeof explorerBlockDtoSchema>

export const explorerBlockListDtoSchema = z.object({
  data: z.array(explorerBlockDtoSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
}).strict()
export type ExplorerBlockListDto = z.infer<typeof explorerBlockListDtoSchema>

// 17. ExplorerTxDto
export const explorerTxDtoSchema = z.object({
  txHash: z.string(),
  from: z.string(),
  to: z.string(),
  blockNumber: z.number().int().nonnegative(),
  status: z.enum(['SUCCESS', 'REVERTED']),
  utc: z.string(),
  events: z.array(safeEventDtoSchema),
}).strict()
export type ExplorerTxDto = z.infer<typeof explorerTxDtoSchema>

// 18. ExplorerAddressDto
export const explorerAddressEventDtoSchema = safeEventDtoSchema.extend({
  txHash: z.string(),
}).strict()
export type ExplorerAddressEventDto = z.infer<typeof explorerAddressEventDtoSchema>

export const explorerAddressDtoSchema = z.object({
  address: z.string(),
  data: z.array(explorerAddressEventDtoSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
}).strict()
export type ExplorerAddressDto = z.infer<typeof explorerAddressDtoSchema>

// 19. ExplorerContractDto
export const explorerContractDtoSchema = z.object({
  address: z.string(),
  authorizedWallet: z.string().nullable(),
  owner: z.string().nullable(),
  paused: z.boolean().nullable(),
  chainId: z.number().int().nullable(),
  networkOk: z.boolean().nullable(),
  abi: z.array(z.unknown()),
}).strict()
export type ExplorerContractDto = z.infer<typeof explorerContractDtoSchema>

// 20. ExplorerValidatorsDto
export const explorerValidatorsDtoSchema = z.object({
  data: z.array(z.object({
    address: z.string(),
    institution: z.string().nullable(),
  }).strict()),
  count: z.number().int().nullable(),
}).strict()
export type ExplorerValidatorsDto = z.infer<typeof explorerValidatorsDtoSchema>

// 21. ExplorerSearchDto
export const explorerSearchEventsDtoSchema = z.object({
  data: z.array(explorerAddressEventDtoSchema),
  limit: z.number().int(),
}).strict()
export type ExplorerSearchEventsDto = z.infer<typeof explorerSearchEventsDtoSchema>

export const explorerSearchDtoSchema = z.union([
  explorerBlockDtoSchema,
  explorerAddressDtoSchema,
  explorerTxDtoSchema,
  explorerSearchEventsDtoSchema,
])
export type ExplorerSearchDto = z.infer<typeof explorerSearchDtoSchema>

// 22. PublicSummaryDto
export const publicSummaryDtoSchema = z.object({
  programs: z.number().int().nonnegative(),
  budget: z.number().int().nonnegative(),
  transactions: z.number().int().nonnegative(),
  amount: z.number().int().nonnegative(),
}).strict()
export type PublicSummaryDto = z.infer<typeof publicSummaryDtoSchema>

// 23. PublicProgramDto & Detail
export const publicProgramDtoSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  kind: z.string(),
  fundSource: z.string(),
  amountPerRecipient: z.number().int().nonnegative(),
  totalBudget: z.number().int().nonnegative(),
  startPeriod: z.number().int(),
  endPeriod: z.number().int(),
  status: z.string(),
}).strict()
export type PublicProgramDto = z.infer<typeof publicProgramDtoSchema>

export const publicLedgerItemDtoSchema = z.object({
  txHash: z.string().nullable(),
  period: z.number().int(),
  amount: z.number().int().nonnegative(),
  time: z.string().nullable(),
}).strict()
export type PublicLedgerItemDto = z.infer<typeof publicLedgerItemDtoSchema>

export const publicProgramDetailDtoSchema = z.object({
  program: publicProgramDtoSchema,
  ledger: listEnvelope(publicLedgerItemDtoSchema),
}).strict()
export type PublicProgramDetailDto = z.infer<typeof publicProgramDetailDtoSchema>

// 24. PublicStatusCheckDto
export const statusCheckEntryDtoSchema = z.object({
  program: z.object({
    code: z.string().optional(),
    name: z.string().nullable().optional(),
  }),
  period: z.number().int(),
  status: z.string(),
  txHash: z.string().nullable().optional(),
}).strict()
export type StatusCheckEntryDto = z.infer<typeof statusCheckEntryDtoSchema>

export const publicStatusCheckDtoSchema = z.discriminatedUnion('found', [
  z.object({
    found: z.literal(false),
  }).strict(),
  z.object({
    found: z.literal(true),
    name: z.string(),
    entries: z.array(statusCheckEntryDtoSchema),
  }).strict(),
])
export type PublicStatusCheckDto = z.infer<typeof publicStatusCheckDtoSchema>

// 25. Auth & Action DTOs
export const loginResultDtoSchema = z.object({
  authenticated: z.literal(true),
  userId: z.string(),
  role: z.string(),
  walletVerificationRequired: z.boolean(),
  redirectTo: z.string(),
  mustChangePassword: z.boolean().optional(),
}).strict()
export type LoginResultDto = z.infer<typeof loginResultDtoSchema>

export const logoutResultDtoSchema = z.object({
  loggedOut: z.literal(true),
  redirectTo: z.string(),
}).strict()
export type LogoutResultDto = z.infer<typeof logoutResultDtoSchema>

export const changePasswordResultDtoSchema = z.object({
  changed: z.literal(true),
  mustChangePassword: z.literal(false),
}).strict()
export type ChangePasswordResultDto = z.infer<typeof changePasswordResultDtoSchema>

export const mfaVerifyResultDtoSchema = z.object({
  verified: z.literal(true),
}).strict()
export type MfaVerifyResultDto = z.infer<typeof mfaVerifyResultDtoSchema>

export const walletNonceDtoSchema = z.object({
  message: z.string(),
}).strict()
export type WalletNonceDto = z.infer<typeof walletNonceDtoSchema>

export const walletBindDtoSchema = z.object({
  verified: z.literal(true),
}).strict()
export type WalletBindDto = z.infer<typeof walletBindDtoSchema>

export const cronReconcileDtoSchema = z.union([
  z.object({
    indexed: z.number().int().nonnegative(),
    processed: z.number().int().nonnegative(),
    failures: z.number().int().nonnegative(),
  }).strict(),
  z.object({
    status: z.literal('busy'),
  }).strict(),
])
export type CronReconcileDto = z.infer<typeof cronReconcileDtoSchema>

export const withdrawEvidenceDtoSchema = z.object({
  status: z.literal('WITHDRAWN'),
  message: z.string().optional(),
}).strict()
export type WithdrawEvidenceDto = z.infer<typeof withdrawEvidenceDtoSchema>
