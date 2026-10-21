// ตัวช่วยแปลงข้อมูลให้เข้ากับรูปแบบที่เว็บเก่าเขียนลงฐานข้อมูล

export type ExtraItem = { name: string; price: number; qty: number }

/** room_ids เก็บเป็น '["7","8"]' -> [7, 8] (ข้อมูลเสียจะได้ []) */
export function parseRoomIds(raw: string | null | undefined): number[] {
  try {
    const arr: unknown = JSON.parse(raw || '[]')
    if (!Array.isArray(arr)) return []
    return arr.map(Number).filter(Number.isFinite)
  } catch {
    return []
  }
}

/** [7, 8] -> '["7","8"]' ต้องเป็น string ข้างใน เพราะเว็บเก่า/ใบเสนอราคาเทียบแบบ string */
export function serializeRoomIds(ids: number[]): string {
  return JSON.stringify(ids.map(String))
}

export function parseExtraItems(raw: string | null | undefined): ExtraItem[] {
  try {
    const arr: unknown = JSON.parse(raw || '[]')
    if (!Array.isArray(arr)) return []
    return arr
      .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
      .map((x) => ({ name: String(x.name ?? ''), price: Number(x.price) || 0, qty: Number(x.qty) || 1 }))
  } catch {
    return []
  }
}

const TZ = 'Asia/Bangkok'

/** วันที่ตามเวลาไทยเป็น 'YYYY-MM-DD' */
export function toDateStr(date: Date = new Date()): string {
  // en-CA ให้รูปแบบ YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date)
}

/** เวลาไทยปัจจุบันเป็น 'HH:mm' */
export function nowTimeStr(): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date())
}

/** บวก/ลบวันจาก 'YYYY-MM-DD' โดยไม่มีปัญหา timezone */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d! + days))
  return dt.toISOString().slice(0, 10)
}

/** จำนวนคืนระหว่างสองวัน */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(checkIn + 'T00:00:00Z')
  const b = Date.parse(checkOut + 'T00:00:00Z')
  return Math.round((b - a) / 86_400_000)
}

export const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
export const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

/** '2026-10-21' -> '21/10/2569' (วัน/เดือน/ปี พ.ศ.) */
export function formatDMY(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${Number(y) + 543}`
}

/** '2026-10-21' -> '21 ต.ค. 2569' */
export function formatThaiDate(dateStr: string, long = false): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const months = long ? THAI_MONTHS : THAI_MONTHS_SHORT
  return `${d} ${months[m! - 1]} ${y! + 543}`
}

/** ข้อความจากช่องกรอก -> ตัวเลข (ว่าง/ผิดรูปแบบ = null) */
export function parseNum(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const baht = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 })

/** ยอดหัก เช่น มัดจำ: 500 -> '-฿500', 0 -> '฿0' */
export function formatDeduct(n: number): string {
  return n > 0 ? `-${formatBaht(n)}` : formatBaht(0)
}

/** 1500 -> '฿1,500', -200 -> '-฿200' */
export function formatBaht(n: number | null | undefined): string {
  const v = n ?? 0
  return v < 0 ? `-฿${baht.format(-v)}` : `฿${baht.format(v)}`
}
