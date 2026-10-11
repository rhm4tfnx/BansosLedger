import {
  CircleCheck,
  FileText,
  LayoutGrid,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statistics = [
  {
    icon: LayoutGrid,
    title: "Program Aktif",
    value: "6",
    description: "Program bantuan sosial berjalan",
    color: "bg-success/15 text-primary",
  },
  {
    icon: Users,
    title: "Total Penerima",
    value: "1.248",
    description: "Penerima manfaat di seluruh wilayah",
    color: "bg-success/15 text-primary",
  },
  {
    icon: CircleCheck,
    title: "Penyaluran Selesai",
    value: "1.102",
    description: "Penerima telah menerima bantuan",
    color: "bg-warning/20 text-primary",
  },
  {
    icon: FileText,
    title: "Transaksi Tercatat",
    value: "3.521",
    description: "Transaksi tercatat di blockchain",
    color: "bg-danger/10 text-danger",
  },
];

export function LandingStatistics() {
  return (
    <section
      className="relative mx-auto w-[calc(100%-40px)] max-w-7xl scroll-mt-8 font-mono min-[641px]:w-[calc(100%-48px)] min-[769px]:w-[calc(100%-64px)] min-[1025px]:w-[calc(100%-112px)]"
      id="transparansi"
      aria-label="Ringkasan transparansi bantuan sosial"
    >
      <div className="grid grid-cols-2 gap-px overflow-hidden border border-t-0 bg-border min-[769px]:grid-cols-4">
        {statistics.map(({ icon: Icon, title, value, description, color }) => (
          <article
            className="flex items-start gap-2.5 bg-background px-3 py-6 min-[769px]:gap-3 min-[769px]:px-4 min-[769px]:py-8 min-[1025px]:gap-4 min-[1025px]:px-5"
            key={title}
          >
            <div
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-label min-[769px]:size-10 min-[1025px]:size-12",
                color,
              )}
            >
              <Icon aria-hidden="true" className="size-5 min-[769px]:size-6" />
            </div>
            <div className="min-w-0">
              <h2 className="mb-1 text-[10px] font-semibold min-[769px]:text-[11px]">
                {title}
              </h2>
              <p className="text-[27px] leading-tight font-bold text-primary-hover tabular-nums min-[769px]:text-[31px]">
                {value}
              </p>
              <p className="mt-1 max-w-40 text-[10px] leading-relaxed text-body-copy">
                {description}
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3 border border-t-0 px-4 py-3.5 text-[10px] leading-relaxed text-body-copy">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck
            size={13}
            className="shrink-0 text-primary"
            aria-hidden="true"
          />
          Transparansi di setiap langkah penyaluran
        </span>
        <span>Ilustrasi data untuk pratinjau sistem</span>
      </div>
    </section>
  );
}
