import Image from "next/image";
import { ArrowDown, ArrowRight, ArrowUpRight, Blocks, Check, CheckCheck, CircleCheck, Database, Eye, FileCheck2, FileText, Fingerprint, HeartHandshake, LayoutGrid, Link2, MapPin, ShieldCheck, Users } from "lucide-react";

export function Brand() {
  return <a className="brand" href="#beranda" aria-label="BansosLedger — beranda"><span className="brand-symbol"><Blocks size={26} strokeWidth={1.7} /></span><span>Bansos<span className="brand-light">Ledger</span><span className="brand-dot">.</span></span></a>;
}

export function Header() {
  return <header className="site-header"><Brand /><nav aria-label="Navigasi utama"><a href="#tentang">Tentang</a><a href="#transparansi">Transparansi</a><a href="#mengapa">Mengapa BansosLedger <ArrowUpRight size={13} /></a></nav><a className="header-cta" href="#transparansi">Lihat data publik <ArrowUpRight size={17} /></a></header>;
}

function LedgerPreview() {
  return <div className="ledger-preview" aria-label="Ilustrasi catatan penyaluran bantuan"><div className="ledger-heading"><span><span className="live-dot" /> JEJAK PENYALURAN</span><span className="demo-tag">DEMO</span></div><div className="ledger-title"><div><small>Setiap bantuan, tercatat.</small><strong>Kepercayaan yang bisa dilihat.</strong></div><ShieldCheck size={28} /></div><div className="ledger-rows">{[{ icon: Users, title: "Penerima terverifikasi", detail: "Identitas penerima divalidasi", status: "Terverifikasi" }, { icon: HeartHandshake, title: "Bantuan tersalurkan", detail: "Bantuan diterima masyarakat", status: "Selesai" }, { icon: Link2, title: "Tercatat di blockchain", detail: "Jejak transaksi dapat ditelusuri", status: "Tercatat" }].map(({ icon: Icon, title, detail, status }) => <div className="ledger-row" key={title}><span className="ledger-icon"><Icon size={18} /></span><div><strong>{title}</strong><small>{detail}</small></div><span className="ledger-status"><Check size={12} />{status}</span></div>)}</div><div className="ledger-bottom"><Fingerprint size={14} /><span>Transparan dari awal hingga sampai tujuan</span><ArrowUpRight size={13} /></div></div>;
}

export function Hero() {
  return <section className="hero" id="tentang" aria-labelledby="hero-title"><div className="hero-copy"><div className="eyebrow"><span className="live-dot" /> SISTEM TRANSPARANSI BANTUAN SOSIAL</div><h1 id="hero-title">Bantuan tepat.<br />Jejak tercatat.<br /><span>Masyarakat percaya.</span></h1><p className="hero-description">Transparansi penyaluran bantuan sosial berbasis blockchain. Pantau setiap prosesnya, telusuri penyalurannya, dan bangun kepercayaan bersama BansosLedger.</p><div className="hero-actions"><a className="button button-primary" href="#transparansi">Lihat transparansi <ArrowUpRight size={18} /></a><a className="button button-secondary" href="#mengapa">Kenali BansosLedger <ArrowRight size={17} /></a></div><div className="hero-trust"><span><Database size={15} /> Data terbuka</span><span><ShieldCheck size={16} /> Berbasis blockchain</span><span><Users size={16} /> Untuk masyarakat</span></div></div><div className="hero-visual"><Image src="/images/bansos-community.png" alt="Ilustrasi keluarga Indonesia melihat lingkungan kelurahan yang hijau" fill priority sizes="(max-width: 800px) 100vw, 52vw" className="community-image" /><div className="visual-grid" /><LedgerPreview /><div className="community-note"><span><HeartHandshake size={21} /></span><div><strong>Teknologi untuk kepedulian.</strong><small>Karena setiap bantuan berarti.</small></div></div><div className="visual-coordinate"><span>TERBUKA. TERLACAK. TERPERCAYA.</span><span>01 / 03</span></div></div></section>;
}

