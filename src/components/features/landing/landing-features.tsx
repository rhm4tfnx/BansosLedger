import { Blocks, FileCheck2, History, LayoutDashboard, Search, ShieldCheck } from 'lucide-react'

const features = [
  {
    icon: Search,
    title: 'Informasi program',
    description:
      'Kenali jenis bantuan, persyaratan, dan tujuan program dalam informasi yang terstruktur.',
    label: 'Temukan informasi',
  },
  {
    icon: History,
    title: 'Riwayat penyaluran',
    description:
      'Telusuri tahapan dan catatan penyaluran untuk memahami perjalanan setiap bantuan.',
    label: 'Ikuti setiap tahap',
  },
  {
    icon: ShieldCheck,
    title: 'Privasi penerima',
    description:
      'Transparansi berfokus pada penyaluran, tanpa menampilkan data pribadi penerima kepada publik.',
    label: 'Tetap jaga privasi',
  },
] as const

export function LandingFeatures() {
  return (
    <section
      id="fitur"
      aria-labelledby="features-title"
      className="mx-auto mt-12 w-[calc(100%-40px)] max-w-7xl min-[641px]:mt-16 min-[641px]:w-[calc(100%-48px)] min-[769px]:w-[calc(100%-64px)] min-[1025px]:mt-20 min-[1025px]:w-[calc(100%-112px)]"
    >
      <header className="mb-8 flex flex-col gap-5 min-[769px]:flex-row min-[769px]:items-end min-[769px]:justify-between">
        <div>
          <p className="mb-5 font-mono text-xs text-primary-hover">02 / Fitur BansosLedger</p>
          <h2
            id="features-title"
            className="text-balance font-sans text-3xl leading-[1.15] tracking-tight min-[641px]:text-4xl min-[1025px]:text-5xl"
          >
            Satu platform.
            <br />
            <span className="font-light text-primary-hover">Bantuan lebih terbuka.</span>
          </h2>
        </div>
        <p className="max-w-sm font-mono text-xs leading-6 text-body-copy">
          Dari informasi program hingga bukti penyaluran, pahami bantuan melalui catatan yang saling
          terhubung.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 min-[769px]:grid-cols-5">
        <article className="flex flex-col border border-primary bg-primary p-6 text-white min-[641px]:p-8 min-[769px]:col-span-3 min-[1025px]:p-10">
          <div className="mb-8 flex items-center justify-between gap-4">
            <LayoutDashboard className="size-8" strokeWidth={1.5} aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-widest">
              Pantau penyaluran
            </span>
          </div>
          <h3 className="font-sans text-3xl font-medium tracking-tight min-[1025px]:text-4xl">
            Gambaran utuh,
            <br />
            dalam satu dashboard.
          </h3>
          <p className="mt-4 max-w-md font-mono text-xs leading-6">
            Lihat ringkasan program dan perkembangan penyaluran dalam satu tempat. Informasi lebih
            jelas untuk pengawasan yang lebih terarah.
          </p>
          <div className="mt-10 grid grid-cols-3 border-t border-white/30 pt-5 font-mono text-[10px] min-[641px]:text-xs">
            {['Program', 'Penyaluran', 'Ringkasan'].map((label, index) => (
              <div
                key={label}
                className="flex flex-col gap-2 border-r border-white/30 px-3 first:pl-0 last:border-r-0"
              >
                <span className="text-white/75">0{index + 1}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="flex flex-col border bg-surface p-6 min-[641px]:p-8 min-[769px]:col-span-2 min-[1025px]:p-10">
          <FileCheck2
            className="mb-8 size-8 text-primary-hover"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h3 className="font-sans text-2xl font-medium tracking-tight min-[1025px]:text-3xl">
            Bukti yang bisa diperiksa.
          </h3>
          <p className="mt-4 font-mono text-xs leading-6 text-body-copy">
            Pencatatan berbasis blockchain membantu penelusuran bukti transaksi dan pemeriksaan
            keaslian catatan penyaluran.
          </p>
          <div className="mt-auto flex items-center gap-3 pt-8 font-mono text-[10px] text-primary-hover">
            <Blocks className="size-5 shrink-0" aria-hidden="true" />
            <span>Catatan terhubung / jejak verifikasi</span>
          </div>
        </article>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 min-[769px]:grid-cols-3">
        {features.map(({ icon: Icon, title, description, label }) => (
          <article key={title} className="flex flex-col border bg-surface p-6 min-[641px]:p-8">
            <Icon className="mb-7 size-7 text-primary-hover" strokeWidth={1.5} aria-hidden="true" />
            <h3 className="font-sans text-xl font-medium tracking-tight min-[1025px]:text-2xl">
              {title}
            </h3>
            <p className="mt-3 font-mono text-xs leading-6 text-body-copy">{description}</p>
            <div className="mt-auto pt-6">
              <span className="inline-block rounded-label bg-secondary px-2.5 py-1.5 font-mono text-[10px]">
                {label}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
