import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { AlarmClock, ChevronDown, DoorOpen, History, Receipt, RotateCcw, Search } from 'lucide-react'
import { roomLookup, useRooms, useZones } from '@/data/rooms'
import { amountDue, useBookings, useReopenBooking, type Booking } from '@/data/bookings'
import { addDays, formatBaht, formatThaiDate, toDateStr } from '@/lib/format'
import { toastError } from '@/lib/errors'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { Badge, EmptyState, PageHeader, Skeleton } from '@/components/ui/misc'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Confirm'
import { PosDialog } from './PosDialog'

export function BillingPage() {
  const today = toDateStr()
  const [params, setParams] = useSearchParams()
  const openId = Number(params.get('open')) || null
  const bookingsQ = useBookings()
  const rooms = useRooms().data
  const zones = useZones().data
  const room = roomLookup(rooms)
  const reopen = useReopenBooking()
  const confirm = useConfirm()
  const [query, setQuery] = useState('')

  const bookings = bookingsQ.data ?? []
  const q = query.trim().toLowerCase()

  const [showOverdue, setShowOverdue] = useState(false)
  const { active, overdue } = useMemo(() => {
    const open = bookings.filter(
      (b) => !b.checkedOut && b.checkIn <= today && (!q || b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)),
    )
    return {
      // กำลังพัก หรือออกวันนี้
      active: open.filter((b) => b.checkOut >= today).sort((a, b) => a.checkOut.localeCompare(b.checkOut)),
      // เลยวันออกแล้วแต่ยังไม่ได้กดเช็คเอาท์ (ส่วนใหญ่เป็นข้อมูลเก่า)
      overdue: open.filter((b) => b.checkOut < today).sort((a, b) => b.checkOut.localeCompare(a.checkOut)),
    }
  }, [bookings, today, q])
  const recent = useMemo(
    () => bookings.filter((b) => b.checkedOut && b.checkOut >= addDays(today, -7)).sort((a, b) => b.checkOut.localeCompare(a.checkOut)),
    [bookings, today],
  )

  const roomsText = (b: Booking) => {
    const z = zones?.find((x) => x.id === b.zoneId)
    const names = b.roomIds.map((id) => room(id).name).join(', ')
    return z ? `โซน ${z.name} (${names})` : names
  }

  const current = bookings.find((b) => b.id === openId) ?? null
  const setOpen = (id: number | null) => setParams(id ? { open: String(id) } : {}, { replace: true })

  const onReopen = async (b: Booking) => {
    if (await confirm({ title: `ยกเลิกการเช็คเอาท์ของ ${b.name}?`, message: 'บิลจะกลับมาอยู่ในรายการลูกค้าที่กำลังพัก' }))
      reopen.mutate(b.id, { onSuccess: () => toast.success('ย้ายกลับมาแล้ว'), onError: toastError('ยกเลิกการเช็คเอาท์') })
  }

  return (
    <>
      <PageHeader title="บิล / เช็คเอาท์" subtitle="คิดเงินของสั่งเพิ่ม ส่วนลด และเช็คเอาท์ลูกค้า">
        <div className="w-full sm:w-72">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อลูกค้า หรือรหัสจอง" leading={<Search />} />
        </div>
      </PageHeader>

      <div className="mb-3 flex items-center gap-2">
        <DoorOpen className="size-5 text-emerald-500" />
        <h2 className="font-semibold">ลูกค้าที่กำลังเข้าพัก</h2>
        <Badge tone="emerald">{active.length} บิล</Badge>
      </div>

      {bookingsQ.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <Card>
          <EmptyState icon={<Receipt />} title={q ? 'ไม่พบบิลที่ค้นหา' : 'ตอนนี้ไม่มีลูกค้าที่กำลังเข้าพัก'}>
            บิลจะขึ้นที่นี่ตั้งแต่วันเช็คอินจนกว่าจะกดเช็คเอาท์
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((b) => (
            <BillCard key={b.id} b={b} today={today} color={room(b.roomIds[0] ?? -1).color} roomsText={roomsText(b)} onOpen={() => setOpen(b.id)} />
          ))}
        </div>
      )}

      {overdue.length > 0 && (
        <div className="mt-8">
          <button type="button" onClick={() => setShowOverdue((v) => !v)} className="mb-3 flex w-full items-center gap-2 text-left">
            <AlarmClock className="size-5 text-rose-500" />
            <h2 className="font-semibold">เลยวันออกแล้ว แต่ยังไม่ได้กดเช็คเอาท์</h2>
            <Badge tone="rose">{overdue.length} บิล</Badge>
            <ChevronDown className={`ml-auto size-5 text-slate-400 transition-transform duration-300 ${showOverdue ? 'rotate-180' : ''}`} />
          </button>
          {!showOverdue ? (
            <p className="text-sm text-slate-500">ส่วนใหญ่เป็นการจองเก่าก่อนมีระบบเช็คเอาท์ แตะหัวข้อเพื่อดูทั้งหมด</p>
          ) : (
            <div className="grid animate-rise gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {overdue.map((b) => (
                <BillCard key={b.id} b={b} today={today} color={room(b.roomIds[0] ?? -1).color} roomsText={roomsText(b)} onOpen={() => setOpen(b.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {recent.length > 0 && (
        <Card className="mt-8">
          <CardHeader icon={<History />} title="เช็คเอาท์ล่าสุด (7 วัน)" />
          <ul className="divide-y divide-slate-100 px-2 pb-2">
            {recent.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {b.code} · {roomsText(b)}
                  </p>
                </div>
                <span className="num hidden text-sm font-semibold sm:block">{formatBaht(amountDue(b, b.extras))}</span>
                <Button size="sm" variant="ghost" onClick={() => setOpen(b.id)}>
                  ดูบิล
                </Button>
                <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => onReopen(b)}>
                  <span className="hidden sm:inline">ยกเลิกเช็คเอาท์</span>
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <PosDialog booking={current} roomsText={current ? roomsText(current) : ''} onClose={() => setOpen(null)} />
    </>
  )
}

function BillCard({ b, today, color, roomsText, onOpen }: { b: Booking; today: string; color: string; roomsText: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative overflow-hidden rounded-3xl bg-white p-5 text-left shadow-soft ring-1 ring-slate-900/[0.04] transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
      <div className="mb-3 flex items-center justify-between">
        {b.checkOut < today ? (
          <Badge tone="rose" dot>
            เลยวันออก
          </Badge>
        ) : b.checkOut === today ? (
          <Badge tone="amber" dot className="animate-twinkle">
            ออกวันนี้
          </Badge>
        ) : (
          <Badge tone="emerald" dot>
            กำลังพัก
          </Badge>
        )}
        <span className="font-mono text-xs text-slate-400">{b.code}</span>
      </div>
      <h3 className="truncate text-lg font-semibold">{b.name}</h3>
      <p className="truncate text-sm text-slate-500">{roomsText}</p>
      <p className="mt-0.5 text-xs text-slate-400">ออก {formatThaiDate(b.checkOut)}</p>
      <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500">{b.extras.length ? `สั่งเพิ่ม ${b.extras.length} รายการ` : 'ยอดที่ต้องเก็บ'}</span>
        <span className="num text-2xl font-bold text-brand-600">{formatBaht(amountDue(b, b.extras))}</span>
      </div>
    </button>
  )
}
