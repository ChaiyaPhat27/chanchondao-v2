import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('ไม่พบ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ในไฟล์ .env')
}

export const supabase = createClient<Database>(url, anonKey, {
  // หลังบ้านยังไม่มีระบบล็อกอิน ไม่ต้องเก็บ session
  auth: { persistSession: false },
})

/** Supabase ส่งได้สูงสุด 1,000 แถวต่อครั้ง ฟังก์ชันนี้ดึงทีละหน้าจนครบ */
export async function fetchAll<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) return rows
  }
}
