import { NextResponse } from 'next/server'
import { procesarNomina } from '@/lib/procesarNomina'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const archivo = formData.get('archivo')
    const informacion = formData.get('informacion')
    const fecha = formData.get('fecha')

    if (!archivo || !fecha) {
      return NextResponse.json({ error: 'Faltan campos: archivo y fecha son requeridos.' }, { status: 400 })
    }

    const buffer = Buffer.from(await archivo.arrayBuffer())
    const infoBuffer = informacion ? Buffer.from(await informacion.arrayBuffer()) : null
    const outputBuffer = await procesarNomina(buffer, fecha, infoBuffer)

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
