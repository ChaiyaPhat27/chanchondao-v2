import { addDays } from './format'

/** วันในสัปดาห์ของ 'YYYY-MM-DD' (0 = อาทิตย์) */
export function weekday(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay()
}

export function monthKey(year: number, month0: number) {
  return `${year}-${String(month0 + 1).padStart(2, '0')}`
}

export function daysInMonth(year: number, month0: number) {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
}

/** ตารางเดือน เริ่มวันอาทิตย์ ช่องว่างหน้า/หลังเป็น null */
export function monthGrid(year: number, month0: number): (string | null)[] {
  const first = `${monthKey(year, month0)}-01`
  const lead = weekday(first)
  const days = daysInMonth(year, month0)
  const cells: (string | null)[] = Array(lead).fill(null)
  for (let d = 0; d < days; d++) cells.push(addDays(first, d))
  while (cells.length % 7) cells.push(null)
  return cells
}

/** 7 วันของสัปดาห์ที่มี dateStr (อาทิตย์-เสาร์) */
export function weekDays(dateStr: string): string[] {
  const start = addDays(dateStr, -weekday(dateStr))
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function shiftMonth(dateStr: string, delta: number): string {
  const [y, m] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1))
  return d.toISOString().slice(0, 10)
}

export const WEEKDAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
export const WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

/** จำนวนวันจากวันนี้ถึง dateStr (ติดลบ = ผ่านมาแล้ว) */
export function daysFrom(today: string, dateStr: string) {
  return Math.round((Date.parse(dateStr + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86_400_000)
}
