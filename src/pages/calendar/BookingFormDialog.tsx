import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { ArrowRight, BedDouble, CalendarCheck, Check, Layers, Lock, RotateCcw, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useFeatures } from '@/data/features'
import { useAgents } from '@/data/catalog'
import { useRooms, useZones } from '@/data/rooms'
import {
  busyRoomIds,
  generateShortCode,
  useBookings,
  useCustomers,
  useSaveBooking,
  type Booking,
  type PhotoConsent,
} from '@/data/bookings'
import { addDays, formatBaht, formatThaiDate, nightsBetween, parseNum, toDateStr } from '@/lib/format'
import { toastError } from '@/lib/errors'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, MoneyInput } from '@/components/ui/Field'
import { DateField } from '@/components/ui/DateField'
import { Segmented } from '@/components/ui/misc'
import { PhotoFields } from '@/components/PhotoFields'

export type BookingFormTarget = { mode: 'new'; date?: string } | { mode: 'edit'; booking: Booking } | null

type Form = {
  name: string
  phone: string
  facebook: string
  source: string
  remark: string
  checkIn: string
  checkOut: string
  pick: 'rooms' | 'zone'
  roomIds: number[]
  zoneId: number | null
  total: string
  /** ผู้ใช้แก้ราคาเองแล้ว (ไม่คำนวณอัตโนมัติทับ) */
  totalTouched: boolean
  deposit: string
  photoUrl: string
  photoConsent: PhotoConsent
}

function initialForm(target: Exclude<BookingFormTarget, null>): Form {
  if (target.mode === 'edit') {
    const b = target.booking
    return {
      name: b.name,
      phone: b.phone,
      facebook: b.facebook,
      source: b.source,
      remark: b.remark,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      pick: b.zoneId ? 'zone' : 'rooms',
      roomIds: b.roomIds,
      zoneId: b.zoneId,
      total: String(b.total),
      totalTouched: true,
      deposit: String(b.deposit),
      photoUrl: b.photoUrl,
      photoConsent: b.photoConsent,
    }
  }
  const ci = target.date ?? toDateStr()
  return {
    name: '',
    phone: '',
    facebook: '',
    source: '',
    remark: '',
    checkIn: ci,
    checkOut: addDays(ci, 1),
    pick: 'rooms',
    roomIds: [],
    zoneId: null,
    total: '',
    totalTouched: false,
    deposit: '',
    photoUrl: '',
    photoConsent: null,
  }
}

export function BookingFormDialog({ target, onClose, onSaved }: { target: BookingFormTarget; onClose: () => void; onSaved?: (b: Booking) => void }) {
  const [form, setForm] = useState<Form | null>(null)
  const [lastTarget, setLastTarget] = useState<BookingFormTarget>(null)
  const saving = useIsMutating({ mutationKey: ['save-booking'] }) > 0
  if (target !== lastTarget) {
    setLastTarget(target)
    if (target) setForm(initialForm(target))
  }
  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      size="lg"
      icon={<CalendarCheck />}
      title={target?.mode === 'edit' ? `แก้ไขการจอง ${target.booking.code}` : 'ลงจองห้องพัก'}
      footer={
        <Button type="submit" form="booking-form" variant="primary" size="lg" className="w-full" loading={saving}>
          บันทึกการจอง
        </Button>
      }
    >
      {target && form && <BookingForm target={target} form={form} setForm={setForm} onDone={(b) => { onSaved?.(b); onClose() }} />}
    </Dialog>
  )
}

