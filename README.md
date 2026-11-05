# BansosLedger

Platform pencatatan, pelaporan, dan verifikasi transparansi penyaluran bantuan sosial (bansos) Kelurahan Takkalasi, Kecamatan Balusu, Kabupaten Barru berbasis **Next.js 16 (App Router)**, **MongoDB (Mongoose 8)**, **IPFS (Pinata V3)**, dan jaringan blockchain konsorsium **Hyperledger Besu (QBFT, Chain ID `250204`)**.

Dokumen sumber kebenaran utama (*source of truth*): [`docs/PRD.md`](./docs/PRD.md) (v2.7).

---

## 1. Prasyarat & Setup Lokal

- **Node.js**: `>= 22 < 23`
- **pnpm**: `12.x` (`corepack enable`)
- **MongoDB**: instans mandiri (`mongodb://...`) atau `mongodb-memory-server` untuk pengujian otomatis.
- **RPC EVM Lokal**: Hardhat (`http://127.0.0.1:8545`, Chain ID `250204`) atau node Hyperledger Besu QBFT.

```bash
# 1. Instal dependensi dengan lockfile beku
pnpm install --frozen-lockfile

# 2. Salin konfigurasi environment
cp .env.example .env.local

# 3. Kompilasi smart contract (@bansos/contracts)
pnpm --filter @bansos/contracts compile

# 4. Pastikan indeks MongoDB terbentuk (saat memakai database lokal/produksi)
pnpm db:indexes

# 5. Jalankan server pengembangan
pnpm dev
```

---

## 2. Daftar Skrip (`package.json`)

| Perintah | Deskripsi |
| --- | --- |
| `pnpm dev` | Menjalankan server pengembangan Next.js 16 |
| `pnpm build` | Membangun bundle produksi Next.js (`output: 'standalone'`) |
| `pnpm start` | Menjalankan server produksi Next.js |
| `pnpm typecheck` | Memeriksa tipe TypeScript (`tsc --noEmit`) secara ketat |
| `pnpm lint` | Menjalankan pemeriksaan arsitektur, batas modul, dan kebijakan kode (`scripts/lint.ts`) |
| `pnpm test` | Menjalankan seluruh unit, integrasi API, dan pengujian komponen Vitest (`node` + `jsdom`) |
| `pnpm test:foundation` | Menjalankan pengujian fondasi kriptografi, NIK, sesi, dan database |
| `pnpm test:domain` | Menjalankan pengujian aturan domain backend & smart contract verifier |
| `pnpm test:all` | Menjalankan `pnpm test`, `pnpm test:foundation`, dan `pnpm test:domain` |
| `pnpm test:e2e` | Menjalankan pengujian E2E Playwright, CSP nonce, dan aksesibilitas WCAG 2.2 AA (`axe-core`) |
| `pnpm db:indexes` | Membuat dan memverifikasi indeks unik/parsial MongoDB (`scripts/ensure-indexes.ts`) |
| `pnpm accounts` | CLI manajemen akun operator/institusi (`create`, `list`, `activate`, `deactivate`, `revoke-sessions`) |
| `pnpm docs:errors` | Menghasilkan ulang katalog kode error di [`docs/ERRORS.md`](./docs/ERRORS.md) |
| `pnpm --filter @bansos/contracts compile` | Mengompilasi kontrak pintar `BansosLedger.sol` (`evmVersion: "paris"`) |
| `pnpm --filter @bansos/contracts test` | Menjalankan pengujian Hardhat untuk kontrak pintar dan kompatibilitas ABI |
| `pnpm --filter @bansos/contracts coverage` | Menjalankan `solidity-coverage` dan memverifikasi ambang batas cakupan |
| `pnpm --filter @bansos/contracts gas` | Menjalankan laporan penggunaan gas (`REPORT_GAS=true`) |

> **Catatan Ubuntu 24.04:** Apabila `mongodb-memory-server` gagal mengunduh binary MongoDB untuk distro Ubuntu 24.04, jalankan pengujian dengan `MONGOMS_DISTRO=ubuntu-22.04 pnpm test:all`.

---

## 3. Variabel Lingkungan (`.env.example` / PRD §18.4)

Saat runtime produksi (`NODE_ENV=production`), [`src/instrumentation.ts`](./src/instrumentation.ts) memanggil [`validateServerEnvironment()`](./src/lib/env.ts) sebelum server menerima trafik dan menolak untuk berjalan (*fail-fast*) apabila variabel wajib tidak valid.

