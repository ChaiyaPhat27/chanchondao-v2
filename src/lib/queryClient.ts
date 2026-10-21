import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ข้อมูลที่โหลดแล้วถือว่าใหม่ 30 วินาที สลับหน้าไปมาจะไม่โหลดซ้ำ
      staleTime: 30_000,
      // กลับมาที่แท็บนี้แล้วจะอัปเดตข้อมูลเบื้องหลังให้เอง (เผื่อมีคนแก้จากเครื่องอื่น)
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})
