function escapeCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value)
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replaceAll('"', '""')}"`
  }
  return raw
}

interface CSVExportProps {
  filename: string
  rows: Array<Record<string, unknown>>
  label?: string
}

export default function CSVExport({ filename, rows, label = 'Export CSV' }: CSVExportProps) {
  const handleExport = () => {
    if (rows.length === 0) return
    const headers = Object.keys(rows[0])
    const lines = [
      headers.map(escapeCell).join(','),
      ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(',')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button type="button" className="btn-secondary" onClick={handleExport} disabled={rows.length === 0}>
      {label}
    </button>
  )
}