function BookingForm({
  target,
  form,
  setForm,
  onDone,
}: {
  target: Exclude<BookingFormTarget, null>
  form: Form
  setForm: (f: Form) => void
  onDone: (b: Booking) => void
}) {
  const rooms = useRooms().data ?? []
  const zones = useZones().data ?? []
  const bookings = useBookings().data ?? []
  const customers = useCustomers().data ?? []
  const agents = useAgents().data ?? []
  const features = useFeatures().data
  const save = useSaveBooking({ withPhotos: !!features?.bookingPhotos })
  const editing = target.mode === 'edit' ? target.booking : null

  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch })
  const nights = nightsBetween(form.checkIn, form.checkOut)
  const busy = useMemo(
    () => (nights > 0 ? busyRoomIds(bookings, form.checkIn, form.checkOut, editing?.id) : new Set<number>()),
    [bookings, form.checkIn, form.checkOut, editing?.id, nights],
  )

  // ราคาปกติ = ราคาต่อคืน x จำนวนคืน
  const zone = zones.find((z) => z.id === form.zoneId)
  const perNight = form.pick === 'zone' ? (zone?.price ?? 0) : rooms.filter((r) => form.roomIds.includes(r.id)).reduce((s, r) => s + r.price, 0)
  const baseTotal = nights > 0 ? perNight * nights : 0
  const total = form.totalTouched ? (parseNum(form.total) ?? 0) : baseTotal
  const discount = baseTotal > total ? baseTotal - total : 0
  const deposit = parseNum(form.deposit) ?? 0

  const sourceOptions = useMemo(() => {
    const s = new Set<string>(['จองตรง', ...agents.map((a) => a.agent_name)])
    bookings.forEach((b) => b.source && s.add(b.source))
    return [...s]
  }, [agents, bookings])
  const remarkOptions = useMemo(() => [...new Set(bookings.map((b) => b.remark.trim()).filter(Boolean))], [bookings])

  const onName = (name: string) => {
    const found = customers.find((c) => c.full_name === name)
    set({ name, ...(found && { phone: form.phone || found.phone || '', facebook: form.facebook || found.social_id || '' }) })
  }

  const onCheckIn = (ci: string) => {
    if (!ci) return set({ checkIn: ci })
    // วันออกต้องหลังวันเข้าเสมอ (คงจำนวนคืนเดิมไว้)
    const keep = Math.max(1, nights)
    set({ checkIn: ci, checkOut: form.checkOut > ci ? form.checkOut : addDays(ci, keep) })
  }

  const toggleRoom = (id: number) =>
    set({ roomIds: form.roomIds.includes(id) ? form.roomIds.filter((x) => x !== id) : [...form.roomIds, id] })

  const pickZone = (id: number) => {
    const z = zones.find((x) => x.id === id)
    set({ zoneId: id, roomIds: z?.roomIds ?? [] })
  }

  const conflict = form.roomIds.some((id) => busy.has(id))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (nights < 1) return toast.error('วันออกต้องอยู่หลังวันเข้าพัก')
    if (!form.roomIds.length) return toast.error(form.pick === 'zone' ? 'เลือกแพ็กเกจก่อน' : 'เลือกห้องอย่างน้อย 1 ห้อง')
    if (conflict) return toast.error('มีห้องที่ติดจองในช่วงวันที่นี้')
    const code =
      editing && editing.checkIn === form.checkIn && editing.roomIds[0] === form.roomIds[0]
        ? editing.code
        : generateShortCode(form.checkIn, form.roomIds, rooms)
    save.mutate(
      {
        id: editing?.id,
        name: form.name,
        phone: form.phone,
        facebook: form.facebook,
        source: form.source,
        remark: form.remark,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        roomIds: form.roomIds,
        zoneId: form.pick === 'zone' ? form.zoneId : null,
        total,
        deposit,
        discount,
        code,
        photoUrl: form.photoUrl,
        photoConsent: form.photoConsent,
      },
      {
        onSuccess: (b) => {
          toast.success(editing ? 'บันทึกการแก้ไขแล้ว' : `ลงจองแล้ว ${b.code}`)
          onDone(b)
        },
        onError: toastError('บันทึกการจอง'),
      },
    )
  }

  return (
    <form id="booking-form" onSubmit={submit} className="space-y-6">
      {/* ลูกค้า */}
      <section className="space-y-3">
        <SectionTitle icon={<UserRound />}>ลูกค้า</SectionTitle>
        <Field label="ชื่อลูกค้า" hint="พิมพ์ชื่อลูกค้าเก่า ระบบจะเติมเบอร์และโซเชียลให้">
          <Input required list="customer-names" autoComplete="off" value={form.name} onChange={(e) => onName(e.target.value)} placeholder="ชื่อ หรือ ชื่อเล่น" />
          <datalist id="customer-names">
            {customers.map((c) => (
              <option key={c.id} value={c.full_name} />
            ))}
          </datalist>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="เบอร์โทร">
            <Input type="tel" inputMode="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="Facebook / LINE">
            <Input value={form.facebook} onChange={(e) => set({ facebook: e.target.value })} />
          </Field>
        </div>
        <Field label="ช่องทางจอง / ผู้แนะนำ">
          <Input list="booking-sources" autoComplete="off" value={form.source} onChange={(e) => set({ source: e.target.value })} placeholder="จองตรง" />
          <datalist id="booking-sources">
            {sourceOptions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
      </section>

      {/* วันที่ */}
      <section className="space-y-3">
        <SectionTitle icon={<CalendarCheck />}>วันเข้าพัก</SectionTitle>
        <div className="flex items-end gap-2">
          <Field label="เช็คอิน" className="min-w-0 flex-1">
            <DateField required value={form.checkIn} onChange={onCheckIn} />
          </Field>
          <ArrowRight className="mb-3.5 size-5 shrink-0 text-slate-300" />
          <Field label="เช็คเอาท์" className="min-w-0 flex-1">
            <DateField required min={form.checkIn ? addDays(form.checkIn, 1) : undefined} value={form.checkOut} onChange={(checkOut) => set({ checkOut })} />
          </Field>
        </div>
        {nights > 0 && (
          <p className="text-sm text-slate-500">
            {formatThaiDate(form.checkIn)} – {formatThaiDate(form.checkOut)} · <span className="font-semibold text-ink">{nights} คืน</span>
          </p>
        )}
      </section>

      {/* ห้อง */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle icon={<BedDouble />}>ห้องพัก</SectionTitle>
          <Segmented
            layoutId="booking-pick"
            value={form.pick}
            onChange={(pick) => set({ pick, roomIds: [], zoneId: null })}
            options={[
              { value: 'rooms', label: 'เลือกรายห้อง' },
              { value: 'zone', label: 'เหมาโซน' },
            ]}
          />
        </div>

        {form.pick === 'rooms' ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {rooms.map((r) => {
              const isBusy = busy.has(r.id)
              const on = form.roomIds.includes(r.id)
              return (
                <button
                  key={r.id}
                  type="button"
                  disabled={isBusy && !on}
                  onClick={() => toggleRoom(r.id)}
                  className={cn(
                    'relative flex items-center gap-3 rounded-2xl p-3 text-left ring-1 transition duration-200',
                    on ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:ring-slate-300',
                    isBusy && 'cursor-not-allowed bg-slate-50 opacity-60',
                    on && isBusy && 'bg-rose-50 opacity-100 ring-rose-400',
                  )}
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: isBusy && !on ? '#cbd5e1' : r.color }}
                  >
                    {isBusy ? <Lock className="size-4" /> : on ? <Check className="size-4.5" /> : <span className="text-xs font-bold">{r.name.slice(0, 2)}</span>}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{r.name}</span>
                    <span className="num block text-xs text-slate-500">{isBusy ? 'ติดจอง' : `${formatBaht(r.price)}/คืน`}</span>
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {zones.map((z) => {
              const isBusy = z.roomIds.some((id) => busy.has(id))
              const on = form.zoneId === z.id
              return (
                <button
                  key={z.id}
                  type="button"
                  disabled={isBusy && !on}
                  onClick={() => pickZone(z.id)}
                  className={cn(
                    'rounded-2xl p-4 text-left ring-1 transition duration-200',
                    on ? 'bg-star-100/60 ring-2 ring-star-500' : 'bg-white ring-slate-200 hover:ring-slate-300',
                    isBusy && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold">
                      <Layers className="size-4.5 text-star-600" />
                      {z.name}
                    </span>
                    <span className="num text-sm font-semibold text-star-600">{isBusy ? 'ไม่ว่าง' : `${formatBaht(z.price)}/คืน`}</span>
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1">
                    {z.roomIds.map((id) => {
                      const r = rooms.find((x) => x.id === id)
                      return (
                        <span key={id} className={cn('rounded-full px-2 py-0.5 text-[11px]', busy.has(id) ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-600')}>
                          {r?.name ?? `#${id}`}
                        </span>
                      )
                    })}
                  </span>
                </button>
              )
            })}
          </div>
        )}
        {conflict && <p className="rounded-2xl bg-rose-50 px-4 py-2.5 text-sm text-rose-600">ห้องที่เลือกไว้ติดจองในวันที่ใหม่ กรุณาเลือกห้องใหม่</p>}
      </section>

      {/* ราคา */}
      <section className="space-y-3 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-900/[0.04] sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="ยอดรวมสุทธิ"
            aside={
              form.totalTouched && total !== baseTotal && baseTotal > 0 ? (
                <button type="button" onClick={() => set({ totalTouched: false, total: '' })} className="flex items-center gap-1 text-xs font-medium text-brand-600">
                  <RotateCcw className="size-3.5" /> ใช้ราคาปกติ
                </button>
              ) : null
            }
            hint={baseTotal > 0 ? `ราคาปกติ ${formatBaht(baseTotal)} (${formatBaht(perNight)} × ${nights} คืน) · แก้ตัวเลขเพื่อลดราคาได้` : undefined}
          >
            <MoneyInput
              required
              min={0}
              value={form.totalTouched ? form.total : String(baseTotal)}
              onChange={(e) => set({ total: e.target.value, totalTouched: true })}
            />
          </Field>
          <Field label="มัดจำโอนแล้ว">
            <MoneyInput min={0} value={form.deposit} onChange={(e) => set({ deposit: e.target.value })} placeholder="0" className="text-emerald-700" />
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-3 text-sm">
          {discount > 0 ? <span className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-600">ส่วนลด {formatBaht(discount)}</span> : <span />}
          <span className="text-slate-500">
            คงเหลือชำระ <span className="num text-lg font-bold text-ink">{formatBaht(total - deposit)}</span>
          </span>
        </div>
      </section>

      <Field label="ของแถม / หมายเหตุ">
        <Input list="remark-options" autoComplete="off" value={form.remark} onChange={(e) => set({ remark: e.target.value })} placeholder="เช่น แถมหมูกระทะ 1 ชุด" />
        <datalist id="remark-options">
          {remarkOptions.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </Field>

      <PhotoFields
        layoutId="booking-consent"
        available={!!features?.bookingPhotos}
        url={form.photoUrl}
        consent={form.photoConsent}
        onUrlChange={(photoUrl) => set({ photoUrl })}
        onConsentChange={(photoConsent) => set({ photoConsent })}
      />
    </form>
  )
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-ink [&>svg]:size-4.5 [&>svg]:text-brand-500">
      {icon}
      {children}
    </h3>
  )
}
