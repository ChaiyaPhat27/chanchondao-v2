import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAgents, useDeleteCatalog, useSaveAgent } from '@/data/catalog'
import type { AgentRow } from '@/lib/database.types'
import { parseNum } from '@/lib/format'
import { toastError } from '@/lib/errors'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input } from '@/components/ui/Field'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { useConfirm } from '@/components/ui/Confirm'

export function AgentsTab() {
  const agents = useAgents()
  const del = useDeleteCatalog('agents')
  const confirm = useConfirm()
  const [editing, setEditing] = useState<AgentRow | 'new' | null>(null)

  const onDelete = async (a: AgentRow) => {
    if (await confirm({ title: `ลบนายหน้า "${a.agent_name}"?`, tone: 'danger', confirmText: 'ลบ' })) {
      del.mutate(a.id, { onSuccess: () => toast.success('ลบแล้ว'), onError: toastError('ลบนายหน้า') })
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">นายหน้า / แพลตฟอร์ม และค่าคอมมิชชัน (ชื่อจะขึ้นเป็นตัวเลือกตอนลงจอง)</p>
        <Button variant="primary" icon={<Plus className="size-4.5" />} onClick={() => setEditing('new')}>
          เพิ่มนายหน้า
        </Button>
      </div>
      {agents.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
        </div>
      ) : agents.data?.length === 0 ? (
        <Card>
          <EmptyState icon={<Users />} title="ยังไม่มีนายหน้า" />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.data?.map((a) => (
            <Card key={a.id} className="flex items-center gap-4 p-5">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-night-900 text-star-300">
                <Users className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{a.agent_name}</h3>
                <p className="num text-sm text-slate-500">
                  คอมมิชชัน <span className="font-semibold text-emerald-600">{a.commission_percent}%</span>
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditing(a)} aria-label="แก้ไข">
                <Pencil className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" className="hover:bg-rose-50 hover:text-rose-600" onClick={() => onDelete(a)} aria-label="ลบ">
                <Trash2 className="size-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
      <AgentDialog agent={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function AgentDialog({ agent, onClose }: { agent: AgentRow | 'new' | null; onClose: () => void }) {
  const save = useSaveAgent()
  const current = agent === 'new' ? null : agent
  const [form, setForm] = useState({ name: '', commission: '' })
  const [last, setLast] = useState<typeof agent>(null)
  if (agent !== last) {
    setLast(agent)
    if (agent) setForm(current ? { name: current.agent_name, commission: String(current.commission_percent) } : { name: '', commission: '' })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate(
      { id: current?.id, name: form.name, commission: parseNum(form.commission) ?? 0 },
      {
        onSuccess: () => {
          toast.success('บันทึกแล้ว')
          onClose()
        },
        onError: toastError('บันทึกนายหน้า'),
      },
    )
  }

  return (
    <Dialog
      open={!!agent}
      onClose={onClose}
      title={current ? 'แก้ไขนายหน้า' : 'เพิ่มนายหน้า'}
      icon={<Users />}
      size="sm"
      footer={
        <Button type="submit" form="agent-form" variant="primary" size="lg" className="w-full" loading={save.isPending}>
          บันทึก
        </Button>
      }
    >
      <form id="agent-form" onSubmit={submit} className="space-y-4">
        <Field label="ชื่อนายหน้า / แพลตฟอร์ม">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น คุณเอ, Agoda" />
        </Field>
        <Field label="ค่าคอมมิชชัน (%)">
          <Input required type="number" inputMode="decimal" step="any" min={0} max={100} value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} placeholder="10" />
        </Field>
      </form>
    </Dialog>
  )
}
