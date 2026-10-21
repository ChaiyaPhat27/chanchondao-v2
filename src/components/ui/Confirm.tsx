import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { Dialog } from './Dialog'
import { Button } from './Button'

type ConfirmOptions = {
  title: string
  message?: ReactNode
  confirmText?: string
  cancelText?: string
  tone?: 'danger' | 'default'
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/** ใช้แทน window.confirm: `if (await confirm({ title: 'ลบ?' })) ...` */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm ต้องอยู่ใน <ConfirmProvider>')
  return ctx
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const [open, setOpen] = useState(false)
  const resolver = useRef<(v: boolean) => void>(undefined)

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = undefined
    setOpen(false)
  }

  const danger = opts?.tone === 'danger'
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onClose={() => close(false)} size="sm">
        <div className="pt-2 text-center sm:pt-7">
          <span
            className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full ${
              danger ? 'bg-rose-50 text-rose-500' : 'bg-brand-50 text-brand-500'
            }`}
          >
            {danger ? <AlertTriangle className="size-7" /> : <HelpCircle className="size-7" />}
          </span>
          <h2 className="text-lg font-semibold">{opts?.title}</h2>
          {opts?.message && <div className="mt-1.5 text-sm text-slate-500">{opts.message}</div>}
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <Button size="lg" onClick={() => close(false)}>
              {opts?.cancelText ?? 'ยกเลิก'}
            </Button>
            <Button size="lg" variant={danger ? 'danger' : 'primary'} onClick={() => close(true)} data-autofocus>
              {opts?.confirmText ?? 'ยืนยัน'}
            </Button>
          </div>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  )
}
