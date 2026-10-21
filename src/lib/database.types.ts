// โครงสร้างตารางจริงใน Supabase (ตรวจจาก information_schema เมื่อ 2026-10-21)
// ห้ามเปลี่ยนชื่อตาราง/คอลัมน์ เพราะเว็บเก่าและหน้าเช็คห้องว่างยังใช้อยู่
// คอลัมน์ numeric ใน Postgres -> PostgREST ส่งมาเป็น number

type Timestamp = string // 'YYYY-MM-DDTHH:mm:ss.sssZ'
type DateStr = string // 'YYYY-MM-DD'

type Table<Row, Required extends keyof Row> = {
  Row: Row
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>
  Update: Partial<Row>
  Relationships: []
}

export type RoomRow = {
  id: number
  room_name: string
  base_price: number
  color_hex: string
  max_pax: number | null
  details: string | null
  created_at: Timestamp | null
}

export type ZoneRow = {
  id: number
  zone_name: string
  package_price: number
  max_pax: number | null
  details: string | null
  created_at: Timestamp | null
}

export type RoomZoneRow = {
  zone_id: number
  room_id: number
}

export type BookingStatus = 'booked' | 'checked_out'

export type BookingRow = {
  id: number
  customer_name: string
  customer_phone: string | null
  customer_facebook: string | null
  source: string | null
  check_in: DateStr
  /** วันเช็คเอาท์ (คืนนั้นไม่นับว่าพัก) */
  check_out: DateStr
  /** ข้อความ JSON ของ id ห้องแบบ string เช่น '["7","8"]' ใช้ parseRoomIds() */
  room_ids: string
  zone_id: number | null
  total_price: number
  deposit: number | null
  discount_amount: number | null
  remark: string | null
  /** ค่าเริ่มต้น 'booked'; หน้าเช็คห้องว่างกรองด้วย 'checked_out' จึงห้ามเปลี่ยนค่านี้ */
  status: BookingStatus | (string & {}) | null
  short_code_id: string | null
  /** ข้อความ JSON ของ ExtraItem[] ใช้ parseExtraItems() */
  extra_items: string | null
  /** เพิ่มใหม่ใน v2 (ต้องรัน SQL เพิ่มคอลัมน์ก่อน) */
  photo_drive_url?: string | null
  /** null = ยังไม่ถาม, true = อนุญาตให้ใช้ภาพ, false = ไม่อนุญาต */
  photo_consent?: boolean | null
  created_at: Timestamp | null
}

export type CustomerRow = {
  id: number
  /** UNIQUE ใช้ upsert onConflict: 'full_name' */
  full_name: string
  phone: string | null
  social_id: string | null
  created_at: Timestamp | null
}

export type AgentRow = {
  id: number
  agent_name: string
  commission_percent: number
  created_at: Timestamp | null
}

export type ItemCategory = 'ของใช้' | 'กิจกรรม'

export type ItemRow = {
  id: number
  item_name: string
  category: ItemCategory | (string & {})
  price: number
  created_at: Timestamp | null
}

export type AtvTransactionType = 'income' | 'expense'

export type AtvTransactionRow = {
  id: number
  transaction_type: AtvTransactionType
  /** รายรับ: 'ลูกค้า N คน' (ข้อมูลเก่าเป็น 'คัน') */
  description: string
  /** null = ยังไม่กรอกยอด */
  amount: number | null
  transaction_date: DateStr
  /** 'HH:mm' เก็บเป็น text */
  action_time: string | null
  staff_name: string | null
  customer_name: string | null
  /** เพิ่มใหม่ใน v2 (ต้องรัน SQL เพิ่มคอลัมน์ก่อน) */
  photo_drive_url?: string | null
  photo_consent?: boolean | null
  created_at: Timestamp | null
}

export type SiteSettingsRow = {
  id: number
  hero_title: string | null
  hero_subtitle: string | null
  announcement: string | null
  line_url: string | null
  facebook_url: string | null
  updated_at: Timestamp
}

export type SeasonalPriceRow = {
  id: number
  season_name: string
  start_date: DateStr
  end_date: DateStr
  adjustment_type: string
  adjustment_value: number
  created_at: Timestamp | null
}

export type BillItemRow = {
  id: number
  booking_id: number | null
  item_name: string
  quantity: number
  price_per_unit: number
  total_price: number
  created_at: Timestamp | null
}

export type Database = {
  public: {
    Tables: {
      rooms: Table<RoomRow, 'room_name' | 'base_price'>
      zones: Table<ZoneRow, 'zone_name' | 'package_price'>
      room_zones: Table<RoomZoneRow, 'zone_id' | 'room_id'>
      bookings: Table<
        BookingRow,
        'customer_name' | 'check_in' | 'check_out' | 'room_ids' | 'total_price'
      >
      customers: Table<CustomerRow, 'full_name'>
      agents: Table<AgentRow, 'agent_name' | 'commission_percent'>
      items: Table<ItemRow, 'item_name' | 'category' | 'price'>
      atv_transactions: Table<
        AtvTransactionRow,
        'transaction_type' | 'description' | 'transaction_date'
      >
      site_settings: Table<SiteSettingsRow, 'id'>
      seasonal_prices: Table<
        SeasonalPriceRow,
        'season_name' | 'start_date' | 'end_date' | 'adjustment_type' | 'adjustment_value'
      >
      bill_items: Table<BillItemRow, 'item_name' | 'quantity' | 'price_per_unit' | 'total_price'>
      // sys_dummy_wake_nodes_77y: ตั้งใจไม่ใส่ เป็นตาราง keep-alive ห้ามแตะ
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

export type TableName = keyof Database['public']['Tables']
