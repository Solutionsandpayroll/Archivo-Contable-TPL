import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM administradoras ORDER BY tipo, nombre`
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: 'Error consultando administradoras.' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { tipo, nombre, nit } = await request.json()
    if (!nombre || !nit) {
      return NextResponse.json({ error: 'nombre y nit son requeridos.' }, { status: 400 })
    }
    const rows = await sql`
      INSERT INTO administradoras (tipo, nombre, nit)
      VALUES (${tipo ?? ''}, ${nombre}, ${nit})
      ON CONFLICT (nombre) DO UPDATE
        SET tipo = EXCLUDED.tipo,
            nit  = EXCLUDED.nit
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Error guardando administradora.' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { nombre } = await request.json()
    await sql`DELETE FROM administradoras WHERE nombre = ${nombre}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error eliminando administradora.' }, { status: 500 })
  }
}
