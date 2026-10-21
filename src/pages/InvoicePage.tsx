import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, Download, FileQuestion, Printer } from 'lucide-react'
import { useBookings } from '@/data/bookings'
import { useRooms, useZones } from '@/data/rooms'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { ExportDialog } from '@/components/ExportDialog'
import { Quotation } from '@/components/docs/Quotation'
import { A4_WIDTH } from '@/components/docs/AtvReport'
import { useMediaQuery } from '@/lib/useMediaQuery'

export function InvoicePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const bookings = useBookings()
  const rooms = useRooms()
  const zones = useZones()
  const [exportOpen, setExportOpen] = useState(false)
  const booking = bookings.data?.find((b) => b.id === Number(id))
  const wide = useMediaQuery('(min-width: 900px)')
  const scale = wide ? 1 : Math.min(1, (window.innerWidth - 32) / A4_WIDTH)

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/calendar'))

  if (bookings.isPending || rooms.isPending || zones.isPending) return <Skeleton className="mx-auto h-[600px] max-w-3xl rounded-3xl" />
  if (!booking)
    return (
      <Card className="mx-auto max-w-xl">
        <EmptyState icon={<FileQuestion />} title="ไม่พบการจองนี้" action={<Button onClick={back}>กลับ</Button>} />
      </Card>
    )

  const doc = <Quotation booking={booking} rooms={rooms.data ?? []} zones={zones.data ?? []} />
  return (
    <>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" icon={<ArrowLeft className="size-4.5" />} onClick={back}>
          กลับ
        </Button>
        <div className="flex gap-2">
          <Button icon={<Printer className="size-4.5" />} onClick={() => window.print()}>
            พิมพ์
          </Button>
          <Button variant="primary" icon={<Download className="size-4.5" />} onClick={() => setExportOpen(true)}>
            ดาวน์โหลด PDF / PNG
          </Button>
        </div>
      </div>
      <div className="print-doc mx-auto overflow-hidden rounded-xl shadow-lift ring-1 ring-slate-900/5" style={{ width: A4_WIDTH * scale }}>
        <div style={{ zoom: scale }}>{doc}</div>
      </div>
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="ใบเสนอราคา"
        filename={`ใบเสนอราคา ${booking.code.replace('#', '')} ${booking.name}`}
        pageWidthPx={A4_WIDTH}
        pages={[doc]}
      />
    </>
  )
}
