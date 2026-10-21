import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * ตรวจว่ารัน SQL เพิ่มคอลัมน์ photo_drive_url / photo_consent แล้วหรือยัง
 * ถ้ายัง จะไม่ส่งคอลัมน์นี้ตอนบันทึก (ไม่งั้นบันทึกพังทั้งแถว)
 */
export function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    // ตรวจซ้ำทุก 1 นาที / ตอนกลับมาที่แท็บ (หลังรัน SQL จะหายเตือนเองไม่ต้องรีเฟรช)
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const check = async (table: 'bookings' | 'atv_transactions') =>
        !(await supabase.from(table).select('photo_drive_url, photo_consent').limit(1)).error
      const [bookingPhotos, atvPhotos] = await Promise.all([check('bookings'), check('atv_transactions')])
      return { bookingPhotos, atvPhotos }
    },
  })
}
