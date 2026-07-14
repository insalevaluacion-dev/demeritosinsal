import ExcelJS from 'exceljs'
import type { FilaMesInstrumento002, Instrumento002Payload } from '@/lib/instrumento-002-types'

/** Columna inicial B = 2, final W = 23 (redenciones por opción A, B, C y Total) */
const COL_START = 2
const COL_END = 23
const HEADER_FILL = 'FFD9E1F2'
const BORDER_COLOR = 'FF000000'

const borderThin = {
  top: { style: 'thin' as const, color: { argb: BORDER_COLOR } },
  left: { style: 'thin' as const, color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin' as const, color: { argb: BORDER_COLOR } },
  right: { style: 'thin' as const, color: { argb: BORDER_COLOR } },
}

function styleHeaderCell(cell: ExcelJS.Cell, bold = true) {
  cell.font = { name: 'Calibri', size: 10, bold, color: { argb: 'FF000000' } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  cell.border = borderThin
}

function styleDataCell(cell: ExcelJS.Cell, align: 'left' | 'center' = 'center') {
  cell.font = { name: 'Calibri', size: 10 }
  cell.alignment = { horizontal: align, vertical: 'middle' }
  cell.border = borderThin
}

function filaConTotales(f: FilaMesInstrumento002): (string | number)[] {
  return [
    f.mes,
    f.matriculaM,
    f.matriculaH,
    f.matriculaM + f.matriculaH,
    f.demeritosM,
    f.demeritosH,
    f.demeritosM + f.demeritosH,
    f.causalA,
    f.causalB,
    f.causalC,
    f.causalD,
    f.causalA + f.causalB + f.causalC + f.causalD,
    f.redencionM,
    f.redencionH,
    f.redencionM + f.redencionH,
    f.redencionA,
    f.redencionB,
    f.redencionC,
    f.redencionA + f.redencionB + f.redencionC,
    f.reconocimientoM,
    f.reconocimientoH,
    f.reconocimientoM + f.reconocimientoH,
  ]
}

function setRowValues(ws: ExcelJS.Worksheet, rowNum: number, values: (string | number)[], alignFirst = true) {
  const r = ws.getRow(rowNum)
  values.forEach((v, i) => {
    const c = r.getCell(COL_START + i)
    c.value = v
    styleDataCell(c, i === 0 && alignFirst ? 'left' : 'center')
  })
}

function mergeTitle(ws: ExcelJS.Worksheet, row: number, text: string, bold = false, size = 11) {
  ws.mergeCells(row, COL_START, row, COL_END)
  const c = ws.getCell(row, COL_START)
  c.value = text
  c.font = { name: 'Calibri', size, bold }
  c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
}

function labelValueRow(
  ws: ExcelJS.Worksheet,
  row: number,
  parts: { label: string; value: string; colStart: number; colEnd: number }[]
) {
  for (const p of parts) {
    ws.mergeCells(row, p.colStart, row, p.colStart + 1)
    const lc = ws.getCell(row, p.colStart)
    lc.value = p.label
    lc.font = { name: 'Calibri', size: 10 }
    lc.alignment = { vertical: 'middle' }

    ws.mergeCells(row, p.colStart + 2, row, p.colEnd)
    const vc = ws.getCell(row, p.colStart + 2)
    vc.value = p.value
    vc.font = { name: 'Calibri', size: 10, underline: true }
    vc.alignment = { vertical: 'middle' }
  }
}

export async function buildInstrumento002Excel(data: Instrumento002Payload): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Sistema de Deméritos INSAL'
  const ws = wb.addWorksheet('Instrumento 002', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      paperSize: 9,
    },
    views: [{ showGridLines: true }],
  })

  const h = data.header

  // Títulos (filas 1-2)
  mergeTitle(ws, 1, 'Instrumento No. 002', true, 12)
  mergeTitle(ws, 2, 'Registro Consolidado Mensual de Deméritos/Redenciones/Reconocimientos (Docente)', true, 11)
  ws.getRow(1).height = 22
  ws.getRow(2).height = 24

  // Metadatos (filas 4-7) — como plantilla MINED
  labelValueRow(ws, 4, [
    { label: '1. Nombre del Centro Educativo:', value: h.centroEducativo, colStart: 2, colEnd: 12 },
    { label: '2. Código del C.E.:', value: h.codigoCE, colStart: 14, colEnd: 20 },
  ])
  labelValueRow(ws, 5, [
    { label: '3. Departamento del C.E.:', value: h.departamento, colStart: 2, colEnd: 8 },
    { label: '4. Municipio:', value: h.municipio, colStart: 10, colEnd: 14 },
    { label: '5. Distrito:', value: h.distrito, colStart: 16, colEnd: 20 },
  ])
  labelValueRow(ws, 6, [
    { label: '6. Nombre del docente:', value: h.docente, colStart: 2, colEnd: 12 },
    { label: '7. Mes/Año:', value: h.mesAnio, colStart: 14, colEnd: 20 },
  ])
  labelValueRow(ws, 7, [
    { label: '8. Grado:', value: h.grado, colStart: 2, colEnd: 8 },
    { label: '9. Sección:', value: h.seccion, colStart: 10, colEnd: 14 },
    { label: '10. Turno:', value: h.turno, colStart: 16, colEnd: 20 },
  ])

  const headerRowTop = 9
  const headerRowSub = 10
  const dataStartRow = 11

  // --- Encabezado tabla fila 9 (grupos) ---
  const mergeHeader = (r1: number, c1: number, r2: number, c2: number, text: string) => {
    ws.mergeCells(r1, c1, r2, c2)
    const cell = ws.getCell(r1, c1)
    cell.value = text
    styleHeaderCell(cell)
  }

  // 11. Mes — B9:B10
  mergeHeader(headerRowTop, 2, headerRowSub, 2, '11. Mes')

  // 12. Matrícula por sexo — C9:E9
  mergeHeader(headerRowTop, 3, headerRowTop, 5, '12. Matricula por Sexo')
  ;['M (Mujer)', 'H (Hombre)', 'Total'].forEach((t, i) => {
    const c = ws.getCell(headerRowSub, 3 + i)
    c.value = t
    styleHeaderCell(c)
  })

  // 13. Deméritos por sexo — F9:H9
  mergeHeader(headerRowTop, 6, headerRowTop, 8, '13. Número de Deméritos por sexo')
  ;['M (Mujer)', 'H (Hombre)', 'Total'].forEach((t, i) => {
    const c = ws.getCell(headerRowSub, 6 + i)
    c.value = t
    styleHeaderCell(c)
  })

  // 14. Deméritos por causales — I9:M9
  mergeHeader(headerRowTop, 9, headerRowTop, 13, '14. Número de Deméritos por causales')
  ;['A', 'B', 'C', 'D', 'Total'].forEach((t, i) => {
    const c = ws.getCell(headerRowSub, 9 + i)
    c.value = t
    styleHeaderCell(c)
  })

  // 15. Redenciones por sexo — N9:P9
  mergeHeader(headerRowTop, 14, headerRowTop, 16, '15. Número Redenciones por sexo')
  ;['M (Mujer)', 'H (Hombre)', 'Total'].forEach((t, i) => {
    const c = ws.getCell(headerRowSub, 14 + i)
    c.value = t
    styleHeaderCell(c)
  })

  // 16. Redenciones por opción — Q9:T9 (A, B, C, Total)
  mergeHeader(headerRowTop, 17, headerRowTop, 20, '16. Num. Redenciones por opción elegida')
  ;['A', 'B', 'C', 'Total'].forEach((t, i) => {
    const c = ws.getCell(headerRowSub, 17 + i)
    c.value = t
    styleHeaderCell(c)
  })

  // 17. Reconocimientos por sexo — U9:W9
  mergeHeader(headerRowTop, 21, headerRowTop, 23, '17. Numero Reconocimientos por sexo')
  ;['M (Mujer)', 'H (Hombre)', 'Total'].forEach((t, i) => {
    const c = ws.getCell(headerRowSub, 21 + i)
    c.value = t
    styleHeaderCell(c)
  })

  ws.getRow(headerRowTop).height = 36
  ws.getRow(headerRowSub).height = 20

  // Filas de datos: anual = 12 meses; mensual = rellenar 12 filas con ceros excepto el mes activo
  const MESES_12 = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]

  const filasMap = new Map(data.filas.map((f) => [f.mesNum, f]))
  let rowNum = dataStartRow

  for (let m = 1; m <= 12; m++) {
    const f =
      filasMap.get(m) ||
      ({
        mes: MESES_12[m - 1],
        mesNum: m,
        matriculaM: 0,
        matriculaH: 0,
        demeritosM: 0,
        demeritosH: 0,
        causalA: 0,
        causalB: 0,
        causalC: 0,
        causalD: 0,
        redencionM: 0,
        redencionH: 0,
        redencionA: 0,
        redencionB: 0,
        redencionC: 0,
        reconocimientoM: 0,
        reconocimientoH: 0,
      } as FilaMesInstrumento002)

    f.mes = MESES_12[m - 1]
    setRowValues(ws, rowNum, filaConTotales(f))
    rowNum++
  }

  // Anchos de columna
  ws.getColumn(2).width = 14
  for (let c = 3; c <= COL_END; c++) {
    ws.getColumn(c).width = 6.5
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
