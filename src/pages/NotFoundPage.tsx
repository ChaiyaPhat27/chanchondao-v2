import { Link } from 'react-router'
import { Compass } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/misc'

export function NotFoundPage() {
  return (
    <Card className="mx-auto max-w-xl">
      <EmptyState
        icon={<Compass />}
        title="ไม่พบหน้านี้"
        action={
          <Link to="/" viewTransition className="font-medium text-brand-600 hover:underline">
            กลับหน้าภาพรวม
          </Link>
        }
      />
    </Card>
  )
}
