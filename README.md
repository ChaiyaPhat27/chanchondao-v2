# ชานชมดาว โฮมสเตย์ · v2

ระบบหลังบ้าน (จองห้องพัก บิล บัญชี ATV ตั้งค่า) และหน้าเช็คห้องว่างสำหรับลูกค้า
เขียนใหม่ด้วย Vite + React + TypeScript + Tailwind + TanStack Query ใช้ Supabase ตัวเดียวกับเว็บเก่า

## เริ่มใช้งานในเครื่อง

```bash
npm install
cp .env.example .env   # แล้วใส่ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

- หลังบ้าน: `http://localhost:5173/`
- หน้าเช็คห้องว่าง: `http://localhost:5173/availability.html`

## Deploy (GitHub Pages)

1. Settings > Pages > Source: **GitHub Actions**
2. Settings > Secrets and variables > Actions > **Variables** เพิ่ม `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY`
3. push ขึ้น branch `main` ระบบจะ build และ deploy ให้เอง

## กฎของโปรเจกต์

- ไฟล์เว็บเก่าใน `chanchondao-main/` เป็นข้อมูลอ้างอิงเท่านั้น ห้ามแก้ ห้ามลบ
- ห้ามเปลี่ยนชื่อ/ลบตารางหรือคอลัมน์ และห้ามเปิด RLS เพราะเว็บเก่ายังใช้ฐานข้อมูลนี้อยู่
- ห้ามใช้ service_role key
- `room_ids` ต้องเก็บเป็น JSON ของ string เช่น `["7","8"]` และค่า `status` ต้องใช้ `checked_out` เหมือนเดิม
- ห้ามแตะตาราง `sys_dummy_wake_nodes_77y`
