import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { BedDouble, Check, ChevronLeft, ChevronRight, Megaphone, MessageCircle, Users, X } from 'lucide-react'
import { fetchAll, supabase } from '@/lib/supabase'
import { formatThaiDate, parseRoomIds, THAI_MONTHS, toDateStr } from '@/lib/format'
import { monthGrid, shiftMonth, WEEKDAYS_SHORT } from '@/lib/calendar'
import { cn } from '@/lib/cn'
import { Dialog } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/misc'
import { LogoMark } from '@/components/Logo'
import { BUSINESS } from '@/config/business'

type PublicRoom = { id: number; room_name: string; color_hex: string; max_pax: number | null; details: string | null }
type Stay = { roomIds: number[]; checkIn: string; checkOut: string }

// ⚠️ หน้าสาธารณะ: ดึงเฉพาะคอลัมน์ที่จำเป็น ห้ามดึงชื่อ/เบอร์ลูกค้า
function usePublicData() {
  const rooms = useQuery({
    queryKey: ['public-rooms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rooms').select('id, room_name, color_hex, max_pax, details').order('id')
      if (error) throw error
      return data as PublicRoom[]
    },
  })
  const stays = useQuery({
    queryKey: ['public-stays'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const since = toDateStr(new Date(Date.now() - 40 * 86_400_000))
      const rows = await fetchAll<{ room_ids: string; check_in: string; check_out: string }>((from, to) =>
        supabase
          .from('bookings')
          .select('room_ids, check_in, check_out')
          .neq('status', 'checked_out')
          .gte('check_out', since)
          .order('id')
          .range(from, to),
      )
      return rows.map<Stay>((r) => ({ roomIds: parseRoomIds(r.room_ids), checkIn: r.check_in, checkOut: r.check_out }))
    },
  })
  const site = useQuery({
    queryKey: ['public-site'],
    queryFn: async () => {
      const { data } = await supabase.from('site_settings').select('hero_title, hero_subtitle, announcement, line_url, facebook_url').order('id').limit(1).maybeSingle()
      return data
    },
  })
  return { rooms, stays, site }
}

const busyOn = (stays: Stay[], date: string) => {
  const s = new Set<number>()
  for (const b of stays) if (b.checkIn <= date && date < b.checkOut) b.roomIds.forEach((id) => s.add(id))
  return s
}

