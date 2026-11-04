# Katalog Kode Error BansosLedger

Dokumen ini dihasilkan secara otomatis oleh skrip `pnpm docs:errors` dari `src/lib/api-contract/errors.ts`.
Setiap respons error pada API v1 mengikuti spesifikasi RFC 9457 (`application/problem+json`) dengan `code` dan `requestId`.

| Kode Error | HTTP Status | Pesan (Bahasa Indonesia) |
|---|---|---|
| `ACCOUNT_CHANGED` | 409 | Akun berubah. Silakan ulangi autentikasi. |
| `AlreadyDisbursed` | 409 | Penerima ini sudah menerima bantuan untuk program dan periode yang sama. |
| `AMOUNT_NOT_ALLOWED` | 400 | Nominal ditentukan oleh program, bukan oleh klien. |
| `AmountMismatch` | 409 | Nominal tidak sesuai ketentuan program. |
| `BODY_ONLY` | 400 | Gunakan JSON body tanpa query parameter. |
| `CAPTCHA_INVALID` | 400 | Verifikasi keamanan tidak valid. |
| `CHAIN_NOT_CONFIGURED` | 503 | Blockchain belum dikonfigurasi. |
| `CRON_NOT_CONFIGURED` | 503 | Cron belum dikonfigurasi. |
| `DB_SUCCESS_WITHOUT_EVENT` | 409 | Data sukses di database tanpa rekaman transaksi on-chain. |
| `DEADLINE_EXCEEDED` | 503 | Batas waktu rekonsiliasi tercapai. |
| `DUPLICATE_EVIDENCE` | 409 | Bukti yang sama sudah diunggah. |
| `DUPLICATE_NIK` | 409 | NIK sudah terdaftar. |
| `DUPLICATE_PROGRAM_CODE` | 409 | Kode program sudah terdaftar. |
| `EnforcedPause` | 503 | Pencatatan sedang dihentikan sementara oleh administrator. |
| `EVENT_WITHOUT_DB_SUCCESS` | 409 | Event on-chain ada tetapi data database tidak berstatus sukses. |
| `EVIDENCE_COUNT` | 400 | Unggah 1–3 berkas bukti. |
| `EVIDENCE_REQUIRED` | 409 | Minimal satu bukti aktif wajib diunggah. |
| `EVIDENCE_STATE` | 409 | Bukti hanya dapat ditambah pada DRAFT, maksimal tiga berkas, dan tanpa operasi bukti lain. |
| `ExpectedPause` | 503 | Pencatatan diharapkan dalam kondisi pause. |
| `FILE_SIZE` | 400 | Setiap berkas harus berukuran 1 byte hingga 5 MB. |
| `FILE_TYPE` | 400 | Hanya JPEG atau PDF yang diizinkan. |
| `FORBIDDEN_ORIGIN` | 403 | Origin tidak diizinkan. |
| `FORBIDDEN_PERMISSION` | 403 | Akses ditolak. |
| `IDEMPOTENCY_CONFLICT` | 409 | Idempotency-Key sudah digunakan untuk permintaan berbeda. |
| `IMMUTABLE_RECORD` | 409 | Data tidak dapat diubah pada status saat ini. |
| `INTEGRATION_NOT_CONFIGURED` | 503 | Penyimpanan, verifikasi receipt Besu, atau autentikasi wallet belum dihubungkan. |
| `INVALID_DATE_RANGE` | 400 | Rentang tanggal tidak valid. |
| `INVALID_INPUT` | 400 | Input tidak valid. |
| `INVALID_JPEG` | 400 | Berkas JPEG tidak valid atau terlalu besar untuk diproses. |
| `INVALID_JSON` | 400 | JSON tidak valid. |
| `INVALID_MULTIPART` | 400 | Data multipart tidak valid. |
| `INVALID_PASSWORD` | 400 | Kata sandi saat ini tidak valid atau tidak memenuhi kebijakan keamanan. |
| `INVALID_PERIOD_RANGE` | 400 | Rentang periode tidak valid. |
| `INVALID_SORT` | 400 | Kolom pengurutan tidak valid. |
| `InvalidBatchSize` | 400 | Ukuran batch transaksi tidak valid. |
| `InvalidCommitment` | 400 | Commitment penerima tidak valid. |
| `InvalidEvidenceCid` | 400 | CID bukti penyaluran tidak valid. |
| `InvalidProgram` | 400 | Program tidak valid. |
| `InvalidWallet` | 400 | Alamat wallet tidak valid. |
| `MISMATCH` | 409 | Data transaksi tidak cocok dengan catatan penyaluran. |
| `MULTIPART_REQUIRED` | 400 | Gunakan multipart/form-data. |
| `NOT_ENROLLED` | 409 | Penerima belum terdaftar dalam program. |
| `NOT_FOUND` | 404 | Data tidak ditemukan. |
| `NotAuthorized` | 403 | Wallet yang dipakai bukan wallet resmi Kelurahan. Ganti akun di MetaMask. |
| `ORIGIN_REJECTED` | 403 | Origin ditolak. |
| `OwnableInvalidOwner` | 400 | Alamat pemilik contract tidak valid. |
| `OwnableUnauthorizedAccount` | 403 | Akun tidak memiliki wewenang kepemilikan contract. |
| `PASSWORD_CHANGE_REQUIRED` | 403 | Ganti kata sandi terlebih dahulu. |
| `PAYLOAD_TOO_LARGE` | 413 | Ukuran permintaan terlalu besar. |
| `PeriodOutOfRange` | 409 | Periode di luar masa program atau program sudah ditutup. |
| `PINATA_FILE_ID_MISSING` | 503 | ID penyimpanan bukti tidak tersedia untuk penarikan. |
| `PINATA_INVALID_RESPONSE` | 503 | Respons penyimpanan bukti tidak valid. |
| `PINATA_NOT_CONFIGURED` | 503 | Penyimpanan bukti belum dikonfigurasi. |
| `PINATA_UNAVAILABLE` | 503 | Layanan penyimpanan bukti tidak tersedia. |
| `ProgramAlreadyExists` | 409 | Program sudah terdaftar di blockchain. |
| `ProgramClosed` | 409 | Periode di luar masa program atau program sudah ditutup. |
| `ProgramNotFound` | 404 | Program bantuan belum terdaftar di blockchain. |
| `RATE_LIMIT` | 429 | Terlalu banyak permintaan. |
| `RECIPIENT_NOT_FINAL` | 409 | Semua penerima harus berstatus FINAL. |
| `RecipientNotRegistered` | 409 | Penerima belum terdaftar pada program ini di blockchain. |
| `RECORD_CHANGED` | 409 | Data berubah. Muat ulang data. |
| `RefIdAlreadyUsed` | 409 | Referensi penyaluran ini sudah digunakan. |
| `RenounceDisabled` | 403 | Melepas kepemilikan contract tidak diizinkan. |
| `RenounceOwnershipDisabled` | 403 | Melepas kepemilikan contract tidak diizinkan. |
| `RESULT_TOO_LARGE` | 503 | Hubungi petugas untuk riwayat lengkap. |
| `REVEAL_LIMIT` | 429 | Batas pembukaan NIK tercapai. |
| `SERVICE_UNAVAILABLE` | 503 | Layanan belum dikonfigurasi. |
| `SHARED_EVIDENCE` | 409 | Bukti digunakan oleh penyaluran lain; diperlukan penanganan administrator. |
| `TOO_MANY_ATTEMPTS` | 429 | Terlalu banyak percobaan. Coba lagi dalam 15 menit. |
| `TOTP_INVALID` | 401 | Kode verifikasi tidak valid. |
| `TOTP_REQUIRED` | 401 | Verifikasi TOTP diperlukan. |
| `TURNSTILE_NOT_CONFIGURED` | 503 | Layanan verifikasi belum dikonfigurasi. |
| `TURNSTILE_UNAVAILABLE` | 503 | Layanan verifikasi tidak tersedia. |
| `TX_HASH_MISMATCH` | 409 | Hash transaksi tidak cocok dengan percobaan aktif. |
| `UNAUTHENTICATED` | 401 | Sesi autentikasi tidak ditemukan atau tidak valid. |
| `UNAUTHORIZED` | 401 | Akses cron ditolak. |
| `UNKNOWN` | 500 | Transaksi ditolak jaringan atau terjadi kesalahan yang tidak diketahui. |
| `VALIDATION_ERROR` | 400 | Parameter permintaan tidak valid. |
| `WALLET_NOT_VERIFIED` | 403 | Wallet belum diverifikasi. |
