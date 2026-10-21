import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { CheckCircle2, Minus, Monitor, Percent, Plus, PlusCircle, ReceiptText, Save, ShoppingBag, Trash2 } from 'lucide-react'
import { amountDue, extrasTotal, useSaveBill, type Booking } from '@/data/bookings'
import { useItems } from '@/data/catalog'
import { formatBaht, parseNum, type ExtraItem } from '@/lib/format'
import { toastError } from '@/lib/errors'
import { cn } from '@/lib/cn'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, Input, MoneyInput } from '@/components/ui/Field'
import { Badge, EmptyState, Skeleton } from '@/components/ui/misc'
import { useConfirm } from '@/components/ui/Confirm'
import { ExportDialog } from '@/components/ExportDialog'
import { Slip, SLIP_WIDTH } from '@/components/docs/Slip'

export function PosDialog({ booking, roomsText, onClose }: { booking: Booking | null; roomsText: string; onClose: () => void }) {
  const [cart, setCart] = useState<ExtraItem[]>([])
  const [lastId, setLastId] = useState<number | null>(null)
  if ((booking?.id ?? null) !== lastId) {
    setLastId(booking?.id ?? null)
    setCart(booking ? booking.extras.map((i) => ({ ...i })) : [])
  }
  const confirm = useConfirm()
  const dirty = !!booking && JSON.stringify(cart) !== JSON.stringify(booking.extras)

  const close = async () => {
    if (dirty && !(await confirm({ title: 'ยังไม่ได้บันทึกรายการ', message: 'ปิดโดยไม่บันทึกใช่ไหม', confirmText: 'ปิดเลย', tone: 'danger' }))) return
    onClose()
  }

  return (
    <Dialog
      open={!!booking}
      onClose={close}
      size="xl"
      icon={<Monitor />}
      title={booking ? `คิดเงิน · ${booking.name}` : ''}
      description={booking ? `${booking.code} · ${roomsText}` : ''}
      bodyClassName="px-0 pb-0 sm:px-0 sm:pb-0"
    >
      {booking && <Pos booking={booking} roomsText={roomsText} cart={cart} setCart={setCart} dirty={dirty} onDone={onClose} />}
    </Dialog>
  )
}