| Variabel | Sifat | Keterangan |
| --- | --- | --- |
| `APP_BASE_URL` | **Wajib** | URL kanonis aplikasi (contoh: `https://bansos.barrukab.go.id`) untuk validasi `Origin` dan hostname Turnstile |
| `MONGODB_URI` | **Wajib** | URI koneksi MongoDB (`mongodb://` atau `mongodb+srv://`) |
| `NIK_ENC_KEY` | **Wajib** | Kunci enkripsi AES-256-GCM NIK (64 karakter hex / 32 byte) |
| `NIK_INDEX_KEY` | **Wajib** | Kunci rahasia HMAC-SHA256 blind index NIK (minimal 32 karakter) |
| `COMMITMENT_PEPPER` | **Wajib** | Pepper server untuk komitmen `keccak256(NIK ‖ COMMITMENT_PEPPER)` (64 karakter hex) |
| `MFA_ENC_KEY` | **Wajib** | Kunci enkripsi rahasia TOTP MFA (64 karakter hex) |
| `INTERNAL_API_URL` | Opsional | URL internal untuk fetch Server Component (default `http://127.0.0.1:3000`) |
| `RPC_URL_SERVER` | Opsional* | Endpoint HTTP JSON-RPC node Besu/Hardhat yang diakses dari server |
| `RPC_API_KEY` | Opsional | Header `X-API-Key` untuk autentikasi ke RPC server bila digunakan |
| `NEXT_PUBLIC_CHAIN_ID` | Opsional* | Chain ID jaringan konsorsium (default PRD: `250204`) |
| `NEXT_PUBLIC_RPC_URL` | Opsional | Endpoint RPC publik/lokal untuk dompet browser (default lokal: `http://127.0.0.1:8545`) |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Opsional* | Alamat kontrak `BansosLedger` (`0x...`, 40 hex) |
| `NEXT_PUBLIC_AUTHORIZED_KELURAHAN_WALLET` | Opsional | Alamat wallet operator kelurahan yang diotorisasi |
| `PINATA_JWT` | Opsional* | Token JWT Pinata V3 untuk unggah/penarikan bukti penyerahan |
| `PINATA_GATEWAY` | Opsional | Base URL gateway IPFS publik (default `https://gateway.pinata.cloud`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Opsional* | Site key Cloudflare Turnstile pada halaman `/cek-bansos` |
| `TURNSTILE_SECRET` | Opsional* | Secret key Cloudflare Turnstile untuk verifikasi server-side |
| `UPSTASH_REDIS_REST_URL` | Opsional | URL REST Upstash Redis untuk pembatasan laju (*rate limit*) terdistribusi |
| `UPSTASH_REDIS_REST_TOKEN` | Opsional | Token REST Upstash Redis |
| `CRON_SECRET` | Opsional | Bearer secret (minimal 32 karakter) untuk `POST /api/v1/cron/reconcile` |
| `AUTH_REQUIRE_TOTP` | Opsional | `'true'` atau `'false'` (default `'false'`) untuk mewajibkan verifikasi TOTP saat login |
| `APP_TRUST_PROXY` | Opsional | `'true'` bila aplikasi berada di belakang reverse proxy tepercaya (Caddy) |
| `CSP_ENFORCE` | Opsional | `'true'` untuk mengirim header `Content-Security-Policy` penuh; default `'false'` menggunakan `Content-Security-Policy-Report-Only` |
| `NEXT_PUBLIC_ENABLE_UI_ROLE_PREVIEW` | Dev-only | Hanya untuk `NODE_ENV=development`; **dilarang** pada build produksi (`next.config.mjs` menolak build bila diaktifkan di produksi) |

*\*Apabila variabel integrasi eksternal (`RPC_URL_SERVER`, `PINATA_JWT`, `TURNSTILE_SECRET`) belum diisi, endpoint terkait akan gagal secara tertutup (fail-closed) dengan HTTP `503` dan kode error terstandar (`CHAIN_NOT_CONFIGURED`, `PINATA_NOT_CONFIGURED`, `TURNSTILE_NOT_CONFIGURED`).*

---

## 4. Dokumentasi Terkait

- [`docs/PRD.md`](./docs/PRD.md) — Dokumen Kebutuhan Produk (PRD v2.7)
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Arsitektur berlapis, alur data on-chain, dan batas kepercayaan (*trust boundaries*)
- [`docs/ERRORS.md`](./docs/ERRORS.md) — Katalog kode error RFC 9457 (`application/problem+json`)
- [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) — Panduan operasional produksi (cron rekonsiliasi, Caddy reverse proxy, CSP, dan deployment standalone)

