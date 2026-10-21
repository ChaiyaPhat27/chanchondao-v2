import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useIsMobile } from '@/lib/useMediaQuery'

type Size = 'sm' | 'md' | 'lg' | 'xl'
const WIDTH: Record<Size, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
}

// จำนวนหน้าต่างที่เปิดอยู่ ใช้ล็อกการเลื่อนหน้าหลัง
let openCount = 0

/**
 * หน้าต่างป๊อปอัป: มือถือเป็นแผ่นเลื่อนขึ้นจากด้านล่าง (ลากลงเพื่อปิดได้) คอมเป็นกล่องกลางจอ
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  icon,
  size = 'md',
  children,
  footer,
  className,
  bodyClassName,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  size?: Size
  children: ReactNode
  footer?: ReactNode
  className?: string
  bodyClassName?: string
}) {
  const isMobile = useIsMobile()
  const drag = useDragControls()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const prevFocus = document.activeElement as HTMLElement | null
    openCount++
    document.documentElement.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    // โฟกัสช่องแรกในหน้าต่าง (ยกเว้นบนมือถือ เพราะคีย์บอร์ดจะเด้งบังจอ)
    const t = window.setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      const first = !isMobile && panel.querySelector<HTMLElement>('[data-autofocus], input:not([type=hidden]), textarea, select')
      ;(first || panel).focus({ preventScroll: true })
    }, 60)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      if (--openCount === 0) document.documentElement.style.overflow = ''
      prevFocus?.focus?.({ preventScroll: true })
    }
  }, [open, isMobile])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-night-950/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-lift outline-none',
              'rounded-t-4xl sm:max-h-[88dvh] sm:rounded-4xl',
              WIDTH[size],
              className,
            )}
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
            drag={isMobile ? 'y' : false}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {isMobile && (
              <div className="flex shrink-0 touch-none justify-center pt-2.5 pb-1" onPointerDown={(e) => drag.start(e)}>
                <span className="h-1.5 w-10 rounded-full bg-slate-200" />
              </div>
            )}
            {title && (
              <div
                className="flex shrink-0 items-start gap-3 px-5 pt-2 pb-4 sm:px-7 sm:pt-6"
                onPointerDown={isMobile ? (e) => drag.start(e) : undefined}
              >
                {icon && (
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 [&>svg]:size-5">
                    {icon}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h2 id={titleId} className="text-lg font-semibold text-ink">
                    {title}
                  </h2>
                  {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="-mt-1 -mr-2 flex size-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-ink"
                  aria-label="ปิด"
                >
                  <X className="size-5" />
                </button>
              </div>
            )}
            {/* pt-1: กันขอบ/วงไฮไลต์ของปุ่มแถวแรกโดนหัวหน้าต่างตัด */}
            <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1 pb-5 scrollbar-thin sm:px-7 sm:pb-7', bodyClassName)}>
              {children}
            </div>
            {footer && (
              <div className="shrink-0 border-t border-slate-100 bg-white/90 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-7 sm:py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