export function AvailabilityApp() {
  const today = toDateStr()
  const [cursor, setCursor] = useState(today.slice(0, 8) + '01')
  const [dir, setDir] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const { rooms, stays, site } = usePublicData()
  const allRooms = rooms.data ?? []
  const [y, m] = cursor.split('-').map(Number) as [number, number]
  const cells = useMemo(() => monthGrid(y, m - 1), [y, m])
  const canGoBack = cursor > today.slice(0, 8) + '01'

  const move = (d: number) => {
    setDir(d)
    setCursor(shiftMonth(cursor, d))
  }

  const busySel = selected ? busyOn(stays.data ?? [], selected) : new Set<number>()
  const free = allRooms.filter((r) => !busySel.has(r.id))
  const full = allRooms.filter((r) => busySel.has(r.id))

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Hero */}
      <header className="starfield relative overflow-hidden px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-28 text-white">
        <div className="pointer-events-none absolute -top-20 right-0 size-72 rounded-full bg-star-300/20 blur-3xl" />
        <div className="relative mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-3">
              <LogoMark />
              <span className="text-lg font-bold">{BUSINESS.name}</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 ring-1 ring-white/15">
              <span className="size-1.5 animate-twinkle rounded-full bg-emerald-400" /> อัปเดตอัตโนมัติ
            </span>
          </div>
          <h1 className="mt-10 text-4xl leading-tight font-bold tracking-tight sm:text-5xl">{site.data?.hero_title || 'เช็คห้องว่าง'}</h1>
          <p className="mt-2 max-w-lg text-white/65">{site.data?.hero_subtitle || 'เลือกวันที่เพื่อดูว่าห้องไหนยังว่างอยู่ แล้วทักมาจองได้เลย'}</p>
          {(site.data?.line_url || site.data?.facebook_url) && (
            <div className="mt-6 flex flex-wrap gap-2">
              {site.data?.line_url && (
                <a href={site.data.line_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl bg-[#06c755] px-5 py-3 text-sm font-semibold shadow-lg transition hover:brightness-110">
                  <MessageCircle className="size-4.5" /> จองผ่าน LINE
                </a>
              )}
              {site.data?.facebook_url && (
                <a href={site.data.facebook_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/20 transition hover:bg-white/20">
                  Facebook
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="relative mx-auto -mt-20 max-w-4xl px-4 pb-16">
        {site.data?.announcement && (
          <div className="mb-4 flex items-start gap-3 rounded-3xl bg-star-100 p-4 text-sm text-star-600 shadow-soft ring-1 ring-star-200">
            <Megaphone className="mt-0.5 size-5 shrink-0" />
            <p className="whitespace-pre-line text-ink">{site.data.announcement}</p>
          </div>
        )}

        <section className="rounded-4xl bg-white p-4 shadow-lift sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {THAI_MONTHS[m - 1]} {y + 543}
              </h2>
              <p className="text-sm text-slate-500">แตะวันที่เพื่อดูห้องว่าง</p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={!canGoBack}
                onClick={() => move(-1)}
                className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 transition hover:bg-slate-200 disabled:opacity-30"
                aria-label="เดือนก่อน"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button type="button" onClick={() => move(1)} className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 transition hover:bg-slate-200" aria-label="เดือนถัดไป">
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 pb-2 text-center text-xs font-medium text-slate-400">
            {WEEKDAYS_SHORT.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {rooms.isPending || stays.isPending ? (
            <Skeleton className="h-80 rounded-2xl" />
          ) : (
            <div className="overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.div
                  key={cursor}
                  custom={dir}
                  variants={{ enter: (d: number) => ({ opacity: 0, x: d * 40 }), center: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: d * -40 }) }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="grid grid-cols-7 gap-1 sm:gap-2"
                >
                  {cells.map((date, i) => {
                    if (!date) return <div key={i} />
                    const past = date < today
                    const left = allRooms.length - busyOn(stays.data ?? [], date).size
                    const tone = left === 0 ? 'full' : left === allRooms.length ? 'free' : 'some'
                    return (
                      <button
                        key={date}
                        type="button"
                        disabled={past}
                        onClick={() => setSelected(date)}
                        className={cn(
                          'flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl transition duration-200 sm:aspect-[4/3]',
                          past && 'opacity-30',
                          !past && 'hover:-translate-y-0.5 hover:shadow-soft',
                          date === today && 'ring-2 ring-brand-500',
                          tone === 'full' ? 'bg-rose-50' : tone === 'some' ? 'bg-amber-50' : 'bg-emerald-50',
                        )}
                      >
                        <span className="num text-sm font-semibold sm:text-base">{Number(date.slice(8))}</span>
                        <span
                          className={cn(
                            'text-[10px] font-semibold sm:text-xs',
                            tone === 'full' ? 'text-rose-500' : tone === 'some' ? 'text-amber-600' : 'text-emerald-600',
                          )}
                        >
                          {tone === 'full' ? 'เต็ม' : `ว่าง ${left}`}
                        </span>
                      </button>
                    )
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
            <Legend className="bg-emerald-200">ว่างทุกห้อง</Legend>
            <Legend className="bg-amber-200">ว่างบางห้อง</Legend>
            <Legend className="bg-rose-200">เต็มแล้ว</Legend>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">© {new Date().getFullYear()} {BUSINESS.name}</p>
      </main>

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        size="md"
        title={selected ? `คืนวันที่ ${formatThaiDate(selected, true)}` : ''}
        description={selected ? `ว่าง ${free.length} จาก ${allRooms.length} ห้อง` : ''}
        icon={<BedDouble />}
        footer={
          site.data?.line_url ? (
            <a href={site.data.line_url} target="_blank" rel="noreferrer" className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#06c755] font-semibold text-white">
              <MessageCircle className="size-5" /> ทัก LINE เพื่อจอง
            </a>
          ) : undefined
        }
      >
        {free.length > 0 && <p className="mb-2 text-xs font-semibold text-emerald-600">ห้องที่ยังว่าง</p>}
        <div className="grid grid-cols-2 gap-2">
          {free.map((r) => (
            <div key={r.id} className="flex flex-col items-center rounded-2xl bg-emerald-50/60 p-3 text-center ring-1 ring-emerald-100">
              <span className="mb-2 flex size-10 items-center justify-center rounded-xl text-white" style={{ background: r.color_hex }}>
                <Check className="size-5" />
              </span>
              <p className="font-semibold leading-tight">{r.room_name}</p>
              {r.max_pax ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <Users className="size-3.5" /> พักได้ {r.max_pax} คน
                </p>
              ) : null}
              {r.details && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{r.details}</p>}
            </div>
          ))}
        </div>
        {full.length > 0 && (
          <>
            <p className="mt-4 mb-2 text-xs font-semibold text-rose-500">จองแล้ว</p>
            <div className="flex flex-wrap gap-1.5">
              {full.map((r) => (
                <span key={r.id} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-400 line-through">
                  <X className="size-3.5" />
                  {r.room_name}
                </span>
              ))}
            </div>
          </>
        )}
      </Dialog>
    </div>
  )
}

function Legend({ className, children }: { className: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-3 rounded-full', className)} />
      {children}
    </span>
  )
}
