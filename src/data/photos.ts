import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAll, supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { AtvTransactionRow, BookingRow } from '@/lib/database.types'
import { toEntry, type AtvEntry } from './atv'
import { toBooking, type Booking, type PhotoConsent } from './bookings'

export type PhotoSource = 'booking' | 'atv'

/** รายการ ATV ที่มีลิงก์รูป (ทุกช่วงวันที่) */
export function useAtvPhotos(enabled: boolean) {
  return useQuery({
    queryKey: ['atv-photos'],
    enabled,
    queryFn: async () =>
      (
        await fetchAll<AtvTransactionRow>((from, to) =>
          supabase.from('atv_transactions').select('*').not('photo_drive_url', 'is', null).order('id', { ascending: false }).range(from, to),
        )
      ).map(toEntry),
  })
}

/**
 * แก้เฉพาะลิงก์รูป + การยินยอม ของการจองหรือรายการ ATV
 * (อัปเดตแค่ 2 คอลัมน์นี้ ข้อมูลอื่นของแถวไม่ถูกแตะ)
 */
export function useSavePhotoLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ source, id, url, consent }: { source: PhotoSource; id: number; url: string; consent: PhotoConsent }) => {
      const payload = { photo_drive_url: url.trim() || null, photo_consent: consent }
      if (source === 'booking') {
        const row = unwrap<BookingRow>(await supabase.from('bookings').update(payload).eq('id', id).select().single())
        return { source, booking: toBooking(row) } as const
      }
      const row = unwrap<AtvTransactionRow>(await supabase.from('atv_transactions').update(payload).eq('id', id).select().single())
      return { source, entry: toEntry(row) } as const
    },
    onSuccess: (res) => {
      if (res.source === 'booking') {
        qc.setQueryData<Booking[]>(['bookings'], (old = []) => old.map((b) => (b.id === res.booking.id ? res.booking : b)))
      } else {
        qc.setQueriesData<AtvEntry[]>({ queryKey: ['atv'] }, (old) => old?.map((e) => (e.id === res.entry.id ? res.entry : e)))
        qc.invalidateQueries({ queryKey: ['atv-photos'] })
      }
    },
  })
}
