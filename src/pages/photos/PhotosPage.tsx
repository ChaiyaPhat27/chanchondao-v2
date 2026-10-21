import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BedDouble, CarFront, Check, Copy, ExternalLink, FolderOpen, Images, Minus, Pencil, Plus, Search, X } from 'lucide-react'
import { useBookings } from '@/data/bookings'
import { roomLookup, useRooms } from '@/data/rooms'
import { useFeatures } from '@/data/features'
import { useAtvPhotos } from '@/data/photos'
import { formatDMY } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { EmptyState, Fab, PageHeader, Segmented, Skeleton } from '@/components/ui/misc'
import { AddPhotoDialog, PhotoLinkDialog, type PhotoTarget } from './PhotoLinkDialog'

type Item = PhotoTarget & { date: string; kind: 'บ้าน' | 'รถ' }
type SourceFilter = 'all' | 'booking' | 'atv'
type ConsentFilter = 'all' | 'yes' | 'no' | 'unknown'

export function PhotosPage() {
  const features = useFeatures().data
  const ready = !!features?.bookingPhotos && !!features?.atvPhotos
  const bookings = useBookings()
  const atvPhotos = useAtvPhotos(ready)
  const rooms = useRooms().data
  const room = useMemo(() => roomLookup(rooms), [rooms])

  const [source, setSource] = useState<SourceFilter>('all')
  const [consent, setConsent] = useState<ConsentFilter>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<PhotoTarget | null>(null)
  const [adding, setAdding] = useState(false)

  // รวมลิงก์จากการจองห้อง (บ้าน) + ATV (รถ)
  const items = useMemo<Item[]>(() => {
    const fromBookings: Item[] = (bookings.data ?? [])
      .filter((b) => b.photoUrl)
      .map((b) => ({
        source: 'booking',
        kind: 'บ้าน',
        id: b.id,
        title: b.name,
        subtitle: `${b.code} · ${b.roomIds.map((id) => room(id).name).join(', ')}`,
        date: b.checkIn,
        url: b.photoUrl,
        consent: b.photoConsent,
        askConsent: true,
      }))
    const fromAtv: Item[] = (atvPhotos.data ?? []).map((e) => ({
      source: 'atv',
      kind: 'รถ',
      id: e.id,
      title: e.staff ? `${e.description} · ${e.staff}` : e.description,
      subtitle: `ATV ${e.type === 'income' ? 'รายรับ' : 'รายจ่าย'} · ${e.time} น.`,
      date: e.date,
      url: e.photoUrl,
      consent: e.photoConsent,
      askConsent: e.type === 'income',
    }))
    return [...fromBookings, ...fromAtv].sort((a, b) => b.date.localeCompare(a.date))
  }, [bookings.data, atvPhotos.data, room])

  const q = query.trim().toLowerCase()
  const shown = items.filter(
    (i) =>
      (source === 'all' || i.source === source) &&
      (consent === 'all' || (consent === 'yes' ? i.consent === true : consent === 'no' ? i.consent === false : i.consent === null)) &&
      (!q || `${i.title} ${i.subtitle}`.toLowerCase().includes(q)),
  )
  const count = (f: (i: Item) => boolean) => items.filter(f).length

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('คัดลอกลิงก์แล้ว')
    } catch {
      toast.error('คัดลอกไม่สำเร็จ')
    }
  }

  const loading = bookings.isPending || (ready && atvPhotos.isPending)

  return (
    <>
      <PageHeader
        title="คลังรูปลูกค้า"
        subtitle="รวมลิงก์โฟลเดอร์ Google Drive จากห้องพักและ ATV ไว้ที่เดียว"
        actions={
          <div className="hidden lg:block">
            <Button variant="primary" size="lg" icon={<Plus className="size-5" />} onClick={() => setAdding(true)} disabled={!ready}>
              เพิ่มลิงก์
            </Button>
          </div>
        }
      />
      {ready && <Fab label="เพิ่มลิงก์" icon={<Plus />} onClick={() => setAdding(true)} />}

      {features && !ready && (
        <div className="mb-6 rounded-3xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          ต้องรัน SQL เพิ่มคอลัมน์ photo_drive_url / photo_consent ก่อน หน้านี้จึงจะใช้งานได้
        </div>
      )}

      {/* ตัวกรอง */}
      <Card className="mb-6 space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            layoutId="photo-source"
            className="grid w-full grid-cols-3 lg:inline-flex lg:w-auto"
            value={source}
            onChange={setSource}
            options={[
              { value: 'all', label: `ทั้งหมด ${items.length}` },
              { value: 'booking', label: <span className="flex items-center justify-center gap-1.5"><BedDouble className="size-4" /> บ้าน {count((i) => i.source === 'booking')}</span> },
              { value: 'atv', label: <span className="flex items-center justify-center gap-1.5"><CarFront className="size-4" /> รถ {count((i) => i.source === 'atv')}</span> },
            ]}
          />
          <div className="lg:w-72">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อลูกค้า / คนส่ง / รหัส" leading={<Search />} className="h-11" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['all', 'ทุกสถานะ', null],
              ['yes', `ใช้ภาพได้ (${count((i) => i.consent === true)})`, Check],
              ['no', `ห้ามใช้ภาพ (${count((i) => i.consent === false)})`, X],
              ['unknown', `ยังไม่ได้ถาม (${count((i) => i.consent === null)})`, Minus],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => setConsent(v)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition',
                consent === v ? 'bg-night-900 text-white ring-night-900' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300',
              )}
            >
              {Icon && <Icon className="size-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-3xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Images />}
            title={items.length ? 'ไม่พบรายการตามตัวกรอง' : 'ยังไม่มีลิงก์รูป'}
            action={
              ready && !items.length ? (
                <Button variant="primary" icon={<Plus className="size-4.5" />} onClick={() => setAdding(true)}>
                  เพิ่มลิงก์แรก
                </Button>
              ) : undefined
            }
          >
            {!items.length && 'ใส่ลิงก์ได้ 3 ทาง: ตอนลงจองห้อง, ตอนลงบัญชี ATV หรือกด "เพิ่มลิงก์" ที่หน้านี้'}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((i) => (
            <Card key={`${i.source}-${i.id}`} className="flex flex-col overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                <span
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-2xl',
                    i.source === 'booking' ? 'bg-brand-50 text-brand-600' : 'bg-star-100 text-star-600',
                  )}
                >
                  {i.source === 'booking' ? <BedDouble className="size-5" /> : <CarFront className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{i.title}</p>
                  <p className="truncate text-xs text-slate-500">{i.subtitle}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="num rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{formatDMY(i.date)}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{i.kind}</span>
                    {i.askConsent &&
                      (i.consent === true ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">ใช้ภาพได้</span>
                      ) : i.consent === false ? (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-600">ห้ามใช้ภาพ</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">ยังไม่ได้ถาม</span>
                      ))}
                  </div>
                </div>
              </div>
              <div className="mt-auto grid grid-cols-[1fr_auto_auto] gap-1.5 border-t border-slate-100 p-2">
                <a
                  href={i.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-50 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
                >
                  <FolderOpen className="size-4.5" /> เปิดโฟลเดอร์ <ExternalLink className="size-3.5 opacity-60" />
                </a>
                <Button size="icon" variant="ghost" onClick={() => copy(i.url)} aria-label="คัดลอกลิงก์">
                  <Copy className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setEditing(i)} aria-label="แก้ไข">
                  <Pencil className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PhotoLinkDialog target={editing} onClose={() => setEditing(null)} />
      <AddPhotoDialog open={adding} onClose={() => setAdding(false)} />
    </>
  )
}
