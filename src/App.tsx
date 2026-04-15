import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  FileText,
  GitBranch,
  LayoutGrid,
  Menu,
  Moon,
  ShieldAlert,
  ShieldCheck,
  ShieldMinus,
  SunMedium,
  User,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './App.css'

type NavItem = {
  label: string
  icon: React.ElementType
  group: 'Incidencias' | 'Documentos'
}

type RowItem = Record<string, unknown>

type MatrixColumn = {
  name: string
  code: string
  group: string
  groupColor: string
  groupTextColor: string
}

type MatrixRow = {
  group: string
  groupColor: string
  groupTextColor: string
  leaderName: string
  leaderCode: string
  participantName: string
  participantCode: string
  interfaceCode: string
  criticidad: string
}

type MatrixPayload = {
  columns: MatrixColumn[]
  rows: MatrixRow[]
}

type GraphHierarchyData = {
  name: string
  children?: GraphHierarchyData[]
  imports?: string[]
  group?: string
  groupColor?: string
  groupTextColor?: string
  code?: string
  label?: string
}

type GraphHierarchyNode = {
  data: GraphHierarchyData
  parent: GraphHierarchyNode | null
  depth: number
  children: GraphHierarchyNode[]
  incoming: Array<[GraphHierarchyNode, GraphHierarchyNode]>
  outgoing: Array<[GraphHierarchyNode, GraphHierarchyNode]>
}

type GraphNode = {
  id: string
  label: string
  code: string
  group: string
  groupColor: string
  groupTextColor: string
  angle: number
  x: number
  y: number
  textX: number
  textY: number
  textAnchor: 'start' | 'end'
  labelRotation: number
}

type GraphLink = {
  sourceId: string
  targetId: string
  criticidad: string
  interfaceCode: string
}

type UploadResponse = {
  totalInterfaces: number
  criticidadAlta: number
  criticidadMedia: number
  criticidadBaja: number
  distribution?: Array<{ name: string; value: number }>
  disciplineSummary?: Array<{ code: string; name: string; count: number }>
  matrix?: MatrixPayload
  rows: RowItem[]
}

const navItems: NavItem[] = [
  { label: 'Carga de RCI', icon: LayoutGrid, group: 'Incidencias' },
  { label: 'Resumen RCI', icon: ClipboardList, group: 'Incidencias' },
  { label: 'Matriz Interfaces', icon: AlertTriangle, group: 'Incidencias' },
  { label: 'Grafo', icon: GitBranch, group: 'Incidencias' },
  { label: 'Oficios', icon: FileText, group: 'Documentos' },
]

const COLORS = ['#73BFF4', '#179BE8', '#00AD14', '#EFAA3A', '#FF6C08', '#F40B32', '#ED8C9A']
const CRITICITY_COLORS: Record<string, string> = {
  Alta: '#F40B32',
  Media: '#EFAA3A',
  Baja: '#00AD14',
}
const GRAPH_COLOR_IN = '#1334BC'
const GRAPH_COLOR_OUT = '#F40B32'

