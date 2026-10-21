import { useMemo, useState, type FormEvent } from 'react'
import { BedDouble, CarFront, ChevronLeft, FolderOpen, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSavePhotoLink, type PhotoSource } from '@/data/photos'
import { useBookings, type PhotoConsent } from '@/data/bookings'
import { useAtv } from '@/data/atv'
import { roomLookup, useRooms } from '@/data/rooms'
import { formatBaht, formatDMY, toDateStr } from '@/lib/format'
import { toastError } from '@/lib/errors'
import { cn } from '@/lib/cn'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { DateField } from '@/components/ui/DateField'
import { Segmented } from '@/components/ui/misc'
import { ConsentPicker, isDriveUrl } from '@/components/PhotoFields'

/** รายการที่จะผูกลิงก์รูป */
export type PhotoTarget = {
  source: PhotoSource
  id: number
  title: string
  subtitle: string
  url: string
  consent: PhotoConsent
  /** ถามการยินยอมใช้ภาพไหม (จองห้อง / ATV รายรับ) */
  askConsent: boolean
}

/** แก้ / ลบลิงก์ของรายการเดียว */
export function PhotoLinkDialog({ target, onClose }: { target: PhotoTarget | null; onClose: () => void }) {
  return (
    <Dialog open={!!target} onClose={onClose} size="sm" icon={<FolderOpen />} title="ลิงก์โฟลเดอร์รูป" description={target ? `${target.title} · ${target.subtitle}` : ''}>
      {target && <LinkForm key={`${target.source}-${target.id}`} target={target} onDone={onClose} />}
    </Dialog>
  )
}

function LinkForm({ target, onDone, onBack }: { target: PhotoTarget; onDone: () => void; onBack?: () => void }) {
  const save = useSavePhotoLink()
  const [url, setUrl] = useState(target.url)
  const [consent, setConsent] = useState<PhotoConsent>(target.consent)

  const persist = (u: string, c: PhotoConsent, msg: string) =>
    save.mutate({ source: target.source, id: target.id, url: u, consent: c }, { onSuccess: () => (toast.success(msg), onDone()), onError: toastError('บันทึกลิงก์') })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!isDriveUrl(url)) return toast.error('ลิงก์ต้องขึ้นต้นด้วย https://')
    persist(url, target.askConsent ? consent : null, 'บันทึกลิงก์แล้ว')
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {onBack && (
        <button type="button" onClick={onBack} className="-mt-1 flex items-center gap-1 text-sm font-medium text-brand-600">
          <ChevronLeft className="size-4" /> เลือกรายการอื่น
        </button>
      )}
      <div className="rounded-2xl bg-slate-50 p-3.5 text-sm">
        <p className="font-semibold">{target.title}</p>
        <p className="text-slate-500">{target.subtitle}</p>
      </div>
      <Field label="ลิงก์โฟลเดอร์ Google Drive">
        <Input type="url" inputMode="url" required autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
      </Field>
      {target.askConsent && <ConsentPicker consent={consent} onChange={setConsent} layoutId="gallery-consent" />}
      <div className="flex gap-2 pt-2">
        {target.url && (
          <Button
            variant="ghost"
            size="lg"
            className="text-rose-600 hover:bg-rose-50"
            icon={<Trash2 className="size-4.5" />}
            onClick={() => persist('', null, 'เอาลิงก์ออกแล้ว')}
            disabled={save.isPending}
          >
            เอาออก
          </Button>
        )}
        <Button type="submit" variant="primary" size="lg" className="flex-1" loading={save.isPending}>
          บันทึกลิงก์
        </Button>
      </div>
    </form>
  )
}

