import type { Booking } from '@/data/bookings'
import type { Room, Zone } from '@/data/rooms'
import { roomLookup } from '@/data/rooms'
import { formatBaht, formatDeduct, formatThaiDate, nightsBetween } from '@/lib/format'
import { BUSINESS } from '@/config/business'
import { A4_HEIGHT, A4_WIDTH } from './AtvReport'

/** ใบเสนอราคา A4 */
export function Quotation({ booking: b, rooms, zones }: { booking: Booking; rooms: Room[]; zones: Zone[] }) {
  const room = roomLookup(rooms)
  const nights = nightsBetween(b.checkIn, b.checkOut)
  const zone = zones.find((z) => z.id === b.zoneId)
  const lines = zone
    ? [{ title: `แพ็กเกจ: ${zone.name}`, sub: b.roomIds.map((id) => room(id).name).join(', '), amount: zone.price * nights }]
    : b.roomIds.map((id) => ({ title: `ห้องพัก: ${room(id).name}`, sub: '', amount: room(id).price * nights }))
  const created = b.createdAt ? new Date(b.createdAt).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' }) : '-'

  return (
    <div className="relative flex flex-col bg-white p-[64px] font-sans text-[15px] text-ink" style={{ width: A4_WIDTH, minHeight: A4_HEIGHT }}>
      <div className="flex items-start justify-between border-b-2 border-slate-100 pb-6">
        <div className="flex gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-night-900 text-star-300">
            <svg viewBox="0 0 24 24" className="size-7" fill="currentColor">
              <path d="M14.5 3.2a8.8 8.8 0 1 0 6.3 14.9A7.4 7.4 0 0 1 14.5 3.2Z" />
            </svg>
          </span>
          <div>
            <p className="text-2xl font-bold text-brand-600">{BUSINESS.name}</p>
            <p className="max-w-xs text-sm text-slate-500">{BUSINESS.address}</p>
            <p className="text-sm text-slate-500">
              โทร {BUSINESS.phone} · LINE {BUSINESS.line}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">ใบเสนอราคา</p>
          <p className="text-sm font-medium tracking-[0.25em] text-slate-400">QUOTATION</p>
          <p className="mt-3 text-sm">
            เลขที่อ้างอิง <span className="font-semibold">{b.code}</span>
          </p>
          <p className="text-sm text-slate-500">วันที่ทำรายการ {created}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-8">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400">ข้อมูลลูกค้า</p>
          <p className="text-lg font-semibold">{b.name}</p>
          {b.phone && <p className="text-slate-600">โทร {b.phone}</p>}
          {b.facebook && <p className="text-slate-600">ติดต่อ {b.facebook}</p>}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400">รายละเอียดการเข้าพัก</p>
          <p>
            เช็คอิน <span className="font-semibold">{formatThaiDate(b.checkIn, true)}</span>
          </p>
          <p>
            เช็คเอาท์ <span className="font-semibold">{formatThaiDate(b.checkOut, true)}</span>
          </p>
          <p>
            ระยะเวลา <span className="font-semibold">{nights} คืน</span>
          </p>
        </div>
      </div>

      <table className="mt-8 w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 text-sm text-slate-500">
            <th className="w-14 border-b border-slate-200 py-3 text-center font-semibold">ลำดับ</th>
            <th className="border-b border-slate-200 py-3 text-left font-semibold">รายการ</th>
            <th className="w-24 border-b border-slate-200 py-3 text-center font-semibold">จำนวน</th>
            <th className="w-36 border-b border-slate-200 py-3 pr-4 text-right font-semibold">จำนวนเงิน (บาท)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="border-b border-slate-100 py-3 text-center">{i + 1}</td>
              <td className="border-b border-slate-100 py-3">
                <span className="font-semibold">{l.title}</span>
                {l.sub && <span className="block text-sm text-slate-500">{l.sub}</span>}
              </td>
              <td className="border-b border-slate-100 py-3 text-center">{nights} คืน</td>
              <td className="num border-b border-slate-100 py-3 pr-4 text-right">{l.amount.toLocaleString('th-TH')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-between gap-8">
        <div className="max-w-sm">
          <p className="text-sm font-semibold">หมายเหตุ</p>
          <p className="text-sm text-slate-500">{b.remark || '-'}</p>
        </div>
        <div className="w-72 space-y-1.5">
          <SumRow label="ราคาปกติ" value={formatBaht(b.total + b.discount)} />
          {b.discount > 0 && <SumRow label="ส่วนลด" value={formatDeduct(b.discount)} className="text-rose-600" />}
          <SumRow label="ยอดรวมสุทธิ" value={formatBaht(b.total)} className="font-semibold" />
          <SumRow label="มัดจำแล้ว" value={formatDeduct(b.deposit)} className="text-emerald-600" />
          <div className="flex items-baseline justify-between border-t-2 border-ink pt-2 text-lg font-bold text-brand-600">
            <span>คงเหลือชำระ</span>
            <span className="num">{formatBaht(b.total - b.deposit)}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-slate-200 pt-5 text-sm">
        <p className="font-semibold">ช่องทางการชำระเงิน</p>
        <p className="text-slate-600">
          {BUSINESS.bank.name} · เลขบัญชี <span className="font-semibold">{BUSINESS.bank.account}</span>
        </p>
        <p className="text-slate-600">ชื่อบัญชี {BUSINESS.bank.accountName}</p>
      </div>
    </div>
  )
}

function SumRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between ${className ?? 'text-slate-600'}`}>
      <span>{label}</span>
      <span className="num">{value}</span>
    </div>
  )
}
