import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { PublicShell, publicPanel } from './public-shell'
const faq = [
  ['Apa itu hash dan blok?', 'Hash adalah sidik digital data. TxHash mengidentifikasi transaksi. Blok adalah kumpulan transaksi yang dicatat bersama.'],
  ['Apakah status SUCCESS membuktikan bantuan diterima?', 'Tidak. Status menunjukkan pencatatan berhasil, bukan membuktikan kejadian di lapangan. Bukti dan pengawasan tetap diperlukan.'],
  ['Apa arti CID dan DITARIK?', 'CID adalah pengenal konten IPFS. DITARIK berarti bukti ditarik dari tampilan aplikasi; salinan pada node IPFS lain belum tentu hilang.'],
  ['Mengapa transaksi tidak ditemukan?', 'Explorer ini memakai data ilustrasi. Periksa TxHash lengkap dan jaringan yang digunakan; hubungi petugas jika data tidak cocok.'],
]
export function VerificationGuide() {
  return <PublicShell title="Cara memeriksa transaksi"><section className={publicPanel}><ol className="flex flex-col gap-6">{[
    <>Buka <Link href="/cek-status" className="text-primary underline">cek status</Link> untuk mendapatkan referensi transaksi.</>,
    <>Salin TxHash lengkap. <abbr title="Hash: sidik digital yang mengidentifikasi transaksi">Hash</abbr> berawalan 0x dan memiliki 66 karakter.</>,
    <>Buka <Link href="/explorer" className="text-primary underline">explorer</Link>, tempel TxHash lalu cari. <abbr title="Blok: kumpulan transaksi yang dicatat bersama">Blok</abbr> menunjukkan lokasi pencatatannya.</>,
    <>Cocokkan program, periode, nominal, dan CID bukti. Periksa waktu WITA dan UTC; jangan hanya mengandalkan label SUCCESS.</>,
  ].map((step,i) => <li key={i} className="text-sm leading-6"><span className="mr-2 font-mono text-primary">0{i+1}</span>{step}</li>)}</ol></section><section className="border"><header className="border-b border-primary p-6"><p className="font-mono text-xs text-primary">pertanyaan-umum/</p><h2 className="mt-4 text-3xl font-medium">Yang perlu Anda ketahui.</h2></header><div className="divide-y">{faq.map(([question,answer],i) => <details key={question} name="verification-faq" open={i===0} className="group open:bg-surface"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-6 py-6 font-sans text-base font-medium leading-relaxed focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary min-[641px]:px-8 min-[1025px]:px-10 [&::-webkit-details-marker]:hidden"><span>{question}</span><ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" /></summary><p className="px-6 pb-7 font-mono text-xs leading-6 text-body-copy min-[641px]:px-8 min-[1025px]:px-10">{answer}</p></details>)}</div></section></PublicShell>
}
