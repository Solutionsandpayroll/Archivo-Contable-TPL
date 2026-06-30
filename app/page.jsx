'use client'

import { useState } from 'react'

function App() {
  const [isHelpExpanded, setIsHelpExpanded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const [archivoFile, setArchivoFile] = useState(null)
  const [infoFile, setInfoFile] = useState(null)
  const [fechaDoc, setFechaDoc] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultMsg, setResultMsg] = useState('')

  async function generarArchivo() {
    if (!archivoFile) { setResultMsg('Selecciona el Archivo Inicial.'); return }
    if (!fechaDoc)    { setResultMsg('Selecciona la fecha del documento.'); return }
    setIsProcessing(true)
    setResultMsg('')
    try {
      const fd = new FormData()
      fd.append('archivo', archivoFile)
      fd.append('fecha', fechaDoc)
      if (infoFile) fd.append('informacion', infoFile)
      const res = await fetch('/api/procesar', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error desconocido')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const [yy, mm] = fechaDoc.split('-')
      a.download = `TPL_${yy}${mm}_Plano Contable.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      setResultMsg('Archivo generado y descargado correctamente.')
    } catch (err) {
      setResultMsg(`Error: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo-container">
              <div className="logo">
                <img
                  src="/Logo syp.png"
                  alt="Solutions & Payroll Logo"
                  width="60"
                  height="60"
                />
              </div>
              <div className="header-text">
                <h1>Solutions & Payroll</h1>
                <p className="subtitle">Archivo Contable - TPL</p>
              </div>
            </div>
            <div className="welcome-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Bienvenido, Usuario</span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="main-content">
        <div className="container">

          {/* Ayuda colapsable */}
          <div className="help-section">
            <button
              className="help-toggle"
              onClick={() => setIsHelpExpanded(!isHelpExpanded)}
              aria-expanded={isHelpExpanded}
            >
              <div className="help-toggle-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span>¿Cómo usar esta aplicación?</span>
              </div>
              <svg
                className={`chevron ${isHelpExpanded ? 'expanded' : ''}`}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div className={`help-content ${isHelpExpanded ? 'expanded' : ''}`}>
              <ol className="help-list">
                <li>
                  <span className="step-number">1</span>
                  <div>
                    <strong>Sube los archivos</strong>
                    <p>Sube el Archivo Inicial (reporte de nomina) y opcionalmente el archivo de Informacion General (Cuentas y Entidades).</p>
                  </div>
                </li>
                <li>
                  <span className="step-number">2</span>
                  <div>
                    <strong>Selecciona la fecha</strong>
                    <p>Elige la fecha del documento contable. El archivo se nombrara automaticamente.</p>
                  </div>
                </li>
                <li>
                  <span className="step-number">3</span>
                  <div>
                    <strong>Descarga el resultado</strong>
                    <p>El sistema genera el Excel con las hojas NO y PS listas para importar al sistema contable.</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          {/* Card principal */}
          <div className="card">
            <div className="card-header">
              <h2>Proceso Principal</h2>
              <p className="description">
                Sube el Archivo Inicial y el de Informacion General, selecciona la fecha y descarga el Archivo Final generado.
              </p>
            </div>

            <div className="card-body">
                <div className="form-section">
                  {/* ── Área de carga de archivo ── */}
                  <div className="form-group">
                    <label className="label">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      Archivo Inicial (Excel)
                    </label>
                    <input
                      id="file-input"
                      type="file"
                      accept=".xlsx,.xls"
                      style={{ display: 'none' }}
                      onChange={(e) => { setArchivoFile(e.target.files?.[0] || null); setIsDragging(false) }}
                    />
                    <div
                      className={`file-dropzone ${isDragging ? 'dragging' : ''} ${archivoFile ? 'has-file' : ''}`}
                      onClick={() => document.getElementById('file-input').click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setIsDragging(false)
                        const file = e.dataTransfer.files?.[0]
                        if (file) setArchivoFile(file)
                      }}
                    >
                      {archivoFile ? (
                        <>
                          <svg className="dropzone-icon file" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                          </svg>
                          <p className="dropzone-filename">{archivoFile.name}</p>
                          <p className="dropzone-hint">Clic para cambiar el archivo</p>
                        </>
                      ) : (
                        <>
                          <svg className="dropzone-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <polyline points="16 16 12 12 8 16"/>
                            <line x1="12" y1="12" x2="12" y2="21"/>
                            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                          </svg>
                          <p className="dropzone-title">Haga clic o arrastre el archivo aquí</p>
                          <p className="dropzone-hint">Formatos soportados: .xlsx, .xls</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Área de carga de archivo de información ── */}
                  <div className="form-group">
                    <label className="label">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      Informacion General (opcional)
                    </label>
                    <input
                      id="info-input"
                      type="file"
                      accept=".xlsx,.xls"
                      style={{ display: 'none' }}
                      onChange={(e) => setInfoFile(e.target.files?.[0] || null)}
                    />
                    <div
                      className={`file-dropzone ${infoFile ? 'has-file' : ''}`}
                      onClick={() => document.getElementById('info-input').click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const file = e.dataTransfer.files?.[0]
                        if (file) setInfoFile(file)
                      }}
                    >
                      {infoFile ? (
                        <>
                          <svg className="dropzone-icon file" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                          </svg>
                          <p className="dropzone-filename">{infoFile.name}</p>
                          <p className="dropzone-hint">Clic para cambiar el archivo</p>
                        </>
                      ) : (
                        <>
                          <svg className="dropzone-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <polyline points="16 16 12 12 8 16"/>
                            <line x1="12" y1="12" x2="12" y2="21"/>
                            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                          </svg>
                          <p className="dropzone-title">Suba el archivo de Informacion General</p>
                          <p className="dropzone-hint">Debe contener las hojas "Cuentas" y "Entidades"</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Fecha (obligatoria) ── */}
                  <div className="form-group">
                    <label className="label">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Fecha del documento <span className="required-star">*</span>
                    </label>
                    <input
                      type="date"
                      className="select-input"
                      value={fechaDoc}
                      required
                      onChange={(e) => setFechaDoc(e.target.value)}
                    />
                    {fechaDoc && (
                      <p className="hint">Nombre del archivo: TPL_{fechaDoc.slice(0,4)}{fechaDoc.slice(5,7)}_Plano Contable.xlsx</p>
                    )}
                  </div>

                  <button className="btn-primary" type="button" onClick={generarArchivo} disabled={isProcessing}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {isProcessing ? 'Procesando...' : 'Generar Archivo Final'}
                  </button>

                  {resultMsg && (
                    <p className={`hint ${resultMsg.startsWith('Error') ? 'error' : 'success'}`}>{resultMsg}</p>
                  )}
                </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Solutions & Payroll. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
