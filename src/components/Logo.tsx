import { cn } from '@/lib/cn'

/** โลโก้ตัวอักษร: จันทร์เสี้ยว + ดาวกะพริบ */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-glow', className)}>
      <svg viewBox="0 0 24 24" className="size-5.5 text-white" fill="currentColor" aria-hidden>
        <path d="M14.5 3.2a8.8 8.8 0 1 0 6.3 14.9A7.4 7.4 0 0 1 14.5 3.2Z" />
      </svg>
      <span className="absolute top-1.5 right-1.5 size-1.5 animate-twinkle rounded-full bg-star-300 shadow-[0_0_6px_2px_rgb(255_208_107/0.7)]" />
    </span>
  )
}

export function Wordmark({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark />
      <span className="leading-tight">
        <span className={cn('block text-[17px] font-bold tracking-tight', light ? 'text-white' : 'text-ink')}>ชานชมดาว</span>
        <span className={cn('block text-[11px] font-medium tracking-[0.18em] uppercase', light ? 'text-white/45' : 'text-slate-400')}>
          Homestay
        </span>
      </span>
    </span>
  )
}
