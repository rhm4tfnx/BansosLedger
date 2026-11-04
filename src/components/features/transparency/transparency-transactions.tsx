'use client'

import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const batches = [
  {
    time: '14:28:05',
    program: 'BLT-K Kelurahan',
    amount: 102000000,
    count: 1020,
    unit: 100000,
    status: 'Berhasil',
  },
  {
    time: '12:15:30',
    program: 'PKH',
    amount: 75500000,
    count: 151,
    unit: 500000,
    status: 'Berhasil',
  },
  {
    time: '09:45:12',
    program: 'Sembako / BPNT',
    amount: 31500000,
    count: 210,
    unit: 150000,
    status: 'Berhasil',
  },
  {
    time: '08:02:44',
    program: 'Bantuan Lansia',
    amount: 9000000,
    count: 45,
    unit: 200000,
    status: 'Berhasil',
  },
  {
    time: '06:30:15',
    program: 'BLT-K Kelurahan',
    amount: 10000000,
    count: 100,
    unit: 100000,
    status: 'Berhasil',
  },
  {
    time: '04:18:52',
    program: 'Bantuan Disabilitas',
    amount: 6500000,
    count: 26,
    unit: 250000,
    status: 'Tertunda',
  },
]
export const rupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)

export function TransparencyTransactions() {
  const [selected, setSelected] = useState<number | null>(null)
  const batch = selected === null ? null : batches[selected]
  return (
    <section id="transaksi" className="scroll-mt-24">
      <header className="mb-6">
        <p className="text-xs font-mono text-primary">03 / JEJAK PENYALURAN</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Penyaluran terkini & audit trail</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Satu baris mewakili satu batch. Pilih detail untuk melihat ringkasan penyaluran.
        </p>
      </header>
      <div data-reveal className="overflow-hidden rounded-control border bg-white">
        <div className="flex flex-wrap justify-between gap-2 border-b p-5">
          <h3 className="font-semibold">Batch penyaluran • 10 Oktober 2026</h3>
          <span className="text-xs text-muted-foreground">6 batch ilustrasi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="bg-secondary text-xs text-muted-foreground">
              <tr>
                {['WAKTU / BATCH', 'PROGRAM', 'TOTAL NOMINAL', 'STATUS', 'DETAIL'].map((x) => (
                  <th key={x} className="px-5 py-4 font-medium">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map((item, index) => (
                <tr key={index} className="border-t transition-colors hover:bg-secondary/50">
                  <td className="px-5 py-5">
                    {item.time} WIB
                    <span className="mt-1 block font-mono text-xs text-muted-foreground">
                      DEMO-BATCH-00{index + 1}
                    </span>
                  </td>
                  <td className="px-5 py-5">{item.program}</td>
                  <td className="px-5 py-5 font-mono text-xs font-semibold">
                    {rupiah(item.amount)}
                  </td>
                  <td className="px-5 py-5">
                    <span className="rounded-label bg-secondary px-3 py-1 text-xs text-primary">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-5 py-5">
                    <button
                      className="flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                      aria-label={`Detail ${item.program} ${item.time}`}
                      onClick={() => setSelected(index)}
                    >
                      Detail <ArrowUpRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-control border bg-white text-foreground shadow-2xl sm:max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle>Detail batch penyaluran</DialogTitle>
            <DialogDescription>
              Data ilustrasi — bukan transaksi blockchain yang sebenarnya.
            </DialogDescription>
          </DialogHeader>
          {batch && (
            <div className="flex flex-col gap-6">
              <div className="rounded-control border bg-secondary p-4">
                <p className="text-xs font-mono text-primary">DEMO-BATCH-00{selected! + 1}</p>
                <h3 className="mt-2 text-lg font-semibold">{batch.program}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  10 Oktober 2026 • {batch.time} WIB
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Penerima', batch.count.toLocaleString('id-ID')],
                  ['Total nominal', rupiah(batch.amount)],
                  ['Nominal / unit', rupiah(batch.unit)],
                  ['Status', batch.status],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-control border p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-2 break-words font-semibold text-primary">{value}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-semibold">Verifikasi bukti digital</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  TxHash, nomor blok, Merkle root, dan CID IPFS belum tersedia. Tautan bukti akan
                  tersedia setelah sumber blockchain terhubung.
                </p>
              </div>
              <div>
                <h3 className="mb-3 font-semibold">Contoh transaksi • 5 dari {batch.count}</h3>
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="p-3">Commitment penerima</th>
                      <th className="p-3">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['0x12ab…9f3c', '0x34cd…8e2b', '0x56ef…7d1a', '0x789a…6c0f', '0x90bc…5b8e'].map((hash) => (
                      <tr key={hash} className="border-b">
                        <td className="p-3 font-mono text-xs">{hash}</td>
                        <td className="p-3">{rupiah(batch.unit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
