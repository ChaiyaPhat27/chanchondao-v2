import { useState, type FormEvent } from 'react'
import { ArrowDownCircle, ArrowUpCircle, CarFront, Minus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAtvReferrers, useSaveAtv, type AtvEntry } from '@/data/atv'
import { useFeatures } from '@/data/features'
import type { PhotoConsent } from '@/data/bookings'
import { nowTimeStr, parseNum, toDateStr } from '@/lib/format'
import { toastError } from '@/lib/errors'
import { cn } from '@/lib/cn'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, Input, MoneyInput } from '@/components/ui/Field'
import { DateField, TimeField } from '@/components/ui/DateField'
import { PhotoFields } from '@/components/PhotoFields'

export type AtvTarget = { mode: 'new' } | { mode: 'edit'; entry: AtvEntry } | null

type Form = {
  type: 'income' | 'expense'
  date: string
  time: string
  pax: string
  staff: string
  expenseDescription: string
  amount: string
  photoUrl: string
  photoConsent: PhotoConsent
}

const init = (t: Exclude<AtvTarget, null>): Form =>
  t.mode === 'edit'
    ? {
        type: t.entry.type,
        date: t.entry.date,
        time: t.entry.time,
        pax: t.entry.pax ? String(t.entry.pax) : '',
        staff: t.entry.staff || (t.entry.type === 'income' ? 'รับเอง' : ''),
        expenseDescription: t.entry.type === 'expense' ? t.entry.description : '',
        amount: t.entry.amount === null ? '' : String(t.entry.amount),
        photoUrl: t.entry.photoUrl,
        photoConsent: t.entry.photoConsent,
      }
    : { type: 'income', date: toDateStr(), time: nowTimeStr(), pax: '', staff: 'รับเอง', expenseDescription: '', amount: '', photoUrl: '', photoConsent: null }

/** จำนวนชื่อคนส่งลูกค้าที่โชว์เป็นปุ่ม (ที่เหลือพิมพ์ค้นหาได้) */
const QUICK_REFERRERS = 8

