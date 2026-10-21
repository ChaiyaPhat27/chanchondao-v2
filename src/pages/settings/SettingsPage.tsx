import { useSearchParams } from 'react-router'
import { BedDouble, Globe, Layers, ShoppingBag, Users } from 'lucide-react'
import { PageHeader, Segmented } from '@/components/ui/misc'
import { RoomsTab } from './RoomsTab'
import { ZonesTab } from './ZonesTab'
import { AgentsTab } from './AgentsTab'
import { ItemsTab } from './ItemsTab'
import { SiteTab } from './SiteTab'

const TABS = {
  rooms: { label: 'ห้องพัก', short: 'ห้อง', icon: BedDouble, el: <RoomsTab /> },
  zones: { label: 'โซน / แพ็กเกจ', short: 'แพ็กเกจ', icon: Layers, el: <ZonesTab /> },
  items: { label: 'สินค้า / บริการ', short: 'สินค้า', icon: ShoppingBag, el: <ItemsTab /> },
  agents: { label: 'นายหน้า', short: 'นายหน้า', icon: Users, el: <AgentsTab /> },
  site: { label: 'หน้าเว็บลูกค้า', short: 'หน้าเว็บ', icon: Globe, el: <SiteTab /> },
} as const
type TabKey = keyof typeof TABS

export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as TabKey) in TABS ? (params.get('tab') as TabKey) : 'rooms'

  return (
    <>
      <PageHeader title="ตั้งค่าระบบ" subtitle="ห้องพัก แพ็กเกจ สินค้า นายหน้า และข้อความบนหน้าเว็บลูกค้า" />
      <div className="mb-6">
        <Segmented
          layoutId="settings-tab"
          className="grid w-full grid-cols-5 sm:inline-flex sm:w-auto"
          value={tab}
          onChange={(v) => setParams({ tab: v }, { replace: true })}
          options={(Object.keys(TABS) as TabKey[]).map((k) => {
            const Icon = TABS[k].icon
            return {
              value: k,
              label: (
                <span className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                  <Icon className="size-4.5 sm:size-4" />
                  <span className="text-xs sm:hidden">{TABS[k].short}</span>
                  <span className="hidden sm:inline">{TABS[k].label}</span>
                </span>
              ),
            }
          })}
        />
      </div>
      <div key={tab} className="animate-rise">
        {TABS[tab].el}
      </div>
    </>
  )
}
