import { useRef, useState, useEffect } from 'react'
import { CalendarDays, RefreshCw, ChevronLeft, ChevronRight, User, FileText, Download, CheckCircle2, ArrowLeft, List } from 'lucide-react'
import { PageLayout } from '@/components/PageLayout'
import { useToast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { formatCPF, formatDate } from '@/lib/pdfExtractor'
import { type Visit, type Patient } from '@/types'

interface VisitFull extends Visit {
  patient: Patient
  medical_records?: MedRecord[]
}

interface MedRecord {
  conduct: {
    cataract?: {
      eye: string; first_eye?: string
      od_diopter?: number; oe_diopter?: number; notes?: string
    }
  }
}
type MobileView = 'fila' | 'form'

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

// ─── Kit document generators ──────────────────────────────────────────────────

const KIT_STYLES = `
  body { font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 32px; color: #1e293b; }
  .header { text-align: center; border-bottom: 2px solid #1462e8; padding-bottom: 16px; margin-bottom: 24px; }
  .header h2 { color: #1462e8; margin: 0 0 4px; font-size: 18px; }
  .header p { color: #64748b; font-size: 12px; margin: 0; }
  .title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 20px; color: #0f172a; }
  p { line-height: 1.7; margin-bottom: 12px; }
  .field { border-bottom: 1px solid #94a3b8; display: inline-block; min-width: 200px; }
  .sign { margin-top: 60px; display: flex; justify-content: space-around; }
  .sign div { text-align: center; }
  .sign .line { border-top: 1px solid #334155; width: 180px; margin-bottom: 8px; }
  .sign p { margin: 0; font-size: 12px; color: #64748b; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
  ul li { margin-bottom: 8px; line-height: 1.6; }
  .bold { font-weight: bold; }
  .highlight { background: #eff6ff; border-left: 4px solid #1462e8; padding: 12px 16px; margin: 16px 0; }
  .pagebreak { break-before: page; page-break-before: always; }
`

const KIT_FOOTER = `
  <div class="footer">
    <p><strong>HOSPITAL DO CORAÇÃO TORÃO TOKUDA</strong></p>
    <p>TEL (43) 98852-8186 · Avenida Jaboti 1914, Jardim Menegazzo / APUCARANA-PR · CEP 86802000</p>
  </div>
`

function generateKitHTML(type: 'comprovante' | 'termo' | 'receita' | 'pre_op' | 'pos_op',
  patient: Patient, scheduledDate: string, scheduledTime: string, eye: string, conduct?: MedRecord['conduct'], options?: { wrap?: boolean }) {
  const name = patient.name
  const cpf = formatCPF(patient.cpf)
  const dateFmt = scheduledDate ? formatDate(scheduledDate) : '___/___/______'
  const hora = scheduledTime || '__:__'
  const eyeLabel = eye === 'OD' ? 'Direito' : eye === 'OE' ? 'Esquerdo' : 'Ambos'
  const wrap = options?.wrap ?? true

  const wrapHtml = (inner: string) =>
    wrap ? `<html><head><meta charset="utf-8"/><style>${KIT_STYLES}</style></head><body>${inner}</body></html>` : inner

  if (type === 'comprovante') return wrapHtml(`
    <div class="header"><h2>CENTRO INTEGRADO EM SAÚDE</h2><p>Gestão Clínica Oftalmológica</p></div>
    <div class="title">COMPROVANTE DE AGENDAMENTO CIRÚRGICO</div>
    <p><strong>Paciente:</strong> ${name}</p>
    <p><strong>CPF:</strong> ${cpf}</p>
    <p><strong>Procedimento:</strong> Facoemulsificação com Implante de Lente Intra-Ocular — Olho ${eyeLabel}</p>
    <p><strong>Data da Cirurgia:</strong> ${dateFmt}</p>
    <p><strong>Horário:</strong> ${hora}</p>
    ${conduct?.cataract?.od_diopter ? `<p><strong>Dioptria OD:</strong> ${conduct.cataract.od_diopter}</p>` : ''}
    ${conduct?.cataract?.oe_diopter ? `<p><strong>Dioptria OE:</strong> ${conduct.cataract.oe_diopter}</p>` : ''}
    <div class="highlight"><p style="margin:0">Este documento é seu comprovante de agendamento. Apresente-o no dia da cirurgia junto com um documento de identificação com foto.</p></div>
    ${KIT_FOOTER}
  `)

  if (type === 'termo') return wrapHtml(`
    <div class="header"><h2>CENTRO INTEGRADO EM SAÚDE</h2></div>
    <div class="title">TERMO DE CONSENTIMENTO E ENTENDIMENTO PRÉ-CIRÚRGICO</div>
    <p>Eu, <span class="field">${name}</span>, portador da cédula de RG n° <span class="field">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, aceito voluntária e plenamente o tratamento médico cirúrgico proposto e solicitado pelo Dr. <span class="field">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, inscrito no CRM/PR Nº <span class="field">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> e sua equipe, para tratar da minha saúde atual conforme julgarem necessário, em procedimento CIRÚRGICO a ser realizado no HOSPITAL DO CORAÇÃO TORÃO TOKUDA no dia <strong>${dateFmt}</strong>.</p>
    <p>Tenho pleno conhecimento e estou ciente que o procedimento cirúrgico foi planejado especificamente para o meu caso e eu de maneira voluntária, consinto e autorizo sua realização, sendo este procedimento <strong>FACOEMULSIFICAÇÃO COM IMPLANTE DE LENTE INTRA-OCULAR EM OLHO ${eyeLabel.toUpperCase()}</strong>.</p>
    <p>Entendo que meu médico possa encontrar diferentes condições que requeiram um procedimento adicional ou até mesmo diferente do planejado, portanto autorizo sua realização na medida que julgarem necessária.</p>
    <p>Estou ciente que todo procedimento pelo qual passarei, terá unicamente a finalidade e/ou tentativa de obter a melhora de minhas condições atuais sem, no entanto, estar pré-definida qualquer garantia de resultado e/ou cura.</p>
    <p>Tenho pleno conhecimento e me foi explicado que nesta cirurgia, como em todas as outras, pode ocorrer, embora raro, complicações e/ou risco de infecção. Todas as minhas dúvidas sobre o ato operatório, possíveis complicações e resultados foram satisfatoriamente esclarecidos em consultório.</p>
    <p>As lentes intra-oculares usadas nas cirurgias do Sistema Único de Saúde são de fabricação nacional e de formato esférico, não havendo a possibilidade de substituição das mesmas.</p>
    <p><strong>Data da entrega do termo:</strong> ___/___/______ &nbsp;&nbsp;&nbsp; <strong>Data da devolução do termo:</strong> ___/___/______</p>
    <div class="sign">
      <div><div class="line"></div><p>Paciente</p></div>
      <div><div class="line"></div><p>Testemunha</p></div>
      <div><div class="line"></div><p>Médico</p></div>
    </div>
    ${KIT_FOOTER}
  `)

  if (type === 'receita') return wrapHtml(`
    <div class="header"><h2>CENTRO INTEGRADO EM SAÚDE</h2></div>
    <div class="title">RECEITUÁRIO MÉDICO — PÓS-OPERATÓRIO</div>
    <p><strong>SR(A):</strong> ${name}</p>
    <div class="highlight"><p style="margin:0;font-weight:bold;">COMECE A USAR OS COLÍRIOS LOGO QUE CHEGAR EM CASA APÓS A CIRURGIA!</p></div>
    <p class="bold">USO OCULAR:</p>
    <p><strong>1- FACOBA OU VIGADEX OU ZYPRED COLÍRIO</strong> — 02 Frascos<br>
    Pingar 01 gota no olho operado de 02/02 horas, por 5 dias<br>
    Após, pingar 1 gota de 4/4h, por 5 dias<br>
    Após, pingar 1 gota de 6/6h, por 5 dias<br>
    Após, pingar 1 gota de 8/8h, por 5 dias<br>
    Após, pingar 1 gota de 12/12h, por 5 dias<br>
    Após, pingar 1 gota 1x ao dia, por 5 dias e pare</p>
    <p><strong>2- TIMOLOL COLÍRIO 0,5%</strong> — 01 Frasco<br>
    Pingar uma gota no olho operado a cada 12/12h por 7 dias.</p>
    <p class="bold">USO ORAL:</p>
    <p><strong>3- CEFALEXINA 500mg</strong> — 01 Caixa<br>
    Tomar 01 comprimido a cada 6 horas por 5 dias.</p>
    <p><strong>4- PARACETAMOL 500mg</strong> — 01 Caixa<br>
    Tomar 01 comprimido a cada 6 horas, <strong>SE DOR</strong>.</p>
    <p><strong>5- METICORTEN 20mg</strong> — 01 Caixa<br>
    Tomar 02 cp após o café, por 3 dias.</p>
    <p><strong>DATA:</strong> ${dateFmt}</p>
    ${KIT_FOOTER}
  `)

  if (type === 'pre_op') return wrapHtml(`
    <div class="header"><h2>CENTRO INTEGRADO EM SAÚDE</h2></div>
    <div class="title">ORIENTAÇÕES PRÉ-OPERATÓRIAS — CIRURGIA DE CATARATA</div>
    <p><strong>Cirurgia:</strong> ${dateFmt} &nbsp;&nbsp; <strong>Horário:</strong> ${hora}</p>
    <ul>
      <li>Estar em jejum de 6 horas;</li>
      <li>Obrigatório estar com um acompanhante;</li>
      <li>Tomar todos os medicamentos de uso contínuo, que já faz uso em casa com água suficiente apenas para engolir os comprimidos;</li>
      <li>Se diabético ou hipertenso, realizar controle rigoroso de glicemia e pressão arterial, pois se estiverem alterados no dia da cirurgia o procedimento será cancelado;</li>
      <li>Trazer os medicamentos que constam na receita prescrita no dia da cirurgia, para usar depois do procedimento;</li>
      <li>Só será realizada a cirurgia dos pacientes que estiverem sem febre nos últimos 7 dias, pressão arterial e glicemia normais;</li>
      <li>Caso não possa comparecer no dia da cirurgia, favor avisar via WhatsApp no número: (43) 98852-8186, <strong>somente via mensagem</strong>.</li>
    </ul>
    ${KIT_FOOTER}
  `)

  // pos_op
  return wrapHtml(`
    <div class="header"><h2>CENTRO INTEGRADO EM SAÚDE</h2></div>
    <div class="title">ORIENTAÇÕES PÓS-CIRÚRGICAS</div>
    <ul>
      <li>O tampão protetor pode ser removido assim que você retornar a sua casa. Utilize-o para proteção na hora de dormir por 7 dias;</li>
      <li>Não durma do lado do olho operado por 7 dias;</li>
      <li>Utilize o colírio corretamente de acordo com a receita para evitar infecção;</li>
      <li>Caso observe pus nos olhos, avise imediatamente;</li>
      <li>Evite sair de casa na 1ª semana;</li>
      <li>Lave as mãos antes de aplicar o colírio;</li>
      <li>Não aperte os olhos;</li>
      <li>Não pegue peso ou faça esforço físico por 20 dias;</li>
      <li>É normal que sua visão esteja embaçada. Isso pode demorar a melhorar;</li>
      <li>É normal sentir o olho dolorido, lacrimejando e com sensação de areia;</li>
      <li>Não abaixe a cabeça além da linha da cintura nos primeiros 7 dias;</li>
      <li>Evite que a água ou sabão entre em seus olhos;</li>
      <li>Em caso de algum problema, encaminhe uma mensagem de WhatsApp para (43) 98852-8186. Neste número não atendemos ligação, apenas mensagem.</li>
    </ul>
    <p>Se, por acaso, não conseguir comparecer no dia do retorno, avisar com antecedência pelo WhatsApp (43) 98852-8186.</p>
    ${KIT_FOOTER}
  `)
}

function printDoc(html: string, title: string) {
  const win = window.open('', '_blank')
  if (!win) return false
  win.document.write(html)
  win.document.title = title
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 500)
  return true
}

