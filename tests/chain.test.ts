import { beforeEach, expect, test, vi } from 'vitest'
import { ledgerInterface } from '@/lib/blockchain/abi'
import { verifyDisbursement, verifyProgramTx, chainMessage } from '@/modules/chain/verifier'
import { readChain, chainDeadline } from '@/modules/chain/config'
const rpc = vi.hoisted(() => ({ getTransactionReceipt: vi.fn(), getBlock: vi.fn(), getTransaction: vi.fn(), call: vi.fn() }))
const contractRead = vi.hoisted(() => vi.fn())
vi.mock('@/modules/chain/config', async importOriginal => ({ ...await importOriginal<typeof import('@/modules/chain/config')>(), provider: () => rpc, chainConfig: () => ({ address: '0x' + '1'.repeat(40), chainId: 1337, url: 'https://rpc.example.test' }) }))
vi.mock('@/modules/chain/network', () => ({ contractRead, networkStatus: vi.fn() }))
const contract = '0x' + '1'.repeat(40), wallet = '0x' + '2'.repeat(40), txHash = '0x' + 'a'.repeat(64), blockHash = '0x' + 'b'.repeat(64)
const expected = { refId: '0x' + 'c'.repeat(64), programId: '0x' + 'd'.repeat(64), periodId: 202601, commitment: '0x' + 'e'.repeat(64), amount: 300000, evidenceCids: ['bafy' + 'a'.repeat(50)] }
function log(name: string, values: unknown[], address = contract) { return { ...ledgerInterface.encodeEventLog(ledgerInterface.getEvent(name)!, values), address, index: 0 } }
function disbursementLog(overrides: Record<string, unknown> = {}) {
  const data = { ...expected, recordedBy: wallet, recordedAt: 1000, evidenceCid: expected.evidenceCids[0], ...overrides }
  return log('DisbursementRecorded', [data.refId, data.programId, data.commitment, data.periodId, data.amount, data.evidenceCid, data.recordedBy, data.recordedAt])
}
function receipt(logs = [disbursementLog()], overrides: Record<string, unknown> = {}) { return { hash: txHash, from: wallet, to: contract, status: 1, logs, blockNumber: 10, blockHash, ...overrides } }
beforeEach(() => { vi.resetAllMocks(); rpc.getTransactionReceipt.mockResolvedValue(receipt()); rpc.getBlock.mockResolvedValue({ timestamp: 1000, hash: blockHash }); contractRead.mockResolvedValue(wallet) })
test('verifies exactly one matching contract event and historical authorized wallet', async () => {
  const result = await verifyDisbursement(txHash, expected)
  expect(result.status).toBe('CONFIRMED'); expect(contractRead).toHaveBeenCalledWith('authorizedWallet', 10)
  if (result.status === 'CONFIRMED') expect(result.receipt).toMatchObject({ txHash, logIndex: 0, blockNumber: 10, blockTimestamp: new Date(1000000), from: wallet })
})
test('missing receipt is NOT_FOUND', async () => { rpc.getTransactionReceipt.mockResolvedValue(null); expect(await verifyDisbursement(txHash, expected)).toEqual({ status: 'NOT_FOUND' }) })
test.each([
  { refId: '0x' + 'f'.repeat(64) }, { programId: '0x' + 'f'.repeat(64) }, { commitment: '0x' + 'f'.repeat(64) },
  { amount: 1 }, { periodId: 202602 }, { evidenceCid: 'bafy' + 'b'.repeat(50) }, { recordedBy: contract }, { recordedAt: 1001 },
])('rejects mismatching event field %j', async overrides => { rpc.getTransactionReceipt.mockResolvedValue(receipt([disbursementLog(overrides)])); expect(await verifyDisbursement(txHash, expected)).toMatchObject({ status: 'MISMATCH' }) })
test.each(['wrong-contract', 'foreign-log', 'duplicate-event', 'wrong-sender', 'missing-event'] as const)('rejects %s', async mode => {
  const logs = mode === 'missing-event' ? [] : mode === 'duplicate-event' ? [disbursementLog(), disbursementLog()] : mode === 'foreign-log' ? [{ ...disbursementLog(), address: wallet }] : [disbursementLog()]
  rpc.getTransactionReceipt.mockResolvedValue(receipt(logs, mode === 'wrong-contract' ? { to: wallet } : mode === 'wrong-sender' ? { from: contract } : {}))
  expect(await verifyDisbursement(txHash, expected)).toMatchObject({ status: 'MISMATCH' })
})
test('reverted receipt replays eth_call at the receipt block and parses Indonesian error', async () => {
  rpc.getTransactionReceipt.mockResolvedValue(receipt([], { status: 0 }))
  rpc.getTransaction.mockResolvedValue({ to: contract, from: wallet, data: '0x1234', value: BigInt(0) })
  rpc.call.mockRejectedValue({ data: ledgerInterface.encodeErrorResult('AlreadyDisbursed') })
  expect(await verifyDisbursement(txHash, expected)).toMatchObject({ status: 'REVERTED', errorCode: 'AlreadyDisbursed', message: chainMessage('AlreadyDisbursed') })
  expect(rpc.call).toHaveBeenCalledTimes(1); expect(rpc.call).toHaveBeenCalledWith(expect.objectContaining({ blockTag: 10 }))
})
test.each(['create', 'close', 'register'] as const)('verifies program %s event and calldata', async kind => {
  const wanted = { programId: expected.programId, amount: expected.amount, startPeriod: 202601, endPeriod: 202602 }
  const name = kind === 'create' ? 'ProgramCreated' : kind === 'close' ? 'ProgramClosed' : 'RecipientsRegistered'
  const args = kind === 'create' ? [wanted.programId, wanted.amount, wanted.startPeriod, wanted.endPeriod] : kind === 'close' ? [wanted.programId] : [wanted.programId, 1]
  rpc.getTransactionReceipt.mockResolvedValue(receipt([log(name, args)]))
  rpc.getTransaction.mockResolvedValue({ data: ledgerInterface.encodeFunctionData('registerRecipients', [wanted.programId, [expected.commitment]]) })
  const result = await verifyProgramTx(kind, txHash, wanted); expect(result.status).toBe('CONFIRMED')
  if (result.status === 'CONFIRMED' && kind === 'register') expect(result.commitments).toEqual([expected.commitment])
})
test('reads retry no more than twice, do not retry contract reverts, and enforce cron deadline', async () => {
  const transient = vi.fn().mockRejectedValue(new Error('transport failed'))
  await expect(readChain(transient, 100)).rejects.toThrow(); expect(transient).toHaveBeenCalledTimes(3)
  const reverted = vi.fn().mockRejectedValue({ code: 'CALL_EXCEPTION' })
  await expect(readChain(reverted)).rejects.toMatchObject({ code: 'CALL_EXCEPTION' }); expect(reverted).toHaveBeenCalledTimes(1)
  const expired = vi.fn()
  await expect(chainDeadline.run(Date.now() - 1, () => readChain(expired))).rejects.toMatchObject({ code: 'DEADLINE_EXCEEDED' }); expect(expired).not.toHaveBeenCalled()
})
