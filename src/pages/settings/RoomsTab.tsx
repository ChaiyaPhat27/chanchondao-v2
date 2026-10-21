import { useState, type FormEvent } from 'react'
import { BedDouble, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useBookings } from '@/data/bookings'
import { useDeleteRoom, useRooms, useSaveRoom, type Room } from '@/data/rooms'
import { formatBaht, parseNum, toDateStr } from '@/lib/format'
import { toastError } from '@/lib/errors'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/Field'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { useConfirm } from '@/components/ui/Confirm'

const SWATCHES = ['#4f5dfb', '#1f8ffd', '#0ea5e9', '#14b8a6', '#10b981', '#84cc16', '#f0a01a', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#64748b']

export function RoomsTab() {
  const rooms = useRooms()
  const bookings = useBookings()
  const del = useDeleteRoom()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Room | 'new' | null>(null)

  const onDelete = async (room: Room) => {
    const today = toDateStr()
    const upcoming = (bookings.data ?? []).filter((b) => b.roomIds.includes(room.id) && b.checkOut >= today).length
    const ok = await confirm({
      title: `ลบห้อง "${room.name}"?`,
      message: upcoming
        ? `⚠️ ห้องนี้ยังมีการจองที่ยังไม่ถึงวันออก ${upcoming} รายการ การจองเหล่านั้นจะแสดงเป็น "ห้องที่ถูกลบ"`
        : 'ห้องจะถูกเอาออกจากแพ็กเกจที่เกี่ยวข้องด้วย ลบแล้วกู้คืนไม่ได้',
      tone: 'danger',
      confirmText: 'ลบห้อง',
    })
    if (ok) del.mutate(room.id, { onSuccess: () => toast.success('ลบห้องแล้ว'), onError: toastError('ลบห้อง') })
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{rooms.data ? `${rooms.data.length} ห้อง · สีของห้องใช้ในปฏิทิน` : ' '}</p>
        <Button variant="primary" icon={<Plus className="size-4.5" />} onClick={() => setEditing('new')}>
          เพิ่มห้อง
        </Button>
      </div>

      {rooms.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-3xl" />
          ))}
        </div>
      ) : rooms.data?.length === 0 ? (
        <Card>
          <EmptyState icon={<BedDouble />} title="ยังไม่มีห้องพัก" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {rooms.data?.map((r) => (
            <Card key={r.id} className="group relative overflow-hidden p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-5">
              <span className="absolute inset-y-0 left-0 w-1.5 sm:inset-x-0 sm:top-0 sm:bottom-auto sm:h-1.5 sm:w-auto" style={{ background: r.color }} />
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-soft" style={{ background: r.color }}>
                  {r.name.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-ink">{r.name}</h3>
                  <p className="num font-bold text-brand-600">
                    {formatBaht(r.price)}
                    <span className="text-xs font-normal text-slate-400"> / คืน</span>
                  </p>
                  {(r.maxPax || r.details) && (
                    <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                      {r.maxPax ? (
                        <>
                          <Users className="size-3.5 shrink-0" /> {r.maxPax} คน
                        </>
                      ) : null}
                      {r.maxPax && r.details ? ' · ' : ''}
                      {r.details && <span className="truncate">{r.details}</span>}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5 transition lg:opacity-0 lg:group-hover:opacity-100">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(r)} aria-label="แก้ไข">
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="hover:bg-rose-50 hover:text-rose-600" onClick={() => onDelete(r)} aria-label="ลบ">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <RoomDialog room={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function RoomDialog({ room, onClose }: { room: Room | 'new' | null; onClose: () => void }) {
  const save = useSaveRoom()
  const current = room === 'new' ? null : room
  const [form, setForm] = useState({ name: '', color: SWATCHES[0]!, price: '', maxPax: '', details: '' })
  const [lastRoom, setLastRoom] = useState<typeof room>(null)

  // เติมค่าเมื่อเปิดหน้าต่างใหม่
  if (room !== lastRoom) {
    setLastRoom(room)
    if (room) {
      setForm(
        current
          ? { name: current.name, color: current.color, price: String(current.price), maxPax: current.maxPax ? String(current.maxPax) : '', details: current.details }
          : { name: '', color: SWATCHES[0]!, price: '', maxPax: '2', details: '' },
      )
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate(
      { id: current?.id, name: form.name, color: form.color, price: parseNum(form.price) ?? 0, maxPax: parseNum(form.maxPax), details: form.details.trim() },
      {
        onSuccess: () => {
          toast.success(current ? 'บันทึกห้องแล้ว' : 'เพิ่มห้องแล้ว')
          onClose()
        },
        onError: toastError('บันทึกห้อง'),
      },
    )
  }

  return (
    <Dialog
      open={!!room}
      onClose={onClose}
      title={current ? `แก้ไขห้อง ${current.name}` : 'เพิ่มห้องพัก'}
      icon={<BedDouble />}
      footer={
        <Button type="submit" form="room-form" variant="primary" size="lg" className="w-full" loading={save.isPending}>
          บันทึก
        </Button>
      }
    >
      <form id="room-form" onSubmit={submit} className="space-y-4">
        <Field label="ชื่อห้อง">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น โดม 1, บ้านเขียว" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ราคาต่อคืน">
            <MoneyInput required min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
          </Field>
          <Field label="พักได้สูงสุด (คน)">
            <Input type="number" inputMode="numeric" min={1} className="h-14 text-lg" value={form.maxPax} onChange={(e) => setForm({ ...form, maxPax: e.target.value })} />
          </Field>
        </div>
        <Field label="สีประจำห้อง (ใช้ในปฏิทิน)">
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className={cn('size-9 rounded-full transition', form.color.toLowerCase() === c ? 'scale-110 ring-2 ring-ink ring-offset-2' : 'hover:scale-110')}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
            <label className="relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-200" title="เลือกสีเอง">
              <span className="absolute inset-0 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" />
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="absolute inset-0 opacity-0" />
            </label>
          </div>
        </Field>
        <Field label="รายละเอียด (แสดงบนหน้าเว็บลูกค้า)" hint="เช่น เตียงคิงไซซ์ วิวภูเขา มีห้องน้ำในตัว">
          <Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
        </Field>
      </form>
    </Dialog>
  )
}
