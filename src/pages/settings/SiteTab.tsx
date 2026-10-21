import { useState, type FormEvent } from 'react'
import { ExternalLink, Globe, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useSaveSiteSettings, useSiteSettings } from '@/data/catalog'
import type { SiteSettingsRow } from '@/lib/database.types'
import { toastError } from '@/lib/errors'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { EmptyState, Skeleton } from '@/components/ui/misc'

type Form = Pick<SiteSettingsRow, 'hero_title' | 'hero_subtitle' | 'announcement' | 'line_url' | 'facebook_url'>
const KEYS = ['hero_title', 'hero_subtitle', 'announcement', 'line_url', 'facebook_url'] as const

export function SiteTab() {
  const settings = useSiteSettings()
  if (settings.isPending) return <Skeleton className="h-96 rounded-3xl" />
  if (!settings.data)
    return (
      <Card>
        <EmptyState icon={<Globe />} title="ไม่พบข้อมูล site_settings" />
      </Card>
    )
  return <SiteForm key={settings.data.id} row={settings.data} />
}

function SiteForm({ row }: { row: SiteSettingsRow }) {
  const save = useSaveSiteSettings()
  const [form, setForm] = useState<Form>(() => Object.fromEntries(KEYS.map((k) => [k, row[k] ?? ''])) as Form)
  const dirty = KEYS.some((k) => (form[k] ?? '') !== (row[k] ?? ''))
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = Object.fromEntries(KEYS.map((k) => [k, form[k]?.trim() || null])) as Form
    save.mutate({ id: row.id, ...clean }, { onSuccess: () => toast.success('บันทึกข้อความหน้าเว็บแล้ว'), onError: toastError('บันทึก') })
  }

  return (
    <Card className="p-5 sm:p-7">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">ข้อความบนหน้าเช็คห้องว่างของลูกค้า</p>
          <a href="./availability.html" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
            ดูหน้าเว็บลูกค้า <ExternalLink className="size-4" />
          </a>
        </div>
        <Field label="หัวข้อหลัก">
          <Input value={form.hero_title ?? ''} onChange={set('hero_title')} placeholder="ชานชมดาว โฮมสเตย์" />
        </Field>
        <Field label="คำโปรย">
          <Input value={form.hero_subtitle ?? ''} onChange={set('hero_subtitle')} />
        </Field>
        <Field label="ประกาศ" hint="แสดงเป็นแถบประกาศด้านบน เว้นว่างได้">
          <Textarea value={form.announcement ?? ''} onChange={set('announcement')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ลิงก์ LINE">
            <Input type="url" value={form.line_url ?? ''} onChange={set('line_url')} placeholder="https://line.me/..." />
          </Field>
          <Field label="ลิงก์ Facebook">
            <Input type="url" value={form.facebook_url ?? ''} onChange={set('facebook_url')} placeholder="https://facebook.com/..." />
          </Field>
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="lg" disabled={!dirty} loading={save.isPending} icon={<Save className="size-4.5" />}>
            บันทึก
          </Button>
        </div>
      </form>
    </Card>
  )
}
