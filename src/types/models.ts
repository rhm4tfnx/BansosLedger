import type {
  DisbursementStatus,
  EnrollmentStatus,
  EvidenceStatus,
  NetworkStatusType,
  PreflightCheckKey,
  ProgramKind,
  ProgramStatus,
  RecipientStatus,
} from '@/lib/api-contract'
import type { Role } from './rbac'

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SessionViewModel {
  id: string
  name: string
  institution: string
  email: string
  role: Role
  rawRole: string
  mustChangePassword: boolean
  walletVerified: boolean
  boundWalletAddress: string | null
  expiresAt: number
  expiresAtWita: string
}

export interface RecipientEnrollmentSummaryViewModel {
  programCode: string
  status: EnrollmentStatus
  statusLabel: string
}

export interface RecipientViewModel {
  id: string
  nikMasked: string
  name: string
  dusun: string
  rt: string
  rw: string
  regionLabel: string
  addressLabel: string
  phone: string | null
  status: RecipientStatus
  statusLabel: string
  commitment: string | null
  commitmentShort: string
  enrollments: RecipientEnrollmentSummaryViewModel[]
  createdAt: string
  createdAtWita: string
  updatedAt: string
  updatedAtWita: string
  finalizedAt: string | null
  finalizedAtWita: string
}

export interface RecipientHistoryItemViewModel {
  id: string
  refId: string
  programId: string
  periodId: number
  periodLabel: string
  amount: number
  amountFormatted: string
  status: DisbursementStatus
  statusLabel: string
  disbursedDate: string | null
  disbursedDateWita: string
  txHash: string | null
  txHashShort: string
  createdAt: string
  createdAtWita: string
}

export interface RecipientDetailViewModel extends RecipientViewModel {
  history: PaginatedResult<RecipientHistoryItemViewModel>
}

export interface ProgramViewModel {
  id: string
  code: string
  programId: string | null
  programIdShort: string
  name: string
  description: string | null
  fundSource: string
  kind: ProgramKind
  kindLabel: 'Tunai' | 'Barang'
  amountPerRecipient: number
  amountPerRecipientFormatted: string
  totalBudget: number
  totalBudgetFormatted: string
  enrolledCount: number
  registeredCount: number
  disbursedCount: number
  disbursedAmount: number
  disbursedAmountFormatted: string
  remainingBudget: number
  remainingBudgetFormatted: string
  realizationPercent: number
  startPeriod: number
  startPeriodLabel: string
  endPeriod: number
  endPeriodLabel: string
  periodRangeLabel: string
  status: ProgramStatus
  statusLabel: string
  createTxHash: string | null
  createTxHashShort: string
  createBlockNumber: number | null
  isPublic: boolean
  createdAt: string
  createdAtWita: string
  updatedAt: string
  updatedAtWita: string
}

export interface ProgramSummaryMetricsViewModel {
  pagu: number
  paguFormatted: string
  target: number
  realisasiCount: number
  realisasiRupiah: number
  realisasiFormatted: string
  sisa: number
  sisaFormatted: string
  percentage: number
}

export interface ProgramDetailViewModel extends ProgramViewModel {
  summary: ProgramSummaryMetricsViewModel
}

export interface ProgramEnrollmentViewModel {
  id: string
  recipientId: string
  recipientName: string
  recipientNikMasked: string
  status: EnrollmentStatus
  statusLabel: string
}

export interface EvidenceViewModel {
  cid: string
  cidShort: string
  mime: string
  size: number
  sha256: string
  name: string
  access: 'PUBLIC'
  status: EvidenceStatus
  isWithdrawn: boolean
  withdrawnAt: string | null
  withdrawnAtWita: string
  withdrawReason: string | null
}

export interface PublicEvidenceItemViewModel {
  cid: string
  cidShort: string
  mime: string
  size: number
  status: EvidenceStatus
  isWithdrawn: boolean
  gatewayUrl: string | null
}

export interface DisbursementAttemptViewModel {
  at: string
  atWita: string
  txHash: string | null
  txHashShort: string
  outcome: string
  errorCode: string | null
  by: string | null
}

export interface DisbursementChainViewModel {
  txHash: string | null
  txHashShort: string
  blockNumber: number | null
  logIndex: number | null
  blockTimestamp: string | null
  blockTimestampWita: string
  from: string | null
  fromShort: string
  confirmedAt: string | null
  confirmedAtWita: string
}

export interface DisbursementViewModel {
  id: string
  refId: string
  refIdShort: string
  programId: string
  recipientId: string
  programCode: string
  programName: string
  recipientName: string
  recipientNikMasked: string
  periodId: number
  periodLabel: string
  commitment: string | null
  commitmentShort: string
  amount: number
  amountFormatted: string
  disbursedDate: string | null
  disbursedDateLabel: string
  note: string
  status: DisbursementStatus
  statusLabel: string
  evidence: EvidenceViewModel[]
  activeEvidenceCount: number
  chain: DisbursementChainViewModel | null
  attempts: DisbursementAttemptViewModel[]
  lastError: string | null
  lastErrorMessage: string | null
  createdAt: string
  createdAtWita: string
  updatedAt: string
  updatedAtWita: string
}

export interface DisbursementPreflightCheckViewModel {
  key: PreflightCheckKey
  label: string
  ok: boolean
  message: string | null
}

