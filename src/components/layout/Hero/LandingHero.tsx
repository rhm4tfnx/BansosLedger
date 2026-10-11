import {
  ArrowUpRight,
  Database,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

export function LandingHero() {
  return (
    <section
      className="relative overflow-hidden border-b bg-background font-mono"
      aria-labelledby="hero-title"
      id="beranda"
    >
      <img
        className="absolute inset-0 size-full object-cover object-[62%_center] min-[641px]:object-[65%_center] min-[769px]:object-[60%_center] min-[1025px]:object-center min-[1600px]:object-[center_56%]"
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hero1-uwdfNvOM9lgY9969xQV1tezZpcIQQT.png"
        alt="Keluarga Indonesia melihat dashboard transparansi bantuan sosial dengan latar kota Jakarta"
        fetchPriority="high"
        width={1942}
        height={809}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,#e9edecf2_0%,#e9edecdb_55%,#e9edecad_100%)] min-[641px]:bg-[linear-gradient(90deg,#e9edecf5_0%,#e9edece6_40%,#e9edec99_100%)] min-[769px]:bg-[linear-gradient(90deg,#e9edec_0%,#e9edecf0_26%,#e9edec90_43%,transparent_68%)] min-[1025px]:bg-[linear-gradient(90deg,#e9edec_0%,#e9edecf5_21%,#e9edecd9_32%,#e9edec40_47%,transparent_60%)]"
      />
      <div className="relative mx-auto min-h-[570px] w-[calc(100%-40px)] max-w-7xl pt-8 pb-[105px] min-[641px]:min-h-[560px] min-[641px]:w-[calc(100%-48px)] min-[641px]:pt-10 min-[641px]:pb-[100px] min-[769px]:min-h-[600px] min-[769px]:w-[calc(100%-64px)] min-[769px]:pt-[57px] min-[769px]:pb-[70px] min-[1025px]:min-h-[618px] min-[1025px]:w-[calc(100%-112px)] min-[1600px]:min-h-[680px] min-[1600px]:pt-20">
        <div className="relative max-w-[510px] min-[769px]:max-w-[535px]">
          <div className="inline-flex items-center gap-2 rounded-label border bg-secondary px-3 py-[7px] text-[11px] font-[550]">
            <ShieldCheck
              size={16}
              className="text-primary"
              aria-hidden="true"
            />
            <span>Sistem Transparansi Bantuan Sosial</span>
          </div>
          <h1
            id="hero-title"
            className="font-sans mt-5 mb-[19px] text-[clamp(32px,8.5vw,44px)] leading-[1.1] font-[760] tracking-[-1.6px] min-[641px]:text-[44px] min-[641px]:tracking-[-2px] min-[769px]:mt-[23px] min-[769px]:text-[clamp(38px,3.65vw,53px)] min-[769px]:tracking-[-2.5px]"
          >
            Transparansi
            <br />
            Penyaluran
            <br />
            Bantuan Sosial
            <br />
            <span className="whitespace-nowrap text-[.83em] text-primary-hover min-[769px]:text-[.91em]">
              Berbasis Blockchain.
            </span>
          </h1>
          <p className="max-w-[390px] text-[13px] leading-[1.85] text-body-copy min-[769px]:max-w-[399px] min-[769px]:text-sm">
            Bantuan yang tepat, kepercayaan yang terjaga. Pantau setiap
            penyaluran bantuan sosial secara terbuka, aman, dan dapat
            dipertanggungjawabkan.
          </p>
          <div className="mt-[23px] flex flex-wrap gap-[9px] min-[769px]:mt-[27px] min-[769px]:gap-3">
            <a
              className="inline-flex min-h-12 items-center justify-center gap-[7px] rounded-control border border-primary bg-primary px-[14px] py-[13px] text-[11px] font-[650] text-white transition-colors hover:bg-primary-hover min-[769px]:gap-2.5 min-[769px]:px-5 min-[769px]:py-[15px] min-[769px]:text-xs"
              href="#transparansi"
            >
              <Search size={18} aria-hidden="true" />
              Lihat Transparansi
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>
          <div className="mt-[23px] flex flex-wrap items-center gap-3 text-[9px] font-medium min-[641px]:gap-4 min-[769px]:mt-7 min-[769px]:gap-[23px] min-[769px]:text-[10px]">
            {[
              { icon: Database, label: "Data Terbuka" },
              { icon: ShieldCheck, label: "Tercatat di Blockchain" },
              { icon: Users, label: "Untuk Masyarakat" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-[7px] whitespace-nowrap"
              >
                <Icon
                  aria-hidden="true"
                  className="size-3.5 text-primary-hover min-[769px]:size-4"
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
