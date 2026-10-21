import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, BedDouble, Moon } from 'lucide-react'
import { roomLookup, type Room } from '@/data/rooms'
import { staysOn, type Booking } from '@/data/bookings'
import { cn } from '@/lib/cn'

/** รายการของวันเดียว: เช็คอิน / พักต่อ / เช็คเอาท์ + ห้องว่าง */
export function DayContent({
  date,
  bookings,
  rooms,
  onOpen,
}: {
  date: string
  bookings: Booking[]
  rooms: Room[]
  onOpen: (b: Booking) => void
}) {
  const room = roomLookup(rooms)
  const arriving = bookings.filter((b) => b.checkIn === date)
  const staying = bookings.filter((b) => staysOn(b, date) && b.checkIn !== date)
  const leaving = bookings.filter((b) => b.checkOut === date)
  const busy = new Set(bookings.filter((b) => staysOn(b, date)).flatMap((b) => b.roomIds))
  const free = rooms.filter((r) => !busy.has(r.id))

  const Group = ({ title, icon, items, tone }: { title: string; icon: ReactNode; items: Booking[]; tone: string }) =>
    items.length ? (
      <div>
        <p className={cn('mb-2 flex items-center gap-1.5 text-xs font-semibold', tone)}>
          {icon} {title} ({items.length})
        </p>
        <div className="space-y-2">
          {items.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onOpen(b)}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200 transition hover:-translate-y-px hover:shadow-soft hover:ring-brand-300"
            >
              <span className="flex -space-x-1.5">
                {b.roomIds.slice(0, 3).map((id) => (
                  <span key={id} className="size-7 rounded-full ring-2 ring-white" style={{ background: room(id).color }} />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{b.name}</span>
                <span className="block truncate text-xs text-slate-500">{b.roomIds.map((id) => room(id).name).join(', ')}</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">{b.code}</span>
            </button>
          ))}
        </div>
      </div>
    ) : null

  return (
    <div className="space-y-5">
      <Group title="เช็คอิน" icon={<ArrowDownRight className="size-4" />} items={arriving} tone="text-emerald-600" />
      <Group title="พักต่อ" icon={<Moon className="size-4" />} items={staying} tone="text-brand-600" />
      <Group title="เช็คเอาท์" icon={<ArrowUpRight className="size-4" />} items={leaving} tone="text-amber-600" />
      {!arriving.length && !staying.length && !leaving.length && <p className="py-4 text-center text-sm text-slate-400">ไม่มีคิวในวันนี้</p>}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <BedDouble className="size-4" /> ห้องว่างคืนนี้ ({free.length}/{rooms.length})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {free.map((r) => (
            <span key={r.id} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm ring-1 ring-slate-200">
              <span className="size-2 rounded-full" style={{ background: r.color }} />
              {r.name}
            </span>
          ))}
          {!free.length && <span className="text-sm text-rose-500">เต็มทุกห้อง</span>}
        </div>
      </div>
    </div>
  )
}
