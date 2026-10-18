import { Blocks, ClipboardList, FileText, ShieldCheck, Upload, Users } from 'lucide-react'

const steps = [
  {
    id: '01',
    label: 'Penetapan',
    icon: Users,
    actor: 'Data penerima',
    title: 'Data penerima ditentukan',
    description:
      'Penerima bantuan sosial ditetapkan sesuai kriteria program. Data ini menjadi dasar proses penyaluran bantuan.',
  },
  {
    id: '02',
    label: 'Penyaluran',
    icon: ClipboardList,
    actor: 'Pihak kelurahan',
    title: 'Penyaluran dicatat oleh kelurahan',
    description:
      'Pihak kelurahan mencatat proses penyaluran di sistem agar setiap bantuan memiliki riwayat yang dapat ditelusuri.',
  },
  {
    id: '03',
    label: 'Pembuktian',
    icon: Upload,
    actor: 'Dokumen penyaluran',
    title: 'Bukti penyaluran diunggah',
    description:
      'Dokumen dan bukti penyaluran diunggah ke dalam sistem sebagai pendukung catatan bantuan yang telah disalurkan.',
  },
  {
    id: '04',
    label: 'Pencatatan',
    icon: Blocks,
    actor: 'Jaringan blockchain',
    title: 'Transaksi tercatat di blockchain',
    description:
      'Catatan transaksi disimpan di blockchain sebagai jejak permanen yang dapat ditelusuri dan diperiksa integritasnya.',
  },
  {
    id: '05',
    label: 'Transparansi',
    icon: FileText,
    actor: 'Masyarakat',
    title: 'Laporan tersedia untuk publik',
    description:
      'Masyarakat dapat mengakses informasi penyaluran secara terbuka untuk mendukung pengawasan, dengan tetap menjaga privasi penerima.',
  },
] as const

export function SystemFlow() {
  return (
    <section
      id="alur-sistem"
      aria-labelledby="system-flow-title"
      className="mx-auto mt-12 w-[calc(100%-40px)] max-w-7xl border min-[641px]:mt-16 min-[641px]:w-[calc(100%-48px)] min-[769px]:w-[calc(100%-64px)] min-[1025px]:mt-20 min-[1025px]:w-[calc(100%-112px)]"
    >
      <header className="border-b px-6 py-8 min-[641px]:p-8 min-[1025px]:p-10">
        <p className="mb-5 font-mono text-xs text-primary-hover">
          03 / Dari penetapan hingga pelaporan
        </p>
        <h2
          id="system-flow-title"
          className="font-sans text-3xl leading-tight tracking-tight min-[641px]:text-4xl min-[1025px]:text-5xl"
        >
          Alur sistem<span className="text-primary-hover">/</span>
        </h2>
      </header>
      <div className="flex flex-col min-[769px]:flex-row">
        <aside
          className="border-b p-6 min-[641px]:p-8 min-[769px]:w-1/3 min-[769px]:shrink-0 min-[769px]:border-r min-[769px]:border-b-0 min-[1025px]:p-10"
          aria-label="Ringkasan alur"
        >
          <div className="min-[769px]:sticky min-[769px]:top-8">
            <div className="flex items-center justify-between gap-4 border bg-secondary p-4 font-mono text-xs">
              <span>5 tahap yang saling terhubung</span>
              <ClipboardList className="size-5 shrink-0 text-primary-hover" aria-hidden="true" />
            </div>
            <p className="mt-6 font-sans text-xl font-medium leading-snug tracking-tight">
              Setiap bantuan punya perjalanan yang jelas.
            </p>
            <p className="mt-4 font-mono text-xs leading-6 text-body-copy">
              Dari perencanaan hingga laporan publik, proses penyaluran dicatat secara sistematis
              dan transparan di BansosLedger.
            </p>
            <div className="mt-8 flex items-start gap-3 border-t pt-5 font-mono text-[10px] leading-5 text-body-copy">
              <ShieldCheck
                className="mt-0.5 size-5 shrink-0 text-primary-hover"
                aria-hidden="true"
              />
              <p>Transparansi penyaluran, tanpa membuka data pribadi penerima.</p>
            </div>
          </div>
        </aside>
        <ol className="min-w-0 flex-1 divide-y divide-border bg-surface">
          {steps.map(({ id, label, icon: Icon, actor, title, description }) => (
            <li
              key={id}
              className="grid gap-5 p-6 min-[641px]:p-8 min-[1025px]:grid-cols-[0.8fr_1.4fr] min-[1025px]:gap-8 min-[1025px]:p-10"
            >
              <div className="flex items-center gap-3 self-start">
                <span className="font-mono text-sm text-primary-hover">{id}</span>
                <span className="font-sans text-xl tracking-tight min-[1025px]:text-2xl">
                  {label}
                </span>
              </div>
              <div>
                <p className="mb-3 flex items-center gap-2 font-mono text-[11px] text-primary-hover">
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {actor}
                </p>
                <h3 className="font-sans text-xl font-medium leading-snug tracking-tight">
                  {title}
                </h3>
                <p className="mt-3 font-mono text-xs leading-6 text-body-copy">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
