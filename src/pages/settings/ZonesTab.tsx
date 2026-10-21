import { useState, type FormEvent } from 'react'
import { Check, Layers, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { roomLookup, useDeleteZone, useRooms, useSaveZone, useZones, type Zone } from '@/data/rooms'
import { formatBaht, parseNum } from '@/lib/format'
import { toastError } from '@/lib/errors'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/Field'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { useConfirm } from '@/components/ui/Confirm'

export function ZonesTab() {
  const zones = useZones()
  const rooms = useRooms()
  const del = useDeleteZone()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Zone | 'new' | null>(null)
  const room = roomLookup(rooms.data)

  const onDelete = async (z: Zone) => {
    if (await confirm({ title: `ลบแพ็กเกจ "${z.name}"?`, message: 'ตัวห้องพักจะไม่ถูกลบ', tone: 'danger', confirmText: 'ลบแพ็กเกจ' })) {
      del.mutate(z.id, { onSuccess: () => toast.success('ลบแพ็กเกจแล้ว'), onError: toastError('ลบแพ็กเกจ') })
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">รวมหลายห้องเป็นแพ็กเกจเหมาโซน ราคาเหมาต่อคืน</p>
        <Button variant="primary" icon={<Plus className="size-4.5" />} onClick={() => setEditing('new')}>
          สร้างแพ็กเกจ
        </Button>
      </div>

      {zones.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      ) : zones.data?.length === 0 ? (
        <Card>
          <EmptyState icon={<Layers />} title="ยังไม่มีแพ็กเกจ" />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {zones.data?.map((z) => (
            <Card key={z.id} className="group p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{z.name}</h3>
                  <p className="num text-xl font-bold text-star-600">
                    {formatBaht(z.price)}
                    <span className="text-xs font-normal text-slate-400"> / คืน</span>
                  </p>
                  {z.maxPax ? (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <Users className="size-4" /> พักได้ {z.maxPax} คน
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-0.5">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(z)} aria-label="แก้ไข">
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="hover:bg-rose-50 hover:text-rose-600" onClick={() => onDelete(z)} aria-label="ลบ">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {z.roomIds.length === 0 && <span className="text-sm text-slate-400">ยังไม่ได้เลือกห้อง</span>}
                {z.roomIds.map((id) => {
                  const r = room(id)
                  return (
                    <span key={id} className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-sm ring-1 ring-slate-200">
                      <span className="size-2 rounded-full" style={{ background: r.color }} />
                      {r.name}
                    </span>
                  )
                })}
              </div>
              {z.details && <p className="mt-3 text-sm text-slate-500">{z.details}</p>}
            </Card>
          ))}
        </div>
      )}

      <ZoneDialog zone={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function ZoneDialog({ zone, onClose }: { zone: Zone | 'new' | null; onClose: () => void }) {
  const rooms = useRooms()
  const save = useSaveZone()
  const current = zone === 'new' ? null : zone
  const [form, setForm] = useState({ name: '', price: '', maxPax: '', details: '', roomIds: [] as number[] })
  const [last, setLast] = useState<typeof zone>(null)
  if (zone !== last) {
    setLast(zone)
    if (zone) {
      setForm(
        current
          ? { name: current.name, price: String(current.price), maxPax: current.maxPax ? String(current.maxPax) : '', details: current.details, roomIds: current.roomIds }
          : { name: '', price: '', maxPax: '4', details: '', roomIds: [] },
      )
    }
  }

  const toggle = (id: number) =>
    setForm((f) => ({ ...f, roomIds: f.roomIds.includes(id) ? f.roomIds.filter((x) => x !== id) : [...f.roomIds, id] }))

  const roomsSum = (rooms.data ?? []).filter((r) => form.roomIds.includes(r.id)).reduce((s, r) => s + r.price, 0)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate(
      { id: current?.id, name: form.name, price: parseNum(form.price) ?? 0, maxPax: parseNum(form.maxPax), details: form.details.trim(), roomIds: form.roomIds },
      {
        onSuccess: () => {
          toast.success('บันทึกแพ็กเกจแล้ว')
          onClose()
        },
        onError: toastError('บันทึกแพ็กเกจ'),
      },
    )
  }

  return (
    <Dialog
      open={!!zone}
      onClose={onClose}
      title={current ? `แก้ไข ${current.name}` : 'สร้างแพ็กเกจเหมาโซน'}
      icon={<Layers />}
      footer={
        <Button type="submit" form="zone-form" variant="primary" size="lg" className="w-full" loading={save.isPending}>
          บันทึก
        </Button>
      }
    >
      <form id="zone-form" onSubmit={submit} className="space-y-4">
        <Field label="ชื่อแพ็กเกจ">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น เหมาโซนโดม 1-4" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ราคาเหมาต่อคืน" hint={roomsSum > 0 ? `ราคาแยกห้องรวม ${formatBaht(roomsSum)}` : undefined}>
            <MoneyInput required min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
          </Field>
          <Field label="พักได้สูงสุด (คน)">
            <Input type="number" inputMode="numeric" min={1} className="h-14 text-lg" value={form.maxPax} onChange={(e) => setForm({ ...form, maxPax: e.target.value })} />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-medium text-slate-600">ห้องในแพ็กเกจ ({form.roomIds.length})</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {rooms.data?.map((r) => {
              const on = form.roomIds.includes(r.id)
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggle(r.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-medium ring-1 transition',
                    on ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:ring-slate-300',
                  )}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md" style={{ background: on ? r.color : undefined, boxShadow: on ? undefined : `inset 0 0 0 2px ${r.color}` }}>
                    {on && <Check className="size-3.5 text-white" />}
                  </span>
                  <span className="truncate">{r.name}</span>
                </button>
              )
            })}
          </div>
        </div>
        <Field label="รายละเอียด (แสดงบนหน้าเว็บลูกค้า)">
          <Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
        </Field>
      </form>
    </Dialog>
  )
}
