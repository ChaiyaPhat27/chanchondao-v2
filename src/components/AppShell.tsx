import { useEffect } from 'react'
import { NavLink, Outlet, ScrollRestoration } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { CalendarDays, CarFront, ExternalLink, Images, LayoutDashboard, Receipt, Settings2 } from 'lucide-react'
import { Toaster } from 'sonner'
import { cn } from '@/lib/cn'
import { roomsQuery, zonesQuery } from '@/data/rooms'
import { bookingsQuery, customersQuery } from '@/data/bookings'
import { itemsQuery } from '@/data/catalog'
import { ConfirmProvider } from './ui/Confirm'
import { Wordmark } from './Logo'

const NAV = [
  { to: '/', label: 'ภาพรวม', short: 'ภาพรวม', icon: LayoutDashboard },
  { to: '/calendar', label: 'ปฏิทินจองห้องพัก', short: 'ปฏิทิน', icon: CalendarDays },
  { to: '/billing', label: 'บิล / เช็คเอาท์', short: 'บิล', icon: Receipt },
  { to: '/atv', label: 'บัญชี ATV', short: 'ATV', icon: CarFront },
  { to: '/photos', label: 'คลังรูปลูกค้า', short: 'คลังรูป', icon: Images },
  { to: '/settings', label: 'ตั้งค่าระบบ', short: 'ตั้งค่า', icon: Settings2 },
]

export function AppShell() {
  const qc = useQueryClient()

  // โหลดข้อมูลหลักล่วงหน้าตั้งแต่เปิดแอป เปลี่ยนหน้าไหนก็มีข้อมูลพร้อมทันที
  useEffect(() => {
    qc.prefetchQuery(roomsQuery)
    qc.prefetchQuery(zonesQuery)
    qc.prefetchQuery(bookingsQuery)
    qc.prefetchQuery(customersQuery)
    qc.prefetchQuery(itemsQuery)
  }, [qc])

  return (
    <ConfirmProvider>
      <div className="min-h-dvh lg:pl-[272px] print:pl-0">
        {/* ───── เมนูข้าง (คอม) ───── */}
        <aside className="starfield fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col p-5 lg:flex print:hidden">
          <div className="px-2 pt-2 pb-8">
            <Wordmark light />
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                viewTransition
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition-colors duration-200',
                    isActive ? 'text-white' : 'text-white/55 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-2xl bg-white/[0.09] ring-1 ring-white/10"
                        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      />
                    )}
                    <Icon className={cn('relative size-5 transition-colors', isActive && 'text-star-300')} />
                    <span className="relative">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <a
            href="./availability.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-3 text-sm text-white/60 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
          >
            หน้าเช็คห้องว่างของลูกค้า
            <ExternalLink className="size-4" />
          </a>
        </aside>

        {/* ───── แถบบน (มือถือ) ───── */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-900/[0.06] bg-canvas/80 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl lg:hidden print:hidden">
          <Wordmark />
          <a href="./availability.html" target="_blank" rel="noreferrer" className="rounded-xl p-2 text-slate-500" aria-label="หน้าเช็คห้องว่างของลูกค้า">
            <ExternalLink className="size-5" />
          </a>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-10 lg:pb-12 print:max-w-none print:p-0">
          {/* เปลี่ยนหน้าด้วย View Transitions (ดู index.css) */}
          <div className="animate-rise [view-transition-name:page]">
            <Outlet />
          </div>
        </main>

        {/* ───── แถบเมนูล่าง (มือถือ) ───── */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-900/[0.06] bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden print:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-6">
            {NAV.map(({ to, short, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} viewTransition className="relative flex flex-col items-center gap-1 py-2.5">
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="tab-active"
                        className="absolute top-1.5 h-8 w-12 rounded-full bg-brand-50"
                        transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                      />
                    )}
                    <Icon className={cn('relative mt-1 size-5.5 transition-colors', isActive ? 'text-brand-600' : 'text-slate-400')} />
                    <span className={cn('relative text-[10.5px] font-medium whitespace-nowrap transition-colors', isActive ? 'text-brand-600' : 'text-slate-500')}>{short}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      <ScrollRestoration />
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{ style: { fontFamily: 'inherit', borderRadius: '1rem' } }}
      />
    </ConfirmProvider>
  )
}
