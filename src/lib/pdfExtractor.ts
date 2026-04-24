// PDF text extraction using pdf.js
// Parses the AVYX reception form and extracts patient header fields

export interface ExtractedPatientData {
  name?: string
  cpf?: string
  birthDate?: string
  motherName?: string
  rawText?: string
}

function normalizeCPF(raw: string): string {
  return raw.replace(/\D/g, '')
}

function normalizeDate(raw: string): string {
  // Accepts DD/MM/YYYY or DD/MM/YY
  const parts = raw.trim().split('/')
  if (parts.length === 3) {
    const [d, m, y] = parts
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return raw
}

export async function extractPatientFromPDF(file: File): Promise<ExtractedPatientData> {
  // Dynamically import pdfjs-dist to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist')

  // Set the worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: unknown) => (item as { str: string }).str)
      .join(' ')
    fullText += pageText + '\n'
  }

  return parsePatientData(fullText)
}

function parsePatientData(text: string): ExtractedPatientData {
  const result: ExtractedPatientData = { rawText: text }

  // Strategy: look for known labels and capture the value after them.
  // The AVYX PDF layout places values on the same or next line after the label.

  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Paciente:
    if (/^Paciente[:\s]/i.test(line)) {
      const inline = line.replace(/^Paciente[:\s]*/i, '').trim()
      if (inline.length > 2) {
        result.name = inline
      } else if (lines[i + 1] && !/^(CPF|D\.N|Nome da Mãe)/i.test(lines[i + 1])) {
        result.name = lines[i + 1].trim()
      }
    }

    // CPF:
    if (/^CPF[:\s]/i.test(line)) {
      const inline = line.replace(/^CPF[:\s]*/i, '').trim()
      const cpfMatch = inline.match(/\d[\d.\-\/]+\d/)
      if (cpfMatch) {
        result.cpf = normalizeCPF(cpfMatch[0])
      } else if (lines[i + 1]) {
        const nextMatch = lines[i + 1].match(/\d[\d.\-\/]+\d/)
        if (nextMatch) result.cpf = normalizeCPF(nextMatch[0])
      }
    }

    // D.N: (data de nascimento)
    if (/^D\.?N\.?[:\s]/i.test(line)) {
      const inline = line.replace(/^D\.?N\.?[:\s]*/i, '').trim()
      const dateMatch = inline.match(/\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}/)
      if (dateMatch) {
        result.birthDate = normalizeDate(dateMatch[0])
      } else if (lines[i + 1]) {
        const nextDate = lines[i + 1].match(/\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}/)
        if (nextDate) result.birthDate = normalizeDate(nextDate[0])
      }
    }

    // Nome da Mãe:
    if (/^Nome da M[aã]e[:\s]/i.test(line)) {
      const inline = line.replace(/^Nome da M[aã]e[:\s]*/i, '').trim()
      if (inline.length > 2) {
        result.motherName = inline
      } else if (lines[i + 1] && !/^(Paciente|CPF|D\.N)/i.test(lines[i + 1])) {
        result.motherName = lines[i + 1].trim()
      }
    }
  }

  // Fallback: scan the entire text for CPF pattern if not found above
  if (!result.cpf) {
    const cpfMatch = text.match(/\b\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}\b/)
    if (cpfMatch) result.cpf = normalizeCPF(cpfMatch[0])
  }

  // Fallback for date
  if (!result.birthDate) {
    const dateMatch = text.match(/\b(\d{2}\/\d{2}\/\d{4})\b/)
    if (dateMatch) result.birthDate = normalizeDate(dateMatch[1])
  }

  return result
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }
  return cpf
}

export function formatDate(isoDate: string): string {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}
