import Image from 'next/image'

const benefits = [
  {
    title: 'Transparansi yang terbuka',
    description:
      'Informasi program dan ringkasan penyaluran dapat diakses masyarakat. Ketahui ke mana bantuan disalurkan tanpa membuka data pribadi penerima.',
    label: 'Akses informasi publik',
  },
  {
    title: 'Catatan yang dapat diverifikasi',
    description:
      'Pencatatan berbasis blockchain membantu memeriksa keaslian riwayat transaksi dan mendeteksi perubahan pada bukti penyaluran.',
    label: 'Verifikasi berbasis blockchain',
  },
  {
    title: 'Penyaluran lebih terlacak',
    description:
      'Ikuti tahapan bantuan dari program hingga penyaluran. Riwayat yang terhubung membantu memahami setiap langkah dalam satu alur.',
    label: 'Riwayat penyaluran',
  },
  {
    title: 'Pengawasan lebih mudah',
    description:
      'Catatan yang terstruktur memudahkan penelusuran dan pemeriksaan. Informasi yang jelas menjadi dasar evaluasi penyaluran bantuan.',
    label: 'Mendukung akuntabilitas',
  },
  {
    title: 'Berpusat pada masyarakat',
    description:
      'Informasi disajikan dengan bahasa yang mudah dipahami, agar masyarakat dapat mengikuti perkembangan bantuan dan ikut mengawasi penyalurannya.',
    label: 'Untuk kepentingan bersama',
  },
] as const

export function WhyBansosLedger() {
  return (
    <section
      id="mengapa-bansosledger"
      aria-labelledby="why-bansosledger-title"
      className="mx-auto mt-12 w-[calc(100%-40px)] max-w-7xl border-x border-t min-[641px]:mt-16 min-[641px]:w-[calc(100%-48px)] min-[769px]:w-[calc(100%-64px)] min-[1025px]:mt-20 min-[1025px]:w-[calc(100%-112px)]"
    >
      <header className="flex flex-col border-b bg-surface min-[769px]:flex-row">
        <div className="flex flex-col gap-5 p-6 min-[641px]:p-8 min-[769px]:w-3/5 min-[1025px]:gap-7 min-[1025px]:p-10">
          <p className="font-mono text-xs text-primary-hover">01 / Mengapa BansosLedger</p>
          <h2
            id="why-bansosledger-title"
            className="text-balance font-sans text-3xl leading-[1.15] tracking-tight min-[641px]:text-4xl min-[1025px]:text-5xl"
          >
            Bantuan yang transparan.
            <br />
            <span className="font-light text-primary-hover">Kepercayaan yang tumbuh.</span>
          </h2>
        </div>
        <div className="relative min-h-56 overflow-hidden border-t min-[769px]:w-2/5 min-[769px]:border-t-0 min-[769px]:border-l">
          <Image
            src="/images/digital-government.png"
            alt="Ilustrasi gedung pemerintahan yang terhubung dengan catatan digital dan masyarakat."
            width={1536}
            height={1024}
            sizes="(max-width: 768px) 100vw, 40vw"
            className="h-full w-full object-cover"
          />
        </div>
      </header>
      <div className="grid grid-cols-1 border-b bg-surface min-[769px]:grid-cols-2">
        {[
          { title: 'Informasi yang bisa ditelusuri', items: benefits.slice(0, 3), start: 1 },
          { title: 'Pengawasan untuk kepentingan bersama', items: benefits.slice(3), start: 4 },
        ].map(({ title, items, start }) => (
          <div
            key={title}
            className="border-b p-6 last:border-b-0 min-[641px]:p-8 min-[769px]:border-r min-[769px]:border-b-0 min-[769px]:last:border-r-0 min-[1025px]:p-10"
          >
            <h3 className="mb-6 font-sans text-xl font-medium tracking-tight">{title}</h3>
            <ol start={start} className="divide-y divide-dotted divide-border">
              {items.map(({ title: benefitTitle, description }, index) => (
                <li key={benefitTitle} className="flex gap-5 py-6 min-[1025px]:gap-7">
                  <span
                    aria-hidden="true"
                    className="pt-0.5 font-mono text-sm font-medium text-primary-hover"
                  >
                    {start + index}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-sans text-base font-medium leading-relaxed">
                      {benefitTitle}
                    </h4>
                    <p className="mt-2 font-mono text-xs leading-6 text-body-copy">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  )
}