function Pos({
  booking,
  roomsText,
  cart,
  setCart,
  dirty,
  onDone,
}: {
  booking: Booking
  roomsText: string
  cart: ExtraItem[]
  setCart: (c: ExtraItem[]) => void
  dirty: boolean
  onDone: () => void
}) {
  const items = useItems()
  const save = useSaveBill()
  const confirm = useConfirm()
  const [custom, setCustom] = useState<'item' | 'discount' | null>(null)
  const [slipOpen, setSlipOpen] = useState(false)

  const roomBalance = booking.total - booking.deposit
  const extra = extrasTotal(cart)
  const grand = amountDue(booking, cart)

  const add = (name: string, price: number) => {
    const i = cart.findIndex((x) => x.name === name && x.price === price)
    if (i >= 0) setCart(cart.map((x, idx) => (idx === i ? { ...x, qty: x.qty + 1 } : x)))
    else setCart([...cart, { name, price, qty: 1 }])
  }
  const changeQty = (idx: number, delta: number) =>
    setCart(cart.flatMap((x, i) => (i !== idx ? [x] : x.qty + delta <= 0 ? [] : [{ ...x, qty: x.qty + delta }])))

  const persist = (checkout: boolean) =>
    save.mutate(
      { id: booking.id, extras: cart, checkout },
      {
        onSuccess: () => {
          if (checkout) {
            toast.success(`เช็คเอาท์ ${booking.name} เรียบร้อย`, { description: `รับเงิน ${formatBaht(grand)}` })
            onDone()
          } else toast.success('บันทึกรายการแล้ว')
        },
        onError: toastError(checkout ? 'เช็คเอาท์' : 'บันทึก'),
      },
    )

  const onCheckout = async () => {
    const ok = await confirm({
      title: `รับเงิน ${formatBaht(grand)} และเช็คเอาท์?`,
      message: `${booking.name} · ${booking.code}`,
      confirmText: 'เช็คเอาท์',
    })
    if (ok) persist(true)
  }

  const grouped = (items.data ?? []).reduce<Record<string, typeof items.data>>((acc, i) => {
    ;(acc[i.category] ??= []).push(i)
    return acc
  }, {})

  return (
    <div className="grid md:grid-cols-[1fr_400px]">
      {/* ── สินค้า ── */}
      <div className="space-y-5 px-5 pb-5 sm:px-7 md:max-h-[64dvh] md:overflow-y-auto md:scrollbar-thin">
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" variant="primary" icon={<PlusCircle className="size-5" />} onClick={() => setCustom('item')}>
            <span className="sm:hidden">เพิ่มเอง</span>
            <span className="hidden sm:inline">เพิ่มรายการเอง</span>
          </Button>
          <Button size="lg" variant="danger" icon={<Percent className="size-5" />} onClick={() => setCustom('discount')}>
            ให้ส่วนลด
          </Button>
        </div>
        {items.isPending ? (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : !items.data?.length ? (
          <EmptyState icon={<ShoppingBag />} title="ยังไม่ได้ตั้งค่าสินค้า">
            เพิ่มสินค้าได้ที่ ตั้งค่าระบบ → สินค้า / บริการ
          </EmptyState>
        ) : (
          Object.entries(grouped).map(([cat, list]) => (
            <div key={cat}>
              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400">{cat}</p>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {list?.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => add(i.item_name, Number(i.price))}
                    className="rounded-2xl bg-white p-3.5 text-left ring-1 ring-slate-200 transition duration-150 hover:ring-brand-400 active:scale-[0.97]"
                  >
                    <span className="block truncate text-sm font-semibold">{i.item_name}</span>
                    <span className="num text-sm font-semibold text-brand-600">+{formatBaht(i.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── ตะกร้า ── */}
      <div className="flex flex-col border-t border-slate-100 bg-slate-50/60 md:border-t-0 md:border-l">
        <div className="flex-1 space-y-2 p-5 md:max-h-[44dvh] md:overflow-y-auto md:scrollbar-thin">
          <div className="flex items-center justify-between rounded-2xl bg-white p-3.5 ring-1 ring-slate-200">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">ค่าที่พักคงเหลือ</p>
              <p className="truncate text-sm font-medium">{roomsText}</p>
            </div>
            <span className="num font-semibold">{formatBaht(roomBalance)}</span>
          </div>
          <AnimatePresence initial={false}>
            {cart.map((i, idx) => (
              <motion.div
                key={`${i.name}-${i.price}`}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 rounded-2xl bg-white p-2.5 pl-3.5 ring-1 ring-slate-200">
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm font-medium', i.price < 0 && 'text-rose-600')}>{i.name}</p>
                    <p className="num text-xs text-slate-400">{formatBaht(i.price)} / หน่วย</p>
                  </div>
                  {i.price >= 0 ? (
                    <div className="flex items-center rounded-xl bg-slate-100">
                      <button type="button" onClick={() => changeQty(idx, -1)} className="flex size-8 items-center justify-center rounded-xl hover:bg-slate-200" aria-label="ลด">
                        {i.qty === 1 ? <Trash2 className="size-3.5 text-rose-500" /> : <Minus className="size-3.5" />}
                      </button>
                      <span className="num w-6 text-center text-sm font-semibold">{i.qty}</span>
                      <button type="button" onClick={() => changeQty(idx, 1)} className="flex size-8 items-center justify-center rounded-xl hover:bg-slate-200" aria-label="เพิ่ม">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => changeQty(idx, -i.qty)} className="flex size-8 items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50" aria-label="ลบ">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                  <span className={cn('num w-20 text-right text-sm font-semibold', i.price < 0 && 'text-rose-600')}>{formatBaht(i.price * i.qty)}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {!cart.length && <p className="py-4 text-center text-sm text-slate-400">ยังไม่มีของสั่งเพิ่ม · แตะสินค้าทางซ้ายเพื่อเพิ่ม</p>}
        </div>

        {/* มือถือ: ยอดสุทธิและปุ่มเช็คเอาท์ติดขอบล่างเสมอ */}
        <div className="sticky bottom-0 z-10 space-y-3 border-t border-slate-200/70 bg-white/95 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgb(12_17_36/0.15)] backdrop-blur md:static md:shadow-none">
          <div className="space-y-1 text-sm text-slate-500">
            <div className="flex justify-between">
              <span>ค่าที่พักค้างจ่าย</span>
              <span className="num">{formatBaht(roomBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span>สั่งเพิ่ม / ส่วนลด</span>
              <span className="num">{formatBaht(extra)}</span>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-semibold">ยอดสุทธิ</span>
            <motion.span key={grand} initial={{ scale: 1.08, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} className="num text-4xl font-bold tracking-tight text-brand-600">
              {formatBaht(grand)}
            </motion.span>
          </div>
          {booking.checkedOut && <Badge tone="slate">บิลนี้เช็คเอาท์แล้ว</Badge>}
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" icon={<Save className="size-4.5" />} onClick={() => persist(false)} disabled={!dirty} loading={save.isPending && !save.variables?.checkout}>
              บันทึก
            </Button>
            <Button size="lg" icon={<ReceiptText className="size-4.5" />} onClick={() => setSlipOpen(true)}>
              สลิป
            </Button>
            {!booking.checkedOut && (
              <Button size="lg" variant="success" className="col-span-2 h-14 text-base" icon={<CheckCircle2 className="size-5" />} onClick={onCheckout} loading={save.isPending && !!save.variables?.checkout}>
                รับเงิน / เช็คเอาท์
              </Button>
            )}
          </div>
        </div>
      </div>

      <CustomDialog mode={custom} onClose={() => setCustom(null)} onAdd={(name, price) => add(name, price)} />
      <ExportDialog
        open={slipOpen}
        onClose={() => setSlipOpen(false)}
        title="สลิปเช็คเอาท์"
        filename={`สลิป ${booking.code.replace('#', '')} ${booking.name}`}
        pageWidthPx={SLIP_WIDTH}
        pages={[<Slip key="slip" code={booking.code} name={booking.name} roomsText={roomsText} roomBalance={roomBalance} extras={cart} />]}
      />
    </div>
  )
}

function CustomDialog({ mode, onClose, onAdd }: { mode: 'item' | 'discount' | null; onClose: () => void; onAdd: (name: string, price: number) => void }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [last, setLast] = useState<typeof mode>(null)
  if (mode !== last) {
    setLast(mode)
    setName('')
    setAmount('')
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = parseNum(amount) ?? 0
    if (mode === 'discount') {
      if (n <= 0) return
      onAdd(name.trim() || 'ส่วนลดพิเศษหน้างาน', -Math.abs(n))
    } else onAdd(name.trim(), n)
    onClose()
  }
  return (
    <Dialog
      open={!!mode}
      onClose={onClose}
      size="sm"
      title={mode === 'discount' ? 'ให้ส่วนลด' : 'เพิ่มรายการเอง'}
      icon={mode === 'discount' ? <Percent /> : <PlusCircle />}
      footer={
        <Button type="submit" form="custom-item" variant={mode === 'discount' ? 'danger' : 'primary'} size="lg" className="w-full">
          เพิ่มลงบิล
        </Button>
      }
    >
      <form id="custom-item" onSubmit={submit} className="space-y-4">
        <Field label={mode === 'discount' ? 'เหตุผล (ไม่บังคับ)' : 'ชื่อรายการ'}>
          <Input required={mode === 'item'} value={name} onChange={(e) => setName(e.target.value)} placeholder={mode === 'discount' ? 'ส่วนลดพิเศษหน้างาน' : 'เช่น ถ่านเพิ่ม, น้ำแข็ง'} />
        </Field>
        <Field label={mode === 'discount' ? 'ลดกี่บาท' : 'ราคา'} hint={mode === 'item' ? 'ใส่ 0 ถ้าแถมฟรี' : undefined}>
          <MoneyInput required min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </Field>
      </form>
    </Dialog>
  )
}
