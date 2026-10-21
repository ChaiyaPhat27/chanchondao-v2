import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Download, FileImage, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { exportElements, type ExportFormat } from '@/lib/exporter'
import { toastError } from '@/lib/errors'
import { Dialog } from './ui/Dialog'
import { Button } from './ui/Button'

/**
 * หน้าต่างส่งออกเอกสาร: แสดงตัวอย่างทุกหน้า + เลือก PNG หรือ PDF
 * `pages` คือเอกสารแต่ละหน้า (ขนาดจริง เช่น A4 = 210mm) จะถูกย่อเพื่อแสดงตัวอย่าง
 */
export function ExportDialog({
  open,
  onClose,
  title,
  filename,
  pages,
  pageWidthPx,
}: {
  open: boolean
  onClose: () => void
  title: string
  filename: string
  pages: ReactNode[]
  /** ความกว้างจริงของหน้า (px) ใช้คำนวณการย่อ */
  pageWidthPx: number
}) {
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // มือถือ: ย่อให้พอดีจอ (หักขอบหน้าต่าง 40px)
  const previewWidth = Math.min(520, pageWidthPx, window.innerWidth - 40)
  const scale = previewWidth / pageWidthPx

  const run = async () => {
    const nodes = [...(containerRef.current?.querySelectorAll<HTMLElement>('[data-export-page]') ?? [])]
    setProgress([0, nodes.length])
    try {
      await exportElements(nodes, { format, filename, onProgress: (d, t) => setProgress([d, t]) })
      toast.success(format === 'pdf' ? 'ดาวน์โหลด PDF แล้ว' : `ดาวน์โหลดรูปแล้ว ${nodes.length} ไฟล์`)
    } catch (e) {
      toastError('ส่งออกไฟล์')(e)
    } finally {
      setProgress(null)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={`${pages.length} หน้า · ตรวจดูความถูกต้องก่อนดาวน์โหลด`}
      icon={<Download />}
      size="lg"
      bodyClassName="bg-slate-100/70 pt-5"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
            {(
              [
                ['pdf', 'PDF', FileText],
                ['png', 'PNG', FileImage],
              ] as const
            ).map(([f, label, Icon]) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition',
                  format === f ? 'bg-white text-ink shadow-soft' : 'text-slate-500 hover:text-ink',
                )}
              >
                <Icon className="size-4.5" /> {label}
              </button>
            ))}
          </div>
          <Button variant="primary" size="lg" onClick={run} loading={!!progress} icon={<Download className="size-5" />}>
            {progress ? `กำลังสร้าง ${progress[0]}/${progress[1]}` : `ดาวน์โหลด ${format.toUpperCase()}`}
          </Button>
        </div>
      }
    >
      {/* ตัวอย่าง (ย่อขนาด) */}
      <div className="flex flex-col items-center gap-5">
        {pages.map((page, i) => (
          <div key={i} className="overflow-hidden rounded-lg bg-white shadow-lift ring-1 ring-slate-900/5" style={{ width: previewWidth }}>
            <div style={{ zoom: scale, width: pageWidthPx }}>{page}</div>
          </div>
        ))}
      </div>
      {/* ตัวจริงสำหรับส่งออก (ขนาดเต็ม ซ่อนไว้นอกจอ) */}
      {createPortal(
        <div ref={containerRef} aria-hidden className="pointer-events-none fixed top-0 -left-[20000px]">
          {pages.map((page, i) => (
            <div key={i} data-export-page style={{ width: pageWidthPx }} className="bg-white">
              {page}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </Dialog>
  )
}
