import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  CalendarClock,
  CalendarPlus,
  CarFront,
  CircleAlert,
  Clock,
  Receipt,
  Users,
  Wallet,
} from 'lucide-react'
import { roomLookup, useRooms } from '@/data/rooms'
import { staysOn, useBookings } from '@/data/bookings'
import { atvSummary, useAtv } from '@/data/atv'
import { useFeatures } from '@/data/features'
import { addDays, formatBaht, formatThaiDate, toDateStr } from '@/lib/format'
import { shiftMonth, WEEKDAYS } from '@/lib/calendar'
import { cn } from '@/lib/cn'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge, EmptyState, Skeleton, Stat } from '@/components/ui/misc'

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: 'numeric', hour12: false }).format(new Date()))
  if (h < 11) return 'อรุณสวัสดิ์'
  if (h < 16) return 'สวัสดีตอนบ่าย'
  if (h < 19) return 'สวัสดีตอนเย็น'
  return 'ราตรีสวัสดิ์ คืนนี้ดาวสวยไหม'
}

export function DashboardPage() {
  const today = toDateStr()
  const tomorrow = addDays(today, 1)
  const month = today.slice(0, 7)
  const monthStart = `${month}-01`
  const monthEnd = addDays(shiftMonth(monthStart, 1), -1)

  const rooms = useRooms()
  const bookingsQ = useBookings()
  const atv = useAtv(monthStart, monthEnd)
  const features = useFeatures().data
  const room = roomLookup(rooms.data)

  const s = useMemo(() => {
    const all = bookingsQ.data ?? []
    const active = all.filter((b) => !b.checkedOut)
    const tonight = active.filter((b) => staysOn(b, today))
    const occupied = new Set(tonight.flatMap((b) => b.roomIds))
    const monthBookings = all.filter((b) => b.checkIn.startsWith(month))
    return {
      tonight,
      occupied,
      arrivals: active.filter((b) => b.checkIn === today),
      departures: active.filter((b) => b.checkOut === today),
      tomorrow: active.filter((b) => b.checkIn === tomorrow),
      monthTotal: monthBookings.reduce((sum, b) => sum + b.total, 0),
      monthDeposit: monthBookings.reduce((sum, b) => sum + b.deposit, 0),
      monthCount: monthBookings.length,
      recent: [...all].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.id - a.id).slice(0, 6),
    }
  }, [bookingsQ.data, today, tomorrow, month])

  const atvSum = atvSummary(atv.data ?? [])
  const totalRooms = rooms.data?.length ?? 0
  const loading = bookingsQ.isPending || rooms.isPending
  const weekday = WEEKDAYS[new Date(today + 'T00:00:00Z').getUTCDay()]

  return (
    <>
      {/* ── Hero ── */}
      <section className="starfield relative mb-6 overflow-hidden rounded-4xl p-6 text-white shadow-lift sm:p-8 lg:mb-8">
        <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-star-300/20 blur-3xl" />
        <p className="text-sm text-white/60">
          วัน{weekday}ที่ {formatThaiDate(today, true)}
        </p>
        <h1 className="mt-1 text-[28px] leading-tight font-bold tracking-tight sm:text-4xl">{greeting()}</h1>
        <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="text-sm text-white/60">ห้องที่มีแขกคืนนี้</p>
            <p className="num text-5xl font-bold tracking-tight">
              {loading ? '–' : s.occupied.size}
              <span className="text-2xl text-white/40">/{totalRooms}</span>
            </p>
          </div>
          <div className="flex gap-5 pb-1.5 sm:gap-6">
            <HeroMini icon={<ArrowDownRight />} label="เช็คอินวันนี้" value={s.arrivals.length} />
            <HeroMini icon={<ArrowUpRight />} label="เช็คเอาท์วันนี้" value={s.departures.length} />
            <HeroMini icon={<CalendarClock />} label="เข้าพรุ่งนี้" value={s.tomorrow.length} />
          </div>
        </div>
        {totalRooms > 0 && (
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-star-300 to-star-500 transition-[width] duration-1000 ease-out"
              style={{ width: `${(s.occupied.size / totalRooms) * 100}%` }}
            />
          </div>
        )}
        <div className="mt-6 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          <HeroLink to="/calendar?new=1" icon={<CalendarPlus />}>
            ลงจอง
          </HeroLink>
          <HeroLink to="/billing" icon={<Receipt />}>
            เช็คเอาท์
          </HeroLink>
          <HeroLink to="/atv?new=1" icon={<CarFront />}>
            ลง ATV
          </HeroLink>
        </div>
      </section>

      {features && (!features.bookingPhotos || !features.atvPhotos) && (
        <div className="mb-6 flex items-start gap-3 rounded-3xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          <p>
            ช่องเก็บลิงก์ภาพลูกค้ายังใช้ไม่ได้ ต้องรัน SQL เพิ่มคอลัมน์ <code className="rounded bg-white/70 px-1">photo_drive_url</code> /{' '}
            <code className="rounded bg-white/70 px-1">photo_consent</code> ใน Supabase ก่อน
          </p>
        </div>
      )}

      {/* ── ตัวเลขเดือนนี้ ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:mb-8 lg:grid-cols-4 lg:gap-4">
        <Stat label="ยอดจองเดือนนี้" value={formatBaht(s.monthTotal)} hint={`${s.monthCount} การจอง`} icon={<Wallet />} loading={loading} />
        <Stat label="มัดจำที่รับแล้ว" value={formatBaht(s.monthDeposit)} hint="ของการจองเดือนนี้" icon={<Receipt />} tone="emerald" loading={loading} />
        <Stat label="กำไร ATV" value={formatBaht(atvSum.profit)} hint={`เดือนนี้ · รับ ${formatBaht(atvSum.income)}`} icon={<CarFront />} tone="violet" loading={atv.isPending} />
        <Stat label="ลูกค้า ATV" value={`${atvSum.pax.toLocaleString()} คน`} hint="เดือนนี้" icon={<Users />} tone="star" loading={atv.isPending} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ── สถานะห้องคืนนี้ ── */}
        <Card className="xl:col-span-2">
          <CardHeader
            icon={<BedDouble />}
            title="สถานะห้องคืนนี้"
            action={
              <Link to="/calendar" viewTransition className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                ปฏิทิน <ArrowRight className="size-4" />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-2 px-5 pb-5 sm:grid-cols-3 sm:px-6 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
              : rooms.data?.map((r) => {
                  const guest = s.tonight.find((b) => b.roomIds.includes(r.id))
                  const leaving = s.departures.some((b) => b.roomIds.includes(r.id))
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        'relative overflow-hidden rounded-2xl p-3.5 ring-1 transition',
                        guest ? 'bg-white ring-slate-200' : 'bg-emerald-50/60 ring-emerald-100',
                      )}
                    >
                      <span className="absolute inset-y-0 left-0 w-1" style={{ background: r.color }} />
                      <p className="truncate font-semibold">{r.name}</p>
                      {guest ? (
                        <>
                          <p className="truncate text-sm text-slate-600">{guest.name}</p>
                          <p className="text-xs text-slate-400">ออก {formatThaiDate(guest.checkOut).replace(/ \d{4}$/, '')}</p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-emerald-600">ว่างคืนนี้</p>
                      )}
                      {leaving && !guest && <p className="text-xs text-amber-600">แขกเช็คเอาท์วันนี้</p>}
                    </div>
                  )
                })}
          </div>
        </Card>

        {/* ── วันนี้ ── */}
        <Card>
          <CardHeader icon={<Clock />} title="ความเคลื่อนไหววันนี้" />
          <div className="space-y-1 px-3 pb-4">
            {loading ? (
              <Skeleton className="mx-2 h-32" />
            ) : !s.arrivals.length && !s.departures.length ? (
              <EmptyState title="วันนี้ไม่มีเข้า-ออก">พักผ่อนได้เลย 🌙</EmptyState>
            ) : (
              [...s.arrivals.map((b) => ({ b, kind: 'in' as const })), ...s.departures.map((b) => ({ b, kind: 'out' as const }))].map(({ b, kind }) => (
                <Link
                  key={`${kind}-${b.id}`}
                  to={kind === 'out' ? `/billing?open=${b.id}` : `/calendar?view=day&d=${today}`}
                  viewTransition
                  className="flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-slate-50"
                >
                  <span className={cn('flex size-10 items-center justify-center rounded-xl', kind === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>
                    {kind === 'in' ? <ArrowDownRight className="size-5" /> : <ArrowUpRight className="size-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{b.name}</span>
                    <span className="block truncate text-xs text-slate-500">{b.roomIds.map((id) => room(id).name).join(', ')}</span>
                  </span>
                  <Badge tone={kind === 'in' ? 'emerald' : 'amber'}>{kind === 'in' ? 'เข้า' : 'ออก'}</Badge>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ── จองล่าสุด ── */}
      <Card className="mt-6">
        <CardHeader icon={<CalendarPlus />} title="การจองล่าสุด" />
        <div className="grid grid-cols-1 gap-1 px-3 pb-3 sm:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="m-2 h-16" />)
            : s.recent.map((b) => (
                <Link key={b.id} to={`/calendar?view=month&d=${b.checkIn}`} viewTransition className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-slate-50">
                  <span className="flex size-10 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: room(b.roomIds[0] ?? -1).color }}>
                    {b.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{b.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {b.code} · เข้า {formatThaiDate(b.checkIn)}
                    </span>
                  </span>
                  <span className="num text-sm font-semibold">{formatBaht(b.total)}</span>
                </Link>
              ))}
        </div>
      </Card>
    </>
  )
}

function HeroMini({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-white/55 [&>svg]:size-3.5">
        {icon}
        {label}
      </p>
      <p className="num text-2xl font-bold">{value}</p>
    </div>
  )
}

function HeroLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      viewTransition
      className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/10 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap ring-1 ring-white/15 backdrop-blur transition hover:bg-white/20 active:scale-95 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm [&>svg]:size-5 sm:[&>svg]:size-4.5"
    >
      {icon}
      {children}
    </Link>
  )
}
