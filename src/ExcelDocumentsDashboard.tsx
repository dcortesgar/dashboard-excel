import { useState } from 'react'

type DistributionItem = {
  name: string
  value: number
}

type RowItem = Record<string, unknown>

type UploadResponse = {
  totalDocuments: number
  distribution: DistributionItem[]
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
      <h1>Dashboard desde Excel</h1>
      <p>Selecciona un archivo Excel y genera el tablero.</p>

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
              marginBottom: 24,
              padding: 16,
              border: '1px solid #ddd',
              borderRadius: 8,
              maxWidth: 300,
              backgroundColor: '#f9f9f9',
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18 }}>Total de documentos</h2>
            <p style={{ fontSize: 28, fontWeight: 'bold', margin: '10px 0 0 0' }}>
              {response.totalDocuments}
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h2>Distribución por estatus</h2>
            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                maxWidth: 500,
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Estatus</th>
                  <th style={thStyle}>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {response.distribution.map((item) => (
                  <tr key={item.name}>
                    <td style={tdStyle}>{item.name}</td>
                    <td style={tdStyle}>{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h2>Tabla de documentos</h2>

            {response.rows.length === 0 ? (
              <p>No hay datos en el archivo.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    borderCollapse: 'collapse',
                    width: '100%',
                    minWidth: 700,
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