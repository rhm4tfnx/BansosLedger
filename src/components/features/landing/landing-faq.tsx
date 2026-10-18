import { ChevronDown, MessagesSquare } from 'lucide-react'

const questions = [
  {
    question: 'Apa itu BansoLedger dan bagaimana cara kerjanya?',
    answer:
      'BansosLedger adalah konsep platform untuk membantu penelusuran penyaluran bantuan sosial. Alurnya dimulai dari penetapan penerima, pencatatan penyaluran oleh kelurahan, unggah bukti, pencatatan referensi transaksi di blockchain, hingga laporan publik. Tampilan saat ini masih berupa prototipe dengan data demo, belum terhubung ke penyaluran nyata.',
  },
  {
    question: 'Mengapa penyaluran bansos memerlukan teknologi Blockchain dan Smart Contract?',
    answer:
      'Blockchain bukan syarat wajib penyaluran bansos, tetapi dapat membantu menyediakan jejak pencatatan bersama yang perubahan datanya dapat ditelusuri. Smart contract dapat menjalankan aturan pencatatan dan validasi yang telah disepakati. Keduanya tidak menjamin data masukan benar atau bantuan benar-benar diterima; verifikasi lapangan dan pengawasan tetap diperlukan. Integrasi tersebut belum aktif pada prototipe ini.',
  },
  {
    question: 'Bagaimana BansoLedger melindungi data privasi penerima bantuan?',
    answer:
      'Rancangan privasinya memisahkan informasi publik dari data pribadi penerima. NIK, alamat lengkap, dan foto yang mengidentifikasi seseorang tidak semestinya dipublikasikan atau disimpan langsung pada blockchain. Data sensitif perlu disimpan di luar blockchain dengan pembatasan akses, enkripsi, dan kebijakan retensi; blockchain cukup menyimpan referensi atau hash sesuai kebutuhan. Perlindungan ini harus diimplementasikan dan diuji sebelum sistem menggunakan data nyata.',
  },
  {
    question: 'Bagaimana cara masyarakat membuktikan keaslian data pelaporan di sistem ini?',
    answer:
      'Pada sistem yang telah terintegrasi, masyarakat dapat membandingkan hash dokumen yang dipublikasikan dengan hash yang tercatat pada transaksi blockchain, lalu memeriksa status transaksi pada jaringan terkait. Kecocokan hash menunjukkan dokumen tidak berubah sejak dicatat, bukan membuktikan kebenaran isi atau kejadian di lapangan. Hash dan referensi bukti pada halaman ini masih contoh; verifikasi on-chain belum tersedia.',
  },
  {
    question: 'Apakah sistem ini sudah teruji kelayakan dan keamanannya?',
    answer:
      'Belum ada laporan audit keamanan atau hasil uji kelayakan independen yang tersedia untuk prototipe ini. Sebelum digunakan secara operasional, sistem memerlukan pengujian fungsional, kontrol akses, privasi, beban, pemulihan data, serta audit smart contract dan infrastruktur. Data demo dan tampilan status pada halaman ini bukan bukti sertifikasi atau jaminan keamanan.',
  },
]

export function LandingFaq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="mx-auto mt-12 w-[calc(100%-40px)] max-w-7xl border min-[641px]:w-[calc(100%-48px)] min-[769px]:mt-16 min-[769px]:w-[calc(100%-64px)] min-[1025px]:w-[calc(100%-112px)]"
    >
      <div className="flex flex-col min-[769px]:flex-row">
        <div className="flex flex-col justify-between gap-10 bg-primary p-6 text-white min-[641px]:p-8 min-[769px]:w-[30%] min-[769px]:shrink-0 min-[1025px]:p-10">
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-xs tracking-widest">PUSAT INFORMASI</span>
            <MessagesSquare aria-hidden="true" className="size-6 shrink-0" strokeWidth={1.5} />
          </div>
          <div>
            <p
              aria-hidden="true"
              className="font-mono text-6xl tracking-tighter min-[1025px]:text-7xl"
            >
              FAQ/
            </p>
            <p className="mt-5 max-w-60 font-mono text-xs leading-6">
              Kenali sistemnya.
              <br />
              Pahami transparansinya.
            </p>
            <p className="mt-8 border-t border-white/30 pt-4 font-mono text-[10px] tracking-wider">
              05 PERTANYAAN UTAMA
            </p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <header className="flex min-h-48 flex-col justify-end border-b border-primary p-6 min-[641px]:p-8 min-[1025px]:min-h-56 min-[1025px]:p-10">
            <p className="mb-4 font-mono text-xs text-primary-hover">pertanyaan-umum/</p>
            <h2
              id="faq-title"
              className="font-sans text-3xl font-medium leading-tight tracking-tight min-[641px]:text-4xl min-[1025px]:text-5xl"
            >
              Yang perlu
              <br />
              Anda ketahui.
            </h2>
          </header>
          <div className="divide-y">
            {questions.map(({ question, answer }, index) => (
              <details
                key={question}
                name="bansos-faq"
                open={index === 0}
                className="group open:bg-surface"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-6 py-6 font-sans text-base font-medium leading-relaxed focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary min-[641px]:px-8 min-[1025px]:px-10 [&::-webkit-details-marker]:hidden">
                  <span>{question}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <p className="px-6 pb-7 font-mono text-xs leading-6 text-body-copy min-[641px]:px-8 min-[1025px]:px-10">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
