import type { ReactNode } from 'react'
import type { AtvEntry } from '@/data/atv'
import { atvSummary } from '@/data/atv'
import { formatDMY, formatThaiDate } from '@/lib/format'
import { ATV_PARTNERS, BUSINESS } from '@/config/business'

/** A4 ที่ 96dpi */
export const A4_WIDTH = 794
export const A4_HEIGHT = 1123

// ความสูงโดยประมาณ (px) ใช้แบ่งหน้า
const PAD = 56
const FOOTER = 34
const FIRST_HEADER = 470
const NEXT_HEADER = 64
const H = { section: 40, thead: 30, row: 25, subtotal: 30, signatures: 190 }

/** 1500 -> '1,500.00' */
const money = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type Section = 'income' | 'expense'
type Block =
  | { kind: 'section'; section: Section }
  | { kind: 'row'; section: Section; no: number; entry: AtvEntry }
  | { kind: 'empty'; section: Section }
  | { kind: 'subtotal'; section: Section; total: number; count: number }
  | { kind: 'signatures' }

const SECTION_TITLE: Record<Section, string> = {
  income: 'ส่วนที่ 3  รายละเอียดรายรับ',
  expense: 'ส่วนที่ 4  รายละเอียดรายจ่าย',
}

/** แบ่งรายงานสรุปบัญชี ATV เป็นหน้า A4 (แบบกึ่งทางการ) */
export function buildAtvReportPages(entries: AtvEntry[], start: string, end: string): ReactNode[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id - b.id)
  const sum = atvSummary(entries)
  const docNo = `ATV-${start.replace(/-/g, '')}-${end.replace(/-/g, '')}`
  const printedAt = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long', timeStyle: 'short' })
  const period = start === end ? `วันที่ ${formatThaiDate(start, true)}` : `วันที่ ${formatThaiDate(start, true)} ถึง ${formatThaiDate(end, true)}`

  // ── เรียงเนื้อหาเป็นก้อน แล้วเติมลงหน้า ──
  const blocks: Block[] = []
  for (const section of ['income', 'expense'] as const) {
    const list = sorted.filter((e) => e.type === section)
    blocks.push({ kind: 'section', section })
    if (!list.length) blocks.push({ kind: 'empty', section })
    list.forEach((entry, i) => blocks.push({ kind: 'row', section, no: i + 1, entry }))
    blocks.push({ kind: 'subtotal', section, total: section === 'income' ? sum.income : sum.expense, count: list.length })
  }
  blocks.push({ kind: 'signatures' })

  const pages: Block[][] = [[]]
  let room = A4_HEIGHT - PAD * 2 - FOOTER - FIRST_HEADER
  let tableOpen: Section | null = null
  blocks.forEach((b, idx) => {
    const needsHead = (b.kind === 'row' || b.kind === 'empty' || b.kind === 'subtotal') && tableOpen !== b.section
    let need =
      b.kind === 'section' ? H.section + H.thead + H.row : b.kind === 'signatures' ? H.signatures : (b.kind === 'subtotal' ? H.subtotal : H.row) + (needsHead ? H.thead : 0)
    // หัวข้อส่วนต้องอยู่หน้าเดียวกับแถวแรก
    if (b.kind === 'section' && blocks[idx + 1]?.kind === 'empty') need = H.section + H.thead + H.row
    if (need > room) {
      pages.push([])
      room = A4_HEIGHT - PAD * 2 - FOOTER - NEXT_HEADER
      tableOpen = null
      need = b.kind === 'section' || b.kind === 'signatures' ? need : (b.kind === 'subtotal' ? H.subtotal : H.row) + H.thead
    }
    pages[pages.length - 1]!.push(b)
    room -= b.kind === 'section' ? H.section : need
    if (b.kind === 'section') tableOpen = null
    else if (b.kind !== 'signatures') tableOpen = b.section
  })

  return pages.map((page, pi) => (
    <div key={pi} className="relative flex flex-col bg-white font-sans text-[12px] leading-snug text-black" style={{ width: A4_WIDTH, height: A4_HEIGHT, padding: PAD }}>
      {pi === 0 ? <FirstHeader docNo={docNo} period={period} printedAt={printedAt} sum={sum} /> : <NextHeader docNo={docNo} period={period} />}
      <div className="flex-1">{renderBlocks(page)}</div>
      <div className="flex justify-between border-t border-neutral-400 pt-2 text-[10px] text-neutral-600" style={{ height: FOOTER }}>
        <span>
          {BUSINESS.name} · เอกสารเลขที่ {docNo} · พิมพ์เมื่อ {printedAt}
        </span>
        <span>
          หน้า {pi + 1} / {pages.length}
        </span>
      </div>
    </div>
  ))
}

