import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-3xl bg-white shadow-soft ring-1 ring-slate-900/[0.04]', className)} {...rest} />
}

export function CardHeader({
  title,
  icon,
  action,
  className,
}: {
  title: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6', className)}>
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        {icon && <span className="text-brand-500 [&>svg]:size-5">{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
  )
}
