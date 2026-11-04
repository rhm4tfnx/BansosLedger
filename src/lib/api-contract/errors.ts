export interface ErrorCatalogEntry {
  status: number
  message: string
}

export const ERROR_CATALOG = {
  // Domain / HTTP / Framework
  VALIDATION_ERROR: { status: 400, message: 'Parameter permintaan tidak valid.' },
  INVALID_JSON: { status: 400, message: 'JSON tidak valid.' },
  INVALID_SORT: { status: 400, message: 'Kolom pengurutan tidak valid.' },
  PAYLOAD_TOO_LARGE: { status: 413, message: 'Ukuran permintaan terlalu besar.' },
  NOT_FOUND: { status: 404, message: 'Data tidak ditemukan.' },
  FORBIDDEN_ORIGIN: { status: 403, message: 'Origin tidak diizinkan.' },
  ORIGIN_REJECTED: { status: 403, message: 'Origin ditolak.' },
  FORBIDDEN_PERMISSION: { status: 403, message: 'Akses ditolak.' },
  UNAUTHENTICATED: { status: 401, message: 'Sesi autentikasi tidak ditemukan atau tidak valid.' },
  PASSWORD_CHANGE_REQUIRED: { status: 403, message: 'Ganti kata sandi terlebih dahulu.' },
  SERVICE_UNAVAILABLE: { status: 503, message: 'Layanan belum dikonfigurasi.' },
  IMMUTABLE_RECORD: { status: 409, message: 'Data tidak dapat diubah pada status saat ini.' },
  INTEGRATION_NOT_CONFIGURED: { status: 503, message: 'Penyimpanan, verifikasi receipt Besu, atau autentikasi wallet belum dihubungkan.' },
  RECORD_CHANGED: { status: 409, message: 'Data berubah. Muat ulang data.' },
  ACCOUNT_CHANGED: { status: 409, message: 'Akun berubah. Silakan ulangi autentikasi.' },
  INVALID_INPUT: { status: 400, message: 'Input tidak valid.' },
  INVALID_PASSWORD: { status: 400, message: 'Kata sandi saat ini tidak valid atau tidak memenuhi kebijakan keamanan.' },
  TOO_MANY_ATTEMPTS: { status: 429, message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
  TOTP_INVALID: { status: 401, message: 'Kode verifikasi tidak valid.' },
  TOTP_REQUIRED: { status: 401, message: 'Verifikasi TOTP diperlukan.' },
  WALLET_NOT_VERIFIED: { status: 403, message: 'Wallet belum diverifikasi.' },
  INVALID_DATE_RANGE: { status: 400, message: 'Rentang tanggal tidak valid.' },

  // Recipients
  DUPLICATE_NIK: { status: 409, message: 'NIK sudah terdaftar.' },
  REVEAL_LIMIT: { status: 429, message: 'Batas pembukaan NIK tercapai.' },

  // Programs
  INVALID_PERIOD_RANGE: { status: 400, message: 'Rentang periode tidak valid.' },
  DUPLICATE_PROGRAM_CODE: { status: 409, message: 'Kode program sudah terdaftar.' },
  RECIPIENT_NOT_FINAL: { status: 409, message: 'Semua penerima harus berstatus FINAL.' },
  NOT_ENROLLED: { status: 409, message: 'Penerima belum terdaftar dalam program.' },

  // Disbursements
  AMOUNT_NOT_ALLOWED: { status: 400, message: 'Nominal ditentukan oleh program, bukan oleh klien.' },
  IDEMPOTENCY_CONFLICT: { status: 409, message: 'Idempotency-Key sudah digunakan untuk permintaan berbeda.' },
  EVIDENCE_REQUIRED: { status: 409, message: 'Minimal satu bukti aktif wajib diunggah.' },
  TX_HASH_MISMATCH: { status: 409, message: 'Hash transaksi tidak cocok dengan percobaan aktif.' },

  // Evidence
  MULTIPART_REQUIRED: { status: 400, message: 'Gunakan multipart/form-data.' },
  INVALID_MULTIPART: { status: 400, message: 'Data multipart tidak valid.' },
  FILE_SIZE: { status: 400, message: 'Setiap berkas harus berukuran 1 byte hingga 5 MB.' },
  FILE_TYPE: { status: 400, message: 'Hanya JPEG atau PDF yang diizinkan.' },
  INVALID_JPEG: { status: 400, message: 'Berkas JPEG tidak valid atau terlalu besar untuk diproses.' },
  EVIDENCE_COUNT: { status: 400, message: 'Unggah 1–3 berkas bukti.' },
  EVIDENCE_STATE: { status: 409, message: 'Bukti hanya dapat ditambah pada DRAFT, maksimal tiga berkas, dan tanpa operasi bukti lain.' },
  DUPLICATE_EVIDENCE: { status: 409, message: 'Bukti yang sama sudah diunggah.' },
  PINATA_NOT_CONFIGURED: { status: 503, message: 'Penyimpanan bukti belum dikonfigurasi.' },
  PINATA_UNAVAILABLE: { status: 503, message: 'Layanan penyimpanan bukti tidak tersedia.' },
  PINATA_INVALID_RESPONSE: { status: 503, message: 'Respons penyimpanan bukti tidak valid.' },
  PINATA_FILE_ID_MISSING: { status: 503, message: 'ID penyimpanan bukti tidak tersedia untuk penarikan.' },
  SHARED_EVIDENCE: { status: 409, message: 'Bukti digunakan oleh penyaluran lain; diperlukan penanganan administrator.' },

  // Chain / Reconcile / Explorer
  CHAIN_NOT_CONFIGURED: { status: 503, message: 'Blockchain belum dikonfigurasi.' },
  DEADLINE_EXCEEDED: { status: 503, message: 'Batas waktu rekonsiliasi tercapai.' },
  CRON_NOT_CONFIGURED: { status: 503, message: 'Cron belum dikonfigurasi.' },
  UNAUTHORIZED: { status: 401, message: 'Akses cron ditolak.' },
  DB_SUCCESS_WITHOUT_EVENT: { status: 409, message: 'Data sukses di database tanpa rekaman transaksi on-chain.' },
  EVENT_WITHOUT_DB_SUCCESS: { status: 409, message: 'Event on-chain ada tetapi data database tidak berstatus sukses.' },

  // Public
  BODY_ONLY: { status: 400, message: 'Gunakan JSON body tanpa query parameter.' },
  RATE_LIMIT: { status: 429, message: 'Terlalu banyak permintaan.' },
  TURNSTILE_NOT_CONFIGURED: { status: 503, message: 'Layanan verifikasi belum dikonfigurasi.' },
  TURNSTILE_UNAVAILABLE: { status: 503, message: 'Layanan verifikasi tidak tersedia.' },
  CAPTCHA_INVALID: { status: 400, message: 'Verifikasi keamanan tidak valid.' },
  RESULT_TOO_LARGE: { status: 503, message: 'Hubungi petugas untuk riwayat lengkap.' },

  // Smart Contract ABI Custom Errors & Verifier Codes
  NotAuthorized: { status: 403, message: 'Wallet yang dipakai bukan wallet resmi Kelurahan. Ganti akun di MetaMask.' },
  AlreadyDisbursed: { status: 409, message: 'Penerima ini sudah menerima bantuan untuk program dan periode yang sama.' },
  AmountMismatch: { status: 409, message: 'Nominal tidak sesuai ketentuan program.' },
  RecipientNotRegistered: { status: 409, message: 'Penerima belum terdaftar pada program ini di blockchain.' },
  PeriodOutOfRange: { status: 409, message: 'Periode di luar masa program atau program sudah ditutup.' },
  ProgramClosed: { status: 409, message: 'Periode di luar masa program atau program sudah ditutup.' },
  EnforcedPause: { status: 503, message: 'Pencatatan sedang dihentikan sementara oleh administrator.' },
  ExpectedPause: { status: 503, message: 'Pencatatan diharapkan dalam kondisi pause.' },
  ProgramNotFound: { status: 404, message: 'Program bantuan belum terdaftar di blockchain.' },
  RefIdAlreadyUsed: { status: 409, message: 'Referensi penyaluran ini sudah digunakan.' },
  InvalidEvidenceCid: { status: 400, message: 'CID bukti penyaluran tidak valid.' },
  InvalidProgram: { status: 400, message: 'Program tidak valid.' },
  ProgramAlreadyExists: { status: 409, message: 'Program sudah terdaftar di blockchain.' },
  InvalidWallet: { status: 400, message: 'Alamat wallet tidak valid.' },
  InvalidBatchSize: { status: 400, message: 'Ukuran batch transaksi tidak valid.' },
  InvalidCommitment: { status: 400, message: 'Commitment penerima tidak valid.' },
  RenounceDisabled: { status: 403, message: 'Melepas kepemilikan contract tidak diizinkan.' },
  RenounceOwnershipDisabled: { status: 403, message: 'Melepas kepemilikan contract tidak diizinkan.' },
  OwnableUnauthorizedAccount: { status: 403, message: 'Akun tidak memiliki wewenang kepemilikan contract.' },
  OwnableInvalidOwner: { status: 400, message: 'Alamat pemilik contract tidak valid.' },
  MISMATCH: { status: 409, message: 'Data transaksi tidak cocok dengan catatan penyaluran.' },
  UNKNOWN: { status: 500, message: 'Transaksi ditolak jaringan atau terjadi kesalahan yang tidak diketahui.' },
} as const satisfies Record<string, ErrorCatalogEntry>

export type ErrorCode = keyof typeof ERROR_CATALOG

export function getErrorInfo(code: string): ErrorCatalogEntry {
  if (Object.hasOwn(ERROR_CATALOG, code)) {
    return ERROR_CATALOG[code as ErrorCode]
  }
  return {
    status: 500,
    message: `Terjadi kesalahan sistem (${code}). Hubungi administrator.`,
  }
}

