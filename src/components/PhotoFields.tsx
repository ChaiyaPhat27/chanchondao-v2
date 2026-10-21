import { Camera, Check, ExternalLink, Minus, X } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import type { PhotoConsent } from '@/data/bookings'
import { Field, Input } from './ui/Field'

const CONSENT_OPTIONS: { value: PhotoConsent; label: string; icon: typeof Check; active: string }[] = [
  { value: null, label: 'ยังไม่ได้ถาม', icon: Minus, active: 'text-slate-700' },
  { value: true, label: 'ให้ใช้ภาพได้', icon: Check, active: 'text-emerald-700' },
  { value: false, label: 'ไม่ให้ใช้ภาพ', icon: X, active: 'text-rose-600' },
]

export function isDriveUrl(url: string) {
  return /^https?:\/\//i.test(url.trim())
}

/** ลิงก์ Google Drive ภาพลูกค้า + ลูกค้ายินยอมให้ใช้ภาพไหม (ไม่บังคับกรอก) */
export function PhotoFields({
  url,
  consent,
  onUrlChange,
  onConsentChange,
  available,
  layoutId,
  title = 'รูปลูกค้า',
  showConsent = true,
}: {
  url: string
  consent: PhotoConsent
  onUrlChange: (v: string) => void
  onConsentChange: (v: PhotoConsent) => void
  /** false = ยังไม่ได้รัน SQL เพิ่มคอลัมน์ */
  available: boolean
  layoutId: string
  title?: string
  /** ถามการยินยอมใช้ภาพ (เฉพาะรูปลูกค้า) */
  showConsent?: boolean
}) {
  return (
    <fieldset className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-900/[0.04] sm:p-5" disabled={!available}>
      <legend className="sr-only">{title}</legend>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <Camera className="size-4.5 text-brand-500" /> {title}
        <span className="font-normal text-slate-400">· ไม่บังคับ</span>
      </div>
      {!available && (
        <p className="mb-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
          ยังใช้ไม่ได้ ต้องรัน SQL เพิ่มคอลัมน์ photo_drive_url / photo_consent ใน Supabase ก่อน
        </p>
      )}
      <Field label="ลิงก์โฟลเดอร์ Google Drive" hint="เปิดแชร์โฟลเดอร์ใน Drive แล้วคัดลอกลิงก์มาวาง">
        <Input
          type="url"
          inputMode="url"
          placeholder="https://drive.google.com/..."
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          trailing={
            isDriveUrl(url) && (
              <a
                href={url.trim()}
                target="_blank"
                rel="noreferrer"
                className="flex size-9 items-center justify-center rounded-xl text-brand-600 transition hover:bg-brand-50"
                aria-label="เปิดลิงก์"
              >
                <ExternalLink className="size-4.5" />
              </a>
            )
          }
        />
      </Field>
      {showConsent && <ConsentPicker consent={consent} onChange={onConsentChange} layoutId={layoutId} />}
    </fieldset>
  )
}

/** เลือก 3 สถานะ: ยังไม่ได้ถาม / ให้ใช้ภาพได้ / ไม่ให้ใช้ภาพ */
export function ConsentPicker({ consent, onChange, layoutId }: { consent: PhotoConsent; onChange: (v: PhotoConsent) => void; layoutId: string }) {
  const onConsentChange = onChange
  return (
    <>
      <p className="mt-4 mb-1.5 text-[13px] font-medium text-slate-600">ลูกค้าอนุญาตให้ใช้ภาพไหม</p>
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 ring-1 ring-slate-200">
        {CONSENT_OPTIONS.map((o) => {
          const active = o.value === consent
          const Icon = o.icon
          return (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => onConsentChange(o.value)}
              className={cn(
                'relative flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[13px] font-medium transition-colors',
                active ? o.active : 'text-slate-500 hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className={cn(
                    'absolute inset-0 rounded-xl',
                    o.value === true ? 'bg-emerald-50' : o.value === false ? 'bg-rose-50' : 'bg-slate-100',
                  )}
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <Icon className="relative size-4" />
              <span className="relative">{o.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

/** ป้ายเล็กแสดงสถานะภาพในรายการ */
export function PhotoBadge({ url, consent }: { url: string; consent: PhotoConsent }) {
  if (!url && consent === null) return null
  const tone = consent === true ? 'text-emerald-600 bg-emerald-50' : consent === false ? 'text-rose-500 bg-rose-50' : 'text-slate-500 bg-slate-100'
  const content = (
    <>
      <Camera className="size-3.5" />
      {consent === true ? 'ใช้ภาพได้' : consent === false ? 'ห้ามใช้ภาพ' : 'มีรูป'}
    </>
  )
  const cls = cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', tone)
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className={cn(cls, 'hover:underline')}>
      {content}
    </a>
  ) : (
    <span className={cls}>{content}</span>
  )
}
