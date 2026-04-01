import { NextResponse } from 'next/server'
import { procesarNomina } from '@/lib/procesarNomina'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const archivo = formData.get('archivo')
    const fecha = formData.get('fecha')

    if (!archivo || !fecha) {
      return NextResponse.json({ error: 'Faltan campos: archivo y fecha son requeridos.' }, { status: 400 })
    }

    const buffer = Buffer.from(await archivo.arrayBuffer())
    const outputBuffer = await procesarNomina(buffer, fecha)

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Archivo final.xlsx"',
      },
    })
  } catch (err) {
    console.error('Error en /api/procesar:', err)
    return NextResponse.json({ error: 'Error procesando el archivo.' }, { status: 500 })
  }
}