function FirstHeader({ docNo, period, printedAt, sum }: { docNo: string; period: string; printedAt: string; sum: ReturnType<typeof atvSummary> }) {
  return (
    <div style={{ height: FIRST_HEADER }}>
      {/* หัวจดหมาย */}
      <div className="flex items-end justify-between border-b-2 border-black pb-2">
        <div>
          <p className="text-[17px] font-bold">{BUSINESS.name}</p>
          <p className="text-[11px] text-neutral-700">{BUSINESS.address}</p>
          <p className="text-[11px] text-neutral-700">
            โทร {BUSINESS.phone} · LINE {BUSINESS.line}
          </p>
        </div>
        <table className="text-[11px]">
          <tbody>
            <tr>
              <td className="pr-2 text-neutral-600">เลขที่เอกสาร</td>
              <td className="font-semibold">{docNo}</td>
            </tr>
            <tr>
              <td className="pr-2 text-neutral-600">วันที่พิมพ์</td>
              <td>{printedAt}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-center">
        <p className="text-[18px] font-bold">รายงานสรุปบัญชีรายรับ – รายจ่าย กิจกรรม ATV</p>
        <p className="mt-0.5 text-[13px]">ประจำ{period}</p>
      </div>

      {/* ส่วนที่ 1 สรุปยอด */}
      <p className="mt-5 mb-1.5 text-[13px] font-bold">ส่วนที่ 1  สรุปยอด</p>
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          <SumRow label="รายรับรวม" value={money(sum.income)} />
          <SumRow label="หัก รายจ่ายรวม" value={`(${money(sum.expense)})`} />
          <SumRow label="กำไรสุทธิ" value={money(sum.profit)} strong />
          <SumRow label="จำนวนลูกค้ารวม" value={`${sum.pax.toLocaleString('th-TH')} คน`} />
        </tbody>
      </table>
      {sum.pending > 0 && <p className="mt-1 text-[10.5px] text-neutral-600">หมายเหตุ: มีรายการที่ยังไม่ระบุจำนวนเงิน {sum.pending} รายการ ไม่ได้นำมารวมในยอดข้างต้น</p>}

      {/* ส่วนที่ 2 แบ่งกำไร */}
      <p className="mt-5 mb-1.5 text-[13px] font-bold">ส่วนที่ 2  การแบ่งผลกำไร</p>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-neutral-100">
            <Th className="w-12 text-center">ลำดับ</Th>
            <Th>ผู้รับส่วนแบ่ง</Th>
            <Th className="w-28 text-center">สัดส่วน</Th>
            <Th className="w-40 text-right">จำนวนเงิน (บาท)</Th>
          </tr>
        </thead>
        <tbody>
          {ATV_PARTNERS.map((name, i) => (
            <tr key={name}>
              <Td className="text-center">{i + 1}</Td>
              <Td>{name}</Td>
              <Td className="text-center">50%</Td>
              <Td className="num text-right">{money(sum.half)}</Td>
            </tr>
          ))}
          <tr className="font-bold">
            <Td className="text-right" colSpan={3}>
              รวม
            </Td>
            <Td className="num text-right">{money(sum.profit)}</Td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function NextHeader({ docNo, period }: { docNo: string; period: string }) {
  return (
    <div className="flex items-end justify-between border-b border-black pb-2" style={{ height: NEXT_HEADER - 12, marginBottom: 12 }}>
      <div>
        <p className="text-[13px] font-bold">รายงานสรุปบัญชีรายรับ – รายจ่าย กิจกรรม ATV (ต่อ)</p>
        <p className="text-[11px] text-neutral-700">ประจำ{period}</p>
      </div>
      <p className="text-[11px] text-neutral-700">เลขที่เอกสาร {docNo}</p>
    </div>
  )
}

/** วาดก้อนเนื้อหาของหน้าเดียว (แถวต่อเนื่องของส่วนเดียวกันรวมเป็นตารางเดียว) */
function renderBlocks(blocks: Block[]) {
  const out: ReactNode[] = []
  let i = 0
  while (i < blocks.length) {
    const b = blocks[i]!
    if (b.kind === 'section') {
      out.push(
        <p key={`s${i}`} className="mt-4 mb-1.5 text-[13px] font-bold" style={{ height: H.section - 22 }}>
          {SECTION_TITLE[b.section]}
        </p>,
      )
      i++
      continue
    }
    if (b.kind === 'signatures') {
      out.push(<Signatures key={`sig${i}`} />)
      i++
      continue
    }
    // รวมแถวของส่วนเดียวกันที่ต่อกันเป็นตารางเดียว
    const section = b.section
    const rows: Block[] = []
    while (i < blocks.length) {
      const r = blocks[i]!
      if (r.kind === 'section' || r.kind === 'signatures' || r.section !== section) break
      rows.push(r)
      i++
    }
    const isIncome = section === 'income'
    out.push(
      <table key={`t${i}`} className="w-full border-collapse text-[11.5px]">
        <thead>
          <tr className="bg-neutral-100">
            <Th className="w-11 text-center">ลำดับ</Th>
            <Th className="w-[84px] text-center">วันที่</Th>
            <Th className="w-14 text-center">เวลา</Th>
            <Th>รายการ</Th>
            {isIncome && <Th className="w-32">ผู้ส่งลูกค้า</Th>}
            <Th className="w-28 text-right">จำนวนเงิน (บาท)</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, k) =>
            r.kind === 'row' ? (
              <tr key={k}>
                <Td className="text-center">{r.no}</Td>
                <Td className="num text-center">{formatDMY(r.entry.date)}</Td>
                <Td className="num text-center">{r.entry.time}</Td>
                <Td>{r.entry.description}</Td>
                {isIncome && <Td>{r.entry.staff || '-'}</Td>}
                <Td className="num text-right">{r.entry.amount === null ? 'ยังไม่ระบุ' : money(r.entry.amount)}</Td>
              </tr>
            ) : r.kind === 'empty' ? (
              <tr key={k}>
                <Td className="text-center text-neutral-500" colSpan={isIncome ? 6 : 5}>
                  ไม่มีรายการ
                </Td>
              </tr>
            ) : r.kind === 'subtotal' ? (
              <tr key={k} className="bg-neutral-50 font-bold">
                <Td className="text-right" colSpan={isIncome ? 5 : 4}>
                  รวม{isIncome ? 'รายรับ' : 'รายจ่าย'} ({r.count} รายการ)
                </Td>
                <Td className="num text-right">{money(r.total)}</Td>
              </tr>
            ) : null,
          )}
        </tbody>
      </table>,
    )
  }
  return out
}

