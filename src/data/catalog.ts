import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { check, unwrap } from '@/lib/errors'
import type { AgentRow, ItemRow, SiteSettingsRow } from '@/lib/database.types'

// ───────── นายหน้า ─────────

export const agentsQuery = {
  queryKey: ['agents'] as const,
  queryFn: async () => unwrap(await supabase.from('agents').select('*').order('id')),
}
export const useAgents = () => useQuery(agentsQuery)

export function useSaveAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id?: number; name: string; commission: number }) => {
      const payload = { agent_name: input.name.trim(), commission_percent: input.commission }
      const q = input.id
        ? supabase.from('agents').update(payload).eq('id', input.id)
        : supabase.from('agents').insert(payload)
      return unwrap<AgentRow>(await q.select().single())
    },
    onSuccess: (row) =>
      qc.setQueryData<AgentRow[]>(['agents'], (old = []) =>
        old.some((a) => a.id === row.id) ? old.map((a) => (a.id === row.id ? row : a)) : [...old, row],
      ),
  })
}

// ───────── สินค้า / บริการเสริม ─────────

export const ITEM_CATEGORIES = ['ของใช้', 'กิจกรรม'] as const

export const itemsQuery = {
  queryKey: ['items'] as const,
  queryFn: async () => unwrap(await supabase.from('items').select('*').order('id')),
}
export const useItems = () => useQuery(itemsQuery)

export function useSaveItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id?: number; name: string; category: string; price: number }) => {
      const payload = { item_name: input.name.trim(), category: input.category, price: input.price }
      const q = input.id
        ? supabase.from('items').update(payload).eq('id', input.id)
        : supabase.from('items').insert(payload)
      return unwrap<ItemRow>(await q.select().single())
    },
    onSuccess: (row) =>
      qc.setQueryData<ItemRow[]>(['items'], (old = []) =>
        old.some((a) => a.id === row.id) ? old.map((a) => (a.id === row.id ? row : a)) : [...old, row],
      ),
  })
}

/** ลบแถวจากตาราง agents / items */
export function useDeleteCatalog(table: 'agents' | 'items') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      check(await supabase.from(table).delete().eq('id', id))
      return id
    },
    onSuccess: (id) => qc.setQueryData<{ id: number }[]>([table], (old = []) => old.filter((r) => r.id !== id)),
  })
}

// ───────── ข้อความหน้าเว็บลูกค้า (site_settings มีแถวเดียว) ─────────

export const siteSettingsQuery = {
  queryKey: ['site_settings'] as const,
  queryFn: async (): Promise<SiteSettingsRow | null> => {
    const { data, error } = await supabase.from('site_settings').select('*').order('id').limit(1).maybeSingle()
    if (error) throw error
    return data
  },
}
export const useSiteSettings = () => useQuery(siteSettingsQuery)

export function useSaveSiteSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Pick<SiteSettingsRow, 'id' | 'hero_title' | 'hero_subtitle' | 'announcement' | 'line_url' | 'facebook_url'>) => {
      const { id, ...rest } = input
      return unwrap(
        await supabase
          .from('site_settings')
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single(),
      )
    },
    onSuccess: (row) => qc.setQueryData(['site_settings'], row),
  })
}
