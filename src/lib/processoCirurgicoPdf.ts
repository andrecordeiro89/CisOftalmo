import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { SAFETY_CHECKLIST } from '@/lib/surgicalDocumentModel'

type ConsentTerm = {
  nome: string
  cpf: string
  data_nascimento: string
  sexo: string
  medico: string
  hospital: string
  cirurgia: string
  data: string
  hora: string
  olho: string
  ANESTESIA: string
  INSTRUMENTADOR: string
  CIRCULANTE: string
}

type Signatures = {
  doctor: string
  patient: string
  witness: string
}

type FormState = Record<string, unknown>

const A4 = { w: 595.303937007874, h: 841.889763779528 }

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function bool(v: unknown): boolean {
  return v === true
}

function yesNo(v: unknown): '' | 'sim' | 'nao' {
  return v === 'sim' || v === 'nao' ? v : ''
}

function toBytesFromDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:(image\/png|image\/jpeg);base64,(.+)$/)
  if (!m) return null
  const bin = atob(m[2])
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function safeText(v: string) {
  return (v || '').replace(/\s+/g, ' ').trim()
}

export async function buildProcessoCirurgicoPdf(input: {
  term: ConsentTerm
  signatures: Signatures
  formState: FormState
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const textColor = rgb(0, 0, 0)
  const borderColor = rgb(0.75, 0.78, 0.82)
  const muted = rgb(0.25, 0.27, 0.3)

  const wrapLines = (text: string, maxWidth: number, size: number) => {
    const words = safeText(text).split(' ').filter(Boolean)
    const lines: string[] = []
    let cur = ''
    const pushCur = () => {
      const v = cur.trim()
      if (v) lines.push(v)
      cur = ''
    }
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        cur = next
        continue
      }
      if (!cur) {
        let chunk = ''
        for (const ch of w) {
          const nextChunk = chunk + ch
          if (font.widthOfTextAtSize(nextChunk, size) <= maxWidth) {
            chunk = nextChunk
            continue
          }
          if (chunk) lines.push(chunk)
          chunk = ch
        }
        if (chunk) lines.push(chunk)
        cur = ''
        continue
      }
      pushCur()
      cur = w
    }
    pushCur()
    return lines
  }

  const drawHeader = (page: any, title: string) => {
    const size = 14
    const w = page.getWidth()
    const y = page.getHeight() - 56
    const textWidth = fontBold.widthOfTextAtSize(title, size)
    page.drawText(title, { x: Math.max(24, (w - textWidth) / 2), y, size, font: fontBold, color: textColor })
    page.drawLine({ start: { x: 36, y: y - 10 }, end: { x: w - 36, y: y - 10 }, thickness: 1, color: borderColor })
    return y - 26
  }

  const drawField = (
    page: any,
    label: string,
    value: string,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    page.drawRectangle({ x, y: y - h, width: w, height: h, borderColor, borderWidth: 1 })
    page.drawText(label, { x: x + 6, y: y - 14, size: 8, font: fontBold, color: muted })
    page.drawText(safeText(value || ''), { x: x + 6, y: y - 28, size: 10, font, color: textColor, maxWidth: w - 12 })
  }

  const drawMultilineBox = (
    page: any,
    label: string,
    value: string,
    x: number,
    y: number,
    w: number,
    h: number,
    size = 10
  ) => {
    page.drawRectangle({ x, y: y - h, width: w, height: h, borderColor, borderWidth: 1 })
    page.drawText(label, { x: x + 6, y: y - 14, size: 8, font: fontBold, color: muted })
    page.drawText((value || '').trim(), {
      x: x + 6,
      y: y - 28,
      size,
      font,
      color: textColor,
      maxWidth: w - 12,
      lineHeight: Math.max(11, size + 2),
    })
  }

  const drawCheckbox = (page: any, x: number, y: number, label: string, checked: boolean) => {
    const s = 10
    page.drawRectangle({ x, y: y - s, width: s, height: s, borderColor, borderWidth: 1 })
    if (checked) page.drawText('X', { x: x + 2.2, y: y - 8.5, size: 10, font: fontBold, color: textColor })
    page.drawText(label, { x: x + 14, y: y - 8.5, size: 10, font, color: textColor, maxWidth: page.getWidth() - x - 24 })
  }

  const drawYesNoRow = (
    page: any,
    x: number,
    y: number,
    label: string,
    v: '' | 'sim' | 'nao',
    opts?: { rightLimitX?: number }
  ) => {
    const rightLimitX = opts?.rightLimitX ?? page.getWidth() - 24
    const labelMax = Math.max(140, rightLimitX - x - 160)
    const lines = wrapLines(label, labelMax, 9)
    for (let i = 0; i < lines.length; i++) {
      page.drawText(lines[i], { x, y: y - 10 - i * 12, size: 9, font, color: textColor })
    }
    const box = (bx: number, text: string, checked: boolean) => {
      page.drawRectangle({ x: bx, y: y - 12, width: 10, height: 10, borderColor, borderWidth: 1 })
      if (checked) page.drawText('X', { x: bx + 2.2, y: y - 10.5, size: 10, font: fontBold, color: textColor })
      page.drawText(text, { x: bx + 14, y: y - 10.5, size: 9, font, color: textColor })
    }
    box(rightLimitX - 116, 'Sim', v === 'sim')
    box(rightLimitX - 56, 'Não', v === 'nao')
    return Math.max(18, lines.length * 12 + 6)
  }

  const drawSignatureBox = async (
    page: any,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    dataUrl: string
  ) => {
    page.drawRectangle({ x, y: y - h, width: w, height: h, borderColor, borderWidth: 1 })
    page.drawText(label, { x: x + 6, y: y - 14, size: 8, font: fontBold, color: muted })
    const bytes = toBytesFromDataUrl(dataUrl || '')
    if (!bytes) return
    const png = await pdfDoc.embedPng(bytes)
    const imgW = png.width
    const imgH = png.height
    const maxW = w - 12
    const maxH = h - 22
    const scale = Math.min(maxW / imgW, maxH / imgH)
    const dw = imgW * scale
    const dh = imgH * scale
    page.drawImage(png, { x: x + 6 + (maxW - dw) / 2, y: y - h + 6 + (maxH - dh) / 2, width: dw, height: dh })
  }

  const term = input.term
  const fs = input.formState || {}
  const sig = input.signatures

  {
    const page = pdfDoc.addPage([A4.w, A4.h])
    let y = drawHeader(page, 'TERMO DE CONSENTIMENTO E ENTENDIMENTO PRÉ-CIRÚRGICO')
    const margin = 36
    const gap = 10
    const rowH = 44
    const colW = (page.getWidth() - margin * 2 - gap * 2) / 3
    drawField(page, 'Paciente', term.nome, margin, y, colW, rowH)
    drawField(page, 'CPF', term.cpf, margin + colW + gap, y, colW, rowH)
    drawField(page, 'Nascimento', term.data_nascimento, margin + (colW + gap) * 2, y, colW, rowH)
    y -= rowH + 16

    const paragraphs = [
      `Eu, ${term.nome || '________'}, portador do ${term.cpf || '________'}, ${term.data_nascimento || '____/____/____'}, aceito voluntária e plenamente o tratamento médico cirúrgico proposto e solicitado pelo ${term.medico || '________'}, e sua equipe, para tratar da minha saúde atual conforme julgarem necessário, em procedimento cirúrgico a ser realizado no ${term.hospital || '________'} no dia ${term.data || '____/____/____'}.`,
      `Tenho pleno conhecimento e estou ciente de que o procedimento cirúrgico foi planejado especificamente para o meu caso e, de maneira voluntária, consinto e autorizo sua realização, sendo este procedimento ${term.cirurgia || '________'} em ${term.olho || '____'}.`,
      'Entendo que meu médico possa encontrar diferentes condições que requeiram um procedimento adicional ou até mesmo diferente do planejado, portanto, autorizo sua realização na medida que julgarem necessária, deste novo e/ou adicional procedimento.',
      'Estou ciente de que todo procedimento pelo qual passarei terá unicamente a finalidade e/ou tentativa de obter melhora das minhas condições atuais, não havendo garantia de resultado e/ou cura.',
      'Tenho pleno conhecimento e me foi explicado que nesta cirurgia, como em todas as outras, podem ocorrer, embora raramente, complicações e/ou risco de infecção, que, dependendo da evolução, podem acarretar um estado pior do que me encontro atualmente. Do mesmo modo, pode haver risco e danos na manutenção da minha condição atual sem a realização do procedimento proposto.',
      'Declaro estar ciente de que a lente intraocular disponibilizada pelo Sistema Único de Saúde (SUS) possui finalidade exclusiva de tratamento da catarata, sendo uma lente monofocal, não destinada à correção completa de erros refrativos, podendo haver necessidade de uso de óculos após o procedimento. Fui devidamente informado(a) de que, uma vez implantada, essa lente é permanente, não sendo indicada sua substituição por outra de tecnologia superior (lente premium), exceto em situações médicas específicas avaliadas pelo oftalmologista, especialmente no período pós-operatório imediato.',
      'Todas as minhas dúvidas sobre o ato operatório, possíveis complicações e resultados foram satisfatoriamente esclarecidas em consultório pelo meu médico oftalmologista, tendo eu plena oportunidade de cancelar a cirurgia programada.',
      'Estou informado(a) sobre a necessidade de exames periódicos e cuidados pós-operatórios, devendo suspender medicações somente por ordem médica e não fazer uso de qualquer medicação por conta própria sem autorização prévia do médico.',
    ]

    const blockX = margin
    const blockW = page.getWidth() - margin * 2
    for (const p of paragraphs) {
      const lines = wrapLines(p, blockW, 10)
      for (const ln of lines) {
        page.drawText(ln, { x: blockX, y, size: 10, font, color: textColor })
        y -= 14
      }
      y -= 8
      if (y < 220) break
    }

    const sigY = 170
    const sigW = (page.getWidth() - margin * 2 - gap * 2) / 3
    await drawSignatureBox(page, margin, sigY, sigW, 110, 'PACIENTE', sig.patient)
    await drawSignatureBox(page, margin + sigW + gap, sigY, sigW, 110, 'TESTEMUNHA', sig.witness)
    await drawSignatureBox(page, margin + (sigW + gap) * 2, sigY, sigW, 110, 'CARIMBO MÉDICO', sig.doctor)
  }

  {
    const page = pdfDoc.addPage([A4.w, A4.h])
    let y = drawHeader(page, 'FICHA DE TRIAGEM PRÉ CIRÚRGICA PARA CIRURGIA DE FACOEMULSIFICAÇÃO')
    const margin = 36
    const gap = 10
    const fieldH = 44
    const col2 = (page.getWidth() - margin * 2 - gap) / 2
    drawField(page, 'Nome do paciente', term.nome, margin, y, col2, fieldH)
    drawField(page, 'Data da cirurgia', term.data, margin + col2 + gap, y, col2, fieldH)
    y -= fieldH + 12
    drawField(page, 'PA', str(fs['triagem_pa']), margin, y, col2, fieldH)
    const sub = (col2 - gap) / 2
    drawField(page, 'Hora', str(fs['triagem_hora']), margin + col2 + gap, y, sub, fieldH)
    drawField(page, 'HGT', str(fs['triagem_hgt']), margin + col2 + gap + sub + gap, y, sub, fieldH)
    y -= fieldH + 14

    page.drawText('Alergias', { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
    y -= 14
    y -= drawYesNoRow(page, margin, y, 'Possui alergias?', yesNo(fs['triagem_alergias'])) + 2
    drawField(page, 'A que?', str(fs['triagem_alergias_que']), margin, y, page.getWidth() - margin * 2, fieldH)
    y -= fieldH + 18

    page.drawText('Jejum / Acompanhante', { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
    y -= 14
    drawCheckbox(
      page,
      margin,
      y,
      'Paciente confirmou jejum e estar acompanhado de um maior de idade que se responsabiliza pelo pós-operatório. (ok)',
      bool(fs['triagem_jejum_ok'])
    )
    y -= 30

    page.drawText('Patologias', { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
    y -= 14
    y -= drawYesNoRow(page, margin, y, 'HAS', yesNo(fs['triagem_has']))
    y -= drawYesNoRow(page, margin, y, 'DM', yesNo(fs['triagem_dm']))
    y -= drawYesNoRow(page, margin, y, 'Disfunção cardíaca', yesNo(fs['triagem_cardio']))
    y -= drawYesNoRow(page, margin, y, 'Usa anti-coagulante', yesNo(fs['triagem_anticoag'])) + 4
    drawMultilineBox(page, 'Outras', str(fs['triagem_outras']), margin, y, page.getWidth() - margin * 2, 110)
    y -= 126

    await drawSignatureBox(page, margin, 170, page.getWidth() - margin * 2, 110, 'ASSINATURA DO AVALIADOR', str(fs['triagem_assinatura_avaliador']))
  }

  {
    const page = pdfDoc.addPage([A4.h, A4.w])
    let y = drawHeader(page, 'PRESCRIÇÃO MÉDICA / ASSINATURA — RELATÓRIO MÉDICO')
    const margin = 36
    const gap = 10
    const col2 = (page.getWidth() - margin * 2 - gap) / 2
    const fieldH = 44
    drawField(page, 'Hospital', term.hospital, margin, y, col2, fieldH)
    drawField(page, 'Data da cirurgia', term.data, margin + col2 + gap, y, col2, fieldH)
    y -= fieldH + 12
    drawField(page, 'Nome do paciente', term.nome, margin, y, col2, fieldH)
    drawField(page, 'CPF', term.cpf, margin + col2 + gap, y, col2, fieldH)
    y -= fieldH + 12
    drawField(page, 'Data nascimento', term.data_nascimento, margin, y, col2, fieldH)
    drawField(page, 'Olho a ser operado', term.olho, margin + col2 + gap, y, col2, fieldH)
    y -= fieldH + 18

    const defaultPrescText = [
      '1 — JEJUM VO. (*MANTER*)',
      `Pós operatório imediato de facoemulsificação com implante de lente intra ocular dobrável em olho ${term.olho || '____'} sem sidel. LIO tópica. Sem sinais de infecção. Paciente segue de Alta, com retorno agendado.`,
      'Orientado quanto a sinais de alerta e entregue orientações pós operatório e telefone de SOS.',
      '2 — AFERIÇÃO DE SSVV E ESTADO CLÍNICO GERAL. (*VERIFICAR*)',
      '3 — AFERIÇÃO (GLICEMIA CAPILAR) COMUNICAR SE MAIOR QUE 200. (*VERIFICAR*)',
      '4 — HIGIENIZAÇÃO DAS MÃOS A CADA 30 MIN. (*PROMOVER*)',
      `5 — Fenilefrina colírio 10%: pingar uma gota no olho ${term.olho || '____'}.`,
      '5 — Diazepan 5 mg CP VO 30 min antes do procedimento.',
      `6 — Colírio tropicamida 0,1% (uso ocular): 1 gt de 5/5 min no olho ${term.olho || '____'} até o procedimento.`,
      '7 — Diamox 250 mg: 1 CP VO após a cirurgia.',
    ].join('\n\n')

    const prescText = (str(fs['presc_rotina_texto']) || defaultPrescText).trim()

    page.drawRectangle({ x: margin, y: y - 170, width: page.getWidth() - margin * 2, height: 170, borderColor, borderWidth: 1 })
    let ty = y - 16
    const rawBlocks = prescText.split(/\n{2,}/).map(s => s.trim()).filter(Boolean)
    for (const block of rawBlocks) {
      const lines = wrapLines(block, page.getWidth() - margin * 2 - 16, 9)
      for (const ln of lines) {
        page.drawText(ln, { x: margin + 8, y: ty, size: 9, font, color: textColor })
        ty -= 12
      }
      ty -= 6
      if (ty < y - 170 + 10) break
    }
    y -= 186

    drawMultilineBox(page, 'Evolução clínica (editável)', str(fs['presc_evolucao']), margin, y, page.getWidth() - margin * 2, 120)
    y -= 136

    const boxW = (page.getWidth() - margin * 2 - gap) / 2
    await drawSignatureBox(page, margin, 140, boxW, 100, 'Carimbo do médico (1)', str(fs['presc_carimbo_1']))
    await drawSignatureBox(page, margin + boxW + gap, 140, boxW, 100, 'Carimbo do médico (2)', str(fs['presc_carimbo_2']))
  }

  {
    const page = pdfDoc.addPage([A4.w, A4.h])
    let y = drawHeader(page, 'CHECKLIST DE CIRURGIA SEGURA — CIRURGIA DE CATARATA')
    const margin = 36
    const rightW = 160
    const rightX = page.getWidth() - margin - rightW
    const leftRightLimitX = rightX - 12
    drawField(page, 'Data', term.data, page.getWidth() - margin - rightW, y + 10, rightW, 40)
    drawField(page, 'Olho', term.olho, page.getWidth() - margin - rightW, y - 40, rightW, 40)
    y -= 26

    const sections = SAFETY_CHECKLIST.slice(0, 2)
    for (const s of sections) {
      page.drawText(s.title, { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
      y -= 18
      for (const it of s.items) {
        y -= drawYesNoRow(page, margin, y, it.label, yesNo(fs[`safety_${s.id}_${it.id}`]), { rightLimitX: leftRightLimitX })
      }
      y -= 8
    }
  }

  {
    const page = pdfDoc.addPage([A4.w, A4.h])
    let y = drawHeader(page, 'CHECKLIST DE CIRURGIA SEGURA — CIRURGIA DE CATARATA (continuação)')
    const margin = 36

    const sections = SAFETY_CHECKLIST.slice(2)
    for (const s of sections) {
      page.drawText(s.title, { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
      y -= 18
      for (const it of s.items) {
        y -= drawYesNoRow(page, margin, y, it.label, yesNo(fs[`safety_${s.id}_${it.id}`]))
      }
      y -= 8
    }

    const gap = 10
    const boxW = (page.getWidth() - margin * 2 - gap) / 2
    await drawSignatureBox(page, margin, 160, boxW, 110, 'Assinatura — médico', str(fs['checklist_sig_medico']))
    await drawSignatureBox(page, margin + boxW + gap, 160, boxW, 110, 'Assinatura — circulante', str(fs['checklist_sig_circulante']))
  }

  {
    const page = pdfDoc.addPage([A4.w, A4.h])
    let y = drawHeader(page, 'REGISTRO CIRÚRGICO')
    const margin = 36
    const gap = 10
    const col2 = (page.getWidth() - margin * 2 - gap) / 2
    const fieldH = 44
    drawField(page, 'Nome do paciente', term.nome, margin, y, col2, fieldH)
    drawField(page, 'Data nascimento', term.data_nascimento, margin + col2 + gap, y, col2, fieldH)
    y -= fieldH + 12
    drawField(page, 'CPF', term.cpf, margin, y, col2, fieldH)
    drawField(page, 'Data da cirurgia', term.data, margin + col2 + gap, y, col2, fieldH)
    y -= fieldH + 16

    page.drawText('Equipe / Procedimento', { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
    y -= 14
    drawField(page, 'Operador', term.medico, margin, y, col2, fieldH)
    drawField(page, 'Instrumentador', term.INSTRUMENTADOR, margin + col2 + gap, y, col2, fieldH)
    y -= fieldH + 10
    drawField(page, 'Anestesista', str(fs['cir_anestesista']), margin, y, col2, fieldH)
    drawField(page, 'Tipo anestesia', term.ANESTESIA, margin + col2 + gap, y, col2, fieldH)
    y -= fieldH + 10
    drawField(page, 'Olho a ser operado', term.olho, margin, y, col2, fieldH)
    drawMultilineBox(page, 'Etiqueta LIO', str(fs['cir_etiqueta_lio']), margin + col2 + gap, y, col2, fieldH)
    y -= fieldH + 10
    drawField(page, 'Tipo de operação', term.cirurgia, margin, y, col2, fieldH)
    drawMultilineBox(page, 'Observação / Diagnóstico', 'Diagnóstico pré-operatório: Catarata\nDiagnóstico pós-operatório: Pseudofacia', margin + col2 + gap, y, col2, fieldH, 9)
    y -= fieldH + 16

    page.drawText('Intercorrências no ato cirúrgico', { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
    y -= 16
    drawCheckbox(page, margin, y, 'Não', bool(fs['cir_intercorrencia_nao']))
    drawCheckbox(page, margin + 120, y, 'Sim', bool(fs['cir_intercorrencia_sim']))
    y -= 24
    drawMultilineBox(page, 'Qual?', str(fs['cir_intercorrencia_qual']), margin, y, page.getWidth() - margin * 2, 70)
    y -= 86

    const defaultDescOpText = [
      'Assepsia/antissepsia + campos estéreis;',
      'Incisão principal + paracenteses;',
      'Azul de tripan na câmara anterior para colorir saco capsular;',
      'Xilocaína diluída com adrenalina na câmara anterior;',
      'Metilcelulose à 2% na câmara anterior;',
      'Capsulorrexis;',
      'Hidrodissécação + hidrodelineação do núcleo;',
      'Facoemulsificação do núcleo;',
      'Aspiração de restos corticais;',
      'Implante de LIO no saco capsular (in the bag);',
      'Aspiração de viscoelástico + sutura aquosa;',
      'Cefuroxima na câmara anterior + Vigamox tópico;',
      'Protetor acrílico.',
    ].join('\n')

    const descText = (str(fs['descop_descricao_operacao']) || defaultDescOpText).trim()
    const descH = 130
    drawMultilineBox(page, 'Descrição da operação', descText, margin, y, page.getWidth() - margin * 2, descH, 8.5)
    y -= descH + 14

    const obsH = 80
    drawMultilineBox(page, 'Observações adicionais', str(fs['descop_observacoes']), margin, y, page.getWidth() - margin * 2, obsH, 9)

    const gapSig = 10
    const sigW = (page.getWidth() - margin * 2 - gapSig * 2) / 3
    await drawSignatureBox(page, margin, 110, sigW, 90, 'Carimbo médico (1)', str(fs['descop_carimbo_1']))
    await drawSignatureBox(page, margin + sigW + gapSig, 110, sigW, 90, 'Carimbo médico (2)', str(fs['descop_carimbo_2']))
    await drawSignatureBox(page, margin + (sigW + gapSig) * 2, 110, sigW, 90, 'Carimbo médico (3)', str(fs['descop_carimbo_3']))
  }

  {
    const page = pdfDoc.addPage([A4.w, A4.h])
    let y = drawHeader(page, 'RELATÓRIO DE ENFERMAGEM — INTRAOPERATÓRIO (CIRURGIA DE CATARATA)')
    const margin = 36
    const gap = 10
    const col2 = (page.getWidth() - margin * 2 - gap) / 2
    const fieldH = 40
    drawField(page, 'Hora de início', str(fs['enf_inicio']), margin, y, col2, fieldH)
    drawField(page, 'Hora de término', str(fs['enf_termino']), margin + col2 + gap, y, col2, fieldH)
    y -= fieldH + 10
    drawField(page, 'Sexo', str(fs['enf_sexo']) || term.sexo, margin, y, col2, fieldH)
    drawField(page, 'Olho operado', term.olho, margin + col2 + gap, y, col2, fieldH)
    y -= fieldH + 10
    drawField(page, 'Instrumentador', term.INSTRUMENTADOR, margin, y, col2, fieldH)
    drawField(page, 'Circulante de sala', term.CIRCULANTE, margin + col2 + gap, y, col2, fieldH)
    y -= fieldH + 16

    page.drawText('Procedimento intraoperatório', { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
    y -= 14
    drawField(page, 'Tipo de anestesia', term.ANESTESIA, margin, y, col2, fieldH)
    drawCheckbox(page, margin + col2 + gap, y - 2, 'Realizado sedação', bool(fs['enf_sedacao_realizada']))
    y -= fieldH + 10
    drawMultilineBox(page, 'Etiqueta LIO implantada', str(fs['enf_etiqueta_lio']), margin, y, page.getWidth() - margin * 2, 60, 9)
    y -= 76

    page.drawText('Técnica cirúrgica', { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
    y -= 14
    drawCheckbox(page, margin, y, 'Facoemulsificação', bool(fs['enf_tecnica_faco']))
    y -= 18
    drawCheckbox(page, margin, y, 'EEC', bool(fs['enf_tecnica_eec']))
    y -= 20
    drawField(page, 'Outro', str(fs['enf_tecnica_outro']), margin, y + 10, page.getWidth() - margin * 2, fieldH)
    y -= fieldH + 16

    page.drawText('Medicamentos administrados (intra-op)', { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
    y -= 14
    drawCheckbox(page, margin, y, 'Carbacol', bool(fs['enf_med_carbacol']))
    y -= 18
    drawCheckbox(page, margin, y, 'Azul de Tripan', bool(fs['enf_med_azul_tripan']))
    y -= 20
    drawField(page, 'Outro', str(fs['enf_med_outro']), margin, y + 10, page.getWidth() - margin * 2, fieldH)
    y -= fieldH + 14

    page.drawText('Antibiótico profilático intracamaral', { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
    y -= 14
    drawCheckbox(page, margin, y, 'Cefuroxima Sódica 750mg, diluída 1/20ml', bool(fs['enf_atb_cefuroxima']))
    y -= 20
    drawField(page, 'Outro', str(fs['enf_atb_outro']), margin, y + 10, page.getWidth() - margin * 2, fieldH)
    y -= fieldH + 14

    page.drawText('Intercorrências', { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
    y -= 14
    drawCheckbox(page, margin, y, 'Não houve', bool(fs['enf_intercorrencia_nao']))
    y -= 18
    drawCheckbox(page, margin, y, 'Sim', bool(fs['enf_intercorrencia_sim']))
    y -= 20
    drawField(page, 'Descrever', str(fs['enf_intercorrencia_desc']), margin, y + 10, page.getWidth() - margin * 2, fieldH)
    y -= fieldH + 14
  }

  {
    const page = pdfDoc.addPage([A4.w, A4.h])
    let y = drawHeader(page, 'RELATÓRIO DE ENFERMAGEM — INTRAOPERATÓRIO (continuação)')
    const margin = 36
    const fieldH = 40

    page.drawText('Finalização', { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
    y -= 14
    y -= drawYesNoRow(page, margin, y, 'Contagem de campos e instrumentais conferida', yesNo(fs['enf_final_contagem']))
    y -= drawYesNoRow(page, margin, y, 'Integridade da LIO confirmada', yesNo(fs['enf_final_integridade_lio']))
    y -= drawYesNoRow(page, margin, y, 'Curativo ocular realizado', yesNo(fs['enf_final_curativo']))
    y -= drawYesNoRow(page, margin, y, 'Paciente encaminhado à recuperação / alta ambulatorial', yesNo(fs['enf_final_encaminhado'])) + 4

    page.drawText('Condições do paciente na saída da sala', { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
    y -= 14
    drawCheckbox(page, margin, y, 'Estável', bool(fs['enf_saida_estavel']))
    y -= 18
    drawCheckbox(page, margin, y, 'Sonolento', bool(fs['enf_saida_sonolento']))
    y -= 22
    drawField(page, 'Outras', str(fs['enf_saida_outras']), margin, y + 10, page.getWidth() - margin * 2, fieldH)

    await drawSignatureBox(page, margin, 120, page.getWidth() - margin * 2, 95, 'CARIMBO/ASSINATURA — CIRCULANTE', str(fs['enf_carimbo_circulante']))
  }

  {
    const page = pdfDoc.addPage([A4.w, A4.h])
    let y = drawHeader(page, 'FOLHA DE RASTREABILIDADE E CONTROLE DE ESTERILIZAÇÃO')
    const margin = 36
    const gap = 10
    const col2 = (page.getWidth() - margin * 2 - gap) / 2
    const fieldH = 44
    drawField(page, 'Nome do paciente', term.nome, margin, y, col2, fieldH)
    drawField(page, 'Data da cirurgia', term.data, margin + col2 + gap, y, col2, fieldH)
    y -= fieldH + 12
    drawField(page, 'Olho a ser operado', term.olho, margin, y, col2, fieldH)
    drawField(page, 'Caixa cirúrgica', str(fs['ester_caixa']), margin + col2 + gap, y, col2, fieldH)
    y -= fieldH + 18

    drawMultilineBox(page, 'Etiqueta identificação caixa cirúrgica', str(fs['ester_etiqueta']), margin, y, page.getWidth() - margin * 2, 130)
    y -= 146

    page.drawText('Integrador químico classe 5', { x: margin, y: y - 2, size: 11, font: fontBold, color: textColor })
    y -= 16
    drawCheckbox(page, margin, y, 'Integrador químico classe 5 presente/ok', bool(fs['ester_integrador_5']))

    await drawSignatureBox(page, margin, 160, page.getWidth() - margin * 2, 110, 'CARIMBO CIRCULANTE', str(fs['ester_carimbo_circulante']))
  }

  return await pdfDoc.save()
}
