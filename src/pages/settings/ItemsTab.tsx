import { useState, type FormEvent } from 'react'
import { Pencil, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ITEM_CATEGORIES, useDeleteCatalog, useItems, useSaveItem } from '@/data/catalog'
import type { ItemRow } from '@/lib/database.types'
import { formatBaht, parseNum } from '@/lib/format'
import { toastError } from '@/lib/errors'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, MoneyInput } from '@/components/ui/Field'
import { Badge, EmptyState, Segmented, Skeleton } from '@/components/ui/misc'
import { useConfirm } from '@/components/ui/Confirm'

export function ItemsTab() {
  const items = useItems()
  const del = useDeleteCatalog('items')
  const confirm = useConfirm()
  const [editing, setEditing] = useState<ItemRow | 'new' | null>(null)

  const onDelete = async (i: ItemRow) => {
    if (await confirm({ title: `ลบ "${i.item_name}"?`, tone: 'danger', confirmText: 'ลบ' })) {
      del.mutate(i.id, { onSuccess: () => toast.success('ลบแล้ว'), onError: toastError('ลบรายการ') })
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">รายการที่กดเพิ่มได้ทันทีในหน้าบิล</p>
        <Button variant="primary" icon={<Plus className="size-4.5" />} onClick={() => setEditing('new')}>
          เพิ่มรายการ
        </Button>
      </div>
      <Card className="overflow-hidden">
        {items.isPending ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : items.data?.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag />}
            title="ยังไม่มีสินค้าหรือบริการ"
            action={
              <Button variant="primary" icon={<Plus className="size-4.5" />} onClick={() => setEditing('new')}>
                เพิ่มรายการแรก
              </Button>
            }
          >
            เช่น หมูกระทะ ถ่าน น้ำแข็ง ATV ล่องแก่ง
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.data?.map((i) => (
              <li key={i.id} className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50/70">
                <Badge tone={i.category === 'กิจกรรม' ? 'star' : 'emerald'}>{i.category}</Badge>
                <span className="flex-1 truncate font-medium">{i.item_name}</span>
                <span className="num font-semibold text-brand-600">{formatBaht(i.price)}</span>
                <div className="flex gap-0.5">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(i)} aria-label="แก้ไข">
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="hover:bg-rose-50 hover:text-rose-600" onClick={() => onDelete(i)} aria-label="ลบ">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <ItemDialog item={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function ItemDialog({ item, onClose }: { item: ItemRow | 'new' | null; onClose: () => void }) {
  const save = useSaveItem()
  const current = item === 'new' ? null : item
  const [form, setForm] = useState({ name: '', category: 'ของใช้', price: '' })
  const [last, setLast] = useState<typeof item>(null)
  if (item !== last) {
    setLast(item)
    if (item) setForm(current ? { name: current.item_name, category: current.category, price: String(current.price) } : { name: '', category: 'ของใช้', price: '' })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate(
      { id: current?.id, name: form.name, category: form.category, price: parseNum(form.price) ?? 0 },
      {
        onSuccess: () => {
          toast.success('บันทึกแล้ว')
          onClose()
        },
        onError: toastError('บันทึกรายการ'),
      },
    )
  }

  return (
    <Dialog
      open={!!item}
      onClose={onClose}
      title={current ? 'แก้ไขรายการ' : 'เพิ่มสินค้า / บริการ'}
      icon={<ShoppingBag />}
      size="sm"
      footer={
        <Button type="submit" form="item-form" variant="primary" size="lg" className="w-full" loading={save.isPending}>
          บันทึก
        </Button>
      }
    >
      <form id="item-form" onSubmit={submit} className="space-y-4">
        <Field label="ชื่อรายการ">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น หมูกระทะชุดใหญ่" />
        </Field>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-slate-600">หมวดหมู่</p>
          <Segmented
            layoutId="item-cat"
            className="w-full"
            value={form.category}
            onChange={(v) => setForm({ ...form, category: v })}
            options={ITEM_CATEGORIES.map((c) => ({ value: c, label: c === 'ของใช้' ? 'ของใช้ / อาหาร' : 'กิจกรรม' }))}
          />
        </div>
        <Field label="ราคา">
          <MoneyInput required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
        </Field>
      </form>
    </Dialog>
  )
}
