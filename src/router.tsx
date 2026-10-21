import { createHashRouter } from 'react-router'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { CalendarPage } from './pages/calendar/CalendarPage'
import { BillingPage } from './pages/billing/BillingPage'
import { AtvPage } from './pages/atv/AtvPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { PhotosPage } from './pages/photos/PhotosPage'
import { InvoicePage } from './pages/InvoicePage'
import { NotFoundPage } from './pages/NotFoundPage'

// ใช้ HashRouter (#/calendar) เพราะ GitHub Pages ไม่รองรับการ rewrite URL
// โหลดทุกหน้าพร้อมกัน (ไม่ lazy) เพื่อให้สลับหน้าได้ทันทีไม่มีจังหวะรอ
export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'atv', element: <AtvPage /> },
      { path: 'photos', element: <PhotosPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'invoice/:id', element: <InvoicePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
