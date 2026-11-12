export const STATUS_QUERY_TAG = '__status__' as const

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    session: () => ['auth', 'me', STATUS_QUERY_TAG] as const,
  },
  recipients: {
    all: ['recipients'] as const,
    lists: () => ['recipients', 'list'] as const,
    list: (filters: Record<string, unknown> = {}) => ['recipients', 'list', filters] as const,
    details: () => ['recipients', 'detail'] as const,
    detail: (id: string, historyPage = 1) => ['recipients', 'detail', id, historyPage] as const,
  },
  programs: {
    all: ['programs'] as const,
    lists: () => ['programs', 'list'] as const,
    list: (filters: Record<string, unknown> = {}) => ['programs', 'list', filters] as const,
    details: () => ['programs', 'detail'] as const,
    detail: (id: string) => ['programs', 'detail', id] as const,
    enrollments: (programId: string, filters: Record<string, unknown> = {}) =>
      ['programs', 'enrollments', programId, filters] as const,
  },
  disbursements: {
    all: ['disbursements'] as const,
    lists: () => ['disbursements', 'list'] as const,
    list: (filters: Record<string, unknown> = {}) =>
      ['disbursements', 'list', filters, STATUS_QUERY_TAG] as const,
    details: () => ['disbursements', 'detail'] as const,
    detail: (id: string) => ['disbursements', 'detail', id, STATUS_QUERY_TAG] as const,
    publicEvidence: (id: string) => ['disbursements', 'public-evidence', id] as const,
  },
  reports: {
    all: ['reports'] as const,
    realization: (filters: Record<string, unknown> = {}) =>
      ['reports', 'realization', filters] as const,
    reconciliation: (filters: Record<string, unknown> = {}) =>
      ['reports', 'reconciliation', filters] as const,
  },
  audit: {
    all: ['audit'] as const,
    lists: () => ['audit', 'list'] as const,
    list: (filters: Record<string, unknown> = {}) => ['audit', 'list', filters] as const,
    verify: (from: number, to: number) => ['audit', 'verify', { from, to }] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: () => ['dashboard', 'summary', STATUS_QUERY_TAG] as const,
  },
  chain: {
    all: ['chain'] as const,
    networkStatus: () => ['chain', 'network-status', STATUS_QUERY_TAG] as const,
    walletStatus: () => ['chain', 'wallet-status', STATUS_QUERY_TAG] as const,
  },
  public: {
    all: ['public'] as const,
    summary: () => ['public', 'summary'] as const,
    programs: (filters: Record<string, unknown> = {}) => ['public', 'programs', filters] as const,
    programDetail: (code: string, page = 1, limit = 20) =>
      ['public', 'programs', 'detail', code, { page, limit }] as const,
    recentDisbursements: (codes: readonly string[], perProgramLimit = 20) =>
      ['public', 'recent-disbursements', { codes, perProgramLimit }] as const,
  },
  explorer: {
    all: ['explorer'] as const,
    blocks: (page = 1, limit = 20) => ['explorer', 'blocks', { page, limit }] as const,
    blockDetail: (blockNumber: number | string) =>
      ['explorer', 'block', String(blockNumber)] as const,
    tx: (txHash: string) => ['explorer', 'tx', txHash.toLowerCase()] as const,
    address: (address: string, page = 1, limit = 20) =>
      ['explorer', 'address', address.toLowerCase(), { page, limit }] as const,
    contract: () => ['explorer', 'contract'] as const,
    validators: () => ['explorer', 'validators'] as const,
    search: (q: string) => ['explorer', 'search', q] as const,
  },
} as const

export function isStatusQueryKey(queryKey: readonly unknown[]): boolean {
  return queryKey.includes(STATUS_QUERY_TAG)
}

