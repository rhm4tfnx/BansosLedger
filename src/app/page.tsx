import { Benefits, Footer, Header, Hero, Statistics } from "../components/landing/landing-page";

export default function Page() {
  return (
    <div className="page-frame" id="beranda">
      <a href="#tentang" className="skip-link">Lewati ke konten utama</a>
      <Header />
      <main>
        <Hero />
        <Statistics />
        <Benefits />
      </main>
      <Footer />
    </div>
  );
}
