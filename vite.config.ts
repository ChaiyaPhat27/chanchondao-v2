import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = import.meta.dirname

// base './' ทำให้ใช้ได้บน GitHub Pages ไม่ว่า repo จะชื่ออะไร (ใช้คู่กับ HashRouter)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    // ไลบรารีหลัก (React, Supabase, motion) รวมกันราว 620 KB (gzip ~185 KB) ถือว่าปกติ
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        // หลังบ้าน (แอดมิน)
        main: resolve(__dirname, 'index.html'),
        // หน้าเช็คห้องว่างสำหรับลูกค้า แยกไฟล์เพื่อไม่ให้โหลดโค้ดหลังบ้านมาด้วย
        availability: resolve(__dirname, 'availability.html'),
      },
    },
  },
})
