export interface EvidenceUpload {
  bytes: Uint8Array
  filename: string
  contentType: string
}
// Server-side adapter contract. Never upload raw NIK or other personal data to public IPFS.
export interface PinataStorage {
  uploadEvidence(file: EvidenceUpload): Promise<{ cid: string }>
}
