'use client'
import { useState } from 'react'
import { actors, matrix, signer, validators } from './wallet-data'
import s from './activity-log.module.css'
import w from './wallet.module.css'
export function WalletPanels() {
  const [filter, setFilter] = useState('Semua fitur')
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
            <div className={s.statRow}>
              Penyimpanan yang direncanakan <strong>MongoDB · db.users</strong>
            </div>
            <div className={s.statRow}>
              Autentikasi <strong>Belum terhubung</strong>
            </div>
            <p className={w.red}>Tidak otomatis berwenang mengeksekusi kontrak.</p>
          </article>
          <article className={s.inset}>
            <span className={s.badge}>02 · Eksekusi smart contract</span>
            <h2>Wallet aplikasi Kelurahan</h2>
            <p>
              Digunakan Operator melalui MetaMask + Ethers.js untuk menandatangani penyaluran. Pada
              tahap ini alamat merupakan data contoh.
            </p>
            <code>{signer}</code>
            <div className={s.statRow}>
              Modifier <strong>onlyAuthorizedKelurahan</strong>
            </div>
            <div className={s.statRow}>
              Fungsi <strong>catatPenyaluran()</strong>
            </div>
            <p>ECDSA secp256k1 · identitas signer terpisah</p>
          </article>
          <article className={s.inset}>
            <span className={s.badge}>03 · Konsensus jaringan</span>
            <h2>4 node validator Besu · QBFT</h2>
            <p>
              Mengusulkan dan mengesahkan blok secara round-robin, bukan mengeksekusi penyaluran.
            </p>
            {validators.map((v, i) => (
              <div className={s.statRow} key={v.name}>
                <span>
                  Val {i + 1} · {v.name}
                </span>
                <code title={v.address}>
                  {v.address.slice(0, 8)}…{v.address.slice(-4)}
                </code>
              </div>
            ))}
            <p className={w.red}>Kunci validator bukan authorized signer.</p>
          </article>
        </div>
      </section>
      <section className={s.card}>
        <div className={s.heading}>
          <div>
            <span className={s.eyebrow}>BAGIAN 4 · TABEL 3.1 & 3.2 SKRIPSI</span>
            <h2>Matriks peran & hak akses 5 aktor sistem</h2>
          </div>
          <span className={s.badge}>5 aktor · 9 fitur · kebijakan rancangan</span>
        </div>
        <div className={s.actions}>
          {[
            'Semua fitur',
            'Data draft & siklus hidup',
            'IPFS & smart contract',
            'LPJ, registri & publik',
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
                          {a.startsWith('Dilarang') ||
                          a.startsWith('Ditolak') ||
                          a.startsWith('Tidak')
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
