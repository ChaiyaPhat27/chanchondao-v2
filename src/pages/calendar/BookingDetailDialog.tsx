import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { CalendarRange, Copy, FileText, Gift, Pencil, Phone, Receipt, Share2, Trash2, UserRound } from 'lucide-react'
import { roomLookup, useRooms, useZones } from '@/data/rooms'
import { useDeleteBooking, type Booking } from '@/data/bookings'
import { formatBaht, formatDeduct, formatThaiDate, nightsBetween } from '@/lib/format'
import { toastError } from '@/lib/errors'
import { BUSINESS } from '@/config/business'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/misc'
import { useConfirm } from '@/components/ui/Confirm'
import { PhotoBadge } from '@/components/PhotoFields'

export function BookingDetailDialog({
  booking,
  onClose,
  onEdit,
}: {
  booking: Booking | null
  onClose: () => void
  onEdit: (b: Booking) => void
}) {
  return (
    <Dialog open={!!booking} onClose={onClose} size="md" title={booking?.name} description={booking && `${booking.code} · ${booking.source || 'จองตรง'}`} icon={<UserRound />}>
      {booking && <Detail booking={booking} onClose={onClose} onEdit={onEdit} />}
    </Dialog>
  )
}

function Detail({ booking: b, onClose, onEdit }: { booking: Booking; onClose: () => void; onEdit: (b: Booking) => void }) {
  const rooms = useRooms().data
  const zones = useZones().data
  const room = roomLookup(rooms)
  const del = useDeleteBooking()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const nights = nightsBetween(b.checkIn, b.checkOut)
  const zone = zones?.find((z) => z.id === b.zoneId)
  const balance = b.total - b.deposit

  const chatText = [
    `✨ ยืนยันการจอง ${BUSINESS.name} ✨`,
    `รหัสจอง: ${b.code}`,
    `คุณ: ${b.name}`,
    `เข้าพัก: ${formatThaiDate(b.checkIn)} - ${formatThaiDate(b.checkOut)} (${nights} คืน)`,
    `ห้องพัก: ${zone ? `${zone.name} (${b.roomIds.map((id) => room(id).name).join(', ')})` : b.roomIds.map((id) => room(id).name).join(', ')}`,
    '------------------------',
    `ยอดรวม: ${formatBaht(b.total)}`,
    `มัดจำแล้ว: ${formatBaht(b.deposit)}`,
    `ยอดคงเหลือชำระ: ${formatBaht(balance)}`,
    '------------------------',
    'ขอบคุณที่ใช้บริการค่ะ 🙏',
  ].join('\n')

  const copyChat = async () => {
    try {
      await navigator.clipboard.writeText(chatText)
      toast.success('คัดลอกข้อความแล้ว', { description: 'วางส่งลูกค้าใน LINE / Messenger ได้เลย' })
    } catch {
      toast.error('คัดลอกไม่สำเร็จ')
    }
  }

  const onDelete = async () => {
    const ok = await confirm({
      title: 'ยกเลิกคิวนี้?',
      message: `การจองของ ${b.name} (${b.code}) จะถูกลบถาวร`,
      tone: 'danger',
      confirmText: 'ยกเลิกคิว',
      cancelText: 'ไม่ใช่',
    })
    if (ok)
      del.mutate(b.id, {
        onSuccess: () => {
          toast.success('ยกเลิกคิวแล้ว')
          onClose()
        },
        onError: toastError('ยกเลิกคิว'),
      })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {b.checkedOut ? <Badge tone="slate">เช็คเอาท์แล้ว</Badge> : <Badge tone="emerald" dot>จองแล้ว</Badge>}
        <PhotoBadge url={b.photoUrl} consent={b.photoConsent} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-emerald-50 p-3.5">
          <p className="text-xs font-medium text-emerald-700">เช็คอิน</p>
          <p className="font-semibold">{formatThaiDate(b.checkIn)}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-3.5">
          <p className="text-xs font-medium text-amber-700">เช็คเอาท์ · {nights} คืน</p>
          <p className="font-semibold">{formatThaiDate(b.checkOut)}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <CalendarRange className="size-3.5" /> ห้องพัก
        </p>
        <div className="flex flex-wrap gap-1.5">
          {zone && <Badge tone="star">โซน {zone.name}</Badge>}
          {b.roomIds.map((id) => {
            const r = room(id)
            return (
              <span key={id} className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-sm ring-1 ring-slate-200">
                <span className="size-2 rounded-full" style={{ background: r.color }} />
                {r.name}
              </span>
            )
          })}
        </div>
      </div>

      {(b.phone || b.facebook) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
          {b.phone && (
            <a href={`tel:${b.phone}`} className="flex items-center gap-1.5 hover:text-brand-600">
              <Phone className="size-4" /> {b.phone}
            </a>
          )}
          {b.facebook && (
            <span className="flex items-center gap-1.5">
              <Share2 className="size-4" /> {b.facebook}
            </span>
          )}
        </div>
      )}

      {b.remark && (
        <p className="flex items-start gap-2 rounded-2xl bg-violet-50 p-3.5 text-sm text-violet-800">
          <Gift className="mt-0.5 size-4 shrink-0" /> {b.remark}
        </p>
      )}

      <div className="space-y-1.5 rounded-2xl bg-slate-50 p-4 text-sm">
        {b.discount > 0 && (
          <>
            <Row label="ราคาปกติ" value={formatBaht(b.total + b.discount)} />
            <Row label="ส่วนลด" value={formatDeduct(b.discount)} className="text-rose-600" />
          </>
        )}
        <Row label="ยอดรวมสุทธิ" value={formatBaht(b.total)} />
        <Row label="มัดจำแล้ว" value={formatDeduct(b.deposit)} className="text-emerald-600" />
        <div className="flex items-center justify-between border-t border-slate-200 pt-2">
          <span className="font-semibold">คงเหลือ</span>
          <span className="num text-xl font-bold text-brand-600">{formatBaht(balance)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button icon={<Pencil className="size-4" />} onClick={() => onEdit(b)}>
          แก้ไข
        </Button>
        <Button variant="primary" icon={<Copy className="size-4" />} onClick={copyChat}>
          คัดลอกส่งลูกค้า
        </Button>
        <Button icon={<FileText className="size-4" />} onClick={() => navigate(`/invoice/${b.id}`, { viewTransition: true })}>
          ใบเสนอราคา
        </Button>
        <Button icon={<Receipt className="size-4" />} onClick={() => navigate(`/billing?open=${b.id}`, { viewTransition: true })}>
          เปิดบิล
        </Button>
        <Button variant="ghost" className="col-span-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700" icon={<Trash2 className="size-4" />} onClick={onDelete} loading={del.isPending}>
          ยกเลิกคิว
        </Button>
      </div>
    </div>
  )
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-center justify-between ${className ?? 'text-slate-600'}`}>
      <span>{label}</span>
      <span className="num font-medium">{value}</span>
    </div>
  )
}
