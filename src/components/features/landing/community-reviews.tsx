'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Quote, Star } from 'lucide-react'

const reviews = [
  {
    name: 'Ibu A.',
    initials: 'IA',
    role: 'Penerima bantuan pangan',
    title: 'Informasi lebih mudah dipahami',
    text: 'Ringkasan program membantu saya memahami bantuan yang tersedia dan informasi penyalurannya.',
  },
  {
    name: 'Bapak R.',
    initials: 'BR',
    role: 'Warga Kabupaten Barru',
    title: 'Tidak perlu menebak status',
    text: 'Tampilan pengecekan yang sederhana membuat langkah mencari informasi bantuan terasa lebih jelas.',
  },
  {
    name: 'Ibu N.',
    initials: 'IN',
    role: 'Penerima bantuan sosial',
    title: 'Catatan bantuan lebih terbuka',
    text: 'Tanggal dan rincian bantuan yang ditampilkan membantu saya membaca riwayat penyaluran dengan lebih mudah.',
  },
  {
    name: 'Bapak H.',
    initials: 'BH',
    role: 'Pendamping masyarakat',
    title: 'Membantu mendampingi warga',
    text: 'Informasi yang tersusun rapi memudahkan saya menjelaskan alur bantuan kepada masyarakat.',
  },
  {
    name: 'Ibu S.',
    initials: 'IS',
    role: 'Warga Sulawesi Selatan',
    title: 'Lebih nyaman mencari informasi',
    text: 'Bahasa yang sederhana dan navigasi yang jelas membuat informasi program lebih mudah ditemukan.',
  },
  {
    name: 'Bapak M.',
    initials: 'BM',
    role: 'Pengamat layanan publik',
    title: 'Transparansi yang mudah diikuti',
    text: 'Ringkasan penyaluran dan jejak pencatatan membantu masyarakat memahami bagaimana bantuan dilaporkan.',
  },
]

export function CommunityReviews() {
  const track = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  useEffect(() => {
    const element = track.current
    if (!element) return
    const update = () =>
      setEdges({
        start: element.scrollLeft <= 2,
        end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
      })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    element.addEventListener('scroll', update, { passive: true })
    update()
    return () => {
      observer.disconnect()
      element.removeEventListener('scroll', update)
    }
  }, [])

  function scroll(direction: number) {
    const element = track.current
    if (!element) return
    const card = element.firstElementChild as HTMLElement | null
    element.scrollBy({
      left: direction * ((card?.offsetWidth ?? element.clientWidth) + 16),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
  }

  return (
    <section
      id="ulasan-warga"
      aria-labelledby="reviews-title"
      className="mx-auto mt-12 w-[calc(100%-40px)] max-w-7xl border bg-surface min-[641px]:mt-16 min-[641px]:w-[calc(100%-48px)] min-[769px]:w-[calc(100%-64px)] min-[1025px]:mt-20 min-[1025px]:w-[calc(100%-112px)]"
    >
      <header className="px-6 pt-8 text-center min-[641px]:px-8 min-[1025px]:pt-10">
        <p className="mb-4 font-mono text-xs text-primary-hover">
          Dari masyarakat, untuk masyarakat
        </p>
        <h2
          id="reviews-title"
          className="font-sans text-3xl leading-tight tracking-tight min-[641px]:text-4xl min-[1025px]:text-5xl"
        >
          Suara & ulasan warga<span className="text-primary-hover">/</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-mono text-xs leading-6 text-body-copy">
          Perspektif warga tentang akses informasi dan transparansi bantuan sosial.
        </p>
        <p className="mt-3 font-mono text-[10px] leading-5 text-body-copy">
          Pratinjau desain · Seluruh nama, penilaian, dan ulasan berikut adalah ilustrasi, bukan
          testimoni penerima nyata.
        </p>
      </header>
      <div className="px-6 min-[641px]:px-8 min-[1025px]:px-10">
        <div
          ref={track}
          id="reviews-track"
          role="region"
          aria-label="Daftar contoh ulasan, geser untuk melihat lainnya"
          tabIndex={0}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pt-8 pb-6 focus-visible:outline-2 focus-visible:outline-primary [scrollbar-color:var(--color-primary)_transparent] [scrollbar-width:thin]"
        >
          {reviews.map((review, index) => (
            <article
              key={review.initials}
              aria-label={`Contoh ulasan ${index + 1} dari ${reviews.length}`}
              className={`flex w-[88%] shrink-0 snap-start flex-col rounded-control border p-6 min-[641px]:w-[calc((100%-16px)/2)] min-[1025px]:w-[calc((100%-32px)/3)] min-[1440px]:w-[calc((100%-48px)/4)] ${index % 3 === 0 ? 'bg-primary/5' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-control bg-primary/10 text-primary-hover">
                  <Quote className="size-4" aria-hidden="true" />
                </span>
                <span
                  className="flex gap-1 text-primary-hover"
                  aria-label="Penilaian ilustrasi: 5 dari 5"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className="size-3 fill-current" aria-hidden="true" />
                  ))}
                </span>
              </div>
              <h3 className="mt-6 font-sans text-lg font-medium leading-snug tracking-tight">
                {review.title}
              </h3>
              <blockquote className="mt-3 mb-6 flex-1 font-mono text-xs leading-6 text-body-copy">
                &ldquo;{review.text}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3 border-t pt-4">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs text-primary-hover"
                >
                  {review.initials}
                </span>
                <div>
                  <p className="font-sans text-sm font-medium">{review.name}</p>
                  <p className="mt-1 font-mono text-[10px] leading-4 text-body-copy">
                    {review.role}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t px-6 py-4 min-[641px]:px-8 min-[1025px]:px-10">
        <p className="font-mono text-[10px] leading-5 text-body-copy">
          6 ulasan ilustrasi · Geser untuk melihat lainnya
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            disabled={edges.start}
            aria-label="Ulasan sebelumnya"
            aria-controls="reviews-track"
            className="flex size-10 items-center justify-center rounded-control border text-primary-hover transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            disabled={edges.end}
            aria-label="Ulasan berikutnya"
            aria-controls="reviews-track"
            className="flex size-10 items-center justify-center rounded-control border border-primary bg-primary text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}