const statistics = [
  { icon: LayoutGrid, value: "6", label: "Program aktif", description: "Program bantuan yang berjalan", color: "green" },
  { icon: Users, value: "1.248", label: "Total penerima", description: "Penerima manfaat terdaftar", color: "green" },
  { icon: CircleCheck, value: "1.102", label: "Penyaluran selesai", description: "Bantuan telah diterima", color: "yellow" },
  { icon: FileText, value: "3.521", label: "Transaksi tercatat", description: "Jejak penyaluran terdokumentasi", color: "pink" },
];

export function Statistics() {
  return <section className="statistics" id="transparansi" aria-labelledby="statistics-title"><div className="section-topline"><h2 id="statistics-title"><span className="section-number">01 /</span> Transparansi dalam angka</h2><span className="data-notice"><span /> Data ilustrasi · bukan data aktual</span></div><div className="statistics-grid">{statistics.map(({ icon: Icon, value, label, description, color }) => <article className="statistic" key={label}><div className="stat-top"><span>{label}</span><span className={`stat-icon ${color}`}><Icon size={20} strokeWidth={1.6} /></span></div><p className="stat-value">{value}<ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" /></p><p className="stat-description">{description}</p></article>)}</div><div className="statistics-footnote"><ShieldCheck size={14} /><p>Dirancang agar setiap penyaluran dapat dipantau dan dipertanggungjawabkan.</p><a href="#mengapa">Kenali prinsipnya <ArrowDown size={13} /></a></div></section>;
}

const benefits = [
  { icon: Eye, title: "Transparan", tagline: "Informasi terbuka untuk semua.", text: "Akses informasi penyaluran bantuan secara terbuka, mudah, dan tanpa batasan.", detail: "Ringkasan program dan penyaluran dirancang untuk dapat diakses publik tanpa menampilkan data pribadi sensitif penerima.", color: "green" },
  { icon: FileCheck2, title: "Terlacak", tagline: "Setiap proses punya jejak.", text: "Telusuri perjalanan bantuan, dari pencatatan hingga sampai ke penerima.", detail: "Setiap tahapan memiliki catatan status sehingga proses penyaluran dapat ditinjau secara runtut dari awal sampai selesai.", color: "blue" },
  { icon: ShieldCheck, title: "Aman", tagline: "Integritas data jadi prioritas.", text: "Teknologi blockchain membantu menjaga keaslian dan integritas catatan.", detail: "Jejak pencatatan berbasis blockchain dirancang untuk membantu mendeteksi perubahan data, dengan tetap menjaga kerahasiaan informasi pribadi.", color: "yellow" },
  { icon: CheckCheck, title: "Akuntabel", tagline: "Kepercayaan lewat bukti nyata.", text: "Dorong pengawasan bersama dan pertanggungjawaban setiap penyaluran.", detail: "Catatan yang dapat ditelusuri mendukung evaluasi program dan memberi masyarakat dasar informasi untuk ikut mengawasi penyaluran.", color: "pink" },
];

export function Benefits() {
  return <section className="benefits" id="mengapa" aria-labelledby="benefits-title"><div className="benefits-heading"><div><div className="eyebrow section-eyebrow"><span className="section-number">02 /</span> DIBANGUN UNTUK KEPERCAYAAN</div><h2 id="benefits-title">Mengapa BansosLedger<span className="brand-dot">?</span></h2><p>Bukan sekadar mencatat bantuan.<br />Membangun sistem yang lebih terbuka, adil, dan bisa dipercaya.</p></div><div className="public-note"><span className="public-note-icon"><Users size={23} strokeWidth={1.5} /></span><span>Dari teknologi,<br /><strong>untuk masyarakat.</strong></span><ArrowDown size={19} /></div></div><div className="benefits-grid">{benefits.map(({ icon: Icon, title, tagline, text, detail, color }, index) => <article className="benefit" key={title}><div className="benefit-top"><span className={`benefit-icon ${color}`}><Icon size={26} strokeWidth={1.5} /></span><span className="benefit-number">0{index + 1}</span></div><h3>{title}</h3><strong className="benefit-tagline">{tagline}</strong><p>{text}</p><details><summary>Pelajari lebih lanjut <ArrowUpRight size={16} /></summary><p>{detail}</p></details></article>)}</div></section>;
}

export function Footer() {
  return <footer className="site-footer"><Brand /><p>Transparansi yang mendekatkan kepercayaan.</p><span><MapPin size={13} /> Kelurahan Takkalasi</span></footer>;
}
