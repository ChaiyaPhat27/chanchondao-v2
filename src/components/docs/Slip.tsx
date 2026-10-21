import type { ExtraItem } from '@/lib/format'
import { formatBaht } from '@/lib/format'
import { BUSINESS } from '@/config/business'

export const SLIP_WIDTH = 400

/** สลิปใบเสร็จ / เช็คเอาท์ (กว้าง 400px สำหรับส่งออกเป็นรูปหรือ PDF) */
export function Slip({
  code,
  name,
  roomsText,
  roomBalance,
  extras,
}: {
  code: string
  name: string
  roomsText: string
  roomBalance: number
  extras: ExtraItem[]
}) {
  const extraTotal = extras.reduce((s, i) => s + i.price * i.qty, 0)
  const printedAt = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' })
  return (
    <div className="bg-white p-8 font-sans text-[15px] text-ink" style={{ width: SLIP_WIDTH }}>
      <div className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-night-900 text-star-300">
          <svg viewBox="0 0 24 24" className="size-6" fill="currentColor">
            <path d="M14.5 3.2a8.8 8.8 0 1 0 6.3 14.9A7.4 7.4 0 0 1 14.5 3.2Z" />
          </svg>
        </div>
        <p className="text-xl font-bold">{BUSINESS.name}</p>
        <p className="text-xs text-slate-500">โทร {BUSINESS.phone} · LINE {BUSINESS.line}</p>
      </div>
      <div className="my-4 border-t border-dashed border-slate-300" />
      <p className="font-semibold">ใบเสร็จรับเงิน / สลิปเช็คเอาท์</p>
      <div className="mt-1 space-y-0.5 text-sm text-slate-600">
        <p>รหัส: {code}</p>
        <p>ลูกค้า: {name}</p>
        <p>ห้องพัก: {roomsText}</p>
      </div>
      <div className="my-4 border-t border-dashed border-slate-300" />
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between font-semibold text-slate-500">
          <span>รายการ</span>
          <span>จำนวนเงิน</span>
        </div>
        <div className="flex justify-between">
          <span>ค่าที่พัก (หักมัดจำแล้ว)</span>
          <span className="num">{roomBalance.toLocaleString('th-TH')}</span>
        </div>
        {extras.map((i, idx) => (
          <div key={idx} className={`flex justify-between gap-3 ${i.price < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
            <span>
              {i.name} {i.qty > 1 && `×${i.qty}`}
            </span>
            <span className="num">{(i.price * i.qty).toLocaleString('th-TH')}</span>
          </div>
        ))}
      </div>
      <div className="my-4 border-t border-dashed border-slate-300" />
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-bold">ยอดรวมทั้งสิ้น</span>
        <span className="num text-2xl font-bold">{formatBaht(roomBalance + extraTotal)}</span>
      </div>
      <div className="my-4 border-t border-dashed border-slate-300" />
      <p className="text-center text-sm text-slate-500">ขอบคุณที่ใช้บริการค่ะ ✨</p>
      <p className="text-center text-xs text-slate-400">{printedAt}</p>
    </div>
  )
}
