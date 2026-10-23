'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import s from '@/components/features/dashboard/recipients/recipients.module.css'
export function RecipientDialog({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = ref.current
    el?.showModal()
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      el?.close()
      document.body.style.overflow = old
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby="recipient-dialog-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={s.dialogInner}>
        <header>
          <div>
            <h2 id="recipient-dialog-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup dialog">
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
