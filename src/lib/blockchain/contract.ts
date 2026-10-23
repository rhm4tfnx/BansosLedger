export type Hex = `0x${string}`
export interface DisbursementCommitment {
  id: string
  identityHash: Hex
  cid: string
}
export interface ConfirmedTransaction {
  txId: Hex
  blockNumber: number
  status: 'SUCCESS'
}
export interface DisbursementContract {
  isAuthorizedWallet(address: Hex): Promise<boolean>
  // Implementation must validate chain + authorized signer and await a successful receipt.
  submit(commitment: DisbursementCommitment): Promise<ConfirmedTransaction>
  verify(id: string): Promise<DisbursementCommitment | null>
}
