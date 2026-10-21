import { useRef, type ReactNode } from 'react'
import { CalendarDays, Clock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDMY } from '@/lib/format'
import { control } from './Field'

type Props = {
  value: string
  onChange: (v: string) => void
  min?: string
  max?: string
  required?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * ช่องวันที่/เวลาที่แสดงรูปแบบเดียวกันทุกเครื่อง (วัน/เดือน/ปี พ.ศ. และ 24 ชม.)
 * ช่อง <input type="date"> ปกติจะแสดงตามภาษาเครื่อง เช่น เดือน/วัน/ปี บนเครื่องที่ตั้งเป็นอังกฤษ
 * จึงซ่อนช่องจริงไว้ แล้วเปิดตัวเลือกวันที่ของเครื่องเมื่อแตะ
 */
function PickerField({ type, display, placeholder, icon, ...p }: Props & { type: 'date' | 'time'; display: string; placeholder: string; icon: ReactNode }) {
  const ref = useRef<HTMLInputElement>(null)
  const open = () => {
    const el = ref.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      el.focus()
      el.click()
    }
  }
  return (
    <span className="relative block">
      <button
        type="button"
        onClick={open}
        aria-label={p['aria-label']}
        className={cn(control, 'flex h-12 items-center justify-between gap-2 text-left', p.className)}
      >
        <span className={cn('num truncate', !p.value && 'text-slate-400')}>{p.value ? display : placeholder}</span>
        <span className="shrink-0 text-slate-400 [&>svg]:size-4.5">{icon}</span>
      </button>
      <input
        ref={ref}
        type={type}
        value={p.value}
        min={p.min}
        max={p.max}
        required={p.required}
        onChange={(e) => p.onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />
    </span>
  )
}

export function DateField(props: Props) {
  return <PickerField {...props} type="date" display={props.value ? formatDMY(props.value) : ''} placeholder="วว/ดด/ปปปป" icon={<CalendarDays />} />
}

export function TimeField(props: Props) {
  return <PickerField {...props} type="time" display={props.value ? `${props.value.slice(0, 5)} น.` : ''} placeholder="--:--" icon={<Clock />} />
}
