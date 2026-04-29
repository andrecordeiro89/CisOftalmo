import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pdfPath = path.resolve(__dirname, '..', 'grade', 'processo_cirurgico_exemplo.pdf')
const data = new Uint8Array(await fs.readFile(pdfPath))

const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

const pdf = await pdfjsLib.getDocument({ data }).promise
console.log('pages:', pdf.numPages)

const needles = [
  'Paciente',
  'CPF',
  'Nascimento',
  'Data',
  'Olho',
  'Hospital',
  'Médico',
  'Instrumentador',
  'Circulante',
  'ANESTESIA',
  'CHECKLIST',
  'TERMO',
  'TESTEMUNHA',
  'CARIMBO',
]

for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i)
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()
  console.log('\n--- page', i, 'size', { w: viewport.width, h: viewport.height }, 'items', content.items.length)

  for (const it of content.items) {
    const str = (it.str || '').trim()
    if (!str) continue
    const hit = needles.find(n => str.toLowerCase().includes(n.toLowerCase()))
    if (!hit) continue
    const [a, b, c, d, e, f] = it.transform
    console.log(JSON.stringify({ page: i, text: str, x: e, y: f, w: it.width, h: it.height }))
  }
}
