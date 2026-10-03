"use client";

import { useState, type FormEvent } from "react";

type Status = "Terverifikasi" | "Menunggu" | "Perlu perbaikan";
type Recipient = { id: number; nama: string; wilayah: string; status: Status };

const statusClasses: Record<Status, string> = {
  Terverifikasi: "bg-success/10 text-success",
  Menunggu: "bg-warning/10 text-warning",
  "Perlu perbaikan": "bg-danger/10 text-danger",
};

const initialData: Recipient[] = [
  {
    id: 1,
    nama: "Penerima Contoh A",
    wilayah: "RT 001",
    status: "Terverifikasi",
  },
  { id: 2, nama: "Penerima Contoh B", wilayah: "RT 002", status: "Menunggu" },
  {
    id: 3,
    nama: "Penerima Contoh C",
    wilayah: "RT 003",
    status: "Perlu perbaikan",
  },
];

// Class ditulis utuh agar dapat dideteksi oleh Tailwind.
const palette = [
  ["background", "bg-background"],
  ["surface", "bg-surface"],
  ["foreground", "bg-foreground"],
  ["muted-foreground", "bg-muted-foreground"],
  ["border", "bg-border"],
  ["input", "bg-input"],
  ["primary", "bg-primary"],
  ["primary-hover", "bg-primary-hover"],
  ["primary-foreground", "bg-primary-foreground"],
  ["secondary", "bg-secondary"],
  ["secondary-hover", "bg-secondary-hover"],
  ["secondary-foreground", "bg-secondary-foreground"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["danger", "bg-danger"],
  ["info", "bg-info"],
] as const;

const fieldClass =
  "mt-2 h-12 w-full rounded-none border border-input bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function TestWarna() {
  const [recipients, setRecipients] = useState<Recipient[]>(initialData);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"Semua" | Status>("Semua");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filters: ("Semua" | Status)[] = [
    "Semua",
    "Terverifikasi",
    "Menunggu",
    "Perlu perbaikan",
  ];
  const visibleData = recipients.filter((item) => {
    const matchesQuery = `${item.nama} ${item.wilayah}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    return matchesQuery && (filter === "Semua" || item.status === filter);
  });
  const statistics = [
    {
      label: "Total penerima",
      value: recipients.length,
      color: "text-foreground",
    },
    {
      label: "Terverifikasi",
      value: recipients.filter((item) => item.status === "Terverifikasi")
        .length,
      color: "text-success",
    },
    {
      label: "Menunggu verifikasi",
      value: recipients.filter((item) => item.status === "Menunggu").length,
      color: "text-warning",
    },
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nama = String(data.get("nama") ?? "").trim();
    const wilayah = String(data.get("wilayah") ?? "").trim();

    if (!nama || !wilayah) {
      setMessage("");
      setError("Nama dan wilayah harus diisi.");
      const missingField = form.elements.namedItem(!nama ? "nama" : "wilayah");
      if (missingField instanceof HTMLInputElement) missingField.focus();
      return;
    }

    setRecipients((current) => [
      ...current,
      { id: current.length + 1, nama, wilayah, status: "Menunggu" },
    ]);
    setQuery("");
    setFilter("Semua");
    form.reset();
    setError("");
    setMessage(`Data contoh ${nama} berhasil ditambahkan.`);
  }

  return (
    <main className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <a
            href="#ringkasan"
            className={`flex items-center gap-3 ${focusClass}`}
          >
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center bg-primary text-xl font-bold text-surface"
            >
              b/
            </span>
            <span className="text-lg font-semibold tracking-tight">
              BansosLedger
            </span>
          </a>
          <nav
            aria-label="Navigasi pratinjau"
            className="flex items-center gap-5 text-sm font-medium"
          >
            <a href="#data" className={`py-3 hover:text-primary ${focusClass}`}>
              Data penerima
            </a>
            <a
              href="#palet"
              className={`py-3 hover:text-primary ${focusClass}`}
            >
              Palet warna <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl border-x border-border">
        <section
          id="ringkasan"
          className="scroll-mt-6 border-b border-border px-5 py-12 sm:px-8 lg:px-12 lg:py-16"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            BansosLedger / pratinjau tema
          </p>
          <h1 className="mt-8 text-4xl leading-tight font-medium tracking-tight sm:text-6xl">
            bantuan tercatat.
            <br />
            transparansi terjaga<span className="text-primary">/</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-foreground/70">
            Coba warna pada tombol, formulir, dan tabel. Semua data di halaman
            ini merupakan data contoh untuk pengujian tampilan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {/* text-surface menjaga teks tetap putih dengan token milikmu saat ini. */}
            <a
              href="#form"
              className={`inline-flex min-h-12 items-center gap-8 bg-primary px-5 font-medium text-surface transition-colors hover:bg-primary-hover ${focusClass}`}
            >
              Tambah penerima <span aria-hidden="true">↗</span>
            </a>
            <a
              href="#palet"
              className={`inline-flex min-h-12 items-center border border-border bg-secondary px-5 font-medium text-secondary-foreground transition-colors hover:bg-secondary-hover ${focusClass}`}
            >
              Lihat palet warna
            </a>
          </div>
        </section>

        <section
          aria-label="Ringkasan data contoh"
          className="grid divide-y divide-border border-b border-border bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          {statistics.map((item) => (
            <article key={item.label} className="p-6 sm:p-8">
              <p className="text-sm text-foreground/70">{item.label}</p>
              <p
                className={`mt-3 text-5xl font-medium tracking-tight tabular-nums ${item.color}`}
              >
                {item.value}
              </p>
            </article>
          ))}
        </section>

        <section
          id="data"
          className="grid scroll-mt-6 border-b border-border lg:grid-cols-5"
        >
          <div className="min-w-0 border-b border-border p-5 sm:p-8 lg:col-span-3 lg:border-r lg:border-b-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-medium tracking-tight">
                data penerima/
              </h2>
              <span className="bg-info/10 px-3 py-1 text-xs font-medium text-info">
                Data contoh
              </span>
            </div>
            <label
              htmlFor="demo-search"
              className="mt-6 block text-sm font-medium"
            >
              Cari penerima
            </label>
            <input
              id="demo-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama atau wilayah..."
              className={fieldClass}
            />
            <div
              role="group"
              aria-label="Filter status"
              className="mt-4 flex flex-wrap gap-2"
            >
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={filter === item}
                  onClick={() => setFilter(item)}
                  className={`min-h-11 border px-3 text-sm transition-colors ${focusClass} ${filter === item ? "border-primary bg-primary text-surface" : "border-border bg-surface text-foreground hover:bg-secondary"}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <p aria-live="polite" className="mt-5 text-sm text-foreground/70">
              Menampilkan {visibleData.length} dari {recipients.length}{" "}
              penerima.
            </p>
            <div className="mt-3 overflow-x-auto border border-border bg-surface">
              <table className="w-full min-w-120 text-left text-sm">
                <caption className="sr-only">
                  Daftar penerima fiktif untuk menguji warna antarmuka
                </caption>
                <thead className="border-b border-border bg-secondary">
                  <tr>
                    {["Nama", "Wilayah", "Status"].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-4 py-4 font-medium text-secondary-foreground"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleData.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-background"
                    >
                      <td className="max-w-60 px-4 py-5 font-medium wrap-anywhere">
                        {item.nama}
                      </td>
                      <td className="max-w-40 px-4 py-5 wrap-anywhere">
                        {item.wilayah}
                      </td>
                      <td className="px-4 py-5">
                        <span
                          className={`inline-flex px-2.5 py-1.5 text-xs font-medium whitespace-nowrap ${statusClasses[item.status]}`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {visibleData.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center">
                        Tidak ada data yang sesuai dengan pencarian atau filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div
            id="form"
            className="scroll-mt-6 bg-surface p-5 sm:p-8 lg:col-span-2"
          >
            <h2 className="text-2xl font-medium tracking-tight">
              uji formulir/
            </h2>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              Data baru akan masuk ke tabel dengan status menunggu.
            </p>
            <form
              noValidate
              onSubmit={handleSubmit}
              onReset={() => {
                setError("");
                setMessage("");
              }}
              className="mt-6 space-y-5"
            >
              <div>
                <label htmlFor="demo-name" className="text-sm font-medium">
                  Nama penerima <span className="text-danger">*</span>
                </label>
                <input
                  id="demo-name"
                  name="nama"
                  required
                  maxLength={80}
                  placeholder="Contoh: Penerima D"
                  aria-describedby={error ? "demo-error" : undefined}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="demo-area" className="text-sm font-medium">
                  Wilayah <span className="text-danger">*</span>
                </label>
                <input
                  id="demo-area"
                  name="wilayah"
                  required
                  maxLength={60}
                  placeholder="Contoh: RT 004"
                  aria-describedby={error ? "demo-error" : undefined}
                  className={fieldClass}
                />
              </div>
              {error && (
                <p
                  id="demo-error"
                  role="alert"
                  className="border-l-2 border-danger bg-danger/10 p-3 text-sm text-danger"
                >
                  {error}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className={`min-h-12 bg-primary px-5 text-sm font-medium text-surface transition-colors hover:bg-primary-hover ${focusClass}`}
                >
                  Simpan contoh <span aria-hidden="true">↗</span>
                </button>
                <button
                  type="reset"
                  className={`min-h-12 border border-input bg-secondary px-5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary-hover ${focusClass}`}
                >
                  Reset
                </button>
              </div>
            </form>
            <p role="status" className="mt-4 min-h-6 text-sm text-success">
              {message}
            </p>
            <p className="mt-5 border-l-2 border-info bg-info/10 p-4 text-sm leading-6 text-info">
              Mode demo: data hanya berada di halaman ini dan akan kembali ke
              contoh awal setelah halaman dimuat ulang.
            </p>
          </div>
        </section>

        <section id="palet" className="scroll-mt-6 p-5 sm:p-8">
          <h2 className="text-2xl font-medium tracking-tight">palet warna/</h2>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            Semua contoh berikut mengambil warna dari token globals.css kamu.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {palette.map(([name, className]) => (
              <div
                key={name}
                className="overflow-hidden border border-border bg-surface"
              >
                <div
                  aria-hidden="true"
                  className={`h-16 border-b border-border ${className}`}
                />
                <p className="p-3 font-mono text-xs leading-5 wrap-anywhere">
                  {name}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 border-l-2 border-warning bg-warning/10 p-4 text-sm leading-6">
            <p className="font-medium text-warning">
              Periksa pasangan warna tombol
            </p>
            <p className="mt-1 text-foreground">
              primary dan primary-foreground saat ini sama-sama hijau. Tombol
              demo memakai text-surface agar terbaca. Jika primary-foreground
              sudah diubah menjadi putih, gunakan text-primary-foreground pada
              tombol utama.
            </p>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Contoh teks muted-foreground — bandingkan keterbacaannya dengan teks
            utama.
          </p>
        </section>
        <footer className="flex flex-wrap justify-between gap-2 border-t border-border px-5 py-6 text-xs text-foreground/70 sm:px-8">
          <span>BansosLedger / eksplorasi antarmuka</span>
          <span>Seluruh nama dan jumlah adalah data contoh.</span>
        </footer>
      </div>
    </main>
  );
}
