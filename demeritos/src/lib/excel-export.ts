import ExcelJS from 'exceljs'

export type ExcelSheet = { name: string; rows: Record<string, unknown>[] }

/** Colores institucionales INSAL */
const COLORS = {
  headerBg: 'FF0F5AAB',
  headerText: 'FFFFFFFF',
  titleBg: 'FF1A6BC7',
  titleText: 'FFFFFFFF',
  stripe: 'FFE8F2FC',
  white: 'FFFFFFFF',
  border: 'FFB8C4CE',
  metaLabel: 'FFF0F4F8',
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
}

function isMetaSheet(name: string): boolean {
  const n = name.toLowerCase()
  return n.includes('información') || n.includes('informacion')
}

function columnWidth(key: string, rows: Record<string, unknown>[]): number {
  const maxCell = rows.reduce((max, row) => {
    const len = String(row[key] ?? '').length
    return len > max ? len : max
  }, 0)
  return Math.min(52, Math.max(key.length + 3, maxCell + 2, 12))
}

function applyHeaderStyle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 11, name: 'Calibri' }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  cell.border = THIN_BORDER
}

function applyDataStyle(cell: ExcelJS.Cell, rowIndex: number, isMeta: boolean, colIndex: number) {
  const stripe = rowIndex % 2 === 0 ? COLORS.stripe : COLORS.white
  cell.font = { size: 10, name: 'Calibri', color: { argb: 'FF1E293B' } }
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
  cell.border = THIN_BORDER

  if (isMeta && colIndex === 0) {
    cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FF1E293B' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.metaLabel } }
  } else {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stripe } }
  }
}

function addDataSheet(ws: ExcelJS.Worksheet, sheetName: string, keys: string[], rows: Record<string, unknown>[]) {
  ws.mergeCells(1, 1, 1, keys.length)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = `INSAL — ${sheetName}`
  titleCell.font = { bold: true, size: 13, color: { argb: COLORS.titleText }, name: 'Calibri' }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.titleBg } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
  titleCell.border = THIN_BORDER
  ws.getRow(1).height = 28

  const headerRow = ws.getRow(2)
  keys.forEach((key, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = key
    applyHeaderStyle(cell)
  })
  headerRow.height = 24

  rows.forEach((row, ri) => {
    const excelRow = ws.getRow(ri + 3)
    keys.forEach((key, ci) => {
      const cell = excelRow.getCell(ci + 1)
      cell.value = String(row[key] ?? '')
      applyDataStyle(cell, ri, false, ci)
    })
    excelRow.height = 20
  })

  keys.forEach((key, i) => {
    ws.getColumn(i + 1).width = columnWidth(key, rows)
  })

  ws.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A3' }]
  if (rows.length > 0) {
    ws.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: rows.length + 2, column: keys.length },
    }
  }
}

function addMetaSheet(ws: ExcelJS.Worksheet, keys: string[], rows: Record<string, unknown>[]) {
  const headerRow = ws.getRow(1)
  keys.forEach((key, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = key
    applyHeaderStyle(cell)
  })
  headerRow.height = 24

  rows.forEach((row, ri) => {
    const excelRow = ws.getRow(ri + 2)
    keys.forEach((key, ci) => {
      const cell = excelRow.getCell(ci + 1)
      cell.value = String(row[key] ?? '')
      applyDataStyle(cell, ri, true, ci)
    })
    excelRow.height = 20
  })

  keys.forEach((key, i) => {
    ws.getColumn(i + 1).width = columnWidth(key, rows)
  })

  ws.views = [{ state: 'frozen', ySplit: 1, activeCell: 'A2' }]
}

export async function buildExcelBuffer(sheets: ExcelSheet[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Sistema de Deméritos INSAL'
  wb.created = new Date()

  for (const sheet of sheets) {
    const rows = sheet.rows.length
      ? sheet.rows
      : [{ Mensaje: 'Sin registros en el período seleccionado' }]

    const safeName = sheet.name.slice(0, 31).replace(/[\\/?*[\]]/g, '_')
    const ws = wb.addWorksheet(safeName, {
      properties: { defaultRowHeight: 20 },
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    })

    const keys = Object.keys(rows[0] ?? { Mensaje: '' })
    const meta = isMetaSheet(sheet.name)

    if (meta) {
      addMetaSheet(ws, keys, rows as Record<string, unknown>[])
    } else {
      addDataSheet(ws, sheet.name, keys, rows as Record<string, unknown>[])
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
