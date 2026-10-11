import { ShieldCheck, Database, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const container =
  "mx-auto w-[calc(100%-40px)] max-w-7xl min-[641px]:w-[calc(100%-48px)] min-[769px]:w-[calc(100%-64px)] min-[1025px]:w-[calc(100%-112px)]";

const reasons = [
  {
    icon: ShieldCheck,
    title: "Keamanan Terjamin",
    description:
      "Setiap transaksi diamankan dengan teknologi enkripsi blockchain yang tidak dapat diubah.",
  },
  {
    icon: Database,
    title: "Data Transparan",
    description:
      "Publik dapat memantau alur penyaluran dana secara real-time tanpa manipulasi.",
  },
  {
    icon: Zap,
    title: "Penyaluran Cepat",
    description:
      "Proses verifikasi otomatis memangkas birokrasi, bantuan sampai lebih cepat.",
  },
];

export function LandingWhy() {
  return (
    <section className={cn(container, "py-12 md:py-20")} id="mengapa">
      <h2 className="mb-10 text-center text-3xl font-medium tracking-[-1px] text-primary-hover md:text-4xl">
        Mengapa BansosLedger?
      </h2>
      <div className="grid grid-cols-1 gap-px bg-border border border-b-0 md:grid-cols-3">
        {reasons.map(({ icon: Icon, title, description }) => (
          <article className="bg-background p-8" key={title}>
            <div className="mb-5 grid size-12 place-items-center rounded-label bg-secondary text-primary">
              <Icon size={28} />
            </div>
            <h3 className="mb-2 text-lg font-[550]">{title}</h3>
            <p className="text-sm leading-relaxed text-body-copy">
              {description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
