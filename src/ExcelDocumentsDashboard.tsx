import { useState } from 'react'

type RowItem = Record<string, unknown>

type UploadResponse = {
  totalInterfaces: number
  criticidadAlta: number
  criticidadMedia: number
  criticidadBaja: number
  rows: RowItem[]
}

export default function ExcelDocumentsDashboard() {
  const [file, setFile] = useState<File | null>(null)
  const [response, setResponse] = useState<UploadResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload() {
    if (!file) {
      setError('Selecciona un archivo primero')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('https://dashboard-backend-bbid.onrender.com/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Ocurrió un error al procesar el archivo')
      }

      setResponse(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setResponse(null)
    } finally {
      setLoading(false)
    }
  }

  const headers =
    response?.rows && response.rows.length > 0
      ? Object.keys(response.rows[0])
      : []

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>Dashboard RCI</h1>
      <p>Sube el Registro de Control de Interfaces para analizar la criticidad.</p>

      <div style={{ marginBottom: 20 }}>
        <input
          type="file"
          accept=".xlsx,.xlsm"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          style={{
            marginLeft: 12,
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Procesando...' : 'Subir archivo'}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: 12,
            border: '1px solid #f5c2c7',
            backgroundColor: '#f8d7da',
            color: '#842029',
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      )}

      {response && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <Card title="Interfaces totales" value={response.totalInterfaces} color="#0d6efd" />
            <Card title="Criticidad alta" value={response.criticidadAlta} color="#dc3545" />
            <Card title="Criticidad media" value={response.criticidadMedia} color="#fd7e14" />
            <Card title="Criticidad baja" value={response.criticidadBaja} color="#198754" />
          </div>

          <div>
            <h2>Tabla RCI</h2>

            {response.rows.length === 0 ? (
              <p>No hay datos en el archivo.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    borderCollapse: 'collapse',
                    width: '100%',
                    minWidth: 900,
                  }}
                >
                  <thead>
                    <tr>
                      {headers.map((header) => (
                        <th key={header} style={thStyle}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {response.rows.map((row, index) => (
                      <tr key={index}>
                        {headers.map((header) => (
                          <td key={header} style={tdStyle}>
                            {String(row[header] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Card({
  title,
  value,
  color,
}: {
  title: string
  value: number
  color: string
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 10,
        backgroundColor: '#f8f9fa',
        borderLeft: `8px solid ${color}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ fontSize: 14, color: '#555' }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 'bold', marginTop: 8 }}>{value}</div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '10px',
  backgroundColor: '#f2f2f2',
  textAlign: 'left',
}

const tdStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '10px',
}