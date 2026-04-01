const XLSX = require('../node_modules/xlsx')
const fs = require('fs')
const path = require('path')

const wb = XLSX.readFile(path.join(__dirname, '../Bases.xlsx'))
const esc = v => String(v == null ? '' : v).replace(/'/g, "''")

// ===== CUENTAS =====
const wsCuentas = wb.Sheets['Cuentas']
const cRaw = XLSX.utils.sheet_to_json(wsCuentas, { header: 1, defval: '' })
const cuentasValues = cRaw.slice(1).filter(r => r[0]).map(r =>
  `('${esc(r[0])}','${esc(r[1])}','${esc(r[2])}',${r[3] || 'NULL'},'${esc(r[4])}','${esc(r[5])}','${esc(r[6])}')`
)

// ===== ADMINISTRADORAS =====
const wsAdm = wb.Sheets['ADMINISTRADORAS']
const admRaw = XLSX.utils.sheet_to_json(wsAdm, { header: 1, defval: '' })
let tipoActual = ''
const admValues = []
for (const r of admRaw) {
  const nombre = String(r[0] || '').trim()
  const nit    = String(r[1] || '').trim()
  if (!nombre) continue
  if (nombre === 'ARP' || nit === 'NIT ARL') continue   // fila cabecera
  if (!nit) { tipoActual = nombre; continue }            // fila de tipo (ARL, EPS…)
  admValues.push(`('${esc(tipoActual)}','${esc(nombre)}','${esc(nit)}')`)
}

// ===== MAESTRO PERSONAL =====
const wsMaestro = wb.Sheets['MAESTRO PERSONAL']
const mRaw = XLSX.utils.sheet_to_json(wsMaestro, { header: 1, defval: '' })
const maestroValues = mRaw.slice(1).filter(r => r[0]).map(r =>
  `('${esc(r[0])}','${esc(r[1])}','${esc((String(r[4]||'') + ' ' + String(r[5]||'')).trim())}','${esc(r[96])}','${esc(r[97])}','${esc(r[98])}','${esc(r[99])}','${esc(r[100])}','${esc(r[102])}','${esc(r[104])}','${esc(r[105])}')`
)

const sql = `
-- CUENTAS (${cuentasValues.length} registros)
INSERT INTO cuentas (concepto,descripcion,tipo,cuenta,debito,credito,naturaleza) VALUES
${cuentasValues.join(',\n')}
ON CONFLICT (concepto) DO NOTHING;

-- ADMINISTRADORAS (${admValues.length} registros)
INSERT INTO administradoras (tipo,nombre,nit) VALUES
${admValues.join(',\n')}
ON CONFLICT (nombre) DO NOTHING;

-- MAESTRO PERSONAL (${maestroValues.length} registros)
INSERT INTO maestro_personal (empleado,docto_ident,nombre,arl,cod_eps,eps,cod_afp,afp,fondo_cesantias,cdg_ccf,dsc_ccf) VALUES
${maestroValues.join(',\n')}
ON CONFLICT (empleado) DO NOTHING;
`

fs.writeFileSync(path.join(__dirname, 'datos-bases.sql'), sql)
console.log('OK cuentas:', cuentasValues.length)
console.log('OK administradoras:', admValues.length)
console.log('OK maestro_personal:', maestroValues.length)
console.log('SQL guardado en scripts/datos-bases.sql')
