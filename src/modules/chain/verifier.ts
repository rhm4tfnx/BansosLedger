import 'server-only'
import { ledgerInterface } from '@/lib/blockchain/abi'
import { chainConfig, provider, readChain } from './config'
import { contractRead, networkStatus } from './network'
import type { TransactionReceipt, Log, LogDescription } from 'ethers'
export type Receipt = { txHash: string; blockNumber: number; logIndex: number; blockTimestamp: Date; from: string }
export type ProgramExpectation = { programId: string; amount: number; startPeriod: number; endPeriod: number }
export type DisbursementExpectation = { refId: string; programId: string; periodId: number; commitment: string; amount: number; evidenceCids: string[] }
type Failure = { status: 'NOT_FOUND' } | { status: 'PENDING' } | { status: 'REVERTED' | 'MISMATCH'; errorCode: string; message?: string }
export type ProgramVerification = { status: 'CONFIRMED'; receipt: Receipt; commitments?: string[] } | Failure
export type DisbursementVerification = { status: 'CONFIRMED'; receipt: Receipt } | Failure
export interface ChainVerifier {
  verifyProgram(kind: 'create' | 'register' | 'close', txHash: string, expected: ProgramExpectation): Promise<ProgramVerification>
  verifyDisbursement(txHash: string, expected: DisbursementExpectation): Promise<DisbursementVerification>
  walletStatus(): Promise<{ authorizedWallet: string | null; owner: string | null; chainId: number | null; paused: boolean | null; networkOk: boolean | null }>
}
const same = (a: unknown, b: string) => String(a).toLowerCase() === b.toLowerCase()
const mismatch = (): Failure => ({ status: 'MISMATCH', errorCode: 'MISMATCH', message: 'Data transaksi tidak cocok dengan catatan penyaluran.' })
function events(receipt: TransactionReceipt, name: string) {
  const address = chainConfig().address
  return receipt.logs.flatMap(log => {
    if (!same(log.address, address)) return []
    try { const parsed = ledgerInterface.parseLog(log); return parsed?.name === name ? [{ log, parsed }] : [] } catch { return [] }
  })
}
async function reverted(receipt: TransactionReceipt): Promise<Failure> {
  let errorCode = 'UNKNOWN'
  const rpc = provider(), tx = await readChain(() => rpc.getTransaction(receipt.hash))
  if (tx) {
    try { await readChain(() => rpc.call({ to: tx.to, from: tx.from, data: tx.data, value: tx.value, blockTag: receipt.blockNumber }), 0) }
    catch (error) {
      const data = (error as { data?: string; info?: { error?: { data?: string } } })
      try { errorCode = ledgerInterface.parseError(data.data ?? data.info?.error?.data ?? '0x')?.name ?? 'UNKNOWN' } catch { /* Unknown RPC errors never expose raw provider messages. */ }
    }
  }
  return { status: 'REVERTED', errorCode, message: chainMessage(errorCode) }
}
async function metadata(receipt: TransactionReceipt, log: Log): Promise<Receipt> {
  const block = await readChain(() => provider().getBlock(receipt.blockNumber))
  if (!block || block.hash !== receipt.blockHash) throw new Error('Block unavailable or reorganized')
  return { txHash: receipt.hash.toLowerCase(), blockNumber: receipt.blockNumber, logIndex: log.index, blockTimestamp: new Date(block.timestamp * 1000), from: receipt.from.toLowerCase() }
}
async function load(txHash: string): Promise<TransactionReceipt | Failure> {
  const config = chainConfig(), receipt = await readChain(() => provider().getTransactionReceipt(txHash))
  if (!receipt) return { status: 'NOT_FOUND' }
  if (!same(receipt.to, config.address)) return mismatch()
  if (receipt.status !== 1) return reverted(receipt)
  return receipt
}
export function matchesDisbursement(parsed: LogDescription, expected: DisbursementExpectation, authorizedWallet: string) {
  const a = parsed.args
  // The PRD contract records one CID; additional uploaded files are off-chain attachments.
  return same(a.refId, expected.refId) && same(a.programId, expected.programId) && same(a.recipientCommitment, expected.commitment) && a.periodId === BigInt(expected.periodId) && a.amount === BigInt(expected.amount) && !!expected.evidenceCids[0] && a.evidenceCid === expected.evidenceCids[0] && same(a.recordedBy, authorizedWallet)
}
export async function verifyDisbursement(txHash: string, expected: DisbursementExpectation): Promise<DisbursementVerification> {
  const loaded = await load(txHash)
  if (!('logs' in loaded)) return loaded
  const matches = events(loaded, 'DisbursementRecorded')
  if (matches.length !== 1) return mismatch()
  const authorized = String(await contractRead('authorizedWallet', loaded.blockNumber))
  if (!same(loaded.from, authorized) || !matchesDisbursement(matches[0].parsed, expected, authorized)) return mismatch()
  const receipt = await metadata(loaded, matches[0].log)
  if (Number(matches[0].parsed.args.recordedAt) !== receipt.blockTimestamp.getTime() / 1000) return mismatch()
  return { status: 'CONFIRMED', receipt }
}
export async function verifyProgramTx(kind: 'create' | 'register' | 'close', txHash: string, expected: ProgramExpectation): Promise<ProgramVerification> {
  const loaded = await load(txHash)
  if (!('logs' in loaded)) return loaded
  const name = { create: 'ProgramCreated', register: 'RecipientsRegistered', close: 'ProgramClosed' }[kind]
  const matches = events(loaded, name)
  if (matches.length !== 1 || !same(matches[0].parsed.args.programId, expected.programId)) return mismatch()
  const authorized = String(await contractRead('authorizedWallet', loaded.blockNumber))
  if (!same(loaded.from, authorized)) return mismatch()
  const args = matches[0].parsed.args
  if (kind === 'create' && (args.amountPerRecipient !== BigInt(expected.amount) || args.startPeriod !== BigInt(expected.startPeriod) || args.endPeriod !== BigInt(expected.endPeriod))) return mismatch()
  let commitments: string[] | undefined
  if (kind === 'register') {
    const tx = await readChain(() => provider().getTransaction(txHash))
    let decoded
    try { decoded = tx && ledgerInterface.parseTransaction({ data: tx.data }) } catch { return mismatch() }
    if (!decoded || decoded.name !== 'registerRecipients' || !same(decoded.args.programId, expected.programId)) return mismatch()
    commitments = Array.from(decoded.args.commitments as string[], value => value.toLowerCase())
    if (!commitments.length || commitments.length > 100 || BigInt(commitments.length) !== args.count || new Set(commitments).size !== commitments.length) return mismatch()
  }
  return { status: 'CONFIRMED', receipt: await metadata(loaded, matches[0].log), ...(commitments ? { commitments } : {}) }
}
export const chainVerifier: ChainVerifier = {
  verifyProgram: verifyProgramTx, verifyDisbursement,
  async walletStatus() {
    const { chainId } = chainConfig()
    const [authorizedWallet, owner, paused, network] = await Promise.all([contractRead('authorizedWallet'), contractRead('owner'), contractRead('paused'), networkStatus()])
    return { authorizedWallet: String(authorizedWallet), owner: String(owner), paused: Boolean(paused), chainId, networkOk: network.status === 'Normal' }
  },
}
import { getErrorInfo } from '@/lib/api-contract/errors'
export function chainMessage(code: string) {
  return getErrorInfo(code).message
}
