import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchAll, supabase } from '@/lib/supabase'
import { check, unwrap } from '@/lib/errors'
import type { AtvTransactionRow, AtvTransactionType } from '@/lib/database.types'
import type { PhotoConsent } from './bookings'

export type AtvEntry = {
  id: number
  type: AtvTransactionType
  date: string
  time: string
  description: string
  staff: string
  amount: number | null
  /** จำนวนคน (ดึงจากคำอธิบาย "ลูกค้า N คน") */
  pax: number | null
  photoUrl: string
  photoConsent: PhotoConsent
}

export const toEntry = (t: AtvTransactionRow): AtvEntry => {
  const pax = t.transaction_type === 'income' ? t.description.match(/\d+/)?.[0] : undefined
  return {
    id: t.id,
    type: t.transaction_type,
    date: t.transaction_date,
    time: (t.action_time ?? '').slice(0, 5),
    description: t.description,
    staff: t.staff_name && t.staff_name !== '-' ? t.staff_name : '',
    amount: t.amount === null ? null : Number(t.amount),
    pax: pax ? Number(pax) : null,
    photoUrl: t.photo_drive_url ?? '',
    photoConsent: t.photo_consent ?? null,
  }
}

/** เรียงใหม่ไปเก่า */
const byNewest = (a: AtvEntry, b: AtvEntry) =>
  b.date.localeCompare(a.date) || b.time.localeCompare(a.time) || b.id - a.id

export function useAtv(start: string, end: string) {
  return useQuery({
    queryKey: ['atv', start, end],
    enabled: Boolean(start && end),
    // เปลี่ยนช่วงวันที่แล้วยังโชว์ข้อมูลเดิมไว้ระหว่างโหลด ไม่กระพริบ
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (
        await fetchAll<AtvTransactionRow>((from, to) =>
          supabase
            .from('atv_transactions')
            .select('*')
            .gte('transaction_date', start)
            .lte('transaction_date', end)
            .order('transaction_date', { ascending: false })
            .order('id', { ascending: false })
            .range(from, to),
        )
      )
        .map(toEntry)
        .sort(byNewest),
  })
}

export const DEFAULT_REFERRERS = ['รับเอง', 'ญาติ', 'ชานชมดาว']

/** รายชื่อคนส่งลูกค้าทั้งหมดที่เคยบันทึก (เรียงตามที่ใช้บ่อย) */
export function useAtvReferrers() {
  return useQuery({
    queryKey: ['atv-referrers'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const rows = await fetchAll<{ staff_name: string | null }>((from, to) =>
        supabase.from('atv_transactions').select('staff_name').eq('transaction_type', 'income').order('id').range(from, to),
      )
      const freq = new Map<string, number>()
      for (const r of rows) {
        const n = r.staff_name?.trim()
        if (n && n !== '-') freq.set(n, (freq.get(n) ?? 0) + 1)
      }
      const used = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)
      return [...new Set([...DEFAULT_REFERRERS, ...used])]
    },
  })
}

export function atvSummary(entries: AtvEntry[]) {
  let income = 0
  let expense = 0
  let pax = 0
  let pending = 0
  for (const e of entries) {
    if (e.type === 'income') pax += e.pax ?? 0
    if (e.amount === null) pending++
    else if (e.type === 'income') income += e.amount
    else expense += e.amount
  }
  const profit = income - expense
  return { income, expense, profit, half: profit / 2, pax, pending }
}

// ───────── บันทึก ─────────

export type AtvInput = {
  id?: number
  type: AtvTransactionType
  date: string
  time: string
  pax: number | null
  staff: string
  expenseDescription: string
  amount: number | null
  photoUrl: string
  photoConsent: PhotoConsent
}

export function useSaveAtv(opts: { withPhotos: boolean }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AtvInput) => {
      const isIncome = input.type === 'income'
      const payload: Partial<AtvTransactionRow> = {
        transaction_type: input.type,
        transaction_date: input.date,
        action_time: input.time,
        description: isIncome ? `ลูกค้า ${input.pax ?? '?'} คน` : input.expenseDescription.trim(),
        staff_name: isIncome ? input.staff.trim() || '-' : '-',
        amount: input.amount,
      }
      if (opts.withPhotos) {
        payload.photo_drive_url = input.photoUrl.trim() || null
        payload.photo_consent = input.photoConsent
      }
      const q = input.id
        ? supabase.from('atv_transactions').update(payload).eq('id', input.id)
        : supabase.from('atv_transactions').insert(payload as AtvTransactionRow)
      return toEntry(unwrap(await q.select().single()))
    },
    onSuccess: (entry) => {
      // อัปเดตทุกช่วงวันที่ที่จำไว้ทันที ไม่ต้องรอโหลดใหม่
      for (const [key, data] of qc.getQueriesData<AtvEntry[]>({ queryKey: ['atv'] })) {
        if (!data) continue
        const [, start, end] = key as [string, string, string]
        const inRange = entry.date >= start && entry.date <= end
        const rest = data.filter((e) => e.id !== entry.id)
        qc.setQueryData(key, inRange ? [...rest, entry].sort(byNewest) : rest)
      }
      qc.invalidateQueries({ queryKey: ['atv-referrers'] })
      qc.invalidateQueries({ queryKey: ['atv-photos'] })
    },
  })
}

export function useDeleteAtv() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      check(await supabase.from('atv_transactions').delete().eq('id', id))
      return id
    },
    onSuccess: (id) => {
      qc.setQueriesData<AtvEntry[]>({ queryKey: ['atv'] }, (old) => old?.filter((e) => e.id !== id))
      qc.invalidateQueries({ queryKey: ['atv-photos'] })
    },
  })
}