/** เพิ่มลิงก์ใหม่: เลือกว่ามาจากการจองห้อง (บ้าน) หรือ ATV (รถ) แล้วเลือกรายการ */
export function AddPhotoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [source, setSource] = useState<PhotoSource>('atv')
  const [picked, setPicked] = useState<PhotoTarget | null>(null)
  const close = () => {
    setPicked(null)
    onClose()
  }
  return (
    <Dialog open={open} onClose={close} size="md" icon={<FolderOpen />} title="เพิ่มลิงก์รูปลูกค้า" description="เลือกรายการที่จะเก็บลิงก์โฟลเดอร์ Google Drive">
      {picked ? (
        <LinkForm target={picked} onDone={close} onBack={() => setPicked(null)} />
      ) : (
        <div className="space-y-4">
          <Segmented
            layoutId="add-photo-source"
            className="w-full"
            value={source}
            onChange={setSource}
            options={[
              { value: 'atv', label: <span className="flex items-center justify-center gap-2"><CarFront className="size-4" /> ATV (รถ)</span> },
              { value: 'booking', label: <span className="flex items-center justify-center gap-2"><BedDouble className="size-4" /> ห้องพัก (บ้าน)</span> },
            ]}
          />
          {source === 'atv' ? <PickAtv onPick={setPicked} /> : <PickBooking onPick={setPicked} />}
        </div>
      )}
    </Dialog>
  )
}

function PickAtv({ onPick }: { onPick: (t: PhotoTarget) => void }) {
  const [date, setDate] = useState(toDateStr())
  const atv = useAtv(date, date)
  return (
    <div className="space-y-3">
      <Field label="วันที่ลงบัญชี">
        <DateField value={date} onChange={(v) => v && setDate(v)} />
      </Field>
      <div className="space-y-1.5">
        {atv.isPending && <p className="py-4 text-center text-sm text-slate-400">กำลังโหลด...</p>}
        {atv.data?.length === 0 && <p className="py-4 text-center text-sm text-slate-400">ไม่มีรายการในวันนี้</p>}
        {atv.data?.map((e) => (
          <PickRow
            key={e.id}
            hasLink={!!e.photoUrl}
            title={e.staff ? `${e.description} · ${e.staff}` : e.description}
            subtitle={`${e.type === 'income' ? 'รายรับ' : 'รายจ่าย'} · ${e.time} น.${e.amount !== null ? ` · ${formatBaht(e.amount)}` : ''}`}
            tone={e.type === 'income' ? 'emerald' : 'rose'}
            onClick={() =>
              onPick({
                source: 'atv',
                id: e.id,
                title: e.staff ? `${e.description} · ${e.staff}` : e.description,
                subtitle: `ATV ${e.type === 'income' ? 'รายรับ' : 'รายจ่าย'} · ${formatDMY(e.date)} ${e.time} น.`,
                url: e.photoUrl,
                consent: e.photoConsent,
                askConsent: e.type === 'income',
              })
            }
          />
        ))}
      </div>
    </div>
  )
}

function PickBooking({ onPick }: { onPick: (t: PhotoTarget) => void }) {
  const bookings = useBookings().data ?? []
  const room = roomLookup(useRooms().data)
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return bookings
      .filter((b) => !s || b.name.toLowerCase().includes(s) || b.code.toLowerCase().includes(s))
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn))
      .slice(0, 30)
  }, [bookings, q])
  return (
    <div className="space-y-3">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อลูกค้า หรือรหัสจอง" leading={<Search />} />
      <div className="space-y-1.5">
        {list.map((b) => {
          const rooms = b.roomIds.map((id) => room(id).name).join(', ')
          return (
            <PickRow
              key={b.id}
              hasLink={!!b.photoUrl}
              title={b.name}
              subtitle={`${formatDMY(b.checkIn)} · ${rooms}`}
              tone="brand"
              onClick={() =>
                onPick({
                  source: 'booking',
                  id: b.id,
                  title: b.name,
                  subtitle: `ห้องพัก ${b.code} · เข้า ${formatDMY(b.checkIn)}`,
                  url: b.photoUrl,
                  consent: b.photoConsent,
                  askConsent: true,
                })
              }
            />
          )
        })}
        {!list.length && <p className="py-4 text-center text-sm text-slate-400">ไม่พบการจอง</p>}
      </div>
    </div>
  )
}

function PickRow({ title, subtitle, tone, hasLink, onClick }: { title: string; subtitle: string; tone: 'emerald' | 'rose' | 'brand'; hasLink: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200 transition hover:ring-brand-300 active:scale-[0.99]"
    >
      <span className={cn('size-2.5 shrink-0 rounded-full', tone === 'emerald' ? 'bg-emerald-500' : tone === 'rose' ? 'bg-rose-500' : 'bg-brand-500')} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-xs text-slate-500">{subtitle}</span>
      </span>
      {hasLink && <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-600">มีลิงก์แล้ว</span>}
    </button>
  )
}
