export type ExportFormat = 'png' | 'pdf'

const PIXEL_RATIO = 2.5

function download(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * แปลง element เป็นรูป/เอกสาร แล้วดาวน์โหลด
 * - png: หลายหน้าจะได้หลายไฟล์ (ต่อท้าย "หน้า N")
 * - pdf: รวมทุกหน้าในไฟล์เดียว ขนาดหน้าเท่ากับ element (A4 = 210mm)
 * โหลดไลบรารีเฉพาะตอนกดส่งออก ไม่ให้แอปหลักหนัก
 */
export async function exportElements(
  nodes: HTMLElement[],
  { format, filename, onProgress }: { format: ExportFormat; filename: string; onProgress?: (done: number, total: number) => void },
) {
  if (!nodes.length) return
  await document.fonts.ready
  const { toCanvas, getFontEmbedCSS } = await import('html-to-image')
  // ฝังฟอนต์ครั้งเดียวใช้ทุกหน้า (เร็วขึ้นมาก)
  const fontEmbedCSS = await getFontEmbedCSS(nodes[0]!)
  const opts = { pixelRatio: PIXEL_RATIO, backgroundColor: '#ffffff', fontEmbedCSS, cacheBust: true }

  const canvases: HTMLCanvasElement[] = []
  for (const [i, node] of nodes.entries()) {
    canvases.push(await toCanvas(node, opts))
    onProgress?.(i + 1, nodes.length)
  }

  if (format === 'png') {
    canvases.forEach((c, i) => {
      const name = canvases.length > 1 ? `${filename} หน้า ${i + 1}.png` : `${filename}.png`
      download(c.toDataURL('image/png'), name)
    })
    return
  }

  const { jsPDF } = await import('jspdf')
  // แปลง px ของ element เป็น mm (96dpi)
  const pxToMm = (px: number) => (px * 25.4) / 96
  let pdf: InstanceType<typeof jsPDF> | null = null
  nodes.forEach((node, i) => {
    const w = pxToMm(node.offsetWidth)
    const h = pxToMm(node.offsetHeight)
    const orientation = w > h ? 'landscape' : 'portrait'
    if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [w, h], orientation, compress: true })
    else pdf.addPage([w, h], orientation)
    pdf.addImage(canvases[i]!.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h, undefined, 'FAST')
  })
  ;(pdf as InstanceType<typeof jsPDF> | null)?.save(`${filename}.pdf`)
}