function downloadDoc(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Agendamento() {
  const {toast} = useToast()
  const [visits, setVisits] = useState<VisitFull[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<VisitFull | null>(null)
  const [mobileView, setMobileView] = useState<MobileView>('fila')
  const patientInfoRef = useRef<HTMLDivElement | null>(null)
  const calendarRef = useRef<HTMLDivElement | null>(null)
  const detailsRef = useRef<HTMLDivElement | null>(null)
  const kitRef = useRef<HTMLDivElement | null>(null)

  const [kitGenerating, setKitGenerating] = useState(false)
  const [kitProgress, setKitProgress] = useState<{ current: number; total: number }>({ current: 0, total: 5 })

  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState('07:00')
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [bookedDates, setBookedDates] = useState<string[]>([])

  const load = async () => {
    setLoading(true)
    const {data, error} = await supabase
      .from('visits')
      .select('*, patient:patients(*), medical_records(*)')
      .eq('status', 'aguardando_agendamento')
      .order('created_at', {ascending: true})
    if (error) toast('Erro ao carregar', 'error')
    else setVisits((data ?? []) as VisitFull[])
    setLoading(false)
  }

  const loadBooked = async () => {
    const {data} = await supabase.from('appointments').select('scheduled_date').eq('status', 'agendado')
    if (data) setBookedDates(data.map(d => d.scheduled_date))
  }

  useEffect(() => { load(); loadBooked() }, [])

  const handleConfirm = async () => {
    if (!selected || !selectedDate) { toast('Selecione uma data', 'error'); return }
    setConfirming(true)

    const conduct = selected.medical_records?.[0]?.conduct
    const eye = (conduct?.cataract?.eye) || ''

    await supabase.from('appointments').insert({
      visit_id: selected.id,
      patient_id: selected.patient_id,
      scheduled_date: selectedDate,
      scheduled_time: selectedTime,
      procedure: 'Cirurgia de Catarata',
      eye,
      notes: conduct?.cataract?.notes || '',
      status: 'agendado',
    })

    await supabase.from('visits').update({status: 'agendado'}).eq('id', selected.id)

    toast(`Cirurgia de ${selected.patient.name} agendada para ${formatDate(selectedDate)}!`, 'success')
    setConfirmed(true)
    loadBooked()
    load()
    setConfirming(false)
  }

  const conduct = selected?.medical_records?.[0]?.conduct
  const eye = conduct?.cataract?.eye || ''
  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const kitBundleHtml = selected
    ? [
        generateKitHTML('comprovante', selected.patient, selectedDate, selectedTime, eye, conduct, { wrap: false }),
        '<div class="pagebreak"></div>',
        generateKitHTML('termo', selected.patient, selectedDate, selectedTime, eye, conduct, { wrap: false }),
        '<div class="pagebreak"></div>',
        generateKitHTML('receita', selected.patient, selectedDate, selectedTime, eye, conduct, { wrap: false }),
        '<div class="pagebreak"></div>',
        generateKitHTML('pre_op', selected.patient, selectedDate, selectedTime, eye, conduct, { wrap: false }),
        '<div class="pagebreak"></div>',
        generateKitHTML('pos_op', selected.patient, selectedDate, selectedTime, eye, conduct, { wrap: false }),
      ].join('')
    : ''
  const kitBundleFullHtml = selected
    ? `<html><head><meta charset="utf-8"/><style>${KIT_STYLES}</style></head><body>${kitBundleHtml}</body></html>`
    : ''

  // Calendar
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  const dateStr = (day: number) => {
    const m = String(calMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${calYear}-${m}-${d}`
  }
  const isPast = (day: number) => new Date(dateStr(day)) < new Date(today.toDateString())
  const isBooked = (day: number) => bookedDates.includes(dateStr(day))

  return (
    <PageLayout title="Agendamento" subtitle="Calendário cirúrgico e kit de agendamento"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileView(v => v === 'fila' ? 'form' : 'fila')}
            className="btn-ghost lg:hidden"
            disabled={mobileView === 'form' && !selected}
            title="Alternar"
          >
            <List size={14} />
            {mobileView === 'fila' ? 'Calendário' : 'Fila'}
          </button>
          <button onClick={load} className="btn-ghost" title="Atualizar"><RefreshCw size={14} /></button>
        </div>
      }>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:h-[calc(100vh-145px)] min-h-0">

        {/* Queue */}
        <div className={`w-full lg:w-64 shrink-0 card flex flex-col overflow-hidden ${mobileView === 'form' ? 'hidden lg:flex' : ''}`}>
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            <p className="text-sm font-semibold text-slate-700">Aguardando Agendamento
              <span className="ml-1 text-xs font-normal text-slate-400">({visits.length})</span>
            </p>
          </div>
          <div className="flex-1 overflow-auto scrollbar-thin divide-y divide-slate-50">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
                <RefreshCw size={12} className="animate-spin" />Carregando…
              </div>
            ) : visits.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Nenhum paciente</p>
            ) : visits.map(v => (
              <button key={v.id} onClick={() => { setSelected(v); setSelectedDate(''); setConfirmed(false); setMobileView('form') }}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                  selected?.id === v.id ? 'bg-brand-50' : 'hover:bg-slate-50'
                }`}>
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <User size={14} className="text-red-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{v.patient.name}</p>
                  <p className="text-xs text-slate-400">
                    {v.medical_records?.[0]?.conduct?.cataract
                      ? `Catarata — ${v.medical_records[0].conduct.cataract.eye}` : 'Cirurgia'}
                  </p>
                </div>
                <ChevronRight size={12} className="text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <div className={`flex-1 flex flex-col gap-5 min-h-0 ${mobileView === 'fila' ? 'hidden lg:flex' : ''}`}>
          {!selected ? (
            <div className="card flex flex-col items-center justify-center flex-1 text-slate-400 gap-3">
              <CalendarDays size={36} className="opacity-20" />
              <p className="text-slate-500 font-medium">Selecione um paciente para agendar</p>
              <button onClick={() => setMobileView('fila')} className="btn-secondary lg:hidden">Ver fila</button>
            </div>
          ) : (
            <>
              {/* Patient info */}
              <div ref={patientInfoRef} className="card p-4 flex items-start gap-4">
                <button onClick={() => setMobileView('fila')} className="btn-ghost p-2 lg:hidden" aria-label="Voltar para fila">
                  <ArrowLeft size={16} />
                </button>
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <span className="font-semibold text-red-700">{selected.patient.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{selected.patient.name}</p>
                  <p className="text-xs text-slate-500 mb-2">CPF {formatCPF(selected.patient.cpf)}{selected.patient.birth_date && ` · ${formatDate(selected.patient.birth_date)}`}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="badge-red">Cirurgia de Catarata — Olho {eye || '—'}</span>
                    {conduct?.cataract?.od_diopter && <span className="badge-slate">Dioptria OD: {conduct.cataract.od_diopter}</span>}
                    {conduct?.cataract?.oe_diopter && <span className="badge-slate">Dioptria OE: {conduct.cataract.oe_diopter}</span>}
                    {conduct?.cataract?.notes && <span className="badge-blue">Obs: {conduct.cataract.notes}</span>}
                  </div>
                </div>
              </div>

              {!confirmed ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="lg:hidden -mt-3">
                    <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
                      <button
                        type="button"
                        onClick={() => scrollTo(patientInfoRef)}
                        className="shrink-0 px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium min-h-[44px]"
                      >
                        Info
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollTo(calendarRef)}
                        className="shrink-0 px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium min-h-[44px]"
                      >
                        Calendário
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollTo(detailsRef)}
                        className="shrink-0 px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium min-h-[44px]"
                      >
                        Detalhes
                      </button>
                    </div>
                  </div>
                  {/* Calendar */}
                  <div ref={calendarRef} className="card p-4">
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={prevMonth} className="btn-ghost p-1"><ChevronLeft size={14} /></button>
                      <p className="font-semibold text-slate-700 text-sm">
                        {MONTHS_PT[calMonth]} {calYear}
                      </p>
                      <button onClick={nextMonth} className="btn-ghost p-1"><ChevronRight size={14} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                      {DAYS_PT.map(d => (
                        <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {Array(firstDay).fill(null).map((_, i) => (
                        <div key={`e${i}`} />
                      ))}
                      {Array(daysInMonth).fill(null).map((_, i) => {
                        const day = i + 1
                        const ds = dateStr(day)
                        const past = isPast(day)
                        const booked = isBooked(day)
                        const selDay = ds === selectedDate
                        return (
                          <button
                            key={day}
                            disabled={past || booked}
                            onClick={() => setSelectedDate(ds)}
                            className={`aspect-square text-xs rounded-lg font-medium transition-colors ${
                              selDay ? 'bg-brand-600 text-white' :
                              past ? 'text-slate-300 cursor-not-allowed' :
                              booked ? 'bg-amber-100 text-amber-600 cursor-not-allowed' :
                              'hover:bg-brand-50 text-slate-700 hover:text-brand-700'
                            }`}
                          >{day}</button>
                        )
                      })}
                    </div>
                    <div className="flex gap-4 mt-3 text-xs">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 inline-block" /> Ocupado</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-600 inline-block" /> Selecionado</span>
                    </div>
                  </div>

                  {/* Scheduling detail */}
                  <div ref={detailsRef} className="card p-4 flex flex-col gap-4">
                    <p className="section-title">Confirmar Agendamento</p>
                    <div>
                      <label className="label">Data selecionada</label>
                      <p className="text-sm font-semibold text-slate-800">
                        {selectedDate ? formatDate(selectedDate) : 'Nenhuma data selecionada'}
                      </p>
                    </div>
                    <div>
                      <label className="label">Horário</label>
                      <input type="time" value={selectedTime}
                        onChange={e => setSelectedTime(e.target.value)}
                        className="input text-sm w-32" />
                    </div>
                    <div>
                      <label className="label">Procedimento</label>
                      <p className="text-sm text-slate-700">Cirurgia de Catarata — Olho {eye || '—'}</p>
                    </div>
                    {conduct?.cataract?.notes && (
                      <div>
                        <label className="label">Observações</label>
                        <p className="text-sm text-slate-700">{conduct.cataract.notes}</p>
                      </div>
                    )}
                    <button onClick={handleConfirm} disabled={confirming || !selectedDate}
                      className="btn-primary mt-auto disabled:opacity-50">
                      <CalendarDays size={14} />
                      {confirming ? 'Agendando…' : 'Confirmar Agendamento'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Confirmed: show kit */
                <div ref={kitRef} className="card p-5 flex flex-col gap-4">
                  <div className="lg:hidden -mt-2">
                    <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
                      <button
                        type="button"
                        onClick={() => scrollTo(patientInfoRef)}
                        className="shrink-0 px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium min-h-[44px]"
                      >
                        Info
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollTo(kitRef)}
                        className="shrink-0 px-3 py-2 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium min-h-[44px]"
                      >
                        Kit
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <p className="font-semibold text-emerald-800 text-sm">
                      Cirurgia agendada para {formatDate(selectedDate)} às {selectedTime}
                    </p>
                  </div>

                  <p className="section-title flex items-center gap-2">
                    <FileText size={16} className="text-brand-600" />
                    Kit de Agendamento — Catarata
                  </p>

                  {kitGenerating && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <RefreshCw size={14} className="animate-spin" />
                      Gerando kit… {kitProgress.current}/{kitProgress.total}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {type: 'comprovante' as const, label: 'Comprovante de Agendamento', icon: '📋'},
                      {type: 'termo' as const, label: 'Termo de Consentimento Cirúrgico', icon: '📝'},
                      {type: 'receita' as const, label: 'Receita Pós-Operatória', icon: '💊'},
                      {type: 'pre_op' as const, label: 'Orientações Pré-Operatórias', icon: '📌'},
                      {type: 'pos_op' as const, label: 'Orientações Pós-Operatórias', icon: '🏥'},
                    ].map(({type, label, icon}) => (
                      <button
                        key={type}
                        type="button"
                        disabled={kitGenerating}
                        onClick={() => {
                          const html = generateKitHTML(type, selected.patient, selectedDate, selectedTime, eye, conduct)
                          const ok = printDoc(html, label)
                          if (!ok) downloadDoc(html, `${label}.html`)
                        }}
                        className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-left disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <span className="text-xl">{icon}</span>
                        <span className="text-sm font-medium text-slate-700 flex-1">{label}</span>
                        <Download size={14} className="text-slate-400 shrink-0" />
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={kitGenerating}
                      onClick={async () => {
                        if (kitGenerating) return
                        const types = ['comprovante','termo','receita','pre_op','pos_op'] as const
                        const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 640px)').matches
                        setKitGenerating(true)
                        setKitProgress({ current: 0, total: types.length })
                        try {
                          for (let i = 0; i < types.length; i++) {
                            setKitProgress({ current: i + 1, total: types.length })
                            const type = types[i]
                            const label = type
                            const html = generateKitHTML(type, selected.patient, selectedDate, selectedTime, eye, conduct)
                            if (isMobile) {
                              downloadDoc(html, `${label}.html`)
                            } else {
                              const ok = printDoc(html, label)
                              if (!ok) downloadDoc(html, `${label}.html`)
                            }
                            await new Promise(resolve => setTimeout(resolve, 250))
                          }
                        } finally {
                          setKitGenerating(false)
                        }
                      }}
                      className="btn-primary sm:col-span-2 justify-center"
                    >
                      <Download size={14} />
                      {kitGenerating ? 'Gerando…' : 'Gerar Kit Completo (5 documentos)'}
                    </button>

                    <button
                      type="button"
                      disabled={kitGenerating}
                      onClick={() => {
                        if (!selected) return
                        const ok = printDoc(kitBundleFullHtml, 'Kit de Agendamento — Catarata')
                        if (!ok) {
                          downloadDoc(kitBundleFullHtml, 'Kit de Agendamento — Catarata.html')
                          toast('Popup bloqueado. O kit foi baixado em HTML para você abrir e salvar como PDF.', 'info')
                        }
                      }}
                      className="btn-secondary sm:col-span-2 justify-center disabled:opacity-50"
                    >
                      <FileText size={14} />
                      Imprimir / Salvar Kit (PDF)
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