export interface DisbursementPreflightViewModel {
  ok: boolean
  checks: DisbursementPreflightCheckViewModel[]
}

export interface DisbursementTxIntentViewModel {
  to: string
  data: string
  chainId: number
  evidenceCid: string
}

export interface RealizationItemViewModel {
  id: string
  programId: string
  refId: string
  refIdShort: string
  periodId: number
  periodLabel: string
  amount: number
  amountFormatted: string
  disbursedDate: string | null
  disbursedDateLabel: string
  txHash: string | null
  txHashShort: string
  recipientName: string
  recipientNikMasked: string
}

export interface RealizationReportViewModel {
  filters: {
    programId?: string
    period?: number
  }
  summary: ProgramSummaryMetricsViewModel
  items: RealizationItemViewModel[]
  txHashes: string[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ReconciliationAnomalyViewModel {
  refId: string
  refIdShort: string
  txHash: string | null
  txHashShort: string
  code: string
  message: string
}

export interface ReconciliationViewModel {
  dbCount: number
  dbAmount: number
  dbAmountFormatted: string
  chainCount: number
  chainAmount: number
  chainAmountFormatted: string
  isBalanced: boolean
  indexedThrough: number
  missingEvents: ReconciliationAnomalyViewModel[]
  inconsistentEvents: ReconciliationAnomalyViewModel[]
  anomalyPage: number
  limitPerCategory: number
}

export interface AuditLogViewModel {
  id: string
  seq: number
  prevHash: string
  prevHashShort: string
  hash: string
  hashShort: string
  actorId: string
  role: string
  action: string
  entity: string
  entityId: string
  diff: unknown
  ip: string
  userAgent: string
  requestId: string
  at: string
  atWita: string
  hasGap: boolean
}

export interface AuditVerifyViewModel {
  valid: boolean
  failedAt: number | null
  missingSequences: number[]
  invalidSequences: number[]
  gapEntries: number[]
}

export interface NetworkValidatorViewModel {
  address: string
  addressShort: string
  institution: string
}

export interface NetworkStatusViewModel {
  status: NetworkStatusType
  latestBlock: number
  timestamp: number
  timestampWita: string
  ageSeconds: number
  validatorCount: number | null
  validators: NetworkValidatorViewModel[]
}

export interface WalletStatusViewModel {
  authorizedWallet: string | null
  authorizedWalletShort: string
  owner: string | null
  ownerShort: string
  chainId: number | null
  paused: boolean | null
  networkOk: boolean | null
  boundWallet: string | null
  boundWalletShort: string
}

export interface DashboardMonthlyPointViewModel {
  periodId: number
  periodLabel: string
  count: number
  amount: number
  amountFormatted: string
}

export interface DashboardProgramPointViewModel {
  code: string
  name: string
  count: number
  amount: number
  amountFormatted: string
}

export interface DashboardRecentTxViewModel {
  id: string
  refId: string
  refIdShort: string
  programId: string
  periodId: number
  periodLabel: string
  amount: number
  amountFormatted: string
  status: string
  txHash: string | null
  txHashShort: string
  createdAt: string
  createdAtWita: string
}

export interface DashboardSummaryViewModel {
  activePrograms: number
  finalRecipients: number
  pagu: number
  paguFormatted: string
  realisasiCount: number
  realisasiRupiah: number
  realisasiFormatted: string
  percentage: number
  pending: number
  failed: number
  monthly: DashboardMonthlyPointViewModel[]
  byProgram: DashboardProgramPointViewModel[]
  network: NetworkStatusViewModel
  recentTransactions: DashboardRecentTxViewModel[]
}

export interface PublicSummaryViewModel {
  programs: number
  budget: number
  budgetFormatted: string
  transactions: number
  amount: number
  amountFormatted: string
}

export interface PublicProgramViewModel {
  code: string
  name: string
  description: string | null
  kind: string
  kindLabel: string
  fundSource: string
  amountPerRecipient: number
  amountPerRecipientFormatted: string
  totalBudget: number
  totalBudgetFormatted: string
  startPeriod: number
  startPeriodLabel: string
  endPeriod: number
  endPeriodLabel: string
  periodRangeLabel: string
  status: string
  statusLabel: string
}

export interface PublicLedgerItemViewModel {
  txHash: string | null
  txHashShort: string
  periodId: number
  periodLabel: string
  amount: number
  amountFormatted: string
  time: string | null
  timeWita: string
}

export interface PublicProgramDetailViewModel {
  program: PublicProgramViewModel
  ledger: PaginatedResult<PublicLedgerItemViewModel>
}

export interface PublicRecentDisbursementItemViewModel extends PublicLedgerItemViewModel {
  programCode: string
  programName: string
  kindLabel: string
}

export interface PublicRecentDisbursementsViewModel {
  items: PublicRecentDisbursementItemViewModel[]
  totalFetched: number
  isTruncated: boolean
  partialFailureCount: number
  failedPrograms: string[]
}

export interface PublicStatusEntryViewModel {
  programCode: string
  programName: string
  periodId: number
  periodLabel: string
  amount: number
  amountFormatted: string
  status: string
  statusLabel: string
  txHash: string | null
  txHashShort: string
}

export type PublicStatusCheckViewModel =
  | { found: false }
  | {
      found: true
      name: string
      entries: PublicStatusEntryViewModel[]
    }

