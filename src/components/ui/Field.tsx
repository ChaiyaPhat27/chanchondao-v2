import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

// มือถือใช้ 16px ไม่งั้น iPhone จะซูมเข้าเองตอนแตะช่องกรอก
export const control =
  'w-full rounded-2xl bg-white px-4 text-base sm:text-[15px] text-ink ring-1 ring-slate-200 transition-[box-shadow,background-color] duration-200 ' +
  'placeholder:text-slate-400 hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 ' +
  'disabled:bg-slate-50 disabled:text-slate-400'

export function Field({
  label,
  hint,
  error,
  children,
  className,
  aside,
}: {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
  aside?: ReactNode
}) {
  return (
    <label className={cn('block', className)}>
      {(label || aside) && (
        <span className="mb-1.5 flex items-center justify-between gap-2 text-[13px] font-medium text-slate-600">
          {label}
          {aside}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-rose-600">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>
      )}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { leading?: ReactNode; trailing?: ReactNode }>(
  function Input({ className, leading, trailing, ...rest }, ref) {
    if (!leading && !trailing) return <input ref={ref} className={cn(control, 'h-12', className)} {...rest} />
    return (
      <span className="relative block">
        {leading && <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400 [&>svg]:size-4.5">{leading}</span>}
        <input ref={ref} className={cn(control, 'h-12', leading && 'pl-10', trailing && 'pr-11', className)} {...rest} />
        {trailing && <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>}
      </span>
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(control, 'min-h-24 py-3', className)} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <span className="relative block">
      <select ref={ref} className={cn(control, 'h-12 appearance-none pr-10', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4.5 -translate-y-1/2 text-slate-400" />
    </span>
  )
})

/** ช่องกรอกเงินตัวใหญ่ */
export const MoneyInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function MoneyInput(
  { className, ...rest },
  ref,
) {
  return (
    <span className="relative block">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg font-semibold text-slate-400">฿</span>
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        step="any"
        className={cn(control, 'num h-14 pl-9 text-xl font-semibold', className)}
        {...rest}
      />
    </span>
  )
})
