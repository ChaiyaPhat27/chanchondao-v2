import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'

type Tone = 'slate' | 'brand' | 'emerald' | 'amber' | 'rose' | 'star' | 'violet'

const TONES: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-600',
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-600',
  star: 'bg-star-100 text-star-600',
  violet: 'bg-violet-50 text-violet-700',
}

export function Badge({ tone = 'slate', className, children, dot }: { tone?: Tone; className?: string; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', TONES[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <span className="mb-4 flex size-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 [&>svg]:size-7">{icon}</span>}
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-slate-500">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions, children }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 sm:text-[15px]">{subtitle}</p>}
      </div>
      {(actions || children) && <div className="flex flex-wrap items-center gap-2">{actions ?? children}</div>}
    </header>
  )
}

/** ปุ่มเลือกแบบแถบ (เช่น เดือน/สัปดาห์/วัน) มีไฮไลต์เลื่อนตามแบบนุ่ม ๆ */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  layoutId,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  className?: string
  layoutId: string
}) {
  return (
    <div className={cn('inline-flex rounded-2xl bg-slate-100 p-1', className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex-1 rounded-xl px-2 py-2 text-sm font-medium whitespace-nowrap transition-colors sm:px-4',
              active ? 'text-ink' : 'text-slate-500 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-white shadow-soft"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** ปุ่มลอยมุมขวาล่าง (มือถือเท่านั้น) สำหรับงานหลักของหน้า */
export function Fab({ onClick, label, icon }: { onClick: () => void; label: string; icon: ReactNode }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex h-14 items-center gap-2 rounded-full bg-brand-500 pr-5 pl-4 font-semibold text-white shadow-glow lg:hidden print:hidden [&>svg]:size-6"
    >
      {icon}
      {label}
    </motion.button>
  )
}

/** การ์ดตัวเลขสรุป */
export function Stat({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  loading,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: Tone
  loading?: boolean
}) {
  return (
    <div className="min-w-0 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-900/[0.04] sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[13px] leading-snug font-medium text-slate-500 sm:text-sm">{label}</p>
        {icon && <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-9 [&>svg]:size-4 sm:[&>svg]:size-4.5', TONES[tone])}>{icon}</span>}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p className="num mt-1.5 truncate text-[22px] leading-tight font-bold tracking-tight text-ink sm:mt-2 sm:text-[28px]">{value}</p>
      )}
      {hint && <p className="mt-1 truncate text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
