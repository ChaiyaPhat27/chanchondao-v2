/** รวม className แบบมีเงื่อนไข (ค่าที่ไม่ใช่ข้อความจะถูกข้าม) */
export function cn(...classes: unknown[]): string {
  return classes.filter((c): c is string => typeof c === 'string' && c !== '').join(' ')
}
