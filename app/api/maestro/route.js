import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM maestro_personal ORDER BY empleado`
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: 'Error consultando maestro.' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const {
      empleado, docto_ident, nombre, arl, cod_eps, eps,
      cod_afp, afp, fondo_cesantias, cdg_ccf, dsc_ccf,
    } = await request.json()
    if (!empleado) {
      return NextResponse.json({ error: 'empleado es requerido.' }, { status: 400 })
    }
    const rows = await sql`
      INSERT INTO maestro_personal
        (empleado, docto_ident, nombre, arl, cod_eps, eps, cod_afp, afp, fondo_cesantias, cdg_ccf, dsc_ccf)
      VALUES
        (${empleado}, ${docto_ident ?? ''}, ${nombre ?? ''}, ${arl ?? ''},
         ${cod_eps ?? ''}, ${eps ?? ''}, ${cod_afp ?? ''}, ${afp ?? ''},
         ${fondo_cesantias ?? ''}, ${cdg_ccf ?? ''}, ${dsc_ccf ?? ''})
      ON CONFLICT (empleado) DO UPDATE
        SET docto_ident     = EXCLUDED.docto_ident,
            nombre          = EXCLUDED.nombre,
            arl             = EXCLUDED.arl,
            cod_eps         = EXCLUDED.cod_eps,
            eps             = EXCLUDED.eps,
            cod_afp         = EXCLUDED.cod_afp,
            afp             = EXCLUDED.afp,
            fondo_cesantias = EXCLUDED.fondo_cesantias,
            cdg_ccf         = EXCLUDED.cdg_ccf,
            dsc_ccf         = EXCLUDED.dsc_ccf
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Error guardando empleado.' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { empleado } = await request.json()
    await sql`DELETE FROM maestro_personal WHERE empleado = ${empleado}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error eliminando empleado.' }, { status: 500 })
  }
}