function Signatures() {
  const box = (role: string, name?: string) => (
    <div className="text-center text-[11.5px]">
      <p className="mt-10">ลงชื่อ ..........................................</p>
      <p className="mt-1.5">( {name ?? '..........................................'} )</p>
      <p className="mt-1">{role}</p>
      <p className="mt-1">วันที่ ......../......../........</p>
    </div>
  )
  return (
    <div className="mt-6 grid grid-cols-3 gap-4" style={{ height: H.signatures - 24 }}>
      {box('ผู้จัดทำ')}
      {box('ผู้รับส่วนแบ่ง', ATV_PARTNERS[0])}
      {box('ผู้รับส่วนแบ่ง', ATV_PARTNERS[1])}
    </div>
  )
}

function SumRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className={strong ? 'font-bold' : undefined}>
      <Td className="w-1/2">{label}</Td>
      <Td className={`num text-right ${strong ? 'border-b-[3px] border-double border-b-black' : ''}`}>{value}</Td>
      <Td className="w-16 text-center">{label.startsWith('จำนวนลูกค้า') ? '' : 'บาท'}</Td>
    </tr>
  )
}

function Th({ className, children }: { className?: string; children: ReactNode }) {
  // ชิดซ้ายเป็นค่าเริ่มต้น เว้นแต่ระบุ text-center / text-right มาเอง
  const align = /\btext-(center|right)\b/.test(className ?? '') ? '' : 'text-left'
  return <th className={`border border-neutral-500 px-2 py-1.5 font-semibold ${align} ${className ?? ''}`}>{children}</th>
}

function Td({ className, children, colSpan }: { className?: string; children?: ReactNode; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={`border border-neutral-400 px-2 py-[3px] ${className ?? ''}`}>
      {children}
    </td>
  )
}
