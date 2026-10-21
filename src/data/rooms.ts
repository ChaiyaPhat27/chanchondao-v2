import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { check, unwrap } from '@/lib/errors'
import type { RoomRow, ZoneRow } from '@/lib/database.types'

export type Room = {
  id: number
  name: string
  price: number
  color: string
  maxPax: number | null
  details: string
}

export type Zone = {
  id: number
  name: string
  price: number
  maxPax: number | null
  details: string
  roomIds: number[]
}

const toRoom = (r: RoomRow): Room => ({
  id: r.id,
  name: r.room_name,
  price: Number(r.base_price) || 0,
  color: r.color_hex || '#4f5dfb',
  maxPax: r.max_pax,
  details: r.details ?? '',
})

export const roomsQuery = {
  queryKey: ['rooms'] as const,
  queryFn: async (): Promise<Room[]> => unwrap(await supabase.from('rooms').select('*').order('id')).map(toRoom),
}

export const zonesQuery = {
  queryKey: ['zones'] as const,
  queryFn: async (): Promise<Zone[]> => {
    const [zones, links] = await Promise.all([
      supabase.from('zones').select('*').order('id').then(unwrap),
      supabase.from('room_zones').select('*').then(unwrap),
    ])
    return zones.map((z: ZoneRow) => ({
      id: z.id,
      name: z.zone_name,
      price: Number(z.package_price) || 0,
      maxPax: z.max_pax,
      details: z.details ?? '',
      roomIds: links.filter((l) => l.zone_id === z.id).map((l) => l.room_id),
    }))
  },
}

export const useRooms = () => useQuery(roomsQuery)
export const useZones = () => useQuery(zonesQuery)

/** หาห้องจาก id; ห้องที่ถูกลบไปแล้วจะได้ชื่อ "ห้อง #id" */
export function roomLookup(rooms: Room[] | undefined) {
  const map = new Map((rooms ?? []).map((r) => [r.id, r]))
  return (id: number): Room =>
    map.get(id) ?? { id, name: `ห้อง #${id} (ถูกลบ)`, price: 0, color: '#94a3b8', maxPax: null, details: '' }
}

// ───────── บันทึก ─────────

export type RoomInput = Omit<Room, 'id'> & { id?: number }

export function useSaveRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: RoomInput) => {
      const payload = {
        room_name: input.name.trim(),
        base_price: input.price,
        color_hex: input.color,
        max_pax: input.maxPax,
        details: input.details,
      }
      const q = input.id
        ? supabase.from('rooms').update(payload).eq('id', input.id)
        : supabase.from('rooms').insert(payload)
      return toRoom(unwrap(await q.select().single()))
    },
    onSuccess: (room) => {
      qc.setQueryData<Room[]>(['rooms'], (old = []) =>
        old.some((r) => r.id === room.id) ? old.map((r) => (r.id === room.id ? room : r)) : [...old, room],
      )
    },
  })
}

export function useDeleteRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      check(await supabase.from('rooms').delete().eq('id', id))
      return id
    },
    onSuccess: (id) => {
      qc.setQueryData<Room[]>(['rooms'], (old = []) => old.filter((r) => r.id !== id))
      // room_zones ถูกลบตาม (ON DELETE CASCADE)
      qc.invalidateQueries({ queryKey: ['zones'] })
    },
  })
}

export type ZoneInput = Omit<Zone, 'id'> & { id?: number }

export function useSaveZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ZoneInput) => {
      const payload = {
        zone_name: input.name.trim(),
        package_price: input.price,
        max_pax: input.maxPax,
        details: input.details,
      }
      const q = input.id
        ? supabase.from('zones').update(payload).eq('id', input.id)
        : supabase.from('zones').insert(payload)
      const zone = unwrap<ZoneRow>(await q.select().single())
      // แทนที่รายการห้องในโซนทั้งหมด (แบบเดียวกับเว็บเก่า)
      check(await supabase.from('room_zones').delete().eq('zone_id', zone.id))
      if (input.roomIds.length) {
        check(await supabase.from('room_zones').insert(input.roomIds.map((room_id) => ({ zone_id: zone.id, room_id }))))
      }
      return zone.id
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['zones'] }),
  })
}

export function useDeleteZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      check(await supabase.from('zones').delete().eq('id', id))
      return id
    },
    onSuccess: (id) => qc.setQueryData<Zone[]>(['zones'], (old = []) => old.filter((z) => z.id !== id)),
  })
}
