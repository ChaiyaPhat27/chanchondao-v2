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
 * จึงวางช่องจริงแบบโปร่งใสทับไว้ด้านบน ให้นิ้วแตะโดนช่องจริงเสมอ
 * (บางเครื่อง เช่น iPhone เปิดตัวเลือกด้วยโค้ดไม่ได้ ต้องแตะที่ช่องจริงเท่านั้น)
 * เลือกวันย้อนหลังหรือล่วงหน้าได้ทุกวัน เว้นแต่จะกำหนด min/max
 */
function PickerField({ type, display, placeholder, icon, ...p }: Props & { type: 'date' | 'time'; display: string; placeholder: string; icon: ReactNode }) {
  const ref = useRef<HTMLInputElement>(null)
  // คอมพิวเตอร์: คลิกตรงไหนก็เปิดปฏิทิน (ไม่ต้องเล็งไอคอนเล็ก ๆ) ถ้าเปิดไม่ได้ก็ปล่อยให้เครื่องจัดการเอง
  const open = () => {
    try {
      ref.current?.showPicker()
    } catch {
      /* เครื่องที่ไม่รองรับจะเปิดตัวเลือกเองจากการแตะ */
    }
  }
  return (
    <span className="group relative block">
      <span aria-hidden className={cn(control, 'flex h-12 items-center justify-between gap-2 text-left group-hover:ring-slate-300 group-focus-within:ring-2 group-focus-within:ring-brand-500', p.className)}>
        <span className={cn('num truncate', !p.value && 'text-slate-400')}>{p.value ? display : placeholder}</span>
        <span className="shrink-0 text-slate-400 [&>svg]:size-4.5">{icon}</span>
      </span>
      <input
        ref={ref}
        type={type}
        value={p.value}
        min={p.min}
        max={p.max}
        required={p.required}
        aria-label={p['aria-label']}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            open()
          }
        }}
        // เครื่องบางรุ่นมีปุ่ม "ล้าง" ในตัวเลือก ไม่ให้ช่องที่จำเป็นกลายเป็นค่าว่าง
        onChange={(e) => (e.target.value || !p.required ? p.onChange(e.target.value) : undefined)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
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
