import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ArrowRight, CarFront, FileDown, Loader2, Pencil, Plus, Trash2, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react'
import { atvSummary, useAtv, useDeleteAtv, type AtvEntry } from '@/data/atv'
import { addDays, formatBaht, formatDMY, toDateStr } from '@/lib/format'
import { shiftMonth, WEEKDAYS, weekday } from '@/lib/calendar'
import { toastError } from '@/lib/errors'
import { cn } from '@/lib/cn'
import { ATV_PARTNERS } from '@/config/business'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DateField } from '@/components/ui/DateField'
import { Badge, EmptyState, Fab, PageHeader, Skeleton, Stat } from '@/components/ui/misc'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useConfirm } from '@/components/ui/Confirm'
import { ExportDialog } from '@/components/ExportDialog'
import { PhotoBadge } from '@/components/PhotoFields'
import { A4_WIDTH, buildAtvReportPages } from '@/components/docs/AtvReport'
import { AtvEntryDialog, type AtvTarget } from './AtvEntryDialog'

const endOfMonth = (d: string) => addDays(shiftMonth(d, 1), -1)

export function AtvPage() {
  const today = toDateStr()
  const monthStart = today.slice(0, 8) + '01'
  const [params, setParams] = useSearchParams()
  const start = params.get('from') || monthStart
  const end = params.get('to') || today
  const setRange = (from: string, to: string) => setParams({ from, to }, { replace: true })

  const atv = useAtv(start, end)
  const entries = atv.data ?? []
  const sum = useMemo(() => atvSummary(entries), [entries])
  const [target, setTarget] = useState<AtvTarget>(null)
  // ลิงก์ลัด ?new=1 (จากหน้าภาพรวม) เปิดฟอร์มลงบัญชีทันที
  const wantsNew = params.get('new') === '1'
  useEffect(() => {
    if (!wantsNew) return
    setTarget({ mode: 'new' })
    setParams(
      (p) => {
        p.delete('new')
        return p
      },
      { replace: true },
    )
  }, [wantsNew, setParams])
  const [exportOpen, setExportOpen] = useState(false)
  const del = useDeleteAtv()
  const confirm = useConfirm()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const presets = [
    { label: 'วันนี้', from: today, to: today },
    { label: 'เดือนนี้', from: monthStart, to: today },
    { label: 'เดือนก่อน', from: shiftMonth(monthStart, -1), to: endOfMonth(shiftMonth(monthStart, -1)) },
  ]

  const grouped = useMemo(() => {
    const map = new Map<string, AtvEntry[]>()
    for (const e of entries) map.set(e.date, [...(map.get(e.date) ?? []), e])
    return [...map.entries()]
  }, [entries])

  const onDelete = async (e: AtvEntry) => {
    if (!(await confirm({ title: 'ลบรายการนี้?', message: `${e.description} · ${formatDMY(e.date)} ${e.time} น.`, tone: 'danger', confirmText: 'ลบ' })))
      return false
    await del.mutateAsync(e.id).then(
      () => toast.success('ลบแล้ว'),
      (err) => toastError('ลบรายการ')(err),
    )
    return true
  }

  const pages = useMemo(() => (exportOpen ? buildAtvReportPages(entries, start, end) : []), [exportOpen, entries, start, end])

  return (
    <>
      <PageHeader
        title="บัญชี ATV"
        subtitle="รายรับ รายจ่าย และแบ่งกำไร 50/50"
        actions={
          <>
            <Button size="lg" icon={<FileDown className="size-5" />} onClick={() => setExportOpen(true)} disabled={!entries.length}>
              สรุป PDF / PNG
            </Button>
            {/* มือถือใช้ปุ่มลอย (Fab) แทน */}
            <div className="hidden lg:block">
              <Button size="lg" variant="primary" icon={<Plus className="size-5" />} onClick={() => setTarget({ mode: 'new' })}>
                ลงบัญชี
              </Button>
            </div>
          </>
        }
      />
      <Fab label="ลงบัญชี" icon={<Plus />} onClick={() => setTarget({ mode: 'new' })} />

      {/* ช่วงวันที่ */}
      <Card className="mb-6 flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex min-w-0 items-center gap-1.5 sm:gap-2">
          <div className="min-w-0 flex-1 lg:w-44 lg:flex-none">
            <DateField aria-label="ตั้งแต่วันที่" value={start} max={end} onChange={(v) => v && setRange(v, end)} className="h-11 px-3" />
          </div>
          <ArrowRight className="size-4 shrink-0 text-slate-300" />
          <div className="min-w-0 flex-1 lg:w-44 lg:flex-none">
            <DateField aria-label="ถึงวันที่" value={end} min={start} onChange={(v) => v && setRange(start, v)} className="h-11 px-3" />
          </div>
          {/* มือถือ: ไอคอนโหลดลอยมุมบน ไม่กินที่ช่องวันที่ */}
          <Loader2
            className={cn(
              'size-5 shrink-0 animate-spin text-brand-500 transition-opacity max-sm:absolute max-sm:-top-3 max-sm:-right-2 max-sm:size-4',
              atv.isFetching ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {presets.map((p) => (
            <Button key={p.label} size="sm" variant={p.from === start && p.to === end ? 'night' : 'ghost'} onClick={() => setRange(p.from, p.to)}>
              {p.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* สรุป */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat label="รายรับ" value={formatBaht(sum.income)} icon={<TrendingUp />} tone="emerald" loading={atv.isPending} />
        <Stat label="รายจ่าย" value={formatBaht(sum.expense)} icon={<TrendingDown />} tone="rose" loading={atv.isPending} />
        <Stat label="กำไรสุทธิ" value={formatBaht(sum.profit)} icon={<Wallet />} tone="brand" loading={atv.isPending} />
        <Stat label="ลูกค้า" value={`${sum.pax.toLocaleString()} คน`} icon={<Users />} tone="violet" loading={atv.isPending} hint={sum.pending ? `รอกรอกยอด ${sum.pending} รายการ` : undefined} />
      </div>
      <div className="starfield mb-8 grid gap-px overflow-hidden rounded-3xl text-white sm:grid-cols-2">
        {ATV_PARTNERS.map((name) => (
          <div key={name} className="flex items-center justify-between p-5 sm:p-6">
            <div>
              <p className="text-sm text-white/60">ส่วนแบ่ง {name} (50%)</p>
              <p className="num text-3xl font-bold tracking-tight">{atv.isPending ? '…' : formatBaht(sum.half)}</p>
            </div>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-star-300">
              <Users className="size-5" />
            </span>
          </div>
        ))}
      </div>

      {/* รายการ */}
      <Card className={cn('overflow-hidden transition-opacity', atv.isPlaceholderData && 'opacity-60')}>
        {atv.isPending ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : atv.isError ? (
          <EmptyState icon={<CarFront />} title="โหลดข้อมูลไม่สำเร็จ">
            <Button className="mt-2" onClick={() => atv.refetch()}>
              ลองใหม่
            </Button>
          </EmptyState>
        ) : !entries.length ? (
          <EmptyState icon={<CarFront />} title="ไม่มีรายการในช่วงนี้" action={<Button variant="primary" icon={<Plus className="size-4.5" />} onClick={() => setTarget({ mode: 'new' })}>ลงบัญชี</Button>} />
        ) : (
          grouped.map(([date, list]) => {
            const day = atvSummary(list)
            return (
              <section key={date}>
                <div className="flex items-center justify-between border-y border-slate-100 bg-slate-50 px-4 py-2.5 text-sm first:border-t-0 sm:px-5">
                  <span className="font-semibold">
                    <span className="text-slate-500">วัน{WEEKDAYS[weekday(date)]}</span> <span className="num">{formatDMY(date)}</span>
                  </span>
                  <span className="num text-slate-500">
                    {day.pax > 0 && `${day.pax} คน · `}
                    <span className={day.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatBaht(day.profit)}</span>
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {list.map((e) => (
                    <li
                      key={e.id}
                      onClick={() => !isDesktop && setTarget({ mode: 'edit', entry: e })}
                      className="group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/60 active:bg-slate-100 sm:px-5 lg:active:bg-transparent"
                    >
                      <span className="num w-11 shrink-0 text-sm text-slate-400">{e.time}</span>
                      <span
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-xl',
                          e.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500',
                        )}
                      >
                        {e.type === 'income' ? <TrendingUp className="size-4.5" /> : <TrendingDown className="size-4.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{e.description}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {e.staff && <span className="text-xs text-slate-500">{e.staff}</span>}
                          <PhotoBadge url={e.photoUrl} consent={e.photoConsent} />
                        </div>
                      </div>
                      {e.amount === null ? (
                        <Badge tone="amber">รอกรอกยอด</Badge>
                      ) : (
                        <span className={cn('num font-semibold', e.type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>
                          {e.type === 'income' ? '+' : '−'}
                          {formatBaht(e.amount)}
                        </span>
                      )}
                      {/* มือถือ: แตะทั้งแถวเพื่อแก้ไข / คอม: ปุ่มแสดงตอนชี้เมาส์ */}
                      <div className="hidden shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 lg:flex">
                        <Button size="icon" variant="ghost" className="size-9" onClick={() => setTarget({ mode: 'edit', entry: e })} aria-label="แก้ไข">
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-9 hover:bg-rose-50 hover:text-rose-600" onClick={() => onDelete(e)} aria-label="ลบ">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })
        )}
      </Card>

      <AtvEntryDialog
        target={target}
        onClose={() => setTarget(null)}
        onDelete={onDelete}
        // ลงย้อนหลัง/ล่วงหน้านอกช่วงที่ดูอยู่ → เปิดเดือนของรายการนั้นให้เห็นทันที
        onSaved={(e) => {
          if (e.date >= start && e.date <= end) return
          const from = e.date.slice(0, 8) + '01'
          const monthEnd = endOfMonth(from)
          setRange(from, from === monthStart ? today : monthEnd)
        }}
      />
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="สรุปบัญชี ATV"
        filename={`สรุป ATV ${start} ถึง ${end}`}
        pageWidthPx={A4_WIDTH}
        pages={pages}
      />
    </>
  )
}
