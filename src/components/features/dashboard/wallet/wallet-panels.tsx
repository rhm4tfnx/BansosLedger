'use client'
import { useState } from 'react'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/features/dashboard/shared/states'
import { useExplorerValidatorsQuery, useWalletStatusQuery } from '@/lib/api/hooks'
import s from '@/components/features/dashboard/audit-log/activity-log.module.css'
import w from '@/components/features/dashboard/wallet/wallet.module.css'

/** Static documentation constants (policy description, not live data). */
const actors = [
  'Operator Bansos Kelurahan',
  'Kecamatan Balusu',
  'Dinas Sosial Kab. Barru',
  'Auditor / Pengawas',
  'Masyarakat / Penerima',
]
const matrix = [
  {
    group: 'Data draft & siklus hidup',
    name: 'Login portal dashboard internal',
    tag: 'Web2 Auth',
    access: [
      'Akun operator',
      'Monitoring wilayah',
      'Verifikator kabupaten',
      'Via explorer publik',
      'Via explorer publik',
    ],
  },
  {
    group: 'Data draft & siklus hidup',
    name: 'Buat & ubah draft KPM / program',
    tag: 'MongoDB off-chain',
    access: [
      'CRUD draft / PENDING',
      'Lihat saja',
      'Lihat saja',
      'Tidak memiliki akses',
      'Tidak memiliki akses',
    ],
  },
  {
    group: 'Data draft & siklus hidup',
    name: 'Soft delete draft (is_deleted = true)',
    tag: 'Siklus data',
    access: [
      'Hanya data draft',
      'Ditolak',
      'Ditolak',
      'Tidak memiliki akses',
      'Tidak memiliki akses',
    ],
  },
  {
    group: 'Data draft & siklus hidup',
    name: 'Hard delete data final on-chain',
    tag: 'Proteksi mutlak',
    access: Array(5).fill('Dilarang keras'),
  },
  {
    group: 'IPFS & smart contract',
    name: 'Unggah bukti penyerahan IPFS',
    tag: 'Fase 2 - Pinata CID',
    access: [
      'Unggah JPG / PDF & terima CID',
      'Pratinjau CID',
      'Verifikasi CID',
      'Verifikasi publik',
      'Verifikasi publik',
    ],
  },
  {
    group: 'IPFS & smart contract',
    name: 'Kirim transaksi catatPenyaluran()',
    tag: 'Fase 3 - Besu QBFT',
    access: [
      'Eksklusif wallet Kelurahan',
      'Ditolak: bukan signer',
      'Ditolak: bukan signer',
      'Ditolak: hanya validator',
      'Ditolak: akses publik',
    ],
  },
  {
    group: 'Laporan realisasi, registri & publik',
    name: 'Laporan realisasi',
    tag: 'PMK 254/2015',
    access: [
      'Susun, catat & cetak laporan realisasi',
      'Monitoring read-only',
      'Monitoring read-only',
      'Audit via explorer',
      'Transparansi via explorer',
    ],
  },
  {
    group: 'Laporan realisasi, registri & publik',
    name: 'Registri wallet & matriks peran',
    tag: 'Read-only',
    access: [
      'Lihat saja',
      'Lihat saja',
      'Lihat saja',
      'Via explorer publik',
      'Via explorer publik',
    ],
  },
  {
    group: 'Laporan realisasi, registri & publik',
    name: 'Penelusuran bukti publik /explorer',
    tag: 'Transparansi',
    access: Array(5).fill('Lihat bukti publik tanpa NIK lengkap'),
  },
]

