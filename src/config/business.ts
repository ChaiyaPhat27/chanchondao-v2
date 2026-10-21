// ข้อมูลกิจการที่พิมพ์ลงเอกสาร (ใบเสนอราคา / สลิป / สรุป ATV)
// ⚠️ ค่าด้านล่างคัดลอกมาจากเว็บเก่า ซึ่งยังเป็นข้อมูลตัวอย่าง (XXX) กรุณาแก้เป็นข้อมูลจริง
export const BUSINESS = {
  name: 'ชานชมดาว โฮมสเตย์',
  nameEn: 'Chan Chom Dao Homestay',
  address: '123 หมู่ 4 ต.สองพี่น้อง อ.แก่งกระจาน จ.เพชรบุรี 76170',
  phone: '081-XXX-XXXX',
  line: '@chanchomdao',
  bank: {
    name: 'ธนาคารกสิกรไทย (K-Bank)',
    account: 'XXX-X-XXXXX-X',
    accountName: 'บจก. ชานชมดาว โฮมสเตย์',
  },
}

/** ผู้รับส่วนแบ่งกำไร ATV (แบ่งครึ่ง) */
export const ATV_PARTNERS = ['อาบอย', 'นุ้ย'] as const
