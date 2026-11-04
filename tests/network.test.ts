import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ledgerInterface } from '@/lib/blockchain/abi'
const mocks = vi.hoisted(() => ({ getBlock: vi.fn(), send: vi.fn(), call: vi.fn(), lean: vi.fn() }))
vi.mock('@/lib/db/connection', () => ({ connectDatabase: vi.fn() }))
vi.mock('@/lib/db/models', () => ({ Settings: { findOne: () => ({ lean: mocks.lean }) } }))
vi.mock('@/modules/chain/config', () => ({
  chainConfig: () => ({ address: '0x' + '1'.repeat(40), chainId: 1337, url: 'https://rpc.example.test' }),
  provider: () => mocks,
  readChain: (operation: () => Promise<unknown>) => operation(),
}))
const address = '0x' + '2'.repeat(40)
const saved = [{ address, institution: 'Kelurahan' }]
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-31T00:00:00Z'))
  mocks.getBlock.mockResolvedValue({ number: 100, timestamp: Math.floor(Date.now() / 1000) - 5 })
  mocks.lean.mockResolvedValue({ blockPeriodSeconds: 5, validators: saved })
  mocks.send.mockRejectedValue({ code: -32601, message: 'Method not found' })
  mocks.call.mockImplementation(async ({ data }: { data: string }) => {
    const name = ledgerInterface.parseTransaction({ data })!.name
    return ledgerInterface.encodeFunctionResult(name, [name === 'paused' ? false : address])
  })
})
afterEach(() => vi.useRealTimers())
test.each([[5, 'Normal', true], [15, 'Normal', true], [16, 'Terganggu', false], [120, 'Terganggu', false], [121, 'Berhenti', false]] as const)('block age %s controls network health without QBFT', async (age, status, networkOk) => {
  mocks.getBlock.mockResolvedValue({ number: 100, timestamp: Math.floor(Date.now() / 1000) - age })
  const { networkStatus } = await import('@/modules/chain/network')
  expect(await networkStatus()).toMatchObject({ status, ageSeconds: age, validatorCount: 1, validators: saved })
  const { chainVerifier } = await import('@/modules/chain/verifier')
  expect(await chainVerifier.walletStatus()).toMatchObject({ networkOk, authorizedWallet: address, owner: address, paused: false })
  expect(mocks.send).toHaveBeenCalledTimes(1)
})
test('explorer returns Settings addresses and institutions when QBFT is unavailable', async () => {
  const { validators } = await import('@/modules/explorer/service')
  expect(await (await validators()).json()).toEqual({ data: saved, count: 1 })
})
test.each([null, { validators: [] }])('missing saved validators produce null count, not a network failure', async settings => {
  mocks.lean.mockResolvedValue(settings)
  const { networkStatus } = await import('@/modules/chain/network')
  expect(await networkStatus()).toMatchObject({ status: 'Normal', validatorCount: null, validators: [] })
})
test('valid QBFT response maps institutions from Settings', async () => {
  mocks.send.mockResolvedValue([address, '0x' + '3'.repeat(40)])
  const { networkStatus } = await import('@/modules/chain/network')
  expect(await networkStatus()).toMatchObject({ validatorCount: 2, validators: [...saved, { address: '0x' + '3'.repeat(40), institution: null }] })
})
test('malformed QBFT response falls back to Settings', async () => {
  mocks.send.mockResolvedValue(['not-an-address'])
  const { networkStatus } = await import('@/modules/chain/network')
  expect(await networkStatus()).toMatchObject({ status: 'Normal', validators: saved })
})
