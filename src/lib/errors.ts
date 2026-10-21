import { toast } from 'sonner'

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

/** แจ้งเตือนเมื่อบันทึกไม่สำเร็จ (เว็บเก่าบอกว่าสำเร็จแม้จะพัง) */
export function toastError(action: string) {
  return (e: unknown) => {
    console.error(e)
    toast.error(`${action}ไม่สำเร็จ`, { description: errorMessage(e) })
  }
}

/** ดึง data จากผลลัพธ์ของ supabase (โยน error ถ้าพังหรือไม่มีข้อมูล) */
export function unwrap<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error
  if (data === null) throw new Error('ไม่พบข้อมูล')
  return data
}

/** ใช้กับคำสั่งที่ไม่ต้องการข้อมูลกลับ เช่น delete */
export function check({ error }: { error: unknown }): void {
  if (error) throw error
}
