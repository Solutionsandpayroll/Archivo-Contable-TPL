import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM cuentas ORDER BY concepto`
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: 'Error consultando cuentas.' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { concepto, descripcion, tipo, cuenta, debito, credito, naturaleza } = await request.json()
    if (!concepto || !descripcion) {
      return NextResponse.json({ error: 'concepto y descripcion son requeridos.' }, { status: 400 })
    }
    const cuentaNum = cuenta ? Number(cuenta) : null
    if (cuenta && isNaN(cuentaNum)) {
      return NextResponse.json({ error: 'El campo cuenta debe ser un número.' }, { status: 400 })
    }
    const rows = await sql`
      INSERT INTO cuentas (concepto, descripcion, tipo, cuenta, debito, credito, naturaleza)
      VALUES (${concepto}, ${descripcion}, ${tipo ?? ''}, ${cuentaNum}, ${debito ?? ''}, ${credito ?? ''}, ${naturaleza ?? ''})
      ON CONFLICT (concepto) DO UPDATE
        SET descripcion = EXCLUDED.descripcion,
            tipo        = EXCLUDED.tipo,
            cuenta      = EXCLUDED.cuenta,
            debito      = EXCLUDED.debito,
            credito     = EXCLUDED.credito,
            naturaleza  = EXCLUDED.naturaleza
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Error guardando cuenta.' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { concepto } = await request.json()
    await sql`DELETE FROM cuentas WHERE concepto = ${concepto}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error eliminando cuenta.' }, { status: 500 })
  }
}
