import { describe, expect, test } from 'vitest'
import { toRecipientDto } from '@/modules/recipients/dto'
import { toProgramDto, toEnrollmentDto } from '@/modules/programs/dto'
import { toDisbursementDto, toEvidenceDto, toAttemptDto, toWithdrawEvidenceDto } from '@/modules/disbursements/dto'
import { toAuditLogDto } from '@/modules/audit/dto'
import { toRealizationReportDto, toDashboardSummaryDto, toWalletStatusDto } from '@/modules/reports/dto'
import { toReconciliationDto, toNetworkStatusDto } from '@/modules/chain/dto'
import { toAuthMeDto } from '@/modules/auth/dto'
import {
  toExplorerBlockDto,
  toExplorerBlockListDto,
  toExplorerTxDto,
  toExplorerAddressDto,
  toExplorerContractDto,
  toExplorerValidatorsDto,
} from '@/modules/explorer/dto'
import {
  toPublicSummaryDto,
  toPublicProgramDto,
  toPublicProgramDetailDto,
  toPublicStatusCheckDto,
} from '@/modules/public/dto'
import {
  recipientDtoSchema,
  programDtoSchema,
  enrollmentDtoSchema,
  disbursementDtoSchema,
  evidenceDtoSchema,
  attemptDtoSchema,
  auditLogDtoSchema,
  realizationReportDtoSchema,
  dashboardSummaryDtoSchema,
  walletStatusDtoSchema,
  networkStatusDtoSchema,
  reconciliationDtoSchema,
  authMeDtoSchema,
} from '@/lib/api-contract/dto'

const FORBIDDEN_KEYS = [
  '_id',
  '__v',
  'schemaVersion',
  'tokenHash',
  'passwordHash',
  'nikEnc',
  'nikBlindIndex',
  'evidenceLease',
  'reconcileLease',
  'pinataId',
  'idempotencyKey',
  'requestHash',
  'secretEnc',
  'recoveryHashes',
  'lastUsedStep',
  'lastSiweNonceUsed',
] as const

function assertNoForbiddenKeys(obj: unknown, path = ''): void {
  if (!obj || typeof obj !== 'object') return
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => assertNoForbiddenKeys(item, `${path}[${index}]`))
    return
  }
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    for (const forbidden of FORBIDDEN_KEYS) {
      expect(key, `Forbidden key "${forbidden}" found at path: ${path ? path + '.' : ''}${key}`).not.toBe(forbidden)
    }
    assertNoForbiddenKeys((obj as Record<string, unknown>)[key], path ? `${path}.${key}` : key)
  }
}

