'use client'

import { useState } from 'react'

const TABLE_FIELDS = {
  cuentas: [
    { key: 'concepto',    label: 'Concepto',    placeholder: 'Ej: A000',               required: true  },
    { key: 'descripcion', label: 'Descripcion', placeholder: 'Ej: SALARIO BASICO',     required: true  },
    { key: 'tipo',        label: 'Tipo',        placeholder: 'Ej: 1, 2 o 3',           required: false },
    { key: 'cuenta',      label: 'Cuenta',      placeholder: 'Ej: 51050505',           required: false },
    { key: 'naturaleza',  label: 'Naturaleza',  placeholder: 'Ej: DEBITO o CREDITO',   required: false },
  ],
  maestro_personal: [
    { key: 'empleado',    label: 'No. Empleado',         placeholder: 'Ej: 1037548244',              required: true  },
    { key: 'docto_ident', label: 'Documento Identidad',  placeholder: 'Ej: 1037548244',              required: false },
    { key: 'nombre',      label: 'Nombre Completo',      placeholder: 'Ej: GARCIA GOMEZ JUAN',       required: false },
    { key: 'arl',         label: 'ARL',                  placeholder: 'Nombre de la ARL',            required: false },
    { key: 'eps',         label: 'EPS',                  placeholder: 'Nombre de la EPS',            required: false },
    { key: 'afp',         label: 'AFP',                  placeholder: 'Nombre del AFP',              required: false },
    { key: 'dsc_ccf',     label: 'Caja de Compensacion', placeholder: 'Nombre de la caja',           required: false },
  ],
  administradoras: [
    { key: 'tipo',   label: 'Tipo',   placeholder: 'ARL, EPS, AFP o CAJA', required: true  },
    { key: 'nombre', label: 'Nombre', placeholder: 'Nombre de la administradora', required: true  },
    { key: 'nit',    label: 'NIT',    placeholder: 'Ej: 800229739',        required: true  },
  ],
}