export function AtvEntryDialog({
  target,
  onClose,
  onDelete,
  onSaved,
}: {
  target: AtvTarget
  onClose: () => void
  /** เรียกหลังบันทึกสำเร็จ (ใช้พาไปดูรายการที่ลงย้อนหลัง) */
  onSaved?: (e: AtvEntry) => void
  /** คืนค่า true ถ้าลบแล้ว */
  onDelete: (e: AtvEntry) => Promise<boolean>
}) {
  const features = useFeatures().data
  const allReferrers = useAtvReferrers().data ?? ['รับเอง', 'ญาติ', 'ชานชมดาว']
  const referrers = allReferrers.slice(0, QUICK_REFERRERS)
  const save = useSaveAtv({ withPhotos: !!features?.atvPhotos })
  const [form, setForm] = useState<Form | null>(null)
  const [last, setLast] = useState<AtvTarget>(null)
  const [customStaff, setCustomStaff] = useState(false)
  if (target !== last) {
    setLast(target)
    if (target) {
      const f = init(target)
      setForm(f)
      setCustomStaff(!!f.staff && f.type === 'income' && !referrers.includes(f.staff))
    }
  }
  const editing = target?.mode === 'edit' ? target.entry : null
  const set = (p: Partial<Form>) => form && setForm({ ...form, ...p })
  const isIncome = form?.type === 'income'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    save.mutate(
      {
        id: editing?.id,
        type: form.type,
        date: form.date,
        time: form.time,
        pax: parseNum(form.pax),
        staff: form.staff,
        expenseDescription: form.expenseDescription,
        amount: parseNum(form.amount),
        // ลิงก์โฟลเดอร์เก็บได้ทั้งรายรับและรายจ่าย ส่วนการยินยอมใช้ภาพมีแค่ฝั่งลูกค้า (รายรับ)
        photoUrl: form.photoUrl,
        photoConsent: form.type === 'income' ? form.photoConsent : null,
      },
      {
        onSuccess: (entry) => {
          toast.success(editing ? 'บันทึกการแก้ไขแล้ว' : 'ลงบัญชีแล้ว')
          onSaved?.(entry)
          onClose()
        },
        onError: toastError('บันทึกบัญชี'),
      },
    )
  }

  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      title={editing ? 'แก้ไขรายการ ATV' : 'ลงบัญชี ATV'}
      icon={<CarFront />}
      footer={
        <div className="flex gap-2">
          {editing && (
            <Button
              size="icon"
              variant="ghost"
              className="size-13 rounded-2xl text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
              aria-label="ลบรายการ"
              onClick={async () => {
                if (await onDelete(editing)) onClose()
              }}
            >
              <Trash2 className="size-5" />
            </Button>
          )}
          <Button type="submit" form="atv-form" variant={isIncome ? 'primary' : 'danger'} size="lg" className="flex-1" loading={save.isPending}>
            บันทึก{isIncome ? 'รายรับ' : 'รายจ่าย'}
          </Button>
        </div>
      }
    >
      {form && (
        <form id="atv-form" onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['income', 'รายรับ', ArrowDownCircle, 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500'],
                ['expense', 'รายจ่าย', ArrowUpCircle, 'bg-rose-50 text-rose-600 ring-2 ring-rose-500'],
              ] as const
            ).map(([t, label, Icon, active]) => (
              <button
                key={t}
                type="button"
                onClick={() => set({ type: t })}
                className={cn(
                  'flex h-16 items-center justify-center gap-2 rounded-2xl text-base font-semibold ring-1 transition duration-200',
                  form.type === t ? active : 'bg-white text-slate-500 ring-slate-200 hover:ring-slate-300',
                )}
              >
                <Icon className="size-5.5" /> {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="วันที่">
              <DateField required value={form.date} onChange={(date) => set({ date })} />
            </Field>
            <Field label="เวลา">
              <TimeField required value={form.time} onChange={(time) => set({ time })} />
            </Field>
          </div>

          {isIncome ? (
            <>
              <Field label="จำนวนลูกค้า (คน)">
                <div className="flex items-center gap-2">
                  <Button size="icon" className="size-14 rounded-2xl" onClick={() => set({ pax: String(Math.max(1, (parseNum(form.pax) ?? 1) - 1)) })} aria-label="ลด">
                    <Minus className="size-5" />
                  </Button>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className="num h-14 text-center text-2xl font-bold"
                    value={form.pax}
                    onChange={(e) => set({ pax: e.target.value })}
                    placeholder="0"
                  />
                  <Button size="icon" className="size-14 rounded-2xl" onClick={() => set({ pax: String((parseNum(form.pax) ?? 0) + 1) })} aria-label="เพิ่ม">
                    <Plus className="size-5" />
                  </Button>
                </div>
              </Field>
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-slate-600">คนส่งลูกค้า / รับเอง</p>
                <div className="flex flex-wrap gap-1.5">
                  {referrers.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setCustomStaff(false)
                        set({ staff: r })
                      }}
                      className={cn(
                        'rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition',
                        !customStaff && form.staff === r ? 'bg-night-900 text-white ring-night-900' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300',
                      )}
                    >
                      {r}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStaff(true)
                      set({ staff: '' })
                    }}
                    className={cn(
                      'rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition',
                      customStaff ? 'bg-brand-500 text-white ring-brand-500' : 'bg-white text-brand-600 ring-brand-200 hover:ring-brand-300',
                    )}
                  >
                    {customStaff && form.staff ? form.staff : `+ คนอื่น (${Math.max(0, allReferrers.length - referrers.length)})`}
                  </button>
                </div>
                {customStaff && (
                  <div className="mt-2 animate-rise">
                    <Input
                      required
                      list="atv-referrers"
                      autoComplete="off"
                      value={form.staff}
                      onChange={(e) => set({ staff: e.target.value })}
                      placeholder="พิมพ์ชื่อ หรือค้นหาจากรายชื่อเดิม"
                    />
                    <datalist id="atv-referrers">
                      {allReferrers.map((r) => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Field label="รายละเอียดรายจ่าย">
              <Input required value={form.expenseDescription} onChange={(e) => set({ expenseDescription: e.target.value })} placeholder="เช่น ซื้อน้ำมัน, ปะยาง" />
            </Field>
          )}

          <Field label="จำนวนเงิน" aside={<span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">เว้นว่างได้ กรอกทีหลัง</span>}>
            <MoneyInput
              min={0}
              value={form.amount}
              onChange={(e) => set({ amount: e.target.value })}
              placeholder="0"
              className={cn('h-16 text-3xl', isIncome ? 'text-emerald-700' : 'text-rose-600')}
            />
          </Field>

          <PhotoFields
            layoutId="atv-consent"
            title={isIncome ? 'รูปลูกค้า' : 'รูป / หลักฐานรายจ่าย'}
            showConsent={isIncome}
            available={!!features?.atvPhotos}
            url={form.photoUrl}
            consent={form.photoConsent}
            onUrlChange={(photoUrl) => set({ photoUrl })}
            onConsentChange={(photoConsent) => set({ photoConsent })}
          />
        </form>
      )}
    </Dialog>
  )
}