function resolveBackendUrl() {
  const configuredValue = import.meta.env.VITE_BACKEND_URL?.trim().replace(/^["']|["']$/g, '')
  const localDevelopmentUrl = 'http://127.0.0.1:10000/api/documents/upload'
  const productionFallbackPath = '/api/documents/upload'

  if (!configuredValue) {
    return import.meta.env.PROD ? productionFallbackPath : localDevelopmentUrl
  }

  const candidate = configuredValue.startsWith('/') || /^https?:\/\//i.test(configuredValue)
    ? configuredValue
    : `https://${configuredValue}`

  try {
    return new URL(candidate, window.location.origin).toString()
  } catch {
    return import.meta.env.PROD ? productionFallbackPath : localDevelopmentUrl
  }
}

const BACKEND_URL = resolveBackendUrl()

function SidebarButton({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button className={`sidebar-button ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="sidebar-icon">
        <Icon size={22} />
      </span>
      <span className="sidebar-label">{item.label}</span>
    </button>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  tone: 'neutral' | 'warning' | 'success' | 'danger'
}) {
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <p className="metric-label">{title}</p>
        <Icon size={20} className="muted" />
      </div>
      <p className={`metric-value ${tone}`}>{value}</p>
      <p className="metric-subtitle">{subtitle}</p>
    </div>
  )
}

function UploadView({
  file,
  loading,
  error,
  onFileChange,
  onUpload,
}: {
  file: File | null
  loading: boolean
  error: string | null
  onFileChange: (file: File | null) => void
  onUpload: () => void
}) {
  return (
    <>
      {/*
        Keep the selected discipline label available for the chart heading so
        the selector context is reflected in user-facing copy.
      */}
      <div className="page-header">
        <h1 className="page-title">Carga de Registro de Control de Interfaces (RCI)</h1>
        <p className="page-description">
          Esta ventana es exclusivamente para cargar el Registro de Control de Interfaces y enviarlo al backend
          para su lectura y extraccion de datos.
        </p>
      </div>

      <section className="hero-card">
        <div>
          <div className="hero-tag">Registro de Control de Interfaces</div>
          <h2 className="hero-title">Sube el archivo Excel que contiene el RCI del proyecto.</h2>
          <p className="hero-copy">
            Una vez seleccionado, el archivo se enviara al servicio backend para procesar el contenido y dejar
            los resultados listos para las demas vistas del sistema.
          </p>
        </div>

        <div className="upload-box">
          <p className="upload-title">Carga de archivo</p>
          <p className="upload-copy">Acepta archivos `.xlsx` y `.xlsm` con la informacion del RCI.</p>
          <input
            className="upload-input"
            type="file"
            accept=".xlsx,.xlsm"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
          <button className="upload-button" onClick={onUpload} disabled={loading}>
            {loading ? 'Procesando archivo...' : 'Subir y procesar RCI'}
          </button>
          <div className="file-pill">
            Archivo seleccionado: <strong>{file?.name ?? 'Ninguno'}</strong>
          </div>
        </div>
      </section>

      {error ? <div className="notice-error">{error}</div> : null}

      <div className="notice-info">
        Despues de cargar el archivo, la informacion procesada se visualiza en la ventana `Resumen RCI`.
      </div>
    </>
  )
}

function PlaceholderView({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>

      <div className="placeholder-box">
        <div className="placeholder-tag">Vista independiente</div>
        <h2 className="hero-title">{title}</h2>
        <p className="placeholder-copy">
          Esta es una ventana diferente dentro del sistema. Queda preparada para conectar su propia logica,
          consulta al backend y componentes visuales cuando definamos ese modulo.
        </p>
        <div className="placeholder-panel">
          La navegacion lateral ya responde por separado. Este modulo no comparte la misma ventana de `Carga de
          RCI`.
        </div>
      </div>
    </>
  )
}

function RciDashboardView({
  response,
  selectedDiscipline,
  availableDisciplines,
  summary,
  stateSummary,
  onDisciplineChange,
}: {
  response: UploadResponse | null
  selectedDiscipline: string
  availableDisciplines: Array<{ code: string; name: string }>
  summary: {
    total: number
    alta: number
    media: number
    baja: number
    distribution: Array<{ name: string; value: number }>
  }
  stateSummary: {
    identificacion: number
    definicion: number
    resolucion: number
    cierre: number
  }
  onDisciplineChange: (value: string) => void
}) {
  if (!response) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Resumen de Registro de Control de Interfaces (RCI)</h1>
          <p className="page-description">
            Esta ventana mostrara la lectura del Registro de Control de Interfaces despues de subir el archivo.
          </p>
        </div>

        <div className="placeholder-box">
          <div className="placeholder-tag">Sin datos cargados</div>
          <h2 className="hero-title">Primero carga un archivo en la ventana "Carga de RCI".</h2>
          <p className="placeholder-copy">
            Cuando el backend procese el Excel, aqui apareceran los indicadores, la distribucion por criticidad y
            la grafica de disciplinas lideres.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Resumen de Registro de Control de Interfaces (RCI)</h1>
        <p className="page-description">
          Esta ventana muestra el resumen del archivo RCI procesado por el backend, incluyendo criticidad y
          disciplinas.
        </p>
      </div>

      <section className="filter-bar">
        <div>
          <p className="filter-label">Vista del resumen</p>
          <p className="filter-value">
            {selectedDiscipline === 'todos'
              ? 'Todas las interfaces'
              : `${selectedDiscipline} - ${
                  availableDisciplines.find((item) => item.code === selectedDiscipline)?.name ?? 'Disciplina'
                }`}
          </p>
        </div>
        <select
          className="panel-select"
          value={selectedDiscipline}
          onChange={(event) => onDisciplineChange(event.target.value)}
        >
          <option value="todos">Todas las interfaces</option>
          {availableDisciplines.map((item) => (
            <option key={item.code} value={item.code}>
              {item.code} - {item.name}
            </option>
          ))}
        </select>
      </section>

      <section className="metric-grid metric-grid--single">
        <MetricCard
          title="Total de Interfaces"
          value={summary.total}
          subtitle={
            selectedDiscipline === 'todos' ? 'Todas las interfaces visibles' : `Disciplina ${selectedDiscipline}`
          }
          icon={BarChart3}
          tone="neutral"
        />
      </section>

      <div className="section-label">Criticidad de Interfaces</div>

      <section className="metric-grid metric-grid--three">
        <MetricCard
          title="Criticidad Alta"
          value={summary.alta}
          subtitle="Interfaces criticas"
          icon={ShieldAlert}
          tone="danger"
        />
        <MetricCard
          title="Criticidad Media"
          value={summary.media}
          subtitle="Requieren seguimiento"
          icon={ShieldMinus}
          tone="warning"
        />
        <MetricCard
          title="Criticidad Baja"
          value={summary.baja}
          subtitle="Menor impacto"
          icon={ShieldCheck}
          tone="success"
        />
      </section>

      <div className="section-label">Estado de Interfaces</div>

      <section className="metric-grid metric-grid--four">
        <MetricCard
          title="Identificacion"
          value={stateSummary.identificacion}
          subtitle="Interfaces en identificacion"
          icon={ClipboardList}
          tone="neutral"
        />
        <MetricCard
          title="Definicion"
          value={stateSummary.definicion}
          subtitle="Interfaces en definicion"
          icon={ClipboardList}
          tone="neutral"
        />
        <MetricCard
          title="Resolucion"
          value={stateSummary.resolucion}
          subtitle="Interfaces en resolucion"
          icon={AlertTriangle}
          tone="neutral"
        />
        <MetricCard
          title="Cierre"
          value={stateSummary.cierre}
          subtitle="Interfaces cerradas"
          icon={ShieldCheck}
          tone="neutral"
        />
      </section>

      <section className="panel-stack">
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <div className="chart-chip">Vista de criticidad</div>
              <h2 className="panel-title">
                {selectedDiscipline === 'todos'
                  ? 'Interfaces por criticidad'
                  : `Criticidad de interfaces ${
                      availableDisciplines.find((item) => item.code === selectedDiscipline)?.name ?? selectedDiscipline
                    }`}
              </h2>
              <p className="panel-subtitle">
                {selectedDiscipline === 'todos'
                  ? 'Distribucion leida desde el archivo RCI.'
                  : `Distribucion leida desde el archivo RCI para la disciplina ${
                      availableDisciplines.find((item) => item.code === selectedDiscipline)?.name ?? selectedDiscipline
                    }.`}
              </p>
            </div>
          </div>

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 6, right: 28, bottom: 22, left: 28 }}>
                <Pie
                  data={summary.distribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="46%"
                  innerRadius={96}
                  outerRadius={188}
                  paddingAngle={4}
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name} ${value} (${Math.round((percent ?? 0) * 100)}%)`
                  }
                >
                  {summary.distribution.map((entry, index) => (
                    <Cell key={entry.name} fill={CRITICITY_COLORS[entry.name] ?? COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid #2f2f2f',
                    borderRadius: 12,
                    color: '#ffffff',
                  }}
                />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <div>
              <div className="chart-chip">Vista por disciplina</div>
              <h2 className="panel-title">Interfaces por disciplina lider</h2>
              <p className="panel-subtitle">Conteo de interfaces agrupadas por disciplina principal.</p>
            </div>
          </div>

          <div className="discipline-chart-wrap">
            {(response.disciplineSummary ?? []).length === 0 ? (
              <div className="summary-box">No se identificaron disciplinas en el archivo cargado.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...(response.disciplineSummary ?? [])].sort((a, b) => b.count - a.count)}
                  margin={{ top: 24, right: 20, left: 10, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="disciplineBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#73BFF4" />
                      <stop offset="100%" stopColor="#1334BC" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#262626" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="code"
                    stroke="currentColor"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    minTickGap={0}
                    height={40}
                    tick={{ fontSize: 11, fontWeight: 700, fill: 'currentColor' }}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111111',
                      border: '1px solid #2f2f2f',
                      borderRadius: 12,
                      color: '#ffffff',
                    }}
                    formatter={(value, _name, item) => [value, `${item?.payload?.name ?? 'Disciplina'}`]}
                  />
                  <Bar dataKey="count" fill="url(#disciplineBar)" radius={[14, 14, 0, 0]} maxBarSize={58}>
                    <LabelList dataKey="count" position="top" fill="currentColor" fontSize={12} fontWeight={700} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

function MatrizInterfacesView({
  response,
}: {
  response: UploadResponse | null
}) {
  const [matrixZoom, setMatrixZoom] = useState(1)
  const [matrixFullscreen, setMatrixFullscreen] = useState(false)
  const [matrixZoomMode, setMatrixZoomMode] = useState(false)
  const [isDraggingMatrix, setIsDraggingMatrix] = useState(false)
  const matrixWrapRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })
  const matrix = response?.matrix
  const columns = matrix?.columns ?? []
  const matrixRows = matrix?.rows ?? []

  function clampMatrixZoom(nextZoom: number) {
    return Math.min(1.8, Math.max(0.1, Number(nextZoom.toFixed(2))))
  }

  const columnGroups = useMemo(() => {
    const groups: Array<{ group: string; color: string; textColor: string; span: number }> = []

    columns.forEach((column) => {
      const previous = groups[groups.length - 1]
      if (previous && previous.group === column.group) {
        previous.span += 1
      } else {
        groups.push({
          group: column.group,
          color: `#${column.groupColor}`,
          textColor: `#${column.groupTextColor}`,
          span: 1,
        })
      }
    })

    return groups
  }, [columns])

  const spanInfo = useMemo(() => {
    const groupSpans = new Map<string, number>()
    const leaderSpans = new Map<string, number>()
    const firstGroupRows = new Set<number>()
    const firstLeaderRows = new Set<number>()

    matrixRows.forEach((row, index) => {
      const previous = matrixRows[index - 1]
      const groupKey = row.group
      const leaderKey = `${row.group}__${row.leaderCode}__${row.leaderName}`

      groupSpans.set(groupKey, (groupSpans.get(groupKey) ?? 0) + 1)
      leaderSpans.set(leaderKey, (leaderSpans.get(leaderKey) ?? 0) + 1)

      if (!previous || previous.group !== row.group) {
        firstGroupRows.add(index)
      }

      if (
        !previous ||
        previous.group !== row.group ||
        previous.leaderCode !== row.leaderCode ||
        previous.leaderName !== row.leaderName
      ) {
        firstLeaderRows.add(index)
      }
    })

    return { groupSpans, leaderSpans, firstGroupRows, firstLeaderRows }
  }, [matrixRows])

  const uniqueLeaders = useMemo(() => {
    return new Set(matrixRows.map((row) => `${row.leaderCode}__${row.leaderName}`)).size
  }, [matrixRows])

  function handleMatrixPointerDown(event: React.MouseEvent<HTMLDivElement>) {
    const container = matrixWrapRef.current
    if (!container) return

    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    }
    setIsDraggingMatrix(true)
  }

  function handleMatrixPointerMove(event: React.MouseEvent<HTMLDivElement>) {
    const container = matrixWrapRef.current
    const dragState = dragStateRef.current

    if (!container || !dragState.active) return

    const deltaX = event.clientX - dragState.startX
    const deltaY = event.clientY - dragState.startY

    container.scrollLeft = dragState.scrollLeft - deltaX
    container.scrollTop = dragState.scrollTop - deltaY
  }

  function stopMatrixDragging() {
    dragStateRef.current.active = false
    setIsDraggingMatrix(false)
  }

  useEffect(() => {
    const container = matrixWrapRef.current
    if (!container) return

    const handleWheel = (event: WheelEvent) => {
      if (!container.contains(event.target as Node)) return

      if (!matrixZoomMode) {
        return
      }

      const isPinchZoomGesture =
        (event.ctrlKey || event.metaKey) &&
        event.deltaMode === WheelEvent.DOM_DELTA_PIXEL &&
        Math.abs(event.deltaY) <= 24 &&
        Math.abs(event.deltaX) <= 24

      if (!isPinchZoomGesture) {
        return
      }

      event.preventDefault()
      const zoomDelta = event.deltaY > 0 ? -0.05 : 0.05
      setMatrixZoom((current) => clampMatrixZoom(current + zoomDelta))
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [matrixZoomMode])

  const matrixCriticitySummary = useMemo(() => {
    let alta = 0
    let media = 0
    let baja = 0

    matrixRows.forEach((row) => {
      const criticidad = row.criticidad.trim().toLowerCase()
      if (criticidad === 'alta') alta += 1
      else if (criticidad === 'media') media += 1
      else if (criticidad === 'baja') baja += 1
    })

    return {
      total: matrixRows.length,
      alta,
      media,
      baja,
    }
  }, [matrixRows])

  if (!response) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Matriz de Interfaces</h1>
          <p className="page-description">
            Esta ventana desplegara la matriz de interfaces despues de procesar el archivo RCI cargado.
          </p>
        </div>

        <div className="placeholder-box">
          <div className="placeholder-tag">Sin datos cargados</div>
          <h2 className="hero-title">Primero carga un archivo en la ventana "Carga de RCI".</h2>
          <p className="placeholder-copy">
            Cuando el backend procese el Excel, aqui aparecera la matriz agrupada por disciplina lider y
            disciplina participante.
          </p>
        </div>
      </>
    )
  }

  if (!matrix || matrixRows.length === 0 || columns.length === 0) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Matriz de Interfaces</h1>
          <p className="page-description">
            Esta ventana muestra la matriz de interfaces generada a partir del Registro de Control de Interfaces.
          </p>
        </div>

        <div className="placeholder-box">
          <div className="placeholder-tag">Sin matriz disponible</div>
          <h2 className="hero-title">El archivo cargado no produjo una matriz interpretable.</h2>
          <p className="placeholder-copy">
            Verifica que el RCI contenga las columnas de subsistema lider, subsistema participante y criticidad.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Matriz de Interfaces</h1>
        <p className="page-description">
          Esta ventana muestra la matriz del Registro de Control de Interfaces, agrupada por disciplina lider y
          disciplina participante.
        </p>
      </div>

      <section className="metric-grid metric-grid--three">
        <MetricCard
          title="Interfaces en Matriz"
          value={matrixRows.length}
          subtitle="Filas generadas desde el RCI"
          icon={BarChart3}
          tone="neutral"
        />
        <MetricCard
          title="Disciplinas Lider"
          value={uniqueLeaders}
          subtitle="Disciplinas con interfaces registradas"
          icon={ClipboardList}
          tone="neutral"
        />
        <MetricCard
          title="Disciplinas Participantes"
          value={columns.length}
          subtitle="Columnas activas en la matriz"
          icon={GitBranch}
          tone="neutral"
        />
      </section>

      <div className="section-label">Resumen General de Interfaces</div>

      <section className="metric-grid metric-grid--four">
        <MetricCard
          title="Total de Interfaces"
          value={matrixCriticitySummary.total}
          subtitle="Interfaces visibles en la matriz"
          icon={BarChart3}
          tone="neutral"
        />
        <MetricCard
          title="Criticidad Alta"
          value={matrixCriticitySummary.alta}
          subtitle="Interfaces criticas"
          icon={ShieldAlert}
          tone="danger"
        />
        <MetricCard
          title="Criticidad Media"
          value={matrixCriticitySummary.media}
          subtitle="Requieren seguimiento"
          icon={ShieldMinus}
          tone="warning"
        />
        <MetricCard
          title="Criticidad Baja"
          value={matrixCriticitySummary.baja}
          subtitle="Menor impacto"
          icon={ShieldCheck}
          tone="success"
        />
      </section>

      <section className="panel-stack">
        <div className={`panel-card ${matrixFullscreen ? 'matrix-panel-fullscreen' : ''}`}>
          <div className="panel-header">
            <div>
              <div className="chart-chip">Vista matricial</div>
              <h2 className="panel-title">Cruce de disciplinas e interfaces</h2>
              <p className="panel-subtitle">
                Cada celda muestra el codigo de interfaz. El color refleja la criticidad leida desde el archivo.
              </p>
            </div>
          </div>

          <div className="matrix-legend">
            <span className="matrix-legend-chip matrix-legend-chip--alta">Alta</span>
            <span className="matrix-legend-chip matrix-legend-chip--media">Media</span>
            <span className="matrix-legend-chip matrix-legend-chip--baja">Baja</span>
            <span className="matrix-legend-chip matrix-legend-chip--diagonal">Misma disciplina</span>
          </div>

          <div className="matrix-toolbar">
            <div className="matrix-zoom-group">
              <span className="matrix-zoom-label">Zoom de matriz</span>
              <button
                className="matrix-zoom-button"
                onClick={() => setMatrixZoom((current) => clampMatrixZoom(current - 0.1))}
                type="button"
              >
                -
              </button>
              <span className="matrix-zoom-value">{Math.round(matrixZoom * 100)}%</span>
              <button
                className="matrix-zoom-button"
                onClick={() => setMatrixZoom((current) => clampMatrixZoom(current + 0.1))}
                type="button"
              >
                +
              </button>
              <button className="matrix-zoom-button matrix-zoom-button--reset" onClick={() => setMatrixZoom(1)} type="button">
                Reset
              </button>
              <button
                className={`matrix-zoom-button matrix-zoom-button--mode ${matrixZoomMode ? 'is-active' : ''}`}
                onClick={() => setMatrixZoomMode((current) => !current)}
                type="button"
              >
                {matrixZoomMode ? 'Modo zoom: ON' : 'Modo zoom: OFF'}
              </button>
              <button
                className="matrix-zoom-button matrix-zoom-button--fullscreen"
                onClick={() => setMatrixFullscreen((current) => !current)}
                type="button"
              >
                {matrixFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}
              </button>
            </div>
          </div>

          <div
            ref={matrixWrapRef}
            className={`matrix-table-wrap ${isDraggingMatrix ? 'is-dragging' : ''}`}
            onMouseDown={handleMatrixPointerDown}
            onMouseMove={handleMatrixPointerMove}
            onMouseUp={stopMatrixDragging}
            onMouseLeave={stopMatrixDragging}
          >
            <div
              className="matrix-scale-stage"
              style={{
                ['--matrix-zoom' as string]: `${matrixZoom}`,
              }}
            >
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th rowSpan={2} className="matrix-side-header">
                      Grupo
                    </th>
                    <th rowSpan={2} className="matrix-side-header">
                      Disciplina lider
                    </th>
                    <th rowSpan={2} className="matrix-side-header matrix-side-header--abbr">
                      Abr.
                    </th>
                    {columnGroups.map((group) => (
                      <th
                        key={group.group}
                        colSpan={group.span}
                        className="matrix-group-header"
                        style={{ backgroundColor: group.color, color: group.textColor }}
                      >
                        {group.group}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={`${column.group}-${column.code}`}
                        className="matrix-column-header"
                        style={{ backgroundColor: `#${column.groupColor}`, color: `#${column.groupTextColor}` }}
                        title={`${column.code} - ${column.name}`}
                      >
                        {column.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((row, index) => {
                    const leaderKey = `${row.group}__${row.leaderCode}__${row.leaderName}`

                    return (
                      <tr key={`${leaderKey}__${row.participantCode}__${row.interfaceCode}__${index}`}>
                        {spanInfo.firstGroupRows.has(index) ? (
                          <td
                            rowSpan={spanInfo.groupSpans.get(row.group) ?? 1}
                            className="matrix-group-cell"
                            style={{ backgroundColor: `#${row.groupColor}`, color: `#${row.groupTextColor}` }}
                          >
                            {row.group}
                          </td>
                        ) : null}

                        {spanInfo.firstLeaderRows.has(index) ? (
                          <>
                            <td
                              rowSpan={spanInfo.leaderSpans.get(leaderKey) ?? 1}
                              className="matrix-leader-cell"
                              style={{ backgroundColor: `#${row.groupColor}`, color: `#${row.groupTextColor}` }}
                            >
                              {row.leaderName}
                            </td>
                            <td
                              rowSpan={spanInfo.leaderSpans.get(leaderKey) ?? 1}
                              className="matrix-leader-cell matrix-leader-cell--abbr"
                              style={{ backgroundColor: `#${row.groupColor}`, color: `#${row.groupTextColor}` }}
                            >
                              {row.leaderCode}
                            </td>
                          </>
                        ) : null}

                        {columns.map((column) => {
                          const isDiagonal = row.leaderCode === column.code
                          const isActiveInterface = row.participantCode === column.code
                          const criticidad = row.criticidad.trim().toLowerCase()
                          const criticidadClass =
                            criticidad === 'alta'
                              ? 'matrix-cell--alta'
                              : criticidad === 'media'
                                ? 'matrix-cell--media'
                                : criticidad === 'baja'
                                  ? 'matrix-cell--baja'
                                  : ''

                          return (
                            <td
                              key={`${leaderKey}-${row.interfaceCode}-${column.code}`}
                              className={`matrix-cell ${
                                isDiagonal ? 'matrix-cell--diagonal' : isActiveInterface ? criticidadClass : ''
                              }`}
                              title={
                                isActiveInterface
                                  ? `${row.interfaceCode} | ${row.leaderCode} -> ${row.participantCode} | ${row.criticidad}`
                                  : isDiagonal
                                    ? 'Misma disciplina'
                                    : ''
                              }
                            >
                              {isActiveInterface ? row.interfaceCode : ''}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function polarPoint(angle: number, radius: number) {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  }
}

function hierarchy(data: GraphHierarchyData[], delimiter = '.') {
  let root: GraphHierarchyData | undefined
  const map = new Map<string, GraphHierarchyData>()

  data.forEach(function find(item) {
    const existing = map.get(item.name)
    if (existing) return existing

    const node = { ...item, children: item.children ?? [] }
    const index = item.name.lastIndexOf(delimiter)
    map.set(item.name, node)

    if (index >= 0) {
      const parent = find({ name: item.name.substring(0, index), children: [] })
      parent.children = parent.children ?? []
      parent.children.push(node)
      node.name = item.name.substring(index + 1)
    } else {
      root = node
    }

    return node
  })

  return root ?? { name: 'root', children: [] }
}

function buildHierarchyTree(data: GraphHierarchyData, parent: GraphHierarchyNode | null = null, depth = 0): GraphHierarchyNode {
  const node: GraphHierarchyNode = {
    data,
    parent,
    depth,
    children: [],
    incoming: [],
    outgoing: [],
  }

  node.children = (data.children ?? []).map((child) => buildHierarchyTree(child, node, depth + 1))
  return node
}

function getLeafNodes(node: GraphHierarchyNode): GraphHierarchyNode[] {
  if (!node.children.length) return [node]
  return node.children.flatMap(getLeafNodes)
}

function hierarchyNodeId(node: GraphHierarchyNode): string {
  return `${node.parent ? `${hierarchyNodeId(node.parent)}.` : ''}${node.data.name}`
}

function bilink(root: GraphHierarchyNode) {
  const leaves = getLeafNodes(root)
  const map = new Map(leaves.map((leaf) => [hierarchyNodeId(leaf), leaf]))

  for (const leaf of leaves) {
    leaf.incoming = []
    leaf.outgoing = (leaf.data.imports ?? [])
      .map((id) => {
        const target = map.get(id)
        return target ? ([leaf, target] as [GraphHierarchyNode, GraphHierarchyNode]) : null
      })
      .filter((item): item is [GraphHierarchyNode, GraphHierarchyNode] => Boolean(item))
  }

  for (const leaf of leaves) {
    for (const outgoing of leaf.outgoing) {
      outgoing[1].incoming.push(outgoing)
    }
  }

  return root
}

function buildGraphPath(source: GraphNode, target: GraphNode, radius: number) {
  const sourceInner = polarPoint(source.angle, radius * 0.58)
  const targetInner = polarPoint(target.angle, radius * 0.58)
  return `M ${source.x} ${source.y} C ${sourceInner.x} ${sourceInner.y}, ${targetInner.x} ${targetInner.y}, ${target.x} ${target.y}`
}

function GrafoView({
  response,
}: {
  response: UploadResponse | null
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  const graphData = useMemo(() => {
    const matrix = response?.matrix
    const sourceRows = response?.rows ?? []
    if (!matrix || sourceRows.length === 0) {
      return { nodes: [] as GraphNode[], links: [] as GraphLink[], counts: new Map<string, { incoming: number; outgoing: number }>() }
    }

    const graphItemsMap = new Map<string, GraphHierarchyData>()
    const linkMetadata = new Map<string, { criticidad: string; interfaceCode: string }>()
    const leaderGroupMap = new Map<string, { group: string; groupColor: string; groupTextColor: string }>()
    const participantGroupMap = new Map<string, { group: string; groupColor: string; groupTextColor: string }>()

    ;(matrix.rows ?? []).forEach((row) => {
      leaderGroupMap.set(`${row.leaderCode}__${row.leaderName}`, {
        group: row.group,
        groupColor: row.groupColor,
        groupTextColor: row.groupTextColor,
      })
    })

    ;(matrix.columns ?? []).forEach((column) => {
      participantGroupMap.set(`${column.code}__${column.name}`, {
        group: column.group,
        groupColor: column.groupColor,
        groupTextColor: column.groupTextColor,
      })
    })

    sourceRows.forEach((row) => {
      const leaderCode = String(row['DISCIPLINA'] ?? '').trim()
      const leaderName = String(row['DISCIPLINA_NOMBRE'] ?? '').trim()
      const participantCode = String(row['DISCIPLINA_PARTICIPANTE'] ?? '').trim()
      const participantName = String(row['DISCIPLINA_PARTICIPANTE_NOMBRE'] ?? '').trim()

      if (!leaderCode || !leaderName || !participantCode || !participantName) {
        return
      }

      const leaderMeta = leaderGroupMap.get(`${leaderCode}__${leaderName}`)
      const participantMeta = participantGroupMap.get(`${participantCode}__${participantName}`)
      const leaderGroup = leaderMeta?.group ?? 'Sin clasificar'
      const leaderPath = `RCI.${leaderGroup}.${leaderCode}`
      const participantGroup = participantMeta?.group ?? leaderGroup
      const participantPath = `RCI.${participantGroup}.${participantCode}`

      if (!graphItemsMap.has(leaderPath)) {
        graphItemsMap.set(leaderPath, {
          name: leaderPath,
          imports: [],
          group: leaderGroup,
          groupColor: leaderMeta?.groupColor ?? 'D8D2DC',
          groupTextColor: leaderMeta?.groupTextColor ?? '3B2051',
          code: leaderCode,
          label: leaderName,
        })
      }

      if (leaderPath !== participantPath) {
        if (!graphItemsMap.has(participantPath)) {
          graphItemsMap.set(participantPath, {
            name: participantPath,
            imports: [],
            group: participantGroup,
            groupColor: participantMeta?.groupColor ?? leaderMeta?.groupColor ?? 'D8D2DC',
            groupTextColor: participantMeta?.groupTextColor ?? leaderMeta?.groupTextColor ?? '3B2051',
            code: participantCode,
            label: participantName,
          })
        }

        graphItemsMap.get(leaderPath)!.imports = [
          ...(graphItemsMap.get(leaderPath)!.imports ?? []),
          participantPath,
        ]

        const linkKey = `${leaderPath}__${participantPath}`
        if (!linkMetadata.has(linkKey)) {
          linkMetadata.set(linkKey, {
            criticidad: String(row['CRITICIDAD'] ?? ''),
            interfaceCode: String(row['CODIGO INTERFAZ'] ?? ''),
          })
        }
      }
    })

    const hierarchicalRoot = bilink(buildHierarchyTree(hierarchy([{ name: 'RCI' }, ...graphItemsMap.values()])))
    const leaves = getLeafNodes(hierarchicalRoot).sort((a, b) => hierarchyNodeId(a).localeCompare(hierarchyNodeId(b)))

    const radius = 300
    const labelRadius = 352
    const nodes: GraphNode[] = leaves.map((leaf, index) => {
      const angle = (index / Math.max(leaves.length, 1)) * Math.PI * 2 - Math.PI / 2
      const point = polarPoint(angle, radius)
      const textPoint = polarPoint(angle, labelRadius)
      const isSecondHalf = angle > Math.PI / 2 || angle < -Math.PI / 2
      const angleDegrees = (angle * 180) / Math.PI

      return {
        id: hierarchyNodeId(leaf),
        label: leaf.data.label ?? leaf.data.name,
        code: leaf.data.code ?? leaf.data.name,
        group: leaf.data.group ?? leaf.parent?.data.name ?? 'Sin grupo',
        groupColor: leaf.data.groupColor ?? 'D8D2DC',
        groupTextColor: leaf.data.groupTextColor ?? '3B2051',
        angle,
        x: point.x,
        y: point.y,
        textX: textPoint.x,
        textY: textPoint.y,
        textAnchor: isSecondHalf ? 'end' : 'start',
        labelRotation: angleDegrees + (isSecondHalf ? 180 : 0),
      }
    })

    const links: GraphLink[] = leaves.flatMap((leaf) =>
      leaf.outgoing.map(([source, target]) => {
        const linkKey = `${hierarchyNodeId(source)}__${hierarchyNodeId(target)}`
        const metadata = linkMetadata.get(linkKey)
        return {
          sourceId: hierarchyNodeId(source),
          targetId: hierarchyNodeId(target),
          criticidad: metadata?.criticidad ?? '',
          interfaceCode: metadata?.interfaceCode ?? '',
        }
      })
    )

    const counts = new Map<string, { incoming: number; outgoing: number }>()
    nodes.forEach((node) => counts.set(node.id, { incoming: 0, outgoing: 0 }))
    links.forEach((link) => {
      counts.get(link.sourceId)!.outgoing += 1
      counts.get(link.targetId)!.incoming += 1
    })

    return { nodes, links, counts }
  }, [response])

  if (!response) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Grafo de Interfaces</h1>
          <p className="page-description">
            Esta ventana mostrara un grafo jerarquico del RCI despues de procesar el archivo cargado.
          </p>
        </div>

        <div className="placeholder-box">
          <div className="placeholder-tag">Sin datos cargados</div>
          <h2 className="hero-title">Primero carga un archivo en la ventana "Carga de RCI".</h2>
          <p className="placeholder-copy">
            Cuando el backend procese el Excel, aqui apareceran los nodos y relaciones entre disciplinas.
          </p>
        </div>
      </>
    )
  }

  if (graphData.nodes.length === 0) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Grafo de Interfaces</h1>
          <p className="page-description">
            Esta ventana muestra las relaciones jerarquicas entre las disciplinas del Registro de Control de Interfaces.
          </p>
        </div>

        <div className="placeholder-box">
          <div className="placeholder-tag">Sin grafo disponible</div>
          <h2 className="hero-title">No se encontraron relaciones suficientes para construir el grafo.</h2>
          <p className="placeholder-copy">
            Verifica que el archivo cargado tenga disciplinas lider y disciplinas participantes identificables.
          </p>
        </div>
      </>
    )
  }

  const hoveredIncoming = new Set(
    graphData.links.filter((link) => link.targetId === hoveredNodeId).map((link) => link.sourceId)
  )
  const hoveredOutgoing = new Set(
    graphData.links.filter((link) => link.sourceId === hoveredNodeId).map((link) => link.targetId)
  )

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Grafo de Interfaces</h1>
        <p className="page-description">
          Esta ventana muestra un grafo jerarquico de relaciones entre disciplinas lider y participantes a partir del
          RCI cargado.
        </p>
      </div>

      <section className="metric-grid metric-grid--three">
        <MetricCard
          title="Nodos"
          value={graphData.nodes.length}
          subtitle="Disciplinas presentes en el grafo"
          icon={GitBranch}
          tone="neutral"
        />
        <MetricCard
          title="Interfaces"
          value={response.totalInterfaces}
          subtitle="Interfaces procesadas desde el RCI"
          icon={BarChart3}
          tone="neutral"
        />
        <MetricCard
          title="Criticidad Alta"
          value={response.criticidadAlta}
          subtitle="Interfaces criticas"
          icon={ShieldAlert}
          tone="danger"
        />
      </section>

      <section className="panel-stack">
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <div className="chart-chip">Vista jerarquica</div>
              <h2 className="panel-title">Relaciones entre disciplinas</h2>
              <p className="panel-subtitle">
                Pasa el cursor sobre una disciplina para resaltar sus relaciones entrantes y salientes.
              </p>
            </div>
          </div>

          <div className="graph-wrap">
            <div className="graph-inline-legend">
              <div className="graph-inline-legend-title">Convenciones</div>
              <div className="graph-inline-legend-grid">
                <span className="graph-inline-chip graph-inline-chip--alta">Alta</span>
                <span className="graph-inline-chip graph-inline-chip--media">Media</span>
                <span className="graph-inline-chip graph-inline-chip--baja">Baja</span>
                <span className="graph-line-legend">
                  <span className="graph-line-sample graph-line-sample--solid" />
                  Entrantes
                </span>
                <span className="graph-line-legend">
                  <span className="graph-line-sample graph-line-sample--dotted" />
                  Salientes
                </span>
              </div>
            </div>
            <svg viewBox="-520 -520 1040 1040" className="graph-svg" aria-label="Grafo de interfaces">
              <g className="graph-links">
                {graphData.links.map((link, index) => {
                  const source = graphData.nodes.find((node) => node.id === link.sourceId)
                  const target = graphData.nodes.find((node) => node.id === link.targetId)
                  if (!source || !target) return null

                  const criticidad = link.criticidad.trim().toLowerCase()
                  const color =
                    criticidad === 'alta' ? '#F40B32' : criticidad === 'media' ? '#EFAA3A' : '#00AD14'
                  const isIncoming = hoveredNodeId === link.targetId
                  const isOutgoing = hoveredNodeId === link.sourceId
                  const isHovered = isIncoming || isOutgoing

                  return (
                    <path
                      key={`${link.sourceId}-${link.targetId}-${index}`}
                      d={buildGraphPath(source, target, 300)}
                      fill="none"
                      stroke={color}
                      strokeOpacity={hoveredNodeId ? (isHovered ? 0.9 : 0.08) : 0.22}
                      strokeWidth={isHovered ? 2.4 : 1.3}
                      strokeDasharray={isOutgoing ? '6 6' : undefined}
                    />
                  )
                })}
              </g>

              <g className="graph-nodes">
                {graphData.nodes.map((node) => {
                  const counts = graphData.counts.get(node.id) ?? { incoming: 0, outgoing: 0 }
                  const isHovered = hoveredNodeId === node.id
                  const incomingHighlighted = hoveredIncoming.has(node.id)
                  const outgoingHighlighted = hoveredOutgoing.has(node.id)
                  const textColor = isHovered
                    ? '#3B2051'
                    : incomingHighlighted
                      ? GRAPH_COLOR_IN
                      : outgoingHighlighted
                        ? GRAPH_COLOR_OUT
                        : undefined

                  return (
                    <g key={node.id}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={4.6}
                        fill={`#${node.groupColor}`}
                        stroke={isHovered ? '#3B2051' : '#FFFFFF'}
                        strokeWidth={isHovered ? 2 : 1}
                      />
                      <text
                        x={node.textX}
                        y={node.textY}
                        dy="0.31em"
                        textAnchor={node.textAnchor}
                        transform={`rotate(${node.labelRotation}, ${node.textX}, ${node.textY})`}
                        className={`graph-node-label ${isHovered ? 'is-hovered' : ''}`}
                        fill={textColor}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                      >
                        {node.label}
                        <title>{`${node.code} - ${node.label}\n${counts.outgoing} salientes\n${counts.incoming} entrantes`}</title>
                      </text>
                    </g>
                  )
                })}
              </g>
            </svg>
          </div>
        </div>
      </section>
    </>
  )
}

function countRowsByEstado(rows: RowItem[], expectedEstado: string) {
  return rows.filter((row) => String(row['ESTADO'] ?? '').trim().toLowerCase() === expectedEstado.toLowerCase()).length
}

export default function App() {
  const [active, setActive] = useState('Carga de RCI')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<UploadResponse | null>(null)
  const [selectedDiscipline, setSelectedDiscipline] = useState('todos')
  const [theme, setTheme] = useState<'night' | 'day'>('night')
  const themeClassName = theme === 'day' ? 'theme-night' : 'theme-day'

  const incidentItems = useMemo(() => navItems.filter((item) => item.group === 'Incidencias'), [])
  const documentItems = useMemo(() => navItems.filter((item) => item.group === 'Documentos'), [])

  const availableDisciplines = useMemo(
    () => (response?.disciplineSummary ?? []).map((item) => ({ code: item.code, name: item.name })),
    [response]
  )

  const filteredRows = useMemo(() => {
    const rows = response?.rows ?? []
    if (selectedDiscipline === 'todos') return rows
    return rows.filter((row) => String(row['DISCIPLINA'] ?? '').trim().toUpperCase() === selectedDiscipline)
  }, [response, selectedDiscipline])

  const summary = useMemo(() => {
    let alta = 0
    let media = 0
    let baja = 0

    filteredRows.forEach((row) => {
      const criticidad = String(row['CRITICIDAD'] ?? '').trim().toLowerCase()
      if (criticidad === 'alta') alta += 1
      else if (criticidad === 'media') media += 1
      else if (criticidad === 'baja') baja += 1
    })

    return {
      total: filteredRows.length,
      alta,
      media,
      baja,
      distribution: [
        { name: 'Alta', value: alta },
        { name: 'Media', value: media },
        { name: 'Baja', value: baja },
      ].filter((item) => item.value > 0),
    }
  }, [filteredRows])

  const stateSummary = useMemo(
    () => ({
      identificacion:
        countRowsByEstado(filteredRows, 'Identificacion') || countRowsByEstado(filteredRows, 'Identificación'),
      definicion: countRowsByEstado(filteredRows, 'Definicion') || countRowsByEstado(filteredRows, 'Definición'),
      resolucion: countRowsByEstado(filteredRows, 'Resolucion') || countRowsByEstado(filteredRows, 'Resolución'),
      cierre: countRowsByEstado(filteredRows, 'Cierre'),
    }),
    [filteredRows]
  )

  async function handleUpload() {
    if (!file) {
      setError('Selecciona un archivo Excel primero.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo procesar el archivo RCI.')
      }

      setResponse({
        ...data,
        distribution: Array.isArray(data?.distribution) ? data.distribution : [],
        disciplineSummary: Array.isArray(data?.disciplineSummary) ? data.disciplineSummary : [],
        matrix:
          data?.matrix && Array.isArray(data.matrix?.columns) && Array.isArray(data.matrix?.rows)
            ? data.matrix
            : { columns: [], rows: [] },
        rows: Array.isArray(data?.rows) ? data.rows : [],
      })
      setSelectedDiscipline('todos')
      setActive('Resumen RCI')
    } catch (err) {
      setResponse(null)
      setError(err instanceof Error ? err.message : 'Ocurrio un error inesperado.')
    } finally {
      setLoading(false)
    }
  }

  function renderActiveView() {
    switch (active) {
      case 'Carga de RCI':
        return (
          <UploadView
            file={file}
            loading={loading}
            error={error}
            onFileChange={setFile}
            onUpload={handleUpload}
          />
        )
      case 'Resumen RCI':
        return (
          <RciDashboardView
            response={response}
            selectedDiscipline={selectedDiscipline}
            availableDisciplines={availableDisciplines}
            summary={summary}
            stateSummary={stateSummary}
            onDisciplineChange={setSelectedDiscipline}
          />
        )
      case 'Matriz Interfaces':
        return <MatrizInterfacesView response={response} />
      case 'Grafo':
        return <GrafoView response={response} />
      default:
        return (
          <PlaceholderView
            title="Oficios"
            description="Esta ventana queda reservada para la gestion documental relacionada con el control de interfaces."
          />
        )
    }
  }

  return (
    <div className={`app-shell ${themeClassName}`}>
      <aside className="sidebar">
        <div>
          <div className="brand-block">
            <div className="brand-badge">CB</div>
            <div className="brand-name">CurrieBrown</div>
          </div>

          <div className="sidebar-group">
            <p className="sidebar-group-title">Incidencias</p>
            <div className="sidebar-nav">
              {incidentItems.map((item) => (
                <SidebarButton
                  key={item.label}
                  item={item}
                  active={active === item.label}
                  onClick={() => setActive(item.label)}
                />
              ))}
            </div>
          </div>

          <div className="sidebar-group">
            <p className="sidebar-group-title">Documentos</p>
            <div className="sidebar-nav">
              {documentItems.map((item) => (
                <SidebarButton
                  key={item.label}
                  item={item}
                  active={active === item.label}
                  onClick={() => setActive(item.label)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="user-card">
          <div className="user-avatar">
            <User size={20} />
          </div>
          <div>
            <p className="user-name">Daniel Cortes</p>
            <p className="user-role">Administrador</p>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <div className="topbar">
          <button className="menu-button">
            <Menu size={18} />
            Menu
          </button>
          <button
            className="theme-button"
            onClick={() => setTheme((current) => (current === 'night' ? 'day' : 'night'))}
            title={theme === 'night' ? 'Cambiar a vista de dia' : 'Cambiar a vista de noche'}
            aria-label={theme === 'night' ? 'Cambiar a vista de dia' : 'Cambiar a vista de noche'}
          >
            {theme === 'night' ? <Moon size={20} /> : <SunMedium size={20} />}
          </button>
        </div>

        <div className="content">{renderActiveView()}</div>
      </main>
    </div>
  )
}
