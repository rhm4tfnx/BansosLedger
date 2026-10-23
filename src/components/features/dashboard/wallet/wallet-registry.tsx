'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { Download, ShieldCheck, Copy, LockKeyhole, X } from 'lucide-react'
import { Dashboard } from '@/components/features/dashboard/overview/dashboard'
import { WalletPanels } from '@/components/features/dashboard/wallet/wallet-panels'
import {
  wallets,
  events,
  signer,
  owner,
  validators,
  actors,
  rotationScript,
  contractCode,
} from '@/mocks/wallet-data'
import s from '@/components/features/dashboard/audit-log/activity-log.module.css'
import w from '@/components/features/dashboard/wallet/wallet.module.css'
export function WalletRegistry() {
  const [role, setRole] = useState(actors[0])
  const [filter, setFilter] = useState('Semua entri')
  const [session, setSession] = useState(signer)
  const [notice, setNotice] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [trace, setTrace] = useState('Belum ada pengujian. Pilih salah satu skenario di atas.')
  const [rotation, setRotation] = useState(false)
  const modal = useRef<HTMLDialogElement>(null)
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setNotice('Berhasil disalin.')
    } catch {
      setNotice('Clipboard tidak tersedia. Pilih dan salin teks secara manual.')
    }
  }
  function test(address: string) {
    const ok = address === signer
    if (!ok) setAttempts((n) => n + 1)
    setTrace(
      `[SIMULASI LOKAL — bukan eksekusi EVM]\n[CALL] BansosLpjRegistry.catatPenyaluran()\n[FROM] ${address}\n[CHECK] onlyAuthorizedKelurahan\n[RESULT] ${ok ? 'SUCCESS · signer cocok' : 'REVERTED · UnauthorizedSigner(address)'}\n[STATE] Tidak ada perubahan state blockchain.\n[AUDIT] Tidak dikirim ke MongoDB atau RPC.`,
    )
  }
  function exportCsv() {
    const rows = [
      ['Jenis', 'Alamat / target', 'Status', 'Blok', 'TxHash', 'Jumlah transaksi'],
      ...wallets.map((x) => [
        'Wallet',
        x.address,
        x.status,
        String(x.block),
        x.tx,
        String(x.count),
      ]),
      ...events.map((x) => [x.name, x.target, x.status, String(x.block), x.tx, '']),
    ]
    const url = URL.createObjectURL(
      new Blob(
        [
          '\ufeff' +
            rows.map((r) => r.map((v) => '"' + v.replaceAll('"', '""') + '"').join(',')).join('\n'),
        ],
        { type: 'text/csv;charset=utf-8' },
      ),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = 'registri-wallet-contoh.csv'
    a.click()
    URL.revokeObjectURL(url)
    setNotice('CSV data contoh registri dan event diekspor.')
  }
  return (
    <Dashboard section="Registri wallet / role">
      <div className={s.page}>
        <div className={s.breadcrumb}>Dashboard / Tata kelola / Registri wallet</div>
        <section className={s.card}>
          <div className={s.labels}>
            <span className={s.badge}>/dashboard/wallet</span>
            <span className={s.badge}>P1 · ISO/IEC 25010:2023 · Security</span>
            <span className={s.badge}>
              <LockKeyhole size={12} /> Internal read-only
            </span>
          </div>
          <div className={s.heading}>
            <div>
              <h1>Registri Wallet & Matriks Peran</h1>
              <p>
                Transparansi identitas Web2, otorisasi smart contract, dan konsensus jaringan Besu.
              </p>
            </div>
            <div className={s.actions}>
              <button onClick={() => modal.current?.showModal()}>
                <ShieldCheck size={15} />
                Laporan Slither SAST
              </button>
              <button className={s.primary} onClick={exportCsv}>
                <Download size={15} />
                Ekspor CSV registri & event
              </button>
            </div>
          </div>
          <div className={s.warning}>
            Pratinjau antarmuka · seluruh alamat, statistik, blok, TxHash, dan hasil uji adalah data
            contoh. Tidak terhubung ke MetaMask, MongoDB, atau Besu. Tidak ada klaim audit keamanan
            aktual.
          </div>
        </section>
        {notice && (
          <div className={s.inset} role="status">
            {notice}
          </div>
        )}
        <div className={s.metrics}>
          {[
            ['Wallet signer penyaluran', '1 Wallet', 'onlyAuthorizedKelurahan'],
            ['Pemisahan lapisan identitas', '3 Identitas', 'Web2 · Signer · QBFT'],
            ['Audit keamanan Slither', 'Belum diuji', 'Pratinjau laporan SAST'],
            ['Uji wallet ilegal', `${attempts} Ditolak`, 'Pengujian lokal · bukan EVM'],
          ].map(([a, b, c]) => (
            <article className={s.card} key={a}>
              <small>{a}</small>
              <strong className={s.number}>{b}</strong>
              <span className={s.badge}>{c}</span>
            </article>
          ))}
        </div>
        <section className={s.card}>
          <div className={s.heading}>
            <div>
              <span className={s.eyebrow}>BAGIAN 1 · PENCEGAHAN PRIVILEGE ESCALATION</span>
              <h2>Akses lihat saja untuk seluruh peran internal</h2>
            </div>
            <div className={s.actions}>
              {actors.slice(0, 3).map((a) => (
                <button key={a} aria-pressed={role === a} onClick={() => setRole(a)}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className={s.columns}>
            <div className={s.inset}>
              <h3>Sesi contoh: {role}</h3>
              <p>
                Pemilihan peran hanya demonstrasi UI, bukan pergantian sesi autentikasi. Registri
                tetap read-only, termasuk untuk operator yang menandatangani penyaluran.
              </p>
              <div className={s.actions}>
                {actors.slice(0, 3).map((a) => (
                  <span className={s.badge} key={a}>
                    {a} · Lihat saja
                  </span>
                ))}
              </div>
            </div>
            <div className={s.inset}>
              <h3>Proteksi antarmuka · UI guard</h3>
              <p>
                Tidak tersedia kontrol tambah, edit, atau hapus wallet. Proteksi API dan kontrak
                belum diimplementasikan pada prototipe tampilan ini.
              </p>
              <div className={s.actions}>
                <span className={s.badge}>Tambah: tidak tersedia</span>
                <span className={s.badge}>Edit / hapus: tidak tersedia</span>
              </div>
              <a className={w.link} href="#mekanisme-wallet">
                Lihat mekanisme script →
              </a>
            </div>
          </div>
        </section>
        <section className={s.card}>
          <div className={s.heading}>
            <div>
              <span className={s.eyebrow}>BAGIAN 2 · STATE SMART CONTRACT · CONTOH</span>
              <h2>Daftar wallet berwenang pada smart contract</h2>
              <p>
                BansosLpjRegistry.sol · ilustrasi registri on-chain, bukan pembacaan state langsung.
              </p>
            </div>
            <div className={s.actions}>
              {['Semua entri', 'ACTIVE / AUTHORIZED', 'REVOKED'].map((f) => (
                <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {f}
                  {f === 'Semua entri' ? ' (3)' : ''}
                </button>
              ))}
            </div>
          </div>
          <div className={s.tableWrap}>
            <table>
              <thead>
                <tr>
                  {[
                    'Peran & modifier',
                    'Alamat lengkap',
                    'Status otorisasi',
                    'Blok pendaftaran',
                    'TxHash penetapan',
                    'Transaksi sah',
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wallets
                  .filter((x) => filter === 'Semua entri' || x.status === filter)
                  .map((x) => (
                    <tr key={x.address}>
                      <td>
                        <h3>{x.name}</h3>
                        <small>{x.role}</small>
                        <code>{x.modifier}</code>
                        <p>{x.description}</p>
                      </td>
                      <td>
                        <code>{x.address}</code>
                        <button onClick={() => copy(x.address)}>
                          <Copy size={12} />
                          Salin alamat
                        </button>
                        <Link className={w.link} href={`/explorer?address=${x.address}`}>
                          Lihat explorer →
                        </Link>
                      </td>
                      <td>
                        <span className={x.status === 'REVOKED' ? w.revoked : w.authorized}>
                          {x.status}
                        </span>
                      </td>
                      <td>
                        <strong>#{x.block}</strong>
                        <small>Blok contoh · QBFT</small>
                      </td>
                      <td>
                        <code title={x.tx}>
                          {x.tx.slice(0, 12)}…{x.tx.slice(-6)}
                        </code>
                        <button aria-label={`Salin TxHash ${x.role}`} onClick={() => copy(x.tx)}>
                          <Copy size={12} />
                        </button>
                      </td>
                      <td>
                        <strong>{x.count} Tx</strong>
                        <small>Data contoh</small>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p>
            Target integrasi: getAuthorizedRegistry() · Besu JSON-RPC port 8545. Mode read-only.
          </p>
        </section>
        <WalletPanels />
        <div className={s.columns}>
          <section className={s.card}>
            <span className={s.eyebrow}>BAGIAN 5A · PEMBANDING WALLET SIMULASI</span>
            <h2>Sesi MetaMask vs state smart contract</h2>
            <label htmlFor="wallet-session">Pilih wallet sesi contoh</label>
            <select
              id="wallet-session"
              className={w.select}
              value={session}
              onChange={(e) => setSession(e.target.value)}
            >
              <option value={signer}>Wallet resmi Kelurahan</option>
              <option value={owner}>Contract Owner (bukan signer)</option>
              <option value={validators[0].address}>Kunci validator Besu</option>
              <option value={wallets[2].address}>Wallet dicabut</option>
              <option value={'0x' + 'de'.repeat(20)}>Wallet eksternal tidak berwenang</option>
            </select>
            <div className={s.grid}>
              <div className={s.inset}>
                <small>Wallet sesi simulasi</small>
                <code>{session}</code>
              </div>
              <div className={s.inset}>
                <small>Authorized signer contoh</small>
                <code>{signer}</code>
              </div>
            </div>
            <div className={s.warning}>
              <strong className={session === signer ? w.green : w.red}>
                {session === signer ? 'COCOK · AUTHORIZED SIGNER' : 'TIDAK COCOK · UNAUTHORIZED'}
              </strong>
            </div>
            <p>
              Alamat dibandingkan secara lokal. Tidak membaca akun ekstensi atau state kontrak
              real-time.
            </p>
            <div className={s.statRow}>
              <span>Slither SAST · belum dijalankan</span>
              <button onClick={() => modal.current?.showModal()}>Detail laporan</button>
            </div>
          </section>
          <section className={s.card}>
            <span className={s.eyebrow}>BAGIAN 5B · SKENARIO 3 · TABEL 3.3</span>
            <h2>Simulator penolakan wallet tidak berwenang</h2>
            <p>
              Memperagakan hasil pemeriksaan modifier tanpa mengirim transaksi atau menggunakan
              private key.
            </p>
            <div className={s.actions}>
              <button onClick={() => test('0x' + 'de'.repeat(20))}>Uji wallet ilegal</button>
              <button onClick={() => test(validators[0].address)}>Uji kunci validator</button>
              <button onClick={() => test(signer)}>Uji wallet resmi</button>
              <button onClick={() => test(session)}>Uji sesi terpilih</button>
            </div>
            <pre className={w.terminal} aria-live="polite">
              {trace}
            </pre>
            <small>Total penolakan simulasi: {attempts} percobaan · Authenticity</small>
          </section>
        </div>
        <section className={s.card} id="mekanisme-wallet">
          <div className={s.heading}>
            <div>
              <span className={s.eyebrow}>BAGIAN 6 · ADMINISTRASI CONTRACT OWNER</span>
              <h2>Mekanisme rotasi & riwayat event otorisasi</h2>
            </div>
            <button onClick={() => setRotation(true)}>Pratinjau alur script rotasi</button>
          </div>
          <p>
            Penambahan, rotasi, atau pencabutan hanya melalui script administratif Hardhat /
            Ethers.js oleh Contract Owner, bukan perubahan dari UI.
          </p>
          {rotation && (
            <div className={s.warning} role="status">
              Alur contoh: owner menandatangani → setAuthorizedWallet() → finalitas QBFT →
              WalletAuthorizationUpdated. Tidak ada script dijalankan atau wallet diubah.
            </div>
          )}
          <div className={s.columns}>
            <div>
              <div className={s.heading}>
                <h3>scripts/rotate-authorized-wallet.js</h3>
                <button onClick={() => copy(rotationScript)}>Salin script</button>
              </div>
              <pre className={w.terminal}>{rotationScript}</pre>
            </div>
            <div>
              <h3>contracts/BansosLpjRegistry.sol · Solidity ^0.8.24</h3>
              <pre className={w.terminal}>{contractCode}</pre>
            </div>
          </div>
          <h2>Riwayat event on-chain · 4 contoh</h2>
          <p>
            Riwayat prototipe, bukan event permanen yang diambil dari jaringan. Log aktivitas
            operasional tetap berada di halaman log aktivitas.
          </p>
          <div className={s.tableWrap}>
            <table>
              <thead>
                <tr>
                  {[
                    'ID & waktu WITA',
                    'Nama event',
                    'Eksekutor',
                    'Target',
                    'Status',
                    'Blok',
                    'TxHash',
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.id}</strong>
                      <small>{e.time}</small>
                    </td>
                    <td>
                      <code>{e.name}</code>
                    </td>
                    <td>
                      <small>Contract Owner</small>
                      <code>{owner}</code>
                    </td>
                    <td>
                      <code>{e.target}</code>
                    </td>
                    <td>
                      <span className={s.badge}>{e.status}</span>
                    </td>
                    <td>#{e.block}</td>
                    <td>
                      <Link className={w.link} href={`/explorer?tx=${e.tx}`}>
                        {e.tx.slice(0, 12)}…{e.tx.slice(-6)} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <dialog ref={modal} className={w.dialog} aria-labelledby="slither-title">
          <div className={s.heading}>
            <span className={s.badge}>Slither Static Application Security Testing</span>
            <button aria-label="Tutup laporan Slither" onClick={() => modal.current?.close()}>
              <X size={16} />
            </button>
          </div>
          <h2 id="slither-title">Pratinjau laporan audit BansosLpjRegistry.sol</h2>
          <p>
            Belum ada audit dijalankan. Panel ini menggambarkan laporan yang akan ditampilkan
            setelah hasil SAST tersedia; bukan sertifikasi keamanan.
          </p>
          <pre
            className={w.terminal}
          >{`$ slither contracts/BansosLpjRegistry.sol\n\nStatus: NOT RUN — contoh struktur laporan\nAccess control / onlyAuthorizedKelurahan: BELUM DIUJI\nOwner rotation / onlyOwner: BELUM DIUJI\nReentrancy & unchecked calls: BELUM DIUJI\nTimestamp dependence & weak PRNG: BELUM DIUJI\n\nHigh: —    Medium: —    Low: —\nCompiler target: Solidity 0.8.24\nVersi Slither & jumlah detector: belum tersedia`}</pre>
          <button className={s.primary} onClick={() => modal.current?.close()}>
            Tutup laporan
          </button>
        </dialog>
      </div>
    </Dashboard>
  )
}
