import { Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-6 w-full border-t bg-surface min-[769px]:mt-8">
      <div className="grid grid-cols-1 border-b min-[769px]:grid-cols-[1.15fr_0.85fr]">
        <section className="border-b px-6 py-5 min-[641px]:px-8 min-[769px]:border-b-0 min-[769px]:border-r min-[769px]:px-10">
          <a
            href="#main"
            className="font-sans text-2xl font-medium tracking-tight text-primary-hover focus-visible:outline-primary"
          >
            BANSOSLEDGER
          </a>
          <p className="mt-2 max-w-md font-mono text-xs leading-5 text-body-copy">
            Sistem Pelaporan dan Penyaluran Bantuan Sosial Berbasis Blockchain
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] text-body-copy">
            <span className="inline-flex items-center gap-2">
              <Mail aria-hidden="true" className="size-3" /> dev@barru.go.id
            </span>
            <span className="inline-flex items-center gap-2">
              <Phone aria-hidden="true" className="size-3" /> Pusat Bantuan
              Sosial
            </span>
          </div>
        </section>
        <section className="px-6 py-5 min-[641px]:px-8 min-[769px]:px-10">
          <h2 className="font-sans text-base font-medium">Kontak & Lokasi</h2>
          <div className="mt-3 space-y-2 font-mono text-[10px] leading-5 text-body-copy">
            <p className="flex items-start gap-2">
              <Phone
                aria-hidden="true"
                className="mt-0.5 size-3 shrink-0 text-primary-hover"
              />{" "}
              (0410) 000 000
            </p>
            <p className="flex items-start gap-2">
              <Mail
                aria-hidden="true"
                className="mt-0.5 size-3 shrink-0 text-primary-hover"
              />{" "}
              dev@barru.go.id
            </p>
            <p className="flex items-start gap-2">
              <MapPin
                aria-hidden="true"
                className="mt-0.5 size-3 shrink-0 text-primary-hover"
              />{" "}
              Kabupaten Barru, Sulawesi Selatan
            </p>
          </div>
        </section>
      </div>
      <div className="flex flex-col justify-between gap-3 px-6 py-4 font-mono text-[10px] leading-5 text-body-copy min-[641px]:flex-row min-[641px]:items-center min-[641px]:px-8 min-[769px]:px-10">
        <p>Hak Cipta © 2026 BansosLedger. Dikembangkan oleh Rahmat Hidayat.</p>
        <p className="text-primary-hover">
          Kebijakan Privasi · Syarat & Ketentuan · Kode Terbuka
        </p>
      </div>
    </footer>
  );
}
