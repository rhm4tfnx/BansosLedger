import { describe, expect, it } from 'vitest'
import {
  toAuditLogListViewModel,
  toAuditVerifyViewModel,
  toDashboardSummaryViewModel,
  toDisbursementListViewModel,
  toDisbursementPreflightViewModel,
  toDisbursementTxIntentViewModel,
  toExplorerAddressViewModel,
  toExplorerBlockListViewModel,
  toExplorerContractViewModel,
  toExplorerSearchResultViewModel,
  toExplorerTxViewModel,
  toExplorerValidatorsViewModel,
  toNetworkStatusViewModel,
  toProgramDetailViewModel,
  toProgramEnrollmentListViewModel,
  toProgramListViewModel,
  toPublicEvidenceItemViewModel,
  toPublicProgramDetailViewModel,
  toPublicProgramListViewModel,
  toPublicStatusCheckViewModel,
  toPublicSummaryViewModel,
  toRealizationReportViewModel,
  toRecipientDetailViewModel,
  toRecipientListViewModel,
  toReconciliationViewModel,
  toSessionViewModel,
  toWalletStatusViewModel,
} from '@/lib/api/adapters'

describe('API DTO -> ViewModel adapters (all domains)', () => {
  it('adapts AuthMeDto -> SessionViewModel and normalizes OPERATOR to OPERATOR_KELURAHAN', () => {
    const vm = toSessionViewModel({
      id: 'user-1',
      name: 'Operator Kelurahan',
      institution: 'Kelurahan Takkalasi',
      email: 'op@takkalasi.go.id',
      role: 'OPERATOR',
      mustChangePassword: false,
      walletVerified: true,
      boundWalletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      expiresAt: Date.UTC(2026, 10, 4, 12, 0, 0),
    })

    expect(vm.role).toBe('OPERATOR_KELURAHAN')
    expect(vm.rawRole).toBe('OPERATOR')
    expect(vm.expiresAtWita).toContain('WITA')
  })

  it('adapts RecipientDto & RecipientDetailDto without non-PRD mock fields', () => {
    const recipientDto = {
      id: 'rec-1',
      nikMasked: '7311••••••••0001',
      name: 'Baharuddin',
      address: { dusun: 'Takkalasi Utara', rt: '1', rw: '2' },
      phone: '08123456789',
      status: 'FINAL' as const,
      commitment: '0x' + 'a'.repeat(64),
      enrollments: [{ programCode: 'BLT-DD', status: 'REGISTERED_ONCHAIN' as const }],
      createdAt: '2026-10-01T01:30:00.000Z',
      updatedAt: '2026-10-01T02:00:00.000Z',
      finalizedAt: '2026-10-01T02:00:00.000Z',
    }

    const listVm = toRecipientListViewModel({
      data: [recipientDto],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    })

    expect(listVm.items[0]?.regionLabel).toBe('RT 001 / RW 002')
    expect(listVm.items[0]?.commitmentShort).toBe('0xaaaa…aaaa')
    expect('kk' in listVm.items[0]!).toBe(false)
    expect('job' in listVm.items[0]!).toBe(false)
    expect('income' in listVm.items[0]!).toBe(false)
    expect('dependents' in listVm.items[0]!).toBe(false)

    const detailVm = toRecipientDetailViewModel({
      ...recipientDto,
      history: {
        data: [
          {
            id: 'disb-1',
            refId: '0x' + 'b'.repeat(64),
            programId: 'prog-1',
            periodId: 202610,
            amount: 600000,
            status: 'SUCCESS',
            disbursedDate: '2026-10-12T04:00:00.000Z',
            chain: { txHash: '0x' + 'c'.repeat(64) },
            createdAt: '2026-10-12T04:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    })

    expect(detailVm.history.items[0]?.amountFormatted).toBe('Rp 600.000')
    expect(detailVm.history.items[0]?.periodLabel).toBe('Oktober 2026')
    expect(detailVm.history.items[0]?.txHashShort).toBe('0xcccc…cccc')
  })

  it('adapts ProgramDto, ProgramDetailDto, and ProgramEnrollmentItemDto', () => {
    const programDto = {
      id: 'prog-1',
      code: 'BLT-2026',
      programId: '0x' + '1'.repeat(64),
      name: 'BLT Dana Kelurahan',
      description: 'Bantuan tunai triwulan',
      fundSource: 'APBD',
      kind: 'TUNAI' as const,
      amountPerRecipient: 600000,
      totalBudget: 6000000,
      enrolledCount: 10,
      registeredCount: 8,
      disbursedCount: 5,
      disbursedAmount: 3000000,
      remainingBudget: 3000000,
      startPeriod: 202607,
      endPeriod: 202609,
      status: 'ACTIVE' as const,
      chain: { createTxHash: '0x' + '2'.repeat(64), blockNumber: 120 },
      isPublic: true,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-02T00:00:00.000Z',
    }

    const listVm = toProgramListViewModel({
      data: [programDto],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    })
    const item = listVm.items[0]!
    expect(item.amountPerRecipientFormatted).toBe('Rp 600.000')
    expect(item.periodRangeLabel).toBe('Juli 2026 – September 2026')
    expect(item.realizationPercent).toBe(50)
    expect('unit' in item).toBe(false)
    expect('criteria' in item).toBe(false)
    expect('quota' in item).toBe(false)

    const detailVm = toProgramDetailViewModel({
      ...programDto,
      summary: {
        pagu: 6000000,
        target: 10,
        realisasi: { count: 5, rupiah: 3000000 },
        sisa: 3000000,
        percentage: 50,
      },
    })
    expect(detailVm.summary.sisaFormatted).toBe('Rp 3.000.000')

    const enrollmentsVm = toProgramEnrollmentListViewModel({
      data: [
        {
          id: 'enr-1',
          recipient: { id: 'rec-1', name: 'Sitti', nikMasked: '7311••••••••0002' },
          status: 'ENROLLED',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    })
    expect(enrollmentsVm.items[0]?.statusLabel).toBe('Terdaftar di DB')
  })

  it('adapts DisbursementDto, Evidence, Preflight, and TxIntent DTOs', () => {
    const disbList = toDisbursementListViewModel({
      data: [
        {
          id: 'd-1',
          refId: '0x' + '9'.repeat(64),
          programId: 'p-1',
          recipientId: 'r-1',
          program: { id: 'p-1', code: 'PKH', name: 'PKH 2026' },
          recipient: { id: 'r-1', name: 'Aminah', nikMasked: '7311••••••••0009' },
          periodId: 202611,
          commitment: '0x' + '8'.repeat(64),
          amount: 750000,
          disbursedDate: '2026-11-02T03:00:00.000Z',
          note: 'Tahap 4',
          status: 'FAILED',
          evidence: [
            {
              cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
              mime: 'image/jpeg',
              size: 12000,
              sha256: 'a'.repeat(64),
              name: 'evidence-1.jpg',
              access: 'PUBLIC',
              status: 'ACTIVE',
              withdrawnAt: null,
              withdrawReason: null,
            },
          ],
          chain: {
            txHash: '0x' + '7'.repeat(64),
            blockNumber: 88,
            logIndex: 0,
            blockTimestamp: '2026-11-02T03:01:00.000Z',
            from: '0x' + '6'.repeat(40),
            confirmedAt: null,
          },
          attempts: [
            {
              at: '2026-11-02T03:01:00.000Z',
              txHash: '0x' + '7'.repeat(64),
              outcome: 'REVERTED',
              errorCode: 'AlreadyDisbursed',
              by: 'u-1',
            },
          ],
          lastError: 'AlreadyDisbursed',
          createdAt: '2026-11-02T03:00:00.000Z',
          updatedAt: '2026-11-02T03:01:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    })

    expect(disbList.items[0]?.amountFormatted).toBe('Rp 750.000')
    expect(disbList.items[0]?.activeEvidenceCount).toBe(1)
    expect(disbList.items[0]?.lastErrorMessage).toBe(
      'Penerima ini sudah menerima bantuan untuk program dan periode yang sama.',
    )

    const pubEv = toPublicEvidenceItemViewModel({
      cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      mime: 'application/pdf',
      size: 5000,
      status: 'WITHDRAWN',
      gatewayUrl: null,
    })
    expect(pubEv.isWithdrawn).toBe(true)

    const preflightVm = toDisbursementPreflightViewModel({
      ok: false,
      checks: [
        { key: 'program_active', label: 'Program aktif', ok: true },
        { key: 'period_in_range', label: 'Periode', ok: true },
        { key: 'recipient_registered', label: 'Terdaftar', ok: true },
        { key: 'no_duplicate', label: 'Duplikasi', ok: false, message: 'Sudah menerima' },
        { key: 'amount_matches_program', label: 'Nominal', ok: true },
        { key: 'recipient_final_commitment', label: 'FINAL', ok: true },
        { key: 'authorized_wallet', label: 'Wallet', ok: true },
      ],
    })
    expect(preflightVm.ok).toBe(false)
    expect(preflightVm.checks[3]?.message).toBe('Sudah menerima')

    const intentVm = toDisbursementTxIntentViewModel({
      to: '0x' + '3'.repeat(40),
      data: '0xdeadbeef',
      chainId: 1337,
      evidenceCid: 'bafy123',
    })
    expect(intentVm.chainId).toBe(1337)
  })

  it('adapts Reports, Audit, Chain, and Dashboard DTOs', () => {
    const realizationVm = toRealizationReportViewModel({
      filters: { period: 202610 },
      summary: {
        pagu: 10000000,
        target: 10,
        realisasi: { count: 2, rupiah: 1200000 },
        sisa: 8800000,
        percentage: 12,
      },
      data: [
        {
          id: 'd-1',
          programId: 'p-1',
          refId: '0x' + 'a'.repeat(64),
          periodId: 202610,
          amount: 600000,
          disbursedDate: '2026-10-15T00:00:00.000Z',
          txHash: '0x' + 'b'.repeat(64),
          recipient: { name: 'Rusdi', nikMasked: '7311••••••••0004' },
        },
      ],
      txHashes: ['0x' + 'b'.repeat(64)],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    })
    expect(realizationVm.items[0]?.amountFormatted).toBe('Rp 600.000')

    const reconciliationVm = toReconciliationViewModel({
      db: { count: 5, amount: 3000000 },
      chain: { count: 4, amount: 2400000 },
      indexedThrough: 999,
      anomalies: {
        missingEvents: [
          { refId: '0x' + 'f'.repeat(64), txHash: null, code: 'DB_SUCCESS_WITHOUT_EVENT' },
        ],
        inconsistentEvents: [],
        page: 1,
        limitPerCategory: 20,
      },
    })
    expect(reconciliationVm.isBalanced).toBe(false)
    expect(reconciliationVm.missingEvents[0]?.message).toBe(
      'Data sukses di database tanpa rekaman transaksi on-chain.',
    )

    const auditListVm = toAuditLogListViewModel({
      data: [
        {
          id: 'aud-1',
          seq: 1,
          prevHash: '0'.repeat(64),
          hash: 'a'.repeat(64),
          actorId: 'u-1',
          role: 'OPERATOR',
          action: 'RECIPIENT_CREATED',
          entity: 'recipients',
          entityId: 'r-1',
          diff: null,
          ip: '127.0.0.1',
          userAgent: 'Vitest',
          requestId: 'req-1',
          at: '2026-10-15T01:00:00.000Z',
          note: 'GAP',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    })
    expect(auditListVm.items[0]?.hasGap).toBe(true)

    const verifyVm = toAuditVerifyViewModel({
      valid: true,
      missingSequences: [],
      invalidSequences: [],
      gapEntries: [],
    })
    expect(verifyVm.valid).toBe(true)
    expect(verifyVm.failedAt).toBeNull()

    const walletStatusVm = toWalletStatusViewModel({
      authorizedWallet: '0x' + '1'.repeat(40),
      owner: '0x' + '2'.repeat(40),
      chainId: 1337,
      paused: false,
      networkOk: true,
      boundWallet: '0x' + '1'.repeat(40),
    })
    expect(walletStatusVm.authorizedWalletShort).toBe('0x1111…1111')

    const netVm = toNetworkStatusViewModel({
      status: 'Normal',
      latestBlock: 500,
      timestamp: 1762240000,
      ageSeconds: 2,
      validatorCount: 4,
      validators: [{ address: '0x' + '4'.repeat(40), institution: null }],
    })
    expect(netVm.validators[0]?.institution).toBe('Validator Konsorsium')

    const dashboardVm = toDashboardSummaryViewModel({
      activePrograms: 3,
      finalRecipients: 120,
      pagu: 90000000,
      realisasi: { count: 80, rupiah: 48000000 },
      percentage: 53.33,
      pending: 2,
      failed: 1,
      monthly: [{ periodId: 202610, count: 80, amount: 48000000 }],
      byProgram: [{ code: 'BLT', name: 'BLT Kelurahan', count: 80, amount: 48000000 }],
      network: {
        status: 'Normal',
        latestBlock: 500,
        timestamp: 1762240000,
        ageSeconds: 2,
        validatorCount: 4,
      },
      recentTransactions: [
        {
          id: 't-1',
          refId: '0x' + 'd'.repeat(64),
          programId: 'p-1',
          periodId: 202610,
          amount: 600000,
          status: 'SUCCESS',
          chain: { txHash: '0x' + 'e'.repeat(64) },
          createdAt: '2026-10-15T01:00:00.000Z',
          updatedAt: '2026-10-15T01:00:00.000Z',
        },
      ],
    })
    expect(dashboardVm.paguFormatted).toBe('Rp 90.000.000')
    expect(dashboardVm.recentTransactions[0]?.txHashShort).toBe('0xeeee…eeee')
  })

  it('adapts Public and Explorer DTOs across all search union branches', () => {
    const pubSummary = toPublicSummaryViewModel({
      programs: 2,
      budget: 50000000,
      transactions: 40,
      amount: 24000000,
    })
    expect(pubSummary.amountFormatted).toBe('Rp 24.000.000')

    const pubProgramDto = {
      code: 'BLT',
      name: 'Bantuan Langsung Tunai',
      description: null,
      kind: 'TUNAI',
      fundSource: 'APBD',
      amountPerRecipient: 600000,
      totalBudget: 12000000,
      startPeriod: 202610,
      endPeriod: 202610,
      status: 'ACTIVE',
    }
    const pubList = toPublicProgramListViewModel({
      data: [pubProgramDto],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    })
    expect(pubList.items[0]?.periodRangeLabel).toBe('Oktober 2026')

    const pubDetail = toPublicProgramDetailViewModel({
      program: pubProgramDto,
      ledger: {
        data: [
          {
            txHash: '0x' + 'a'.repeat(64),
            period: 202610,
            amount: 600000,
            time: '2026-10-20T05:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    })
    expect(pubDetail.ledger.items[0]?.amountFormatted).toBe('Rp 600.000')

    expect(toPublicStatusCheckViewModel({ found: false })).toEqual({ found: false })
    const foundStatus = toPublicStatusCheckViewModel({
      found: true,
      name: 'B*** Dg. T***',
      entries: [
        {
          program: { code: 'BLT', name: 'BLT Kelurahan' },
          period: 202610,
          status: 'SUCCESS',
          txHash: '0x' + 'b'.repeat(64),
        },
      ],
    })
    expect(foundStatus.found).toBe(true)
    if (foundStatus.found) {
      expect(foundStatus.entries[0]?.statusLabel).toBe('Tersalurkan (Tercatat On-Chain)')
    }

    const blockDto = {
      number: 42,
      hash: '0x' + '1'.repeat(64),
      parentHash: '0x' + '0'.repeat(64),
      timestamp: 1762240000,
      proposer: '0x' + '9'.repeat(40),
      transactionCount: 3,
    }
    const blocksVm = toExplorerBlockListViewModel({
      data: [blockDto],
      page: 1,
      limit: 20,
      total: 42,
    })
    expect(blocksVm.totalPages).toBe(3)

    const txDto = {
      txHash: '0x' + '2'.repeat(64),
      from: '0x' + '3'.repeat(40),
      to: '0x' + '4'.repeat(40),
      blockNumber: 42,
      status: 'SUCCESS' as const,
      utc: '2026-10-20T05:00:00.000Z',
      events: [
        {
          refId: '0x' + '5'.repeat(64),
          programId: '0x' + '6'.repeat(64),
          period: 202610,
          amount: '600000',
          commitment: '0x' + '7'.repeat(64),
          cid: 'bafy123',
          gatewayUrl: 'https://ipfs.io/ipfs/bafy123',
          recordedBy: '0x' + '3'.repeat(40),
          utc: '2026-10-20T05:00:00.000Z',
          wita: null,
        },
      ],
    }
    expect(toExplorerTxViewModel(txDto).events[0]?.amountFormatted).toBe('Rp 600.000')

    const addrDto = {
      address: '0x' + '3'.repeat(40),
      data: [{ ...txDto.events[0]!, txHash: txDto.txHash }],
      total: 1,
      page: 1,
      limit: 20,
    }
    expect(toExplorerAddressViewModel(addrDto).totalPages).toBe(1)

    const contractVm = toExplorerContractViewModel({
      address: '0x' + '4'.repeat(40),
      authorizedWallet: '0x' + '3'.repeat(40),
      owner: '0x' + '8'.repeat(40),
      paused: false,
      chainId: 1337,
      networkOk: true,
      abi: ['function recordDisbursement()'],
    })
    expect(contractVm.chainId).toBe(1337)

    const validatorsVm = toExplorerValidatorsViewModel({
      data: [{ address: '0x' + '9'.repeat(40), institution: 'Kelurahan Takkalasi' }],
      count: 1,
    })
    expect(validatorsVm.items[0]?.institution).toBe('Kelurahan Takkalasi')
    expect('uptime' in validatorsVm.items[0]!).toBe(false)
    expect('reputation' in validatorsVm.items[0]!).toBe(false)
    expect(validatorsVm.count).toBe(1)
    expect(toExplorerValidatorsViewModel({ data: [], count: null }).count).toBeNull()

    expect(toExplorerSearchResultViewModel(blockDto).kind).toBe('block')
    expect(toExplorerSearchResultViewModel(txDto).kind).toBe('tx')
    expect(toExplorerSearchResultViewModel(addrDto).kind).toBe('address')
    expect(
      toExplorerSearchResultViewModel({
        data: addrDto.data,
        limit: 20,
      }).kind,
    ).toBe('events')
  })
})

