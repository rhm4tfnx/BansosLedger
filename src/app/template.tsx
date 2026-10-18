import { ScrollReveal } from '@/components/ui/scroll-reveal'

export default function Template({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="page-transition">
      <ScrollReveal>{children}</ScrollReveal>
    </div>
  )
}
