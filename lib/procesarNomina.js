import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { sql } from './db'

// Construye una hoja en un workbook ExcelJS con estilos completos
function buildWorksheet(wbOut, name, headers, rows, colDefs, colWidths) {
  const ws = wbOut.addWorksheet(name)

  // Sin líneas de cuadrícula
  ws.views = [{ showGridLines: false }]

  // Anchos de columna
  ws.columns = colWidths.map(w => ({ width: w != null ? w : 8 }))

  // Fila de encabezados: negrilla, centrado, borde inferior
  const headerRow = ws.addRow(headers)
  headerRow.height = 15.75
  headerRow.eachCell({ includeEmpty: true }, cell => {
    cell.font = { name: 'Calibri', size: 11, bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF000000' } } }
  })

  // Filtro automático en fila 1
  const lastColLetter = XLSX.utils.encode_col(headers.length - 1)
  ws.autoFilter = `A1:${lastColLetter}1`

  // Filas de datos
  rows.forEach(row => {
    const dataRow = ws.addRow(row)
    dataRow.height = 15.75
    dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const def = colDefs[colNumber - 1] || {}
      cell.font = { name: 'Calibri', size: 11 }
      if (def.isDate) {
        cell.numFmt = 'DD/MM/YYYY'
      } else if (def.isText) {
        cell.numFmt = '@'
      } else if (def.fmt) {
        cell.numFmt = def.fmt
      }
    })
  })
}

// Conceptos DÉBITO de COSTO: fila usa cuenta del catálogo, ID = doctoIdent
const COSTO_DEBITO = new Set(['O001', 'O002', 'O003', 'O004'])

// Conceptos CRÉDITO de COSTO: fila usa cuenta contrapartida, ID = NIT administradora
const COSTO_CREDITO = {
  O101: { cuenta: 23803000, campoAdmin: 'nit_afp' },
  O102: { cuenta: 23700505, campoAdmin: 'nit_eps' },
  O103: { cuenta: 23700601, campoAdmin: 'nit_arl' },
  O104: { cuenta: 23701005, campoAdmin: 'nit_ccf' },
}

// Mapeo de cada DÉBITO de costo a su CRÉDITO correspondiente
const COSTO_DEBITO_A_CREDITO = {
  O001: 'O101',
  O002: 'O102',
  O003: 'O103',
  O004: 'O104',
}

// Conceptos DÉBITO de PROVISIÓN: fila usa cuenta del catálogo, ID = doctoIdent
const PROV_DEBITO = new Set(['P000', 'P001', 'P002', 'P003'])

// Conceptos CRÉDITO de PROVISIÓN: fila usa cuenta contrapartida, ID = doctoIdent
const PROV_CREDITO = {
  G014: 25101005,
  G015: 25150105,
  G016: 25200105,
  G017: 25250105,
}

// Mapeo de cada DÉBITO de provisión a su CRÉDITO correspondiente
const PROV_DEBITO_A_CREDITO = {
  P000: 'G014',
  P001: 'G015',
  P002: 'G016',
  P003: 'G017',
}

function getAporteAdminField(descripcion) {
  const desc = String(descripcion || '').trim().toUpperCase()
  if (!desc.startsWith('APORTE')) return null

  if (desc.endsWith('EPS')) return 'nit_eps'
  if (desc.endsWith('AFP')) return 'nit_afp'
  if (desc.endsWith('CCF')) return 'nit_ccf'
  if (desc.endsWith('ARL')) return 'nit_arl'

  return null
}

function getAdminFieldByDescription(descripcion) {
  const desc = String(descripcion || '').trim().toUpperCase()

  if (/\bEPS\b/.test(desc)) return 'nit_eps'
  if (/\bAFP\b/.test(desc)) return 'nit_afp'
  if (/\bCCF\b/.test(desc)) return 'nit_ccf'
  if (/\bARL\b/.test(desc)) return 'nit_arl'

  return null
}

function loadCuentasFromSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  // Row 0 = headers: CONCEPTO(0), DESCRIPCION(1), TIPO(2), CUENTA(3), DEBITO(4), CREDITO(5), NATURALEZA(6)
  return rows.slice(1).filter(r => String(r[0] || '').trim() !== '').map(r => ({
    concepto:    String(r[0] || '').trim(),
    descripcion: String(r[1] || '').trim(),
    tipo:        String(r[2] || '').trim(),
    cuenta:      String(r[3] || '').trim(),
    naturaleza:  String(r[6] || '').trim().toUpperCase(),
  }))
}

function loadEntidadesFromSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  // Row 1 = headers; data starts at row 2
  return rows.slice(2).filter(r => String(r[0] || '').trim() !== '').map(r => ({
    empleado:   String(r[0] || '').trim(),
    nombre:     String(r[1] || '').trim(),
    nit_afp:    String(r[16] || '').trim(),
    nit_eps:    String(r[18] || '').trim(),
    nit_arl:    String(r[20] || '').trim(),
    nit_ccf:    String(r[22] || '').trim(),
  }))
}

export async function procesarNomina(fileBuffer, fecha, infoBuffer) {
  // 1. Leer fuente Excel (headers en fila 3 → índice 2)
  const wb = XLSX.read(fileBuffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const sourceRows = rawRows.slice(3).filter(r => String(r[1]).trim() !== '')

  // 2. Cargar tablas de referencia (desde Excel o desde DB)
  let cuentasMap
  let maestroMap

  if (infoBuffer) {
    const wbInfo = XLSX.read(infoBuffer, { type: 'buffer' })
    const wsCuentas = wbInfo.Sheets['Cuentas']
    const wsEntidades = wbInfo.Sheets['Entidades']

    if (!wsCuentas) throw new Error('El archivo de Informacion General no tiene la hoja "Cuentas"')
    if (!wsEntidades) throw new Error('El archivo de Informacion General no tiene la hoja "Entidades"')

    const cuentasData = loadCuentasFromSheet(wsCuentas)
    const entidadesData = loadEntidadesFromSheet(wsEntidades)

    cuentasMap = {}
    for (const c of cuentasData) {
      if (!cuentasMap[c.concepto]) cuentasMap[c.concepto] = c
    }
    maestroMap = Object.fromEntries(entidadesData.map(m => [m.empleado, m]))
  } else {
    const [cuentasData, maestroData] = await Promise.all([
      sql`SELECT concepto, descripcion, tipo, cuenta, naturaleza FROM cuentas`,
      sql`
        SELECT
          m.empleado,
          a_afp.nit AS nit_afp,
          a_eps.nit AS nit_eps,
          a_arl.nit AS nit_arl,
          a_caj.nit AS nit_ccf
        FROM maestro_personal m
        LEFT JOIN administradoras a_afp ON a_afp.nombre = m.afp
        LEFT JOIN administradoras a_eps ON a_eps.nombre = m.eps
        LEFT JOIN administradoras a_arl ON a_arl.nombre = m.arl
        LEFT JOIN administradoras a_caj ON a_caj.nombre = m.dsc_ccf
      `,
    ])

    cuentasMap = Object.fromEntries(cuentasData.map(c => [c.concepto, c]))
    maestroMap = Object.fromEntries(maestroData.map(m => [m.empleado, m]))
  }

  // Fecha como Date nativo (ExcelJS no usa seriales)
  const [fy, fm, fd] = fecha.split('-').map(Number)
  const fechaDate = new Date(fy, fm - 1, fd, 12)

  const noRows = []
  const psRows = []
  const ntoAcum = {}

  for (const row of sourceRows) {
    const empleado    = String(row[1]).trim()
    const doctoIdent  = String(row[3]).trim()
    const concepto    = String(row[9]).trim()
    const descripcion = String(row[10]).trim()
    const valorDev    = Number(row[12]) || 0
    const valorDed    = Number(row[13]) || 0
    const valor       = Math.abs(valorDev || valorDed)

    if (!ntoAcum[empleado]) ntoAcum[empleado] = { doctoIdent, neto: 0 }

    const cuentaReg = cuentasMap[concepto]
    if (!cuentaReg) continue

    const tipo = cuentaReg.tipo

    if (tipo === '3') {
      // ── Hoja PS: los débitos de costo/provisión generan también su crédito ──
      const maestro = maestroMap[empleado] || {}

      if (COSTO_DEBITO.has(concepto)) {
        const adminField = getAdminFieldByDescription(descripcion)
        const idTerceroDeb = adminField && maestro[adminField]
          ? String(maestro[adminField]).trim()
          : doctoIdent
        psRows.push(['PS', 1, fechaDate, idTerceroDeb, descripcion, Number(cuentaReg.cuenta), 'DEBITO', valor])

        const conceptoCredito = COSTO_DEBITO_A_CREDITO[concepto]
        const { cuenta: cuentaCred, campoAdmin } = COSTO_CREDITO[conceptoCredito]
        const idTerceroCred = maestro[campoAdmin] ? String(maestro[campoAdmin]).trim() : ''
        psRows.push(['PS', 1, fechaDate, idTerceroCred, descripcion, cuentaCred, 'CREDITO', valor])

      } else if (COSTO_CREDITO[concepto]) {
        const { cuenta, campoAdmin } = COSTO_CREDITO[concepto]
        const nitAdmin = maestro[campoAdmin] ? Number(maestro[campoAdmin]) : ''
        psRows.push(['PS', 1, fechaDate, nitAdmin, descripcion, cuenta, 'CREDITO', valor])

      } else if (PROV_DEBITO.has(concepto)) {
        const adminField = getAdminFieldByDescription(descripcion)
        const idTerceroDeb = adminField && maestro[adminField]
          ? String(maestro[adminField]).trim()
          : doctoIdent
        psRows.push(['PS', 1, fechaDate, idTerceroDeb, descripcion, Number(cuentaReg.cuenta), 'DEBITO', valor])

        const conceptoCredito = PROV_DEBITO_A_CREDITO[concepto]
        psRows.push(['PS', 1, fechaDate, doctoIdent, descripcion, PROV_CREDITO[conceptoCredito], 'CREDITO', valor])

      } else if (PROV_CREDITO[concepto]) {
        psRows.push(['PS', 1, fechaDate, doctoIdent, descripcion, PROV_CREDITO[concepto], 'CREDITO', valor])
      }

    } else {
      // ── Hoja NO ──────────────────────────────────────────────
      const maestro = maestroMap[empleado] || {}
      const valorFinal = valorDev || valorDed
      let idTercero = doctoIdent

      const adminField = getAporteAdminField(descripcion)
      if (adminField && maestro[adminField]) {
        idTercero = String(maestro[adminField]).trim()
      }

      noRows.push(['NO ', 1, fechaDate, idTercero, descripcion, Number(cuentaReg.cuenta), cuentaReg.naturaleza, valorFinal, '', ''])

      ntoAcum[empleado].neto += valorDev - valorDed
    }
  }

  // Fila NTP por empleado al final de NO
  for (const emp of Object.values(ntoAcum)) {
    noRows.push(['NO ', 1, fechaDate, emp.doctoIdent, 'NETO A PAGAR POR EMPLEADO', 25050105, 'CREDITO', Math.abs(emp.neto), '', ''])
  }

  // 3. Definición de columnas con formatos
  const colDefsNO = [
    {},                           // A TIPO DOCUMENTO  → texto
    { fmt: '0' },                 // B CONSECUTIVO     → entero
    { isDate: true },             // C FECHA           → DD/MM/YYYY
    { isText: true },             // D ID TERCERO      → texto (preserva ceros iniciales)
    {},                           // E DESCRIPCION     → texto
    { fmt: '0' },                 // F CUENTA          → entero sin decimales
    {},                           // G NATURALEZA      → texto
    { fmt: '#,##0.00' },          // H VALOR           → contable 2 decimales
    {},                           // I vacía
    {},                           // J vacía
  ]
  const colWidthsNO = [17.43, 26.43, 10, 10.86, 44, 8.29, 12.43, 14.43, null, 14.43]

  const colDefsPS = [
    {},                           // A TIPO DOCUMENTO  → texto
    { fmt: '0' },                 // B CONSECUTIVO     → entero
    { isDate: true },             // C FECHA           → DD/MM/YYYY
    {},                           // D ID TERCERO      → nit (número) o docto (string)
    {},                           // E DESCRIPCION     → texto
    { fmt: '0' },                 // F CUENTA          → entero
    {},                           // G NATURALEZA      → texto
    { fmt: '#,##0.00' },          // H VALOR           → contable 2 decimales
  ]
  const colWidthsPS = [17.43, 26.43, 10, 11.29, 28.43, 8.29, 13.14, 12.43]

  const headersNO = ['TIPO DOCUMENTO ', 'CONSECUTIVO DOCUMENTO ', 'FECHA ', 'ID TERCERO ', 'DESCRIPCION ', 'CUENTA ', 'NATURALEZA ', 'VALOR ', '', '']
  const headersPS = ['TIPO DOCUMENTO ', 'CONSECUTIVO DOCUMENTO ', 'FECHA ', 'ID TERCERO ', 'DESCRIPCION ', 'CUENTA ', 'NATURALEZA ', 'VALOR ']

  // 4. Generar Excel con ExcelJS (soporte completo de estilos)
  const wbOut = new ExcelJS.Workbook()
  buildWorksheet(wbOut, 'NO', headersNO, noRows, colDefsNO, colWidthsNO)
  buildWorksheet(wbOut, 'PS', headersPS, psRows, colDefsPS, colWidthsPS)

  const buffer = await wbOut.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
