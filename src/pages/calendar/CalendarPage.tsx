import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, ChevronLeft, ChevronRight, Gift, ListTodo, Plus, Search, X } from 'lucide-react'
import { useRooms, roomLookup, type Room } from '@/data/rooms'
import { useBookings, type Booking } from '@/data/bookings'
import { addDays, formatBaht, formatThaiDate, nightsBetween, THAI_MONTHS, THAI_MONTHS_SHORT, toDateStr } from '@/lib/format'
import { daysFrom, monthGrid, shiftMonth, WEEKDAYS, WEEKDAYS_SHORT, weekDays } from '@/lib/calendar'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Field'
import { Badge, EmptyState, Fab, PageHeader, Segmented, Skeleton } from '@/components/ui/misc'
import { PhotoBadge } from '@/components/PhotoFields'
import { BookingDetailDialog } from './BookingDetailDialog'
import { BookingFormDialog, type BookingFormTarget } from './BookingFormDialog'
import { DayContent } from './DayContent'

type View = 'month' | 'week' | 'day'

export function CalendarPage() {
  const today = toDateStr()
  const [params, setParams] = useSearchParams()
  const view = (['month', 'week', 'day'].includes(params.get('view') ?? '') ? params.get('view') : 'month') as View
  const cursor = /^\d{4}-\d{2}-\d{2}$/.test(params.get('d') ?? '') ? params.get('d')! : today
  const [dir, setDir] = useState(0)

  const rooms = useRooms()
  const bookingsQ = useBookings()
  const bookings = bookingsQ.data ?? []
  const [detailId, setDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<BookingFormTarget>(null)
  const [daySheet, setDaySheet] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // ลิงก์ลัด ?new=1 (จากหน้าภาพรวม) เปิดฟอร์มลงจองทันที
  const wantsNew = params.get('new') === '1'
  useEffect(() => {
    if (!wantsNew) return
    setForm({ mode: 'new' })
    setParams(
      (p) => {
        p.delete('new')
        return p
      },
      { replace: true },
    )
  }, [wantsNew, setParams])

  const detail = bookings.find((b) => b.id === detailId) ?? null
  const go = (patch: { view?: View; d?: string }, direction = 0) => {
    setDir(direction)
    setParams({ view: patch.view ?? view, d: patch.d ?? cursor }, { replace: true })
  }
  const step = (delta: number) =>
    go({ d: view === 'month' ? shiftMonth(cursor, delta) : addDays(cursor, delta * (view === 'week' ? 7 : 1)) }, delta)

  const [y, m] = cursor.split('-').map(Number) as [number, number]
  const title =
    view === 'day'
      ? formatThaiDate(cursor, true)
      : view === 'week'
        ? (() => {
            const w = weekDays(cursor)
            return `${formatThaiDate(w[0]!)} – ${formatThaiDate(w[6]!)}`
          })()
        : `${THAI_MONTHS[m - 1]} ${y + 543}`

  const openDetail = (b: Booking) => {
    setDaySheet(null)
    setDetailId(b.id)
  }

  return (
    <>
      <PageHeader
        title="ปฏิทินจองห้องพัก"
        subtitle={bookingsQ.data ? `การจองทั้งหมด ${bookings.length} รายการ` : 'กำลังโหลด...'}
        actions={
          // มือถือใช้ปุ่มลอย (Fab) แทน
          <div className="hidden lg:block">
            <Button variant="primary" size="lg" icon={<Plus className="size-5" />} onClick={() => setForm({ mode: 'new', date: view === 'month' ? undefined : cursor })}>
              ลงจอง
            </Button>
          </div>
        }
      />
      <Fab label="ลงจอง" icon={<Plus />} onClick={() => setForm({ mode: 'new', date: view === 'month' ? undefined : cursor })} />

      <Card className="mb-6 overflow-hidden">
        {/* แถบควบคุม */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => step(-1)} aria-label="ก่อนหน้า">
              <ChevronLeft className="size-5" />
            </Button>
            <h2 className="min-w-0 flex-1 text-center text-lg font-semibold whitespace-nowrap sm:min-w-56">{title}</h2>
            <Button size="icon" variant="ghost" onClick={() => step(1)} aria-label="ถัดไป">
              <ChevronRight className="size-5" />
            </Button>
            <Button size="sm" variant="secondary" className="ml-1" onClick={() => go({ d: today }, cursor < today ? 1 : -1)}>
              วันนี้
            </Button>
          </div>
          <Segmented
            layoutId="cal-view"
            value={view}
            onChange={(v) => go({ view: v })}
            options={[
              { value: 'month', label: 'เดือน' },
              { value: 'week', label: 'สัปดาห์' },
              { value: 'day', label: 'วัน' },
            ]}
          />
        </div>

        <div className="relative overflow-hidden p-2 sm:p-4">
          {bookingsQ.isPending || rooms.isPending ? (
            <Skeleton className="h-[420px] rounded-2xl" />
          ) : (
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={`${view}-${view === 'month' ? cursor.slice(0, 7) : cursor}`}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 40 }),
                  center: { opacity: 1, x: 0 },
                  exit: (d: number) => ({ opacity: 0, x: d * -40 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                {view === 'month' && (
                  <MonthView year={y} month0={m - 1} today={today} bookings={bookings} rooms={rooms.data ?? []} onDay={setDaySheet} onOpen={openDetail} />
                )}
                {view === 'week' && <WeekView cursor={cursor} today={today} bookings={bookings} rooms={rooms.data ?? []} onOpen={openDetail} onDay={setDaySheet} />}
                {view === 'day' && (
                  <div className="mx-auto max-w-2xl p-2 sm:p-4">
                    <DayContent date={cursor} bookings={bookings} rooms={rooms.data ?? []} onOpen={openDetail} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </Card>

      <Agenda
        month={cursor.slice(0, 7)}
        today={today}
        bookings={bookings}
        rooms={rooms.data ?? []}
        query={query}
        setQuery={setQuery}
        onOpen={openDetail}
        loading={bookingsQ.isPending}
      />

      <Dialog
        open={!!daySheet}
        onClose={() => setDaySheet(null)}
        title={daySheet ? formatThaiDate(daySheet, true) : ''}
        description={daySheet ? `วัน${WEEKDAYS[new Date(daySheet + 'T00:00:00Z').getUTCDay()]}` : ''}
        icon={<CalendarDays />}
        footer={
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            icon={<Plus className="size-5" />}
            onClick={() => {
              setForm({ mode: 'new', date: daySheet ?? undefined })
              setDaySheet(null)
            }}
          >
            ลงจองเข้าพักวันนี้
          </Button>
        }
      >
        {daySheet && <DayContent date={daySheet} bookings={bookings} rooms={rooms.data ?? []} onOpen={openDetail} />}
      </Dialog>

      <BookingDetailDialog
        booking={detail}
        onClose={() => setDetailId(null)}
        onEdit={(b) => {
          setDetailId(null)
          setForm({ mode: 'edit', booking: b })
        }}
      />
      <BookingFormDialog target={form} onClose={() => setForm(null)} onSaved={(b) => setDetailId(b.id)} />
    </>
  )
}

// ───────────────────────── เดือน ─────────────────────────

function MonthView({
  year,
  month0,
  today,
  bookings,
  rooms,
  onDay,
  onOpen,
}: {
  year: number
  month0: number
  today: string
  bookings: Booking[]
  rooms: Room[]
  onDay: (d: string) => void
  onOpen: (b: Booking) => void
}) {
  const room = roomLookup(rooms)
  const cells = monthGrid(year, month0)
  return (
    <div>
      <div className="grid grid-cols-7 pb-2 text-center text-xs font-medium text-slate-400">
        {WEEKDAYS_SHORT.map((d, i) => (
          <div key={d} className={cn(i === 0 && 'text-rose-400', i === 6 && 'text-brand-400')}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />
          const stays = bookings.filter((b) => b.checkIn <= date && date < b.checkOut).sort((a, b) => a.checkIn.localeCompare(b.checkIn))
          const outs = bookings.filter((b) => b.checkOut === date)
          const isToday = date === today
          const isPast = date < today
          const soon = (b: Booking) => b.checkIn === date && daysFrom(today, date) >= 0 && daysFrom(today, date) <= 3
          return (
            <button
              key={date}
              type="button"
              onClick={() => onDay(date)}
              className={cn(
                'group flex min-h-[68px] flex-col rounded-xl p-1 text-left transition duration-200 sm:min-h-[118px] sm:rounded-2xl sm:p-2',
                isToday ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-slate-50/70 hover:bg-slate-100',
                isPast && !isToday && 'opacity-60',
              )}
            >
              <span
                className={cn(
                  'num mb-1 self-end px-1 text-xs font-semibold sm:text-sm',
                  isToday ? 'rounded-full bg-brand-500 px-2 text-white' : 'text-slate-500',
                )}
              >
                {Number(date.slice(8))}
              </span>
              {/* มือถือ: จุดสี */}
              <span className="mt-auto flex flex-wrap justify-end gap-0.5 sm:hidden">
                {stays.flatMap((b) => b.roomIds.map((id) => ({ b, id }))).slice(0, 6).map(({ b, id }) => (
                  <span key={`${b.id}-${id}`} className={cn('size-2 rounded-full', soon(b) && 'animate-twinkle')} style={{ background: room(id).color }} />
                ))}
                {outs.length > 0 && stays.length === 0 && <span className="size-2 rounded-full ring-1 ring-slate-300" />}
              </span>
              {/* คอม: ป้ายชื่อ */}
              <span className="hidden flex-col gap-1 sm:flex">
                {stays.slice(0, 3).map((b) => (
                  <span
                    key={b.id}
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpen(b)
                    }}
                    className={cn('flex items-center gap-1 truncate rounded-lg px-1.5 py-0.5 text-[11px] font-medium text-white shadow-sm transition hover:brightness-110', soon(b) && 'animate-twinkle')}
                    style={{ background: room(b.roomIds[0] ?? -1).color }}
                  >
                    {b.roomIds.length > 1 && <span className="rounded bg-white/25 px-1">{b.roomIds.length}</span>}
                    <span className="truncate">{b.name}</span>
                  </span>
                ))}
                {stays.length > 3 && <span className="px-1 text-[11px] font-medium text-slate-500">+{stays.length - 3} รายการ</span>}
                {outs.length > 0 && stays.length < 3 && (
                  <span className="truncate rounded-lg border border-dashed border-slate-300 px-1.5 py-0.5 text-[11px] text-slate-400">ออก {outs.length} คิว</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ───────────────────────── สัปดาห์ ─────────────────────────

function WeekView({
  cursor,
  today,
  bookings,
  rooms,
  onOpen,
  onDay,
}: {
  cursor: string
  today: string
  bookings: Booking[]
  rooms: Room[]
  onOpen: (b: Booking) => void
  onDay: (d: string) => void
}) {
  const room = roomLookup(rooms)
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
      {weekDays(cursor).map((date, i) => {
        const stays = bookings.filter((b) => b.checkIn <= date && date < b.checkOut)
        const outs = bookings.filter((b) => b.checkOut === date)
        const isToday = date === today
        return (
          <div key={date} className={cn('min-w-0 rounded-2xl p-3 md:min-h-64', isToday ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-slate-50/70')}>
            <button type="button" onClick={() => onDay(date)} className="mb-2 flex w-full items-baseline justify-between md:flex-col md:items-center">
              <span className={cn('text-xs font-medium', i === 0 ? 'text-rose-400' : 'text-slate-400')}>{WEEKDAYS[i]}</span>
              <span className={cn('num text-xl font-bold', isToday ? 'text-brand-600' : 'text-ink')}>{Number(date.slice(8))}</span>
            </button>
            <div className="space-y-1.5">
              {stays.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onOpen(b)}
                  className="w-full rounded-xl p-2 text-left text-xs text-white shadow-sm transition hover:-translate-y-px hover:brightness-110"
                  style={{ background: room(b.roomIds[0] ?? -1).color }}
                >
                  <span className="block truncate font-semibold">{b.name}</span>
                  <span className="block truncate opacity-85">{b.roomIds.map((id) => room(id).name).join(', ')}</span>
                </button>
              ))}
              {outs.map((b) => (
                <button key={`out-${b.id}`} type="button" onClick={() => onOpen(b)} className="w-full truncate rounded-xl border border-dashed border-slate-300 p-2 text-left text-xs text-slate-500">
                  ออก: {b.name}
                </button>
              ))}
              {!stays.length && !outs.length && <p className="py-2 text-center text-xs text-slate-300 md:py-6">ว่าง</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ───────────────────────── รายการคิว ─────────────────────────

function Agenda({
  month,
  today,
  bookings,
  rooms,
  query,
  setQuery,
  onOpen,
  loading,
}: {
  month: string
  today: string
  bookings: Booking[]
  rooms: Room[]
  query: string
  setQuery: (q: string) => void
  onOpen: (b: Booking) => void
  loading: boolean
}) {
  const room = roomLookup(rooms)
  const q = query.trim().toLowerCase()
  const list = useMemo(() => {
    const items = q
      ? bookings.filter((b) => [b.name, b.code, b.phone, b.source].some((s) => s.toLowerCase().includes(q)))
      : bookings.filter((b) => b.checkIn.startsWith(month))
    return [...items].sort((a, b) => (q ? b.checkIn.localeCompare(a.checkIn) : a.checkIn.localeCompare(b.checkIn)))
  }, [bookings, month, q])

  const status = (b: Booking) => {
    const d = daysFrom(today, b.checkIn)
    if (b.checkedOut) return <Badge>เช็คเอาท์แล้ว</Badge>
    if (d === 0) return <Badge tone="rose" dot className="animate-twinkle">เข้าวันนี้</Badge>
    if (d === 1) return <Badge tone="amber">พรุ่งนี้</Badge>
    if (d > 1 && d <= 3) return <Badge tone="brand">อีก {d} วัน</Badge>
    if (d < 0 && today < b.checkOut) return <Badge tone="emerald" dot>กำลังพัก</Badge>
    if (d < 0) return <Badge>ผ่านมาแล้ว</Badge>
    return <Badge tone="slate">ล่วงหน้า</Badge>
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 px-5 pt-5 pb-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <ListTodo className="size-5 text-brand-500" />
          {q ? `ผลการค้นหา (${list.length})` : `คิวเข้าพักเดือนนี้ (${list.length})`}
        </h2>
        <div className="sm:w-72">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อ / รหัส / เบอร์"
            className="h-11"
            leading={<Search />}
            trailing={
              query && (
                <button type="button" onClick={() => setQuery('')} className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label="ล้าง">
                  <X className="size-4" />
                </button>
              )
            }
          />
        </div>
      </div>
      <div className="px-2 pb-2 sm:px-4 sm:pb-4">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={<CalendarDays />} title={q ? 'ไม่พบการจองที่ค้นหา' : 'ยังไม่มีคิวเข้าพักในเดือนนี้'} />
        ) : (
          <ul className="space-y-1">
            {list.map((b) => {
              const balance = b.total - b.deposit
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(b)}
                    className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-slate-50 active:bg-slate-100 sm:gap-4 sm:p-3"
                  >
                    {/* ป้ายวันที่ */}
                    <span className="flex w-12 shrink-0 flex-col items-center rounded-2xl bg-slate-50 py-1.5 ring-1 ring-slate-200/70">
                      <span className="num text-lg leading-none font-bold">{Number(b.checkIn.slice(8))}</span>
                      <span className="mt-0.5 text-[11px] text-slate-500">{THAI_MONTHS_SHORT[Number(b.checkIn.slice(5, 7)) - 1]}</span>
                      <span className="text-[10px] text-slate-400">{nightsBetween(b.checkIn, b.checkOut)} คืน</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-semibold">{b.name}</span>
                        <span className="shrink-0">{status(b)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <span className="flex shrink-0 -space-x-0.5">
                          {b.roomIds.slice(0, 4).map((id) => (
                            <span key={id} className="size-2 rounded-full ring-1 ring-white" style={{ background: room(id).color }} />
                          ))}
                        </span>
                        <span className="truncate">{b.roomIds.map((id) => room(id).name).join(', ')}</span>
                      </span>
                      {(b.remark || b.photoUrl || b.photoConsent !== null) && (
                        <span className="mt-1 flex items-center gap-1.5">
                          {b.remark && (
                            <span className="flex min-w-0 items-center gap-1 text-xs text-violet-600">
                              <Gift className="size-3.5 shrink-0" />
                              <span className="truncate">{b.remark}</span>
                            </span>
                          )}
                          <PhotoBadge url={b.photoUrl} consent={b.photoConsent} />
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="num block text-sm font-semibold">{formatBaht(b.total)}</span>
                      <span className={cn('num block text-xs', balance > 0 ? 'text-rose-500' : 'text-emerald-600')}>
                        {balance > 0 ? `ค้าง ${formatBaht(balance)}` : 'ชำระครบ'}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Card>
  )
}