function App() {
  const [isHelpExpanded, setIsHelpExpanded] = useState(false)
  const [activeModule, setActiveModule] = useState('proceso-principal')
  const [isDragging, setIsDragging] = useState(false)

  // Módulo 2 – Agregar Datos
  const [targetTable, setTargetTable] = useState('cuentas')
  const [formData, setFormData] = useState({})
  const [recentRecords, setRecentRecords] = useState([])
  const [mod1Msg, setMod1Msg] = useState('')
  const [mod1Loading, setMod1Loading] = useState(false)

  // Módulo 2 – Proceso Principal
  const [archivoFile, setArchivoFile] = useState(null)
  const [fechaDoc, setFechaDoc] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultMsg, setResultMsg] = useState('')

  // ── Módulo 2: agregar registro ────────────────────────────
  async function agregarRegistro() {
    const fields = TABLE_FIELDS[targetTable]
    const missing = fields.find(f => f.required && !String(formData[f.key] || '').trim())
    if (missing) {
      setMod1Msg(`El campo "${missing.label}" es obligatorio.`)
      return
    }
    setMod1Loading(true)
    setMod1Msg('')
    try {
      const endpoints = {
        cuentas:         '/api/cuentas',
        maestro_personal: '/api/maestro',
        administradoras: '/api/administradoras',
      }
      const res = await fetch(endpoints[targetTable], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error desconocido')
      }
      const primaryKey = { cuentas: 'concepto', maestro_personal: 'empleado', administradoras: 'nombre' }[targetTable]
      const nameKey    = { cuentas: 'descripcion', maestro_personal: 'nombre', administradoras: 'nit' }[targetTable]
      setRecentRecords(prev => [
        { table: targetTable, code: formData[primaryKey] || '', detail: formData[nameKey] || '' },
        ...prev.slice(0, 4),
      ])
      setFormData({})
      setMod1Msg('Registro guardado correctamente.')
    } catch (err) {
      setMod1Msg(`Error: ${err.message}`)
    } finally {
      setMod1Loading(false)
    }
  }

  // ── Módulo 2: generar archivo final ──────────────────────
  async function generarArchivo() {
    if (!archivoFile) { setResultMsg('Selecciona el Archivo Inicial.'); return }
    if (!fechaDoc)    { setResultMsg('Selecciona la fecha del documento.'); return }
    setIsProcessing(true)
    setResultMsg('')
    try {
      const fd = new FormData()
      fd.append('archivo', archivoFile)
      fd.append('fecha', fechaDoc)
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
                    <strong>Modulo 1: Proceso Principal</strong>
                    <p>Sube el Archivo Inicial, selecciona la fecha y genera el Archivo Final automaticamente.</p>
                  </div>
                </li>
                <li>
                  <span className="step-number">2</span>
                  <div>
                    <strong>Modulo 2: Agregar Datos</strong>
                    <p>Agrega o actualiza registros en Cuentas, Maestro Personal y Administradoras.</p>
                  </div>
                </li>
                <li>
                  <span className="step-number">3</span>
                  <div>
                    <strong>Descarga el resultado</strong>
                    <p>El sistema genera el Excel con las hojas NO y PS listas para usar.</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          {/* Selector de modulo */}
          <div className="module-switcher" role="tablist" aria-label="Selector de modulo">
            <button
              type="button"
              role="tab"
              aria-selected={activeModule === 'proceso-principal'}
              className={`module-tab ${activeModule === 'proceso-principal' ? 'active' : ''}`}
              onClick={() => setActiveModule('proceso-principal')}
            >
              Modulo 1: Proceso Principal
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeModule === 'carga-datos'}
              className={`module-tab ${activeModule === 'carga-datos' ? 'active' : ''}`}
              onClick={() => setActiveModule('carga-datos')}
            >
              Modulo 2: Agregar Datos
            </button>
          </div>

          {/* Card principal */}
          <div className="card">
            <div className="card-header">
              <h2>
                {activeModule === 'proceso-principal'
                  ? 'Modulo 1: Proceso Principal'
                  : 'Modulo 2: Agregar Datos a Tablas'}
              </h2>
              <p className="description">
                {activeModule === 'proceso-principal'
                  ? 'Sube el Archivo Inicial, selecciona la fecha y descarga el Archivo Final generado.'
                  : 'Agrega o actualiza registros en las tablas Cuentas, Maestro Personal y Administradoras.'}
              </p>
            </div>

            <div className="card-body">
              {activeModule === 'proceso-principal' ? (
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
              ) : (
                <div className="form-section">
                  <div className="form-group">
                    <label className="label">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
                      </svg>
                      Tabla de destino
                    </label>
                    <select
                      className="select-input"
                      value={targetTable}
                      onChange={(e) => { setTargetTable(e.target.value); setFormData({}) }}
                    >
                      <option value="cuentas">Cuentas</option>
                      <option value="maestro_personal">Maestro Personal</option>
                      <option value="administradoras">Administradoras</option>
                    </select>
                  </div>

                  {TABLE_FIELDS[targetTable].map(field => (
                    <div className="form-group" key={field.key}>
                      <label className="label">
                        {field.label}
                        {field.required && <span className="required-star">*</span>}
                      </label>
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        className="select-input"
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      />
                    </div>
                  ))}

                  <button className="btn-primary" type="button" onClick={agregarRegistro} disabled={mod1Loading}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    {mod1Loading ? 'Guardando...' : 'Agregar Registro'}
                  </button>

                  {mod1Msg && (
                    <p className={`hint ${mod1Msg.startsWith('Error') ? 'error' : 'success'}`}>{mod1Msg}</p>
                  )}

                  <div className="module-preview">
                    <h3>Registros recientes</h3>
                    {recentRecords.length === 0 ? (
                      <p className="hint">No hay registros recientes.</p>
                    ) : (
                      <ul>
                        {recentRecords.map((record, i) => (
                          <li key={i}>
                            <strong>{record.table}</strong>
                            <span>{record.code}</span>
                            <span>{record.detail}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
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