export function WalletPanels() {
  const [filter, setFilter] = useState('Semua fitur')
  const walletQuery = useWalletStatusQuery()
  const validatorsQuery = useExplorerValidatorsQuery()
  const validators = validatorsQuery.data
  return (
    <>
      <section className={s.card}>
        <span className={s.eyebrow}>BAGIAN 3 · ARSITEKTUR IDENTITAS BERLAPIS</span>
        <h2>Pemisahan tegas 3 jenis identitas</h2>
        <p>
          Kredensial portal, tanda tangan transaksi, dan kunci konsensus memiliki tanggung jawab
          yang berbeda.
        </p>
        <div className={w.three}>
          <article className={s.inset}>
            <span className={s.badge}>01 · Aplikasi Web2</span>
            <h2>Akun pengguna portal internal</h2>
            <p>
              Operator Bansos, Lurah, Sekretaris Kelurahan, Kecamatan Balusu, dan Dinsos masuk
              dengan role aplikasi. Akun maupun wallet pribadi tidak otomatis menjadi signer sah.
            </p>
            <p className={w.red}>Tidak otomatis berwenang mengeksekusi kontrak.</p>
          </article>
          <article className={s.inset}>
            <span className={s.badge}>02 · Eksekusi smart contract</span>
            <h2>Wallet aplikasi Kelurahan</h2>
            <p>
              Digunakan Operator melalui MetaMask + Ethers.js untuk menandatangani penyaluran.
            </p>
            {walletQuery.isPending ? (
              <TableSkeleton rows={1} label="Memuat status wallet" />
            ) : walletQuery.isError ? (
              <ErrorState error={walletQuery.error} onRetry={() => void walletQuery.refetch()} />
            ) : (
              <HashLink
                hash={walletQuery.data?.authorizedWallet ?? null}
                short={walletQuery.data?.authorizedWalletShort ?? '-'}
                kind="address"
              />
            )}
            <div className={s.statRow}>
              Modifier <strong>onlyAuthorizedKelurahan</strong>
            </div>
            <p>ECDSA secp256k1 · identitas signer terpisah</p>
          </article>
          <article className={s.inset}>
            <span className={s.badge}>03 · Konsensus jaringan</span>
            <h2>
              {validators ? (validators.count === null ? '-' : validators.count) : '-'} node validator Besu · QBFT
            </h2>
            <p>
              Mengusulkan dan mengesahkan blok secara round-robin, bukan mengeksekusi penyaluran.
            </p>
            {validatorsQuery.isPending ? (
              <TableSkeleton rows={2} label="Memuat validator" />
            ) : validatorsQuery.isError ? (
              <ErrorState error={validatorsQuery.error} onRetry={() => void validatorsQuery.refetch()} />
            ) : validators && validators.items.length > 0 ? (
              validators.items.map((v, i) => (
                <div className={s.statRow} key={v.address}>
                  <span>
                    Val {i + 1} · {v.institution}
                  </span>
                  <HashLink hash={v.address} short={v.addressShort} kind="address" />
                </div>
              ))
            ) : (
              <EmptyState>Belum ada data validator.</EmptyState>
            )}
            <p className={w.red}>Kunci validator bukan authorized signer.</p>
          </article>
        </div>
      </section>
      <section className={s.card}>
        <div className={s.heading}>
          <div>
            <span className={s.eyebrow}>BAGIAN 4 · TABEL 3.1 &amp; 3.2 SKRIPSI</span>
            <h2>Matriks peran &amp; hak akses 5 aktor sistem</h2>
          </div>
          <span className={s.badge}>5 aktor · 9 fitur · kebijakan rancangan</span>
        </div>
        <div className={s.actions}>
          {[
            'Semua fitur',
            'Data draft & siklus hidup',
            'IPFS & smart contract',
            'Laporan realisasi, registri & publik',
          ].map((f) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Fitur / operasi sistem</th>
                {actors.map((a) => (
                  <th key={a}>{a}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix
                .filter((r) => filter === 'Semua fitur' || r.group === filter)
                .map((r) => (
                  <tr key={r.name}>
                    <td>
                      <span className={s.badge}>{r.tag}</span>
                      <h3>{r.name}</h3>
                    </td>
                    {r.access.map((a, i) => (
                      <td key={i}>
                        <span className={s.badge}>
                          {a.startsWith('Dilarang') || a.startsWith('Ditolak') || a.startsWith('Tidak')
                            ? 'Tidak diizinkan'
                            : a.includes('saja') || a.includes('publik') || a.includes('explorer')
                              ? 'Lihat / dibatasi'
                              : 'Diizinkan sesuai peran'}
                        </span>
                        <p>{a}</p>
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}


