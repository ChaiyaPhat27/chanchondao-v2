import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAll, supabase } from '@/lib/supabase'
import { check, unwrap } from '@/lib/errors'
import type { BookingRow, CustomerRow } from '@/lib/database.types'
import { parseExtraItems, parseRoomIds, serializeRoomIds, type ExtraItem } from '@/lib/format'
import type { Room } from './rooms'

export type PhotoConsent = boolean | null

export type Booking = {
  id: number
  name: string
  phone: string
  facebook: string
  source: string
  checkIn: string
  checkOut: string
  roomIds: number[]
  zoneId: number | null
  total: number
  deposit: number
  discount: number
  remark: string
  checkedOut: boolean
  code: string
  extras: ExtraItem[]
  photoUrl: string
  photoConsent: PhotoConsent
  createdAt: string | null
}

export const toBooking = (b: BookingRow): Booking => ({
  id: b.id,
  name: b.customer_name,
  phone: b.customer_phone ?? '',
  facebook: b.customer_facebook ?? '',
  source: b.source ?? '',
  checkIn: b.check_in,
  checkOut: b.check_out,
  roomIds: parseRoomIds(b.room_ids),
  zoneId: b.zone_id,
  total: Number(b.total_price) || 0,
  deposit: Number(b.deposit) || 0,
  discount: Number(b.discount_amount) || 0,
  remark: b.remark ?? '',
  checkedOut: b.status === 'checked_out',
  code: b.short_code_id || `#${String(b.id).slice(-4)}`,
  extras: parseExtraItems(b.extra_items),
  photoUrl: b.photo_drive_url ?? '',
  photoConsent: b.photo_consent ?? null,
  createdAt: b.created_at,
})

export const extrasTotal = (items: ExtraItem[]) => items.reduce((s, i) => s + i.price * i.qty, 0)

/** ยอดที่ต้องเก็บตอนเช็คเอาท์ = (ยอดสุทธิ - มัดจำ) + ของสั่งเพิ่ม */
export const amountDue = (b: Pick<Booking, 'total' | 'deposit'>, extras: ExtraItem[]) => b.total - b.deposit + extrasTotal(extras)

/** การจองนี้พักคืนวันที่ date ไหม (คืนเช็คเอาท์ไม่นับ) */
export const staysOn = (b: Booking, date: string) => b.checkIn <= date && date < b.checkOut

export const bookingsQuery = {
  queryKey: ['bookings'] as const,
  queryFn: async () =>
    (await fetchAll<BookingRow>((from, to) => supabase.from('bookings').select('*').order('id').range(from, to))).map(toBooking),
}

export const useBookings = () => useQuery(bookingsQuery)

export const customersQuery = {
  queryKey: ['customers'] as const,
  queryFn: () => fetchAll<CustomerRow>((from, to) => supabase.from('customers').select('*').order('full_name').range(from, to)),
}
export const useCustomers = () => useQuery(customersQuery)

/** ห้องที่ไม่ว่างในช่วง [checkIn, checkOut) ไม่นับการจอง excludeId */
export function busyRoomIds(bookings: Booking[], checkIn: string, checkOut: string, excludeId?: number | null) {
  const busy = new Set<number>()
  for (const b of bookings) {
    if (b.id === excludeId) continue
    if (checkIn < b.checkOut && checkOut > b.checkIn) b.roomIds.forEach((id) => busy.add(id))
  }
  return busy
}

/** รหัสจองแบบเว็บเก่า: #DDMMYY(พ.ศ.) + รหัสห้องแรก เช่น #211069A */
export function generateShortCode(checkIn: string, roomIds: number[], rooms: Room[]) {
  const [y, m, d] = checkIn.split('-')
  const datePart = `${d}${m}${String(Number(y) + 543).slice(-2)}`
  const first = rooms.find((r) => r.id === roomIds[0])
  let roomCode = 'X'
  if (first) roomCode = first.name.match(/[A-Za-z0-9]+/)?.[0] ?? first.name.slice(0, 2)
  return `#${datePart}${roomCode.toUpperCase()}`
}

// ───────── บันทึก ─────────

export type BookingInput = {
  id?: number
  name: string
  phone: string
  facebook: string
  source: string
  remark: string
  checkIn: string
  checkOut: string
  roomIds: number[]
  zoneId: number | null
  total: number
  deposit: number
  discount: number
  code: string
  photoUrl: string
  photoConsent: PhotoConsent
}

function upsertInCache(old: Booking[] = [], b: Booking) {
  return old.some((x) => x.id === b.id) ? old.map((x) => (x.id === b.id ? b : x)) : [...old, b]
}

export function useSaveBooking(opts: { withPhotos: boolean }) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['save-booking'],
    mutationFn: async (input: BookingInput) => {
      const name = input.name.trim()
      // ระบบช่วยจำลูกค้า: ไม่เขียนทับเบอร์/โซเชียลเดิมด้วยค่าว่าง
      const customer: { full_name: string; phone?: string; social_id?: string } = { full_name: name }
      if (input.phone.trim()) customer.phone = input.phone.trim()
      if (input.facebook.trim()) customer.social_id = input.facebook.trim()
      check(await supabase.from('customers').upsert(customer, { onConflict: 'full_name' }))

      const payload: Partial<BookingRow> = {
        customer_name: name,
        customer_phone: input.phone.trim(),
        customer_facebook: input.facebook.trim(),
        source: input.source.trim() || 'จองตรง',
        remark: input.remark.trim(),
        check_in: input.checkIn,
        check_out: input.checkOut,
        room_ids: serializeRoomIds(input.roomIds),
        zone_id: input.zoneId,
        total_price: input.total,
        deposit: input.deposit,
        discount_amount: input.discount,
        short_code_id: input.code,
      }
      if (opts.withPhotos) {
        payload.photo_drive_url = input.photoUrl.trim() || null
        payload.photo_consent = input.photoConsent
      }
      const q = input.id
        ? supabase.from('bookings').update(payload).eq('id', input.id)
        : supabase.from('bookings').insert(payload as BookingRow)
      return toBooking(unwrap(await q.select().single()))
    },
    onSuccess: (b) => {
      qc.setQueryData<Booking[]>(['bookings'], (old) => upsertInCache(old, b))
      qc.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useDeleteBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      check(await supabase.from('bookings').delete().eq('id', id))
      return id
    },
    onSuccess: (id) => qc.setQueryData<Booking[]>(['bookings'], (old = []) => old.filter((b) => b.id !== id)),
  })
}

/** บันทึกของสั่งเพิ่ม และ (ถ้า checkout) เช็คเอาท์ */
export function useSaveBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, extras, checkout }: { id: number; extras: ExtraItem[]; checkout?: boolean }) => {
      const payload: Partial<BookingRow> = { extra_items: JSON.stringify(extras) }
      if (checkout) payload.status = 'checked_out'
      return toBooking(unwrap(await supabase.from('bookings').update(payload).eq('id', id).select().single()))
    },
    onSuccess: (b) => qc.setQueryData<Booking[]>(['bookings'], (old) => upsertInCache(old, b)),
  })
}

/** ยกเลิกการเช็คเอาท์ (กรณีกดผิด) */
export function useReopenBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) =>
      toBooking(unwrap(await supabase.from('bookings').update({ status: 'booked' }).eq('id', id).select().single())),
    onSuccess: (b) => qc.setQueryData<Booking[]>(['bookings'], (old) => upsertInCache(old, b)),
  })
}