describe('DTO Mappers - Security & Structure', () => {
  const dirtyFields = {
    _id: '507f1f77bcf86cd799439011',
    __v: 0,
    schemaVersion: 1,
    tokenHash: 'secret-token-hash-value',
    passwordHash: 'secret-argon2-hash-value',
    nikEnc: { iv: 'iv', tag: 'tag', ct: 'ct', keyVersion: 'v1' },
    nikBlindIndex: 'blind-index-value',
    evidenceLease: { token: 'lease-token', expiresAt: new Date() },
    reconcileLease: { token: 'rec-token', expiresAt: new Date() },
    pinataId: 'pinata-storage-id',
    idempotencyKey: 'idem-key-sha256',
    requestHash: 'req-hash-sha256',
    secretEnc: { iv: 'iv', tag: 'tag', ct: 'ct', keyVersion: 'v1' },
    recoveryHashes: ['hash1'],
    lastUsedStep: 12345,
    lastSiweNonceUsed: 'nonce-1234',
  }

  test('toRecipientDto never leaks internal keys and parses valid DTO', () => {
    const raw = {
      ...dirtyFields,
      nikMasked: '7305••••••••1234',
      name: 'Penerima Uji',
      address: { dusun: 'Dusun I', rt: '01', rw: '02' },
      phone: '08123456789',
      status: 'FINAL',
      commitment: '0x' + '1'.repeat(64),
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
      finalizedAt: new Date('2026-01-03T00:00:00Z'),
    }

    const dto = toRecipientDto(raw)
    assertNoForbiddenKeys(dto)
    expect(dto.id).toBe('507f1f77bcf86cd799439011')
    expect(recipientDtoSchema.parse(dto)).toEqual(dto)
  })

  test('toProgramDto never leaks internal keys and formats integers/dates', () => {
    const raw = {
      ...dirtyFields,
      code: 'PRG-01',
      programId: '0x' + '2'.repeat(64),
      name: 'Program BLT',
      description: 'Bantuan Langsung',
      fundSource: 'APBD',
      kind: 'TUNAI',
      amountPerRecipient: 300000,
      totalBudget: 30000000,
      startPeriod: 202601,
      endPeriod: 202612,
      status: 'ACTIVE',
      chain: { createTxHash: '0x' + '3'.repeat(64), blockNumber: 100 },
      isPublic: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    }

    const dto = toProgramDto(raw)
    assertNoForbiddenKeys(dto)
    expect(dto.id).toBe('507f1f77bcf86cd799439011')
    expect(programDtoSchema.parse(dto)).toEqual(dto)
  })

  test('toEnrollmentDto never leaks internal keys', () => {
    const raw = {
      ...dirtyFields,
      programId: '507f1f77bcf86cd799439012',
      recipientId: '507f1f77bcf86cd799439013',
      status: 'ENROLLED',
      registerTxHash: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    }

    const dto = toEnrollmentDto(raw)
    assertNoForbiddenKeys(dto)
    expect(dto.id).toBe('507f1f77bcf86cd799439011')
    expect(enrollmentDtoSchema.parse(dto)).toEqual(dto)
  })

  test('toDisbursementDto never leaks internal keys in root, evidence, attempts, or chain', () => {
    const raw = {
      ...dirtyFields,
      refId: '0x' + '4'.repeat(64),
      programId: '507f1f77bcf86cd799439012',
      recipientId: '507f1f77bcf86cd799439013',
      periodId: 202601,
      commitment: '0x' + '5'.repeat(64),
      amount: 300000,
      disbursedDate: new Date('2026-01-15T00:00:00Z'),
      note: 'Penyaluran tahap 1',
      status: 'SUCCESS',
      evidence: [
        {
          ...dirtyFields,
          cid: 'Qm' + 'a'.repeat(44),
          mime: 'application/pdf',
          size: 1024,
          sha256: 'sha256-hash',
          name: 'bukti.pdf',
          access: 'PUBLIC',
          status: 'ACTIVE',
          withdrawnAt: null,
          withdrawReason: null,
        },
      ],
      chain: {
        ...dirtyFields,
        txHash: '0x' + '6'.repeat(64),
        blockNumber: 150,
        logIndex: 0,
        blockTimestamp: new Date('2026-01-15T01:00:00Z'),
        from: '0x' + '7'.repeat(40),
        confirmedAt: new Date('2026-01-15T01:05:00Z'),
      },
      attempts: [
        {
          ...dirtyFields,
          at: new Date('2026-01-15T00:50:00Z'),
          txHash: '0x' + '6'.repeat(64),
          outcome: 'CONFIRMED',
          errorCode: null,
          by: '507f1f77bcf86cd799439099',
        },
      ],
      lastError: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    }

    const dto = toDisbursementDto(raw)
    assertNoForbiddenKeys(dto)
    expect(dto.id).toBe('507f1f77bcf86cd799439011')
    expect(disbursementDtoSchema.parse(dto)).toEqual(dto)
  })

  test('toEvidenceDto and toAttemptDto never leak internal keys', () => {
    const rawEv = {
      ...dirtyFields,
      cid: 'Qm' + 'b'.repeat(44),
      mime: 'image/jpeg',
      size: 2048,
      sha256: 'hash',
      name: 'foto.jpg',
      access: 'PUBLIC',
      status: 'ACTIVE',
      withdrawnAt: null,
      withdrawReason: null,
    }
    const evDto = toEvidenceDto(rawEv)
    assertNoForbiddenKeys(evDto)
    expect(evidenceDtoSchema.parse(evDto)).toEqual(evDto)

    const rawAtt = {
      ...dirtyFields,
      at: new Date(),
      txHash: '0x' + '8'.repeat(64),
      outcome: 'RETRY',
      errorCode: 'AlreadyDisbursed',
      by: 'user-1',
    }
    const attDto = toAttemptDto(rawAtt)
    assertNoForbiddenKeys(attDto)
    expect(attemptDtoSchema.parse(attDto)).toEqual(attDto)
  })

  test('toAuditLogDto never leaks internal keys and preserves seq/hashes', () => {
    const raw = {
      ...dirtyFields,
      seq: 1,
      prevHash: '0'.repeat(64),
      hash: 'a'.repeat(64),
      actorId: 'user-1',
      role: 'OPERATOR',
      action: 'LOGIN',
      entity: 'users',
      entityId: 'user-1',
      diff: { some: 'diff' },
      ip: '127.0.0.1',
      userAgent: 'Mozilla',
      requestId: 'req-uuid',
      at: new Date('2026-01-01T00:00:00Z'),
      note: null,
    }

    const dto = toAuditLogDto(raw)
    assertNoForbiddenKeys(dto)
    expect(dto.id).toBe('507f1f77bcf86cd799439011')
    expect(auditLogDtoSchema.parse(dto)).toEqual(dto)
  })

  test('toRealizationReportDto never leaks internal keys and calculates totalPages', () => {
    const raw = {
      ...dirtyFields,
      filters: { programId: '507f1f77bcf86cd799439012', period: 202601 },
      summary: {
        ...dirtyFields,
        pagu: 1000000,
        target: 10,
        realisasi: { ...dirtyFields, count: 5, rupiah: 500000 },
        sisa: 500000,
        percentage: 50,
      },
      data: [
        {
          ...dirtyFields,
          programId: '507f1f77bcf86cd799439012',
          refId: '0x' + '9'.repeat(64),
          periodId: 202601,
          amount: 100000,
          disbursedDate: new Date('2026-01-15T00:00:00Z'),
          txHash: '0x' + 'a'.repeat(64),
          recipient: { ...dirtyFields, name: 'Ali', nikMasked: '7305••••••••1234' },
        },
      ],
      txHashes: ['0x' + 'a'.repeat(64)],
      total: 1,
      page: 1,
      limit: 20,
    }

    const dto = toRealizationReportDto(raw)
    assertNoForbiddenKeys(dto)
    expect(dto.totalPages).toBe(1)
    expect(realizationReportDtoSchema.parse(dto)).toEqual(dto)
  })

  test('toDashboardSummaryDto never leaks internal keys', () => {
    const raw = {
      ...dirtyFields,
      activePrograms: 2,
      finalRecipients: 50,
      pagu: 5000000,
      realisasi: { ...dirtyFields, count: 10, rupiah: 1000000 },
      percentage: 20,
      pending: 1,
      failed: 0,
      network: {
        ...dirtyFields,
        status: 'Normal',
        latestBlock: 500,
        timestamp: 1700000000,
        ageSeconds: 5,
        validatorCount: 1,
        validators: [{ ...dirtyFields, address: '0x' + 'b'.repeat(40), institution: 'Dinas' }],
      },
      recentTransactions: [
        {
          ...dirtyFields,
          refId: '0x' + 'c'.repeat(64),
          programId: '507f1f77bcf86cd799439012',
          periodId: 202601,
          amount: 100000,
          status: 'SUCCESS',
          chain: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
        },
      ],
    }

    const dto = toDashboardSummaryDto(raw)
    assertNoForbiddenKeys(dto)
    expect(dashboardSummaryDtoSchema.parse(dto)).toEqual(dto)
  })

  test('toWalletStatusDto never leaks internal keys', () => {
    const raw = {
      ...dirtyFields,
      authorizedWallet: '0x' + 'd'.repeat(40),
      owner: '0x' + 'e'.repeat(40),
      chainId: 1337,
      paused: false,
      networkOk: true,
      boundWallet: '0x' + 'f'.repeat(40),
    }

    const dto = toWalletStatusDto(raw)
    assertNoForbiddenKeys(dto)
    expect(walletStatusDtoSchema.parse(dto)).toEqual(dto)
  })

  test('toNetworkStatusDto never leaks internal keys', () => {
    const raw = {
      ...dirtyFields,
      status: 'Normal',
      latestBlock: 100,
      timestamp: 1700000000,
      ageSeconds: 3,
      validatorCount: 2,
      validators: [{ ...dirtyFields, address: '0x' + '1'.repeat(40), institution: 'Kelurahan' }],
    }

    const dto = toNetworkStatusDto(raw)
    assertNoForbiddenKeys(dto)
    expect(networkStatusDtoSchema.parse(dto)).toEqual(dto)
  })

  test('toReconciliationDto never leaks internal keys and rounds integer rupiah', () => {
    const raw = {
      ...dirtyFields,
      db: { ...dirtyFields, count: 10, amount: '3000000' },
      chain: { ...dirtyFields, count: 10, amount: '3000000' },
      indexedThrough: 200,
      anomalies: {
        ...dirtyFields,
        missingEvents: [{ ...dirtyFields, refId: '0x' + '1'.repeat(64), txHash: null, code: 'DB_SUCCESS_WITHOUT_EVENT' }],
        inconsistentEvents: [{ ...dirtyFields, refId: '0x' + '2'.repeat(64), txHash: '0x' + '3'.repeat(64), code: 'MISMATCH' }],
        page: 1,
        limitPerCategory: 20,
      },
    }

    const dto = toReconciliationDto(raw)
    assertNoForbiddenKeys(dto)
    expect(reconciliationDtoSchema.parse(dto)).toEqual(dto)
    expect(dto.db.amount).toBe(3000000)
    expect(typeof dto.db.amount).toBe('number')
  })

  test('toAuthMeDto returns exactly AuthMeDto fields without passwordHash or internal tokenHash', () => {
    const rawUser = {
      ...dirtyFields,
      name: 'Budi Santoso',
      institution: 'Kelurahan Takkalasi',
      email: 'budi@kelurahan.test',
      role: 'OPERATOR',
      mustChangePassword: false,
    }
    const rawSession = {
      ...dirtyFields,
      userId: '507f1f77bcf86cd799439011',
      role: 'OPERATOR_KELURAHAN',
      walletVerified: true,
      boundWalletAddress: '0x' + '4'.repeat(40),
      expiresAt: Date.now() + 3600000,
    }

    const dto = toAuthMeDto(rawUser, rawSession)
    assertNoForbiddenKeys(dto)
    expect(dto.id).toBe('507f1f77bcf86cd799439011')
    expect(dto.name).toBe('Budi Santoso')
    expect(dto.institution).toBe('Kelurahan Takkalasi')
    expect(dto.email).toBe('budi@kelurahan.test')
    expect(dto.role).toBe('OPERATOR')
    expect(dto.mustChangePassword).toBe(false)
    expect(dto.walletVerified).toBe(true)
    expect(dto.boundWalletAddress).toBe('0x' + '4'.repeat(40))
    expect(typeof dto.expiresAt).toBe('number')
    expect(authMeDtoSchema.parse(dto)).toEqual(dto)
  })

  test('Explorer and Public DTO mappers exclude all forbidden internal and private keys', () => {
    // Explorer block
    const blockDto = toExplorerBlockDto({
      ...dirtyFields,
      number: 10,
      hash: '0x' + 'b'.repeat(64),
      parentHash: '0x' + 'c'.repeat(64),
      timestamp: 1700000000,
      proposer: '0x' + '1'.repeat(40),
      transactionCount: 2,
    })
    assertNoForbiddenKeys(blockDto)
    expect(blockDto.number).toBe(10)

    // Explorer tx
    const txDto = toExplorerTxDto({
      ...dirtyFields,
      txHash: '0x' + 'a'.repeat(64),
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      blockNumber: 10,
      status: 'SUCCESS',
      utc: new Date().toISOString(),
      events: [{
        ...dirtyFields,
        refId: '0x' + '1'.repeat(64),
        programId: '0x' + '2'.repeat(64),
        period: 202601,
        amount: '300000',
        commitment: '0x' + '3'.repeat(64),
        cid: 'bafy' + 'a'.repeat(50),
        recordedBy: '0x' + '1'.repeat(40),
      }],
    })
    assertNoForbiddenKeys(txDto)
    expect(txDto.status).toBe('SUCCESS')

    // Explorer address
    const addrDto = toExplorerAddressDto({
      ...dirtyFields,
      address: '0x' + '1'.repeat(40),
      data: [{
        ...dirtyFields,
        txHash: '0x' + 'a'.repeat(64),
        refId: '0x' + '1'.repeat(64),
        programId: '0x' + '2'.repeat(64),
        period: 202601,
        amount: '300000',
        commitment: '0x' + '3'.repeat(64),
        cid: 'bafy' + 'a'.repeat(50),
        recordedBy: '0x' + '1'.repeat(40),
      }],
      total: 1,
      page: 1,
      limit: 20,
    })
    assertNoForbiddenKeys(addrDto)

    // Public summary
    const pubSum = toPublicSummaryDto({
      ...dirtyFields,
      programs: 3,
      budget: 10000000,
      transactions: 20,
      amount: 6000000,
    })
    assertNoForbiddenKeys(pubSum)
    expect(pubSum.programs).toBe(3)

    // Public program detail
    const pubProg = toPublicProgramDetailDto({
      ...dirtyFields,
      program: {
        ...dirtyFields,
        code: 'PKH-2026',
        name: 'Program PKH',
        kind: 'TUNAI',
        fundSource: 'APBD',
        amountPerRecipient: 300000,
        totalBudget: 3000000,
        startPeriod: 202601,
        endPeriod: 202612,
        status: 'ACTIVE',
      },
      ledger: {
        ...dirtyFields,
        data: [{
          ...dirtyFields,
          txHash: '0x' + 'a'.repeat(64),
          period: 202601,
          amount: 300000,
          time: new Date().toISOString(),
        }],
        total: 1,
        page: 1,
        limit: 20,
      },
    })
    assertNoForbiddenKeys(pubProg)

    // Public status-check
    const statusDto = toPublicStatusCheckDto({
      ...dirtyFields,
      found: true,
      name: 'Penerima Contoh',
      entries: [{
        ...dirtyFields,
        program: { code: 'PKH-2026', name: 'Program PKH' },
        period: 202601,
        status: 'SUDAH_DISALURKAN',
        txHash: '0x' + 'a'.repeat(64),
      }],
    })
    assertNoForbiddenKeys(statusDto)
    expect(statusDto.found).toBe(true)

    // Withdraw evidence
    const withdrawDto = toWithdrawEvidenceDto({
      ...dirtyFields,
      status: 'WITHDRAWN',
      message: 'Penarikan sukses',
    })
    assertNoForbiddenKeys(withdrawDto)
    expect(withdrawDto.status).toBe('WITHDRAWN')
  })
})

