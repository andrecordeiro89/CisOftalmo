import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Scissors, ArrowRight, Plus, Save, X, ChevronDown, ChevronRight, Check, FileText } from 'lucide-react'
import { PageLayout } from '@/components/PageLayout'
import { SurgicalDocumentHtml } from '@/components/SurgicalDocumentHtml'
import { useToast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'

type SurgicalCaseRow = {
  id: string
  patient_id: string
  cpf: string
  patient_name: string | null
  patient?: { birth_date?: string | null; sex?: string | null } | { birth_date?: string | null; sex?: string | null }[] | null
  visit?: { status?: string | null } | { status?: string | null }[] | null
  surgeon: string | null
  surgery_date: string | null
  surgery_time: string | null
  eye: string | null
  eye_number: number | null
  anesthesia: string | null
  instrumentador: string | null
  circulante: string | null
  surgery: string | null
  observation: string | null
  diseases: string | null
  allergies: string | null
  lio: number | null
  av_pre_op: string | null
  city: string | null
  visit_id: string | null
  source: string | null
  created_at: string
}

type PendingVisitRow = {
  id: string
  created_at: string
  patient_id: string
  patient: { id: string; name: string; cpf: string } | { id: string; name: string; cpf: string }[] | null
}

type ChecklistItem = { id: string; label: string; checked: boolean }
type ChecklistSection = { id: string; title: string; items: ChecklistItem[]; rubric: string }

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

const DEFAULT_CHECKLIST: ChecklistSection[] = [
  {
    id: 'antes_anestesia',
    title: 'Antes da anestesia',
    rubric: '',
    items: [
      { id: 'identificacao', label: 'Paciente identificado (nome e CPF)', checked: false },
      { id: 'procedimento', label: 'Procedimento e olho confirmados', checked: false },
      { id: 'consentimento', label: 'Termo de consentimento presente', checked: false },
      { id: 'alergias', label: 'Alergias revisadas', checked: false },
      { id: 'risco_sangramento', label: 'Risco de sangramento avaliado', checked: false },
    ],
  },
  {
    id: 'antes_incisao',
    title: 'Antes da incisão',
    rubric: '',
    items: [
      { id: 'apresentacao', label: 'Equipe se apresentou e confirmou funções', checked: false },
      { id: 'antibiotico', label: 'Profilaxia/medicação conforme protocolo (se aplicável)', checked: false },
      { id: 'materiais', label: 'Materiais e LIO confirmados', checked: false },
    ],
  },
  {
    id: 'antes_saida',
    title: 'Antes de sair da sala',
    rubric: '',
    items: [
      { id: 'contagens', label: 'Contagem/cheque final conforme rotina', checked: false },
      { id: 'rotulo', label: 'Registros e identificação conferidos', checked: false },
      { id: 'plano', label: 'Plano pós-operatório orientado', checked: false },
    ],
  },
]

function isValidCPF(digits: string) {
  if (!/^\d{11}$/.test(digits)) return false
  if (/^(\d)\1{10}$/.test(digits)) return false
  const nums = digits.split('').map(d => parseInt(d, 10))
  const sum1 = nums.slice(0, 9).reduce((acc, n, i) => acc + n * (10 - i), 0)
  let d1 = (sum1 * 10) % 11
  if (d1 === 10) d1 = 0
  if (d1 !== nums[9]) return false
  const sum2 = nums.slice(0, 10).reduce((acc, n, i) => acc + n * (11 - i), 0)
  let d2 = (sum2 * 10) % 11
  if (d2 === 10) d2 = 0
  return d2 === nums[10]
}

function expectedCpfDv(digits: string) {
  if (!/^\d{11}$/.test(digits)) return null
  const nums9 = digits.slice(0, 9).split('').map(d => parseInt(d, 10))
  const sum1 = nums9.reduce((acc, n, i) => acc + n * (10 - i), 0)
  let d1 = (sum1 * 10) % 11
  if (d1 === 10) d1 = 0
  const nums10 = [...nums9, d1]
  const sum2 = nums10.reduce((acc, n, i) => acc + n * (11 - i), 0)
  let d2 = (sum2 * 10) % 11
  if (d2 === 10) d2 = 0
  return `${d1}${d2}`
}

function formatCpfPartial(cpfDigits: string) {
  const digits = cpfDigits.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

function formatCPF(raw: string) {
  return formatCpfPartial(raw)
}

function formatDateBR(iso: string | null | undefined) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

function eyeLabel(eye: string | null) {
  if (eye === 'OD') return 'DIREITO'
  if (eye === 'OE') return 'ESQUERDO'
  if (eye === 'AO') return 'AMBOS'
  return ''
}

type SurgicalForm = {
  name: string
  cpf: string
  birth_date: string
  sex: string
  city: string
  surgeon: string
  surgery_date: string
  surgery_time: string
  eye: '' | 'OD' | 'OE' | 'AO'
  eye_number: '' | '1' | '2'
  anesthesia: string
  instrumentador: string
  circulante: string
  lio: string
  surgery: string
  diseases: string
  observation: string
  allergies: string
  av_pre_op: string
}

const EMPTY_FORM: SurgicalForm = {
  name: '',
  cpf: '',
  birth_date: '',
  sex: '',
  city: '',
  surgeon: '',
  surgery_date: '',
  surgery_time: '',
  eye: '',
  eye_number: '',
  anesthesia: '',
  instrumentador: '',
  circulante: '',
  lio: '',
  surgery: '',
  diseases: '',
  observation: '',
  allergies: '',
  av_pre_op: '',
}

export function Cirurgico() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [view, setView] = useState<'fila' | 'escala'>('fila')
  const [escalaDate, setEscalaDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [loadingList, setLoadingList] = useState(true)
  const [cases, setCases] = useState<SurgicalCaseRow[]>([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [pending, setPending] = useState<PendingVisitRow[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [presenting, setPresenting] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [form, setForm] = useState<SurgicalForm>(EMPTY_FORM)
  const [savingNew, setSavingNew] = useState(false)
  const [docOpen, setDocOpen] = useState(false)
  const [docCase, setDocCase] = useState<SurgicalCaseRow | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [docSaving, setDocSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const autoSaveTimerRef = useRef<number | null>(null)
  const lastSavedHashRef = useRef<string>('')
  const [docTerm, setDocTerm] = useState<ConsentTerm>({
    nome: '',
    cpf: '',
    data_nascimento: '',
    sexo: '',
    medico: '',
    hospital: '',
    cirurgia: '',
    data: '',
    hora: '',
    olho: '',
    ANESTESIA: '',
    INSTRUMENTADOR: '',
    CIRCULANTE: '',
  })
  const [sigDoctor, setSigDoctor] = useState('')
  const [sigPatient, setSigPatient] = useState('')
  const [sigWitness, setSigWitness] = useState('')
  const [docChecklist, setDocChecklist] = useState<ChecklistSection[]>(DEFAULT_CHECKLIST)
  const [formState, setFormState] = useState<Record<string, unknown>>({})

  const loadCases = async () => {
    setLoadingList(true)
    const { data, error } = await supabase
      .from('surgical_cases')
      .select('id, patient_id, cpf, patient_name, patient:patients(birth_date, sex), visit:visits(status), surgeon, surgery_date, surgery_time, eye, eye_number, anesthesia, instrumentador, circulante, surgery, observation, diseases, allergies, lio, av_pre_op, city, visit_id, source, created_at')
      .order('surgery_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) toast('Erro ao carregar cirúrgico', 'error')
    else setCases((data ?? []) as SurgicalCaseRow[])
    setLoadingList(false)
  }

  const loadPending = async () => {
    setLoadingPending(true)
    const { data, error } = await supabase
      .from('visits')
      .select('id, patient_id, created_at, patient:patients(id, name, cpf)')
      .eq('status', 'aguardando_agendamento')
      .order('created_at', { ascending: true })
    if (error) toast('Erro ao carregar fila de agendamento', 'error')
    else setPending((data ?? []) as unknown as PendingVisitRow[])
    setLoadingPending(false)
  }

  useEffect(() => { loadCases(); loadPending() }, [])

  const stats = useMemo(() => {
    const totalCases = cases.length
    const withDate = cases.filter(c => c.surgery_date).length
    const queued = cases.filter(c => !!c.visit_id).length
    const pendingCount = pending.length
    return { totalCases, withDate, queued, pendingCount, totalAll: totalCases + pendingCount }
  }, [cases, pending])

  const escalaRows = useMemo(() => {
    const rows = cases.filter(c => c.surgery_date === escalaDate)
    const byTime = (a: SurgicalCaseRow, b: SurgicalCaseRow) => {
      const at = a.surgery_time || '99:99'
      const bt = b.surgery_time || '99:99'
      return at.localeCompare(bt)
    }
    return rows.slice().sort(byTime)
  }, [cases, escalaDate])

  const escapeHtml = (s: string) => {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  const buildTermDefaults = (c: SurgicalCaseRow): ConsentTerm => {
    const p = Array.isArray(c.patient) ? c.patient[0] : c.patient
    const defaultHospital = (() => {
      try {
        return localStorage.getItem('cisoftalmo_default_hospital') || ''
      } catch {
        return ''
      }
    })()
    return {
      nome: c.patient_name || '',
      cpf: c.cpf ? formatCPF(c.cpf) : '',
      data_nascimento: p?.birth_date ? formatDateBR(p.birth_date) : '',
      sexo: (p?.sex ?? '').trim(),
      medico: c.surgeon || '',
      hospital: defaultHospital,
      cirurgia: c.surgery || '',
      data: c.surgery_date ? formatDateBR(c.surgery_date) : '',
      hora: c.surgery_time || '',
      olho: eyeLabel(c.eye),
      ANESTESIA: c.anesthesia || '',
      INSTRUMENTADOR: c.instrumentador || '',
      CIRCULANTE: c.circulante || '',
    }
  }

  const normalizeChecklist = (raw: unknown): ChecklistSection[] => {
    if (!Array.isArray(raw)) return DEFAULT_CHECKLIST
    const byId = new Map<string, any>()
    raw.forEach((s: any) => {
      if (s && typeof s === 'object' && typeof s.id === 'string') byId.set(s.id, s)
    })

    return DEFAULT_CHECKLIST.map(def => {
      const r = byId.get(def.id)
      const itemsById = new Map<string, any>()
      if (r?.items && Array.isArray(r.items)) {
        r.items.forEach((it: any) => {
          if (it && typeof it === 'object' && typeof it.id === 'string') itemsById.set(it.id, it)
        })
      }
      return {
        ...def,
        rubric: typeof r?.rubric === 'string' ? r.rubric : '',
        items: def.items.map(it => ({
          ...it,
          checked: !!itemsById.get(it.id)?.checked,
        })),
      }
    })
  }

  const toChecklistSave = (list: ChecklistSection[]) => {
    return list.map(s => ({
      id: s.id,
      title: s.title,
      rubric: s.rubric || '',
      items: s.items.map(i => ({ id: i.id, label: i.label, checked: !!i.checked })),
    }))
  }

  const buildDocPayload = (
    c: SurgicalCaseRow,
    term: ConsentTerm,
    checklist: ChecklistSection[],
    doctor: string,
    patient: string,
    witness: string,
    state: Record<string, unknown>
  ) => {
    return {
      surgical_case_id: c.id,
      visit_id: c.visit_id,
      term,
      signatures: {
        doctor,
        patient,
        witness,
      },
      checklist: toChecklistSave(checklist),
      form_state: state,
    }
  }

  const openDocument = async (c: SurgicalCaseRow) => {
    setDocOpen(true)
    setDocCase(c)
    setDocLoading(true)
    try {
      const defaultsTerm = buildTermDefaults(c)
      const { data, error } = await supabase
        .from('surgical_documents')
        .select('term, signatures, checklist, form_state')
        .eq('surgical_case_id', c.id)
        .maybeSingle()

      if (error) {
        toast('Erro ao carregar documento: ' + error.message, 'error')
        setDocTerm(defaultsTerm)
        setDocChecklist(DEFAULT_CHECKLIST)
        setSigDoctor('')
        setSigPatient('')
        setSigWitness('')
        setFormState({})
        return
      }

      if (!data) {
        const { data: created, error: upErr } = await supabase
          .from('surgical_documents')
          .upsert({
            surgical_case_id: c.id,
            visit_id: c.visit_id,
            term: defaultsTerm,
            signatures: {},
            checklist: DEFAULT_CHECKLIST,
            form_state: {},
          }, { onConflict: 'surgical_case_id' })
          .select('term, signatures, checklist, form_state')
          .single()

        if (upErr) {
          toast('Erro ao preparar documento: ' + upErr.message, 'error')
          setDocTerm(defaultsTerm)
          setDocChecklist(DEFAULT_CHECKLIST)
          setSigDoctor('')
          setSigPatient('')
          setSigWitness('')
          return
        }

        const createdTerm = (created?.term ?? {}) as Partial<ConsentTerm>
        const createdSig = (created?.signatures ?? {}) as any
        const nextTerm = { ...defaultsTerm, ...createdTerm }
        const nextChecklist = normalizeChecklist(created?.checklist)
        const nextDoctor = typeof createdSig?.doctor === 'string' ? createdSig.doctor : ''
        const nextPatient = typeof createdSig?.patient === 'string' ? createdSig.patient : ''
        const nextWitness = typeof createdSig?.witness === 'string' ? createdSig.witness : ''
        const nextFormState = (created as any)?.form_state
        setFormState(nextFormState && typeof nextFormState === 'object' ? nextFormState : {})
        setDocTerm(nextTerm)
        setDocChecklist(nextChecklist)
        setSigDoctor(nextDoctor)
        setSigPatient(nextPatient)
        setSigWitness(nextWitness)
        lastSavedHashRef.current = JSON.stringify(buildDocPayload(c, nextTerm, nextChecklist, nextDoctor, nextPatient, nextWitness, nextFormState && typeof nextFormState === 'object' ? nextFormState : {}))
        return
      }

      const term = (data?.term ?? {}) as Partial<ConsentTerm>
      const sig = (data?.signatures ?? {}) as any
      const nextTerm = { ...defaultsTerm, ...term }
      const nextChecklist = normalizeChecklist(data?.checklist)
      const nextDoctor = typeof sig?.doctor === 'string' ? sig.doctor : ''
      const nextPatient = typeof sig?.patient === 'string' ? sig.patient : ''
      const nextWitness = typeof sig?.witness === 'string' ? sig.witness : ''
      const nextFormState = (data as any)?.form_state
      setFormState(nextFormState && typeof nextFormState === 'object' ? nextFormState : {})
      setDocTerm(nextTerm)
      setDocChecklist(nextChecklist)
      setSigDoctor(nextDoctor)
      setSigPatient(nextPatient)
      setSigWitness(nextWitness)
      lastSavedHashRef.current = JSON.stringify(buildDocPayload(c, nextTerm, nextChecklist, nextDoctor, nextPatient, nextWitness, nextFormState && typeof nextFormState === 'object' ? nextFormState : {}))
    } finally {
      setDocLoading(false)
    }
  }

  const saveDocument = async () => {
    if (!docCase) return false
    if (docSaving) return false
    setDocSaving(true)
    try {
      const payload = buildDocPayload(docCase, docTerm, docChecklist, sigDoctor, sigPatient, sigWitness, formState)
      const { error } = await supabase.from('surgical_documents').upsert(payload, { onConflict: 'surgical_case_id' })

      if (error) {
        toast('Erro ao salvar documento: ' + error.message, 'error')
        return false
      }
      toast('Documento salvo.', 'success')
      lastSavedHashRef.current = JSON.stringify(payload)
      return true
    } finally {
      setDocSaving(false)
    }
  }

  useEffect(() => {
    if (!docOpen || docLoading || !docCase) return
    const payload = buildDocPayload(docCase, docTerm, docChecklist, sigDoctor, sigPatient, sigWitness, formState)
    const hash = JSON.stringify(payload)
    if (hash === lastSavedHashRef.current) return
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = window.setTimeout(async () => {
      setAutoSaving(true)
      try {
        const { error } = await supabase.from('surgical_documents').upsert(payload, { onConflict: 'surgical_case_id' })
        if (error) {
          toast('Erro ao salvar automaticamente: ' + error.message, 'error')
          return
        }
        lastSavedHashRef.current = hash
      } finally {
        setAutoSaving(false)
      }
    }, 900)
    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current)
    }
  }, [docOpen, docLoading, docCase, docTerm, docChecklist, sigDoctor, sigPatient, sigWitness, formState])

  const printPdf = async () => {
    const ok = await saveDocument()
    if (!ok) return
    const yn = (k: string) => {
      const v = (formState as any)?.[k]
      if (v === 'sim') return 'Sim'
      if (v === 'nao') return 'Não'
      return ''
    }
    const ck = (k: string) => ((formState as any)?.[k] === true ? '☑' : '☐')
    const tx = (k: string) => {
      const v = (formState as any)?.[k]
      return typeof v === 'string' ? v : ''
    }
    const img = (dataUrl: string) => dataUrl ? `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:contain;"/>` : ''

    const safetySections = [
      {
        id: 'prep',
        title: '1. Sala de preparação do paciente',
        items: [
          { id: 'identificacao', label: 'Identificação do paciente conferida (nome e data de nascimento)' },
          { id: 'procedimento_olho', label: 'Confirmação do procedimento e olho a ser operado' },
          { id: 'consentimento', label: 'Consentimento cirúrgico assinado pelo paciente e acompanhante' },
          { id: 'alergias', label: 'Verificação de alergias (medicamentos / látex)' },
          { id: 'jejum', label: 'Avaliação de jejum confirmada' },
          { id: 'coque', label: 'Verificação de coque no cabelo do paciente, ok' },
        ],
      },
      {
        id: 'sala_antes',
        title: '2. Sala cirúrgica — antes do procedimento',
        items: [
          { id: 'posicionamento', label: 'Paciente posicionado adequadamente na mesa cirúrgica' },
          { id: 'pvpi', label: 'Campo operatório limpo e preparado com PVPI' },
          { id: 'equipamentos', label: 'Equipamentos revisados (microscópio, faco)' },
          { id: 'materiais', label: 'Materiais estéreis disponíveis e dentro do prazo de validade' },
          { id: 'sitio', label: 'Sítio cirúrgico marcado e confirmado (OD/OE)' },
          { id: 'lio', label: 'Lente intraocular conferida (modelo, dioptria, lote, validade)' },
          { id: 'equipe_confirma', label: 'Cirurgião e equipe confirmam o procedimento' },
          { id: 'pressao', label: 'Pressão arterial e sinais verificados' },
        ],
      },
      {
        id: 'pausa',
        title: '3. Pausa cirúrgica — imediatamente antes da incisão',
        items: [
          { id: 'apresentacao', label: 'Equipe se apresenta e confirma papéis' },
          { id: 'confirmacao_verbal', label: 'Confirmação verbal do paciente, olho e tipo de cirurgia' },
          { id: 'cirurgiao_confirma_lio', label: 'Cirurgião confirma tipo de LIO e técnica cirúrgica' },
          { id: 'equipamentos_ok', label: 'Equipamentos funcionando corretamente' },
          { id: 'campo_esteril', label: 'Campo operatório mantido estéril' },
          { id: 'sem_duvidas', label: 'Não há dúvidas pendentes antes do início' },
        ],
      },
      {
        id: 'apos',
        title: '4. Após o procedimento (final da cirurgia)',
        items: [
          { id: 'contagem', label: 'Contagem de instrumentais e campos conferida' },
          { id: 'integridade_lio', label: 'Integridade da lente intraocular implantada confirmada' },
          { id: 'incisao', label: 'Incisão autosselante e olho protegido com curativo' },
          { id: 'med_topica', label: 'Medicação tópica instilada (antibiótico/anti-inflamatório)' },
          { id: 'estavel', label: 'Paciente consciente e hemodinamicamente estável' },
          { id: 'registro_lio', label: 'Registro do modelo e dioptria da LIO no prontuário e cartão' },
          { id: 'orientacoes', label: 'Orientações de alta pós-operatória entregues ao paciente' },
        ],
      },
    ]

    const safetyHtml = safetySections.map(sec => {
      const items = sec.items.map(it => {
        const key = `safety_${sec.id}_${it.id}`
        return `<tr><td style="padding:6px 8px;border:1px solid #e2e8f0;">${escapeHtml(it.label)}</td><td style="padding:6px 8px;border:1px solid #e2e8f0;width:90px;text-align:center;">${escapeHtml(yn(key))}</td></tr>`
      }).join('')
      return `<div style="margin-top:14px;"><div style="font-weight:700;margin-bottom:6px;">${escapeHtml(sec.title)}</div><table style="width:100%;border-collapse:collapse;font-size:12px;">${items}</table></div>`
    }).join('')

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Documento</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color: #0f172a; }
            h1 { font-size: 14px; margin: 0 0 10px; }
            h2 { font-size: 13px; margin: 14px 0 8px; }
            p { font-size: 12px; line-height: 1.5; margin: 8px 0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; }
            .k { font-size: 10px; color: #64748b; margin: 0; }
            .v { font-size: 12px; font-weight: 600; margin: 4px 0 0; }
            .sig { border: 1px solid #e2e8f0; border-radius: 10px; height: 120px; overflow: hidden; background: #fff; }
            .pagebreak { page-break-after: always; }
          </style>
        </head>
        <body>
          <h1>TERMO DE CONSENTIMENTO E ENTENDIMENTO PRÉ-CIRÚRGICO</h1>
          <p>Eu, <b>${escapeHtml(docTerm.nome || '')}</b>, portador do <b>${escapeHtml(docTerm.cpf || '')}</b>, <b>${escapeHtml(docTerm.data_nascimento || '')}</b>, aceito voluntária e plenamente o tratamento médico cirúrgico proposto e solicitado pelo <b>${escapeHtml(docTerm.medico || '')}</b>, e sua equipe, para tratar da minha saúde atual conforme julgarem necessário, em procedimento cirúrgico a ser realizado no <b>${escapeHtml(docTerm.hospital || '')}</b> no dia <b>${escapeHtml(docTerm.data || '')}</b>.</p>
          <p>Tenho pleno conhecimento e estou ciente de que o procedimento cirúrgico foi planejado especificamente para o meu caso e, de maneira voluntária, consinto e autorizo sua realização, sendo este procedimento <b>${escapeHtml(docTerm.cirurgia || '')}</b> em <b>${escapeHtml(docTerm.olho || '')}</b>.</p>
          <p>Entendo que meu médico possa encontrar diferentes condições que requeiram um procedimento adicional ou até mesmo diferente do planejado, portanto, autorizo sua realização na medida que julgarem necessária, deste novo e/ou adicional procedimento.</p>
          <p>Declaro estar ciente de que a lente intraocular disponibilizada pelo Sistema Único de Saúde (SUS) possui finalidade exclusiva de tratamento da catarata, sendo uma lente monofocal, não destinada à correção completa de erros refrativos, podendo haver necessidade de uso de óculos após o procedimento.</p>
          <div class="grid" style="margin-top:12px;">
            <div><div class="k" style="margin-bottom:6px;">PACIENTE</div><div class="sig">${img(sigPatient)}</div></div>
            <div><div class="k" style="margin-bottom:6px;">TESTEMUNHA</div><div class="sig">${img(sigWitness)}</div></div>
          </div>
          <div style="margin-top:12px;"><div class="k" style="margin-bottom:6px;">CARIMBO MÉDICO</div><div class="sig">${img(sigDoctor)}</div></div>

          <div class="pagebreak"></div>
          <h2>FICHA DE TRIAGEM PRÉ CIRÚRGICA (FACOEMULCIFICAÇÃO)</h2>
          <p><b>Paciente:</b> ${escapeHtml(docTerm.nome || '')} &nbsp; <b>Data:</b> ${escapeHtml(docTerm.data || '')}</p>
          <p><b>PA:</b> ${escapeHtml(tx('triagem_pa'))} &nbsp; <b>Hora:</b> ${escapeHtml(tx('triagem_hora'))} &nbsp; <b>HGT:</b> ${escapeHtml(tx('triagem_hgt'))}</p>
          <p><b>Alergias:</b> ${escapeHtml(yn('triagem_alergias'))} &nbsp; <b>A que:</b> ${escapeHtml(tx('triagem_alergias_que'))}</p>
          <p>${ck('triagem_jejum_ok')} Paciente confirmou jejum e estar acompanhado de um maior de idade que se responsabiliza pelo pós-operatório.</p>
          <p><b>Patologias:</b> HAS ${escapeHtml(yn('triagem_has'))} · DM ${escapeHtml(yn('triagem_dm'))} · Disfunção cardíaca ${escapeHtml(yn('triagem_cardio'))} · Anti-coagulante ${escapeHtml(yn('triagem_anticoag'))}</p>
          <p><b>Outras:</b> ${escapeHtml(tx('triagem_outras'))}</p>
          <div style="margin-top:12px;"><div class="k" style="margin-bottom:6px;">ASSINATURA DO AVALIADOR</div><div class="sig">${img(tx('triagem_assinatura_avaliador'))}</div></div>

          <div class="pagebreak"></div>
          <h2>PRESCRIÇÃO MÉDICA / ASSINATURA — RELATÓRIO MÉDICO</h2>
          <p><b>Paciente:</b> ${escapeHtml(docTerm.nome || '')} &nbsp; <b>CPF:</b> ${escapeHtml(docTerm.cpf || '')} &nbsp; <b>Nascimento:</b> ${escapeHtml(docTerm.data_nascimento || '')}</p>
          <p><b>Data cirurgia:</b> ${escapeHtml(docTerm.data || '')} &nbsp; <b>Olho:</b> ${escapeHtml(docTerm.olho || '')}</p>
          <p>1 — JEJUM VO. (*MANTER*)</p>
          <p>Pós operatório imediato de facoemulsificação com implante de lente intra ocular dobrável em olho ${escapeHtml(docTerm.olho || '')} sem sidel. LIO tópica. Sem sinais de infecção. Paciente segue de Alta, com retorno agendado.</p>
          <p>2 — AFERIÇÃO DE SSVV E ESTADO CLÍNICO GERAL. (*VERIFICAR*)</p>
          <p>3 — AFERIÇÃO (GLICEMIA CAPILAR) COMUNICAR SE MAIOR QUE 200. (*VERIFICAR*)</p>
          <p>4 — HIGIENIZAÇÃO DAS MÃOS A CADA 30 MIN. (*PROMOVER*)</p>
          <p>5 — Fenilefrina colírio 10% - pingar uma gota no olho ${escapeHtml(docTerm.olho || '')}.</p>
          <p>5 — Diazepan 5 MG CP VO 30 MIN ANTES PROCEDIMENTO.</p>
          <p>6 — Colírio tropicamida 0,1% 1gt de 5/5 min no olho ${escapeHtml(docTerm.olho || '')} até o procedimento.</p>
          <p>7 — Diamox 250MG 1CP VO após a cirurgia.</p>
          <p><b>Evolução clínica:</b> ${escapeHtml(tx('presc_evolucao'))}</p>
          <div class="grid" style="margin-top:12px;">
            <div><div class="k" style="margin-bottom:6px;">Carimbo do médico (1)</div><div class="sig">${img(tx('presc_carimbo_1'))}</div></div>
            <div><div class="k" style="margin-bottom:6px;">Carimbo do médico (2)</div><div class="sig">${img(tx('presc_carimbo_2'))}</div></div>
          </div>

          <div class="pagebreak"></div>
          <h2>CHECKLIST DE CIRURGIA SEGURA — CIRURGIA DE CATARATA</h2>
          <p><b>Paciente:</b> ${escapeHtml(docTerm.nome || '')} &nbsp; <b>Data:</b> ${escapeHtml(docTerm.data || '')} &nbsp; <b>Olho:</b> ${escapeHtml(docTerm.olho || '')}</p>
          ${safetyHtml}
          <div class="grid" style="margin-top:12px;">
            <div><div class="k" style="margin-bottom:6px;">Assinatura — médico</div><div class="sig">${img(tx('checklist_sig_medico'))}</div></div>
            <div><div class="k" style="margin-bottom:6px;">Assinatura — circulante</div><div class="sig">${img(tx('checklist_sig_circulante'))}</div></div>
          </div>

          <div class="pagebreak"></div>
          <h2>REGISTRO CIRÚRGICO</h2>
          <p><b>Paciente:</b> ${escapeHtml(docTerm.nome || '')} &nbsp; <b>Nascimento:</b> ${escapeHtml(docTerm.data_nascimento || '')} &nbsp; <b>CPF:</b> ${escapeHtml(docTerm.cpf || '')}</p>
          <p><b>Data:</b> ${escapeHtml(docTerm.data || '')} &nbsp; <b>Operador:</b> ${escapeHtml(docTerm.medico || '')}</p>
          <p><b>Instrumentador:</b> ${escapeHtml(docTerm.INSTRUMENTADOR || '')} &nbsp; <b>Anestesista:</b> ${escapeHtml(tx('cir_anestesista'))}</p>
          <p><b>Tipo anestesia:</b> ${escapeHtml(docTerm.ANESTESIA || '')} &nbsp; <b>Olho:</b> ${escapeHtml(docTerm.olho || '')}</p>
          <p><b>Etiqueta LIO:</b> ${escapeHtml(tx('cir_etiqueta_lio'))}</p>
          <p><b>Diagnóstico pré:</b> Catarata &nbsp; <b>Tipo de operação:</b> ${escapeHtml(docTerm.cirurgia || '')} &nbsp; <b>Diagnóstico pós:</b> Pseudofacia</p>
          <p><b>Intercorrências:</b> ${ck('cir_intercorrencia_nao')} Não ${ck('cir_intercorrencia_sim')} Sim &nbsp; <b>Qual:</b> ${escapeHtml(tx('cir_intercorrencia_qual'))}</p>
          <p><b>Descrição da operação:</b> Assepsia/antissepsia + campos estéreis; incisão principal + paracenteses; azul de tripan; xilocaína com adrenalina; metilcelulose 2%; capsulorrexis; hidrodissécação/hidrodelineação; facoemulsificação; aspiração de restos corticais; implante de LIO; aspiração de viscoelástico + sutura aquosa; cefuroxima + Vigamox; protetor acrílico.</p>
          <p><b>Observações adicionais:</b> ${escapeHtml(tx('descop_observacoes'))}</p>
          <div class="grid" style="margin-top:12px;">
            <div><div class="k" style="margin-bottom:6px;">Carimbo médico (1)</div><div class="sig">${img(tx('descop_carimbo_1'))}</div></div>
            <div><div class="k" style="margin-bottom:6px;">Carimbo médico (2)</div><div class="sig">${img(tx('descop_carimbo_2'))}</div></div>
          </div>
          <div style="margin-top:12px;"><div class="k" style="margin-bottom:6px;">Carimbo médico (3)</div><div class="sig">${img(tx('descop_carimbo_3'))}</div></div>

          <div class="pagebreak"></div>
          <h2>RELATÓRIO DE ENFERMAGEM — INTRAOPERATÓRIO</h2>
          <p><b>Início:</b> ${escapeHtml(tx('enf_inicio'))} &nbsp; <b>Término:</b> ${escapeHtml(tx('enf_termino'))} &nbsp; <b>Sexo:</b> ${escapeHtml(tx('enf_sexo') || docTerm.sexo || '')}</p>
          <p><b>Instrumentador:</b> ${escapeHtml(docTerm.INSTRUMENTADOR || '')} &nbsp; <b>Circulante:</b> ${escapeHtml(docTerm.CIRCULANTE || '')}</p>
          <p><b>Tipo anestesia:</b> ${escapeHtml(docTerm.ANESTESIA || '')} &nbsp; ${ck('enf_sedacao_realizada')} Sedação</p>
          <p><b>Olho operado:</b> ${escapeHtml(docTerm.olho || '')} &nbsp; <b>Etiqueta LIO:</b> ${escapeHtml(tx('enf_etiqueta_lio'))}</p>
          <p><b>Técnica:</b> ${ck('enf_tecnica_faco')} Facoemulsificação ${ck('enf_tecnica_eec')} EEC &nbsp; <b>Outro:</b> ${escapeHtml(tx('enf_tecnica_outro'))}</p>
          <p><b>Medicamentos:</b> ${ck('enf_med_carbacol')} Carbacol ${ck('enf_med_azul_tripan')} Azul de Tripan &nbsp; <b>Outro:</b> ${escapeHtml(tx('enf_med_outro'))}</p>
          <p><b>ATB intracamaral:</b> ${ck('enf_atb_cefuroxima')} Cefuroxima &nbsp; <b>Outro:</b> ${escapeHtml(tx('enf_atb_outro'))}</p>
          <p><b>Intercorrências:</b> ${ck('enf_intercorrencia_nao')} Não houve ${ck('enf_intercorrencia_sim')} Sim &nbsp; <b>Descrever:</b> ${escapeHtml(tx('enf_intercorrencia_desc'))}</p>
          <p><b>Finalização:</b> Contagem ${escapeHtml(yn('enf_final_contagem'))} · Integridade LIO ${escapeHtml(yn('enf_final_integridade_lio'))} · Curativo ${escapeHtml(yn('enf_final_curativo'))} · Encaminhado ${escapeHtml(yn('enf_final_encaminhado'))}</p>
          <p><b>Condição saída:</b> ${ck('enf_saida_estavel')} Estável ${ck('enf_saida_sonolento')} Sonolento &nbsp; <b>Outras:</b> ${escapeHtml(tx('enf_saida_outras'))}</p>
          <div style="margin-top:12px;"><div class="k" style="margin-bottom:6px;">Carimbo/assinatura — circulante</div><div class="sig">${img(tx('enf_carimbo_circulante'))}</div></div>

          <div class="pagebreak"></div>
          <h2>FOLHA DE RASTREABILIDADE E CONTROLE DE ESTERELIZAÇÃO</h2>
          <p><b>Paciente:</b> ${escapeHtml(docTerm.nome || '')} &nbsp; <b>Data:</b> ${escapeHtml(docTerm.data || '')} &nbsp; <b>Olho:</b> ${escapeHtml(docTerm.olho || '')}</p>
          <p><b>Caixa cirúrgica:</b> ${escapeHtml(tx('ester_caixa'))}</p>
          <p><b>Etiqueta identificação caixa cirúrgica:</b> ${escapeHtml(tx('ester_etiqueta'))}</p>
          <p>${ck('ester_integrador_5')} Integrador químico classe 5 presente/ok</p>
          <div style="margin-top:12px;"><div class="k" style="margin-bottom:6px;">Carimbo circulante</div><div class="sig">${img(tx('ester_carimbo_circulante'))}</div></div>
        </body>
      </html>
    `

    const w = window.open('', '_blank')
    if (!w) {
      toast('Permita pop-ups para baixar o PDF.', 'error')
      return
    }
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 350)
  }

  const markPresence = async (c: SurgicalCaseRow) => {
    if (!c.visit_id) {
      toast('Este registro não possui vínculo com atendimento/agendamento.', 'error')
      return
    }
    if (presenting) return
    setPresenting(c.id)
    try {
      const { error } = await supabase.from('visits').update({ status: 'presente_cirurgia' }).eq('id', c.visit_id)
      if (error) {
        toast('Erro ao dar presença: ' + error.message, 'error')
        return
      }
      toast('Presença registrada.', 'success')
      loadCases()
      loadPending()
      await openDocument(c)
    } catch {
      toast('Erro ao confirmar presença.', 'error')
    } finally {
      setPresenting(null)
    }
  }

  const createCase = async () => {
    if (savingNew) return
    const name = form.name.trim()
    const cpfDigits = form.cpf.replace(/\D/g, '')

    if (!name) { toast('Nome é obrigatório', 'error'); return }
    if (!cpfDigits) { toast('CPF é obrigatório', 'error'); return }
    if (cpfDigits.length !== 11) { toast('CPF deve ter 11 dígitos', 'error'); return }
    if (!isValidCPF(cpfDigits)) {
      const dv = expectedCpfDv(cpfDigits)
      toast(`CPF inválido (DV esperado: ${dv ?? '--'})`, 'error')
      return
    }

    const birthDate = form.birth_date || null
    const sex = form.sex.trim() || null
    const city = form.city.trim() || null

    let eye_number: number | null = null
    if (form.eye_number === '1') eye_number = 1
    if (form.eye_number === '2') eye_number = 2
    if (!eye_number && form.eye === 'OD') eye_number = 1
    if (!eye_number && form.eye === 'OE') eye_number = 2

    const lio = form.lio.trim()
    const lioNumber = lio ? Number(lio.replace(',', '.')) : null
    if (lio && !Number.isFinite(lioNumber)) { toast('LIO inválido', 'error'); return }

    setSavingNew(true)
    try {
      const { error: pErr } = await supabase
        .from('patients')
        .upsert([{
          cpf: cpfDigits,
          name,
          birth_date: birthDate,
          mother_name: null,
          sex,
          city,
        }], { onConflict: 'cpf' })

      if (pErr) {
        toast('Erro ao salvar paciente: ' + pErr.message, 'error')
        return
      }

      const { data: pData, error: pMapErr } = await supabase
        .from('patients')
        .select('id')
        .eq('cpf', cpfDigits)
        .single()

      if (pMapErr || !pData?.id) {
        toast('Erro ao mapear paciente: ' + (pMapErr?.message || ''), 'error')
        return
      }

      let createdVisitId: string | null = null
      const shouldAutoSchedule = !!form.surgery_date
      const scheduledTime = (form.surgery_time.trim() || '07:00')
      const procedure = form.surgery.trim() || 'Procedimento cirúrgico'
      const eye = form.eye || null
      const notes = [
        procedure ? `Cirurgia: ${procedure}` : '',
        lioNumber != null ? `LIO: ${lioNumber}` : '',
        form.diseases.trim() ? `Doenças: ${form.diseases.trim()}` : '',
        form.allergies.trim() ? `Alergias: ${form.allergies.trim()}` : '',
        form.observation.trim() ? `Obs: ${form.observation.trim()}` : '',
      ].filter(Boolean).join('\n')

      if (shouldAutoSchedule) {
        const { data: visit, error: vErr } = await supabase
          .from('visits')
          .insert({
            patient_id: pData.id,
            visit_type: 'retorno',
            oci_subtype: null,
            status: 'agendado',
          })
          .select('id')
          .single()

        if (vErr || !visit?.id) {
          toast('Erro ao criar atendimento: ' + (vErr?.message || ''), 'error')
          return
        }
        createdVisitId = visit.id

        await supabase.from('medical_records').upsert({
          visit_id: createdVisitId,
          conduct: { cataract: { eye, notes } },
          patient_consent: false,
        }, { onConflict: 'visit_id' })

        const { error: aErr } = await supabase.from('appointments').insert({
          visit_id: createdVisitId,
          patient_id: pData.id,
          scheduled_date: form.surgery_date,
          scheduled_time: scheduledTime,
          procedure,
          eye: eye || '',
          notes,
          status: 'agendado',
        })

        if (aErr) {
          toast('Atendimento criado, mas erro ao agendar: ' + aErr.message, 'error')
          return
        }
      }

      const { error: cErr } = await supabase
        .from('surgical_cases')
        .insert({
          patient_id: pData.id,
          cpf: cpfDigits,
          patient_name: name,
          surgeon: form.surgeon.trim() || null,
          surgery_date: form.surgery_date || null,
          surgery_time: form.surgery_time.trim() || null,
          eye: form.eye || null,
          eye_number,
          anesthesia: form.anesthesia.trim() || null,
          instrumentador: form.instrumentador.trim() || null,
          circulante: form.circulante.trim() || null,
          lio: lioNumber,
          surgery: form.surgery.trim() || null,
          diseases: form.diseases.trim() || null,
          observation: form.observation.trim() || null,
          allergies: form.allergies.trim() || null,
          av_pre_op: form.av_pre_op.trim() || null,
          city,
          visit_id: createdVisitId,
          source: shouldAutoSchedule ? 'manual_auto' : 'manual',
          source_file: null,
          source_row: null,
        })

      if (cErr) {
        toast('Erro ao salvar caso cirúrgico: ' + cErr.message, 'error')
        return
      }

      toast(shouldAutoSchedule ? 'Paciente cadastrado e agendado automaticamente.' : 'Paciente cadastrado no cirúrgico.', 'success')
      setForm(EMPTY_FORM)
      setManualOpen(false)
      loadCases()
      loadPending()
    } finally {
      setSavingNew(false)
    }
  }

  return (
    <PageLayout
      title="Cirúrgico"
      subtitle="Gestão de pacientes e fila de cirurgias"
      actions={
        <div className="flex items-center gap-2">
          <Dialog.Root
            open={manualOpen}
            onOpenChange={open => {
              setManualOpen(open)
              if (open) setForm(EMPTY_FORM)
            }}
          >
            <Dialog.Trigger asChild>
              <button type="button" className="btn-primary">
                <Plus size={14} />
                Paciente
              </button>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
              <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 border border-brand-200">
                    <Plus size={18} className="text-brand-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Dialog.Title className="font-display font-semibold text-slate-900">
                      Novo paciente cirúrgico
                    </Dialog.Title>
                    <Dialog.Description className="text-xs text-slate-500">
                      Cadastro manual com 19 campos.
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button className="btn-ghost p-2 min-h-0" aria-label="Fechar">
                      <X size={16} />
                    </button>
                  </Dialog.Close>
                </div>

                <form
                  className="p-5 overflow-auto"
                  onSubmit={async e => {
                    e.preventDefault()
                    await createCase()
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="label">Nome</label>
                      <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>

                    <div>
                      <label className="label">CPF</label>
                      <input
                        className="input"
                        value={formatCpfPartial(form.cpf)}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                          setForm(f => ({ ...f, cpf: digits }))
                        }}
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                      />
                      {(() => {
                        const digits = form.cpf.replace(/\D/g, '')
                        if (!digits) return null
                        if (digits.length !== 11) return <p className="text-xs text-amber-700 mt-1">CPF deve ter 11 dígitos.</p>
                        if (!isValidCPF(digits)) return <p className="text-xs text-red-600 mt-1">CPF inválido (DV esperado: {expectedCpfDv(digits) ?? '--'}).</p>
                        return <p className="text-xs text-emerald-700 mt-1">CPF válido.</p>
                      })()}
                    </div>

                    <div>
                      <label className="label">Data de nascimento</label>
                      <input className="input" type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
                    </div>

                    <div>
                      <label className="label">Sexo</label>
                      <input className="input" value={form.sex} onChange={e => setForm(f => ({ ...f, sex: e.target.value }))} placeholder="Masculino/Feminino" />
                    </div>

                    <div>
                      <label className="label">Cidade</label>
                      <input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="divider" />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="label">Médico</label>
                      <input className="input" value={form.surgeon} onChange={e => setForm(f => ({ ...f, surgeon: e.target.value }))} />
                    </div>

                    <div>
                      <label className="label">Data (cirurgia)</label>
                      <input className="input" type="date" value={form.surgery_date} onChange={e => setForm(f => ({ ...f, surgery_date: e.target.value }))} />
                    </div>

                    <div>
                      <label className="label">Hora</label>
                      <input className="input" value={form.surgery_time} onChange={e => setForm(f => ({ ...f, surgery_time: e.target.value }))} placeholder="06:00" />
                    </div>

                    <div>
                      <label className="label">Olho</label>
                      <select
                        className="input"
                        value={form.eye}
                        onChange={e => {
                          const eye = e.target.value as SurgicalForm['eye']
                          setForm(f => ({
                            ...f,
                            eye,
                            eye_number: eye === 'OD' ? '1' : eye === 'OE' ? '2' : f.eye_number,
                          }))
                        }}
                      >
                        <option value="">—</option>
                        <option value="OD">OD</option>
                        <option value="OE">OE</option>
                        <option value="AO">AO</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Nº olho</label>
                      <select className="input" value={form.eye_number} onChange={e => setForm(f => ({ ...f, eye_number: e.target.value as SurgicalForm['eye_number'] }))}>
                        <option value="">—</option>
                        <option value="1">1 (OD)</option>
                        <option value="2">2 (OE)</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Anestesia</label>
                      <input className="input" value={form.anesthesia} onChange={e => setForm(f => ({ ...f, anesthesia: e.target.value }))} />
                    </div>

                    <div>
                      <label className="label">Instrumentador</label>
                      <input className="input" value={form.instrumentador} onChange={e => setForm(f => ({ ...f, instrumentador: e.target.value }))} />
                    </div>

                    <div>
                      <label className="label">Circulante</label>
                      <input className="input" value={form.circulante} onChange={e => setForm(f => ({ ...f, circulante: e.target.value }))} />
                    </div>

                    <div>
                      <label className="label">LIO</label>
                      <input className="input" value={form.lio} onChange={e => setForm(f => ({ ...f, lio: e.target.value }))} placeholder="Ex: 22,5" inputMode="decimal" />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="label">Cirurgia</label>
                      <input className="input" value={form.surgery} onChange={e => setForm(f => ({ ...f, surgery: e.target.value }))} placeholder="Ex: FACO + LIO" />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="label">Doenças</label>
                      <input className="input" value={form.diseases} onChange={e => setForm(f => ({ ...f, diseases: e.target.value }))} placeholder="Ex: HA/DM" />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="label">Observação</label>
                      <textarea className="input resize-none" rows={3} value={form.observation} onChange={e => setForm(f => ({ ...f, observation: e.target.value }))} />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="label">Alergias</label>
                      <input className="input" value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} />
                    </div>

                    <div>
                      <label className="label">AV pré-op</label>
                      <input className="input" value={form.av_pre_op} onChange={e => setForm(f => ({ ...f, av_pre_op: e.target.value }))} placeholder="Ex: 20/80" />
                    </div>

                    <div className="flex items-end justify-end gap-2">
                      <button type="button" className="btn-secondary" disabled={savingNew} onClick={() => setForm(EMPTY_FORM)}>
                        Limpar
                      </button>
                      <button type="submit" className="btn-primary" disabled={savingNew}>
                        <Save size={14} />
                        {savingNew ? 'Salvando…' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </form>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          <button
            type="button"
            onClick={() => { loadCases(); loadPending() }}
            className="btn-ghost"
            title="Atualizar"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      }
    >
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-1">
          <button
            type="button"
            onClick={() => setView('fila')}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              view === 'fila' ? 'border-brand-500 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Fila
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">
              {stats.totalAll}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setView('escala')}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              view === 'escala' ? 'border-brand-500 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Escala
          </button>
        </div>

        {view === 'fila' && (
          <div className="p-4 sm:p-5 overflow-x-auto">
            {(loadingList || loadingPending) ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <RefreshCw size={16} className="animate-spin mr-2" />
                Carregando…
              </div>
            ) : stats.totalAll === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <Scissors size={26} className="opacity-30" />
                <p className="text-sm">Nenhum paciente cirúrgico no momento</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Pendentes do sistema (aguardando agendamento)
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/agendamento')}
                      className="inline-flex items-center gap-2 text-xs font-medium text-brand-700 hover:text-brand-800"
                    >
                      Abrir Agendamento <ArrowRight size={12} />
                    </button>
                  </div>
                  {pending.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Nenhum paciente pendente vindo do fluxo natural.
                    </div>
                  ) : (
                    <table className="table-fixed w-full text-sm min-w-[760px]">
                      <colgroup>
                        <col className="w-[34%]" />
                        <col className="w-[18%]" />
                        <col className="w-[18%]" />
                        <col className="w-[30%]" />
                      </colgroup>
                      <thead>
                        <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                          <th className="px-5 py-2.5">Paciente</th>
                          <th className="px-4 py-2.5">CPF</th>
                          <th className="px-4 py-2.5">Criado em</th>
                          <th className="px-4 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pending.map(v => (
                          <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-3 font-medium text-slate-800 truncate">
                              {(Array.isArray(v.patient) ? v.patient[0]?.name : v.patient?.name) || '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                              {(() => {
                                const cpf = Array.isArray(v.patient) ? v.patient[0]?.cpf : v.patient?.cpf
                                return cpf ? formatCPF(cpf) : '—'
                              })()}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{new Date(v.created_at).toLocaleDateString('pt-BR')}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => navigate('/agendamento')}
                                className="btn-secondary text-xs"
                              >
                                Agendar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Casos cirúrgicos cadastrados
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="badge-slate">Total: {stats.totalCases}</span>
                      <span className="badge-blue">Na fila: {stats.queued}</span>
                    </div>
                  </div>
                  {cases.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Nenhum caso cadastrado ainda.
                    </div>
                  ) : (
                    <table className="table-fixed w-full text-sm min-w-[980px]">
                    <colgroup>
                      <col className="w-[4%]" />
                      <col className="w-[20%]" />
                      <col className="w-[14%]" />
                      <col className="w-[10%]" />
                      <col className="w-[9%]" />
                      <col className="w-[10%]" />
                      <col className="w-[25%]" />
                      <col className="w-[10%]" />
                    </colgroup>
                    <thead>
                      <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                        <th className="px-3 py-2.5"></th>
                        <th className="px-5 py-2.5">Paciente</th>
                        <th className="px-4 py-2.5">CPF</th>
                        <th className="px-4 py-2.5">Data</th>
                        <th className="px-4 py-2.5">Hora</th>
                        <th className="px-4 py-2.5">Olho</th>
                        <th className="px-4 py-2.5">Cirurgia</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map(c => (
                        <Fragment key={c.id}>
                          <tr className="border-b border-slate-50">
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                className="btn-ghost p-2 min-h-0"
                                aria-label="Expandir"
                                onClick={() => setExpanded(s => ({ ...s, [c.id]: !s[c.id] }))}
                              >
                                {expanded[c.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                            </td>
                            <td className="px-5 py-3 font-medium text-slate-800 truncate">{c.patient_name || '—'}</td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">{formatCPF(c.cpf)}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{c.surgery_date ? new Date(c.surgery_date).toLocaleDateString('pt-BR') : '—'}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{c.surgery_time || '—'}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{c.eye || (c.eye_number ? `#${c.eye_number}` : '—')}</td>
                            <td className="px-4 py-3 text-slate-600 text-xs truncate">{c.surgery || '—'}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-xs text-slate-500">
                                {c.visit_id ? 'Agendado/Vinculado' : (c.surgery_date ? 'Data informada (sem vínculo)' : 'Pendente')}
                              </span>
                            </td>
                          </tr>
                          {expanded[c.id] && (
                            <tr key={`${c.id}-expanded`} className="border-b border-slate-50 bg-slate-50/50">
                              <td className="px-3 py-3"></td>
                              <td className="px-5 py-3" colSpan={7}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="text-slate-400">Médico</p>
                                    <p className="text-slate-800 font-medium mt-0.5">{c.surgeon || '—'}</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="text-slate-400">Anestesia</p>
                                    <p className="text-slate-800 font-medium mt-0.5">{c.anesthesia || '—'}</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="text-slate-400">Instrumentador</p>
                                    <p className="text-slate-800 font-medium mt-0.5">{c.instrumentador || '—'}</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="text-slate-400">Circulante</p>
                                    <p className="text-slate-800 font-medium mt-0.5">{c.circulante || '—'}</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="text-slate-400">LIO</p>
                                    <p className="text-slate-800 font-medium mt-0.5">{c.lio != null ? String(c.lio).replace('.', ',') : '—'}</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="text-slate-400">AV pré-op</p>
                                    <p className="text-slate-800 font-medium mt-0.5">{c.av_pre_op || '—'}</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="text-slate-400">Doenças</p>
                                    <p className="text-slate-800 font-medium mt-0.5 whitespace-pre-wrap">{c.diseases || '—'}</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="text-slate-400">Alergias</p>
                                    <p className="text-slate-800 font-medium mt-0.5 whitespace-pre-wrap">{c.allergies || '—'}</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="text-slate-400">Observação</p>
                                    <p className="text-slate-800 font-medium mt-0.5 whitespace-pre-wrap">{c.observation || '—'}</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="text-slate-400">Cidade</p>
                                    <p className="text-slate-800 font-medium mt-0.5">{c.city || '—'}</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="text-slate-400">Origem</p>
                                    <p className="text-slate-800 font-medium mt-0.5">{c.source || '—'}</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="text-slate-400">Criado em</p>
                                    <p className="text-slate-800 font-medium mt-0.5">{new Date(c.created_at).toLocaleString('pt-BR')}</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'escala' && (
          <div className="p-4 sm:p-5 overflow-x-auto">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 mb-4">
              <div>
                <label className="label">Dia</label>
                <input className="input w-44" type="date" value={escalaDate} onChange={e => setEscalaDate(e.target.value)} />
              </div>
              <div className="text-xs text-slate-500 sm:pb-2">
                Total: <span className="font-semibold text-slate-700">{escalaRows.length}</span>
              </div>
            </div>

            {escalaRows.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Nenhum paciente agendado para este dia.
              </div>
            ) : (
              <table className="table-fixed w-full text-sm min-w-[980px]">
                <colgroup>
                  <col className="w-[4%]" />
                  <col className="w-[6%]" />
                  <col className="w-[22%]" />
                  <col className="w-[10%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[18%]" />
                  <col className="w-[10%]" />
                  <col className="w-[6%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                    <th className="px-3 py-2.5"></th>
                    <th className="px-3 py-2.5">Nº</th>
                    <th className="px-4 py-2.5">Paciente</th>
                    <th className="px-4 py-2.5">LIO</th>
                    <th className="px-4 py-2.5">Cirurgia</th>
                    <th className="px-4 py-2.5">AV</th>
                    <th className="px-4 py-2.5">Obs</th>
                    <th className="px-4 py-2.5">Cidade</th>
                    <th className="px-4 py-2.5">Hora</th>
                    <th className="px-4 py-2.5 text-right">Presença</th>
                  </tr>
                </thead>
                <tbody>
                  {escalaRows.map((c, idx) => (
                    <Fragment key={c.id}>
                      <tr className="border-b border-slate-50">
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            className="btn-ghost p-2 min-h-0"
                            aria-label="Expandir"
                            onClick={() => setExpanded(s => ({ ...s, [c.id]: !s[c.id] }))}
                          >
                            {expanded[c.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-slate-500 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-800 truncate">{c.patient_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{c.lio != null ? String(c.lio).replace('.', ',') : '—'}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs truncate">{c.surgery || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{c.av_pre_op || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs truncate">{c.observation || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs truncate">{c.city || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{c.surgery_time || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          {(() => {
                            const v = Array.isArray(c.visit) ? c.visit[0] : c.visit
                            const status = v?.status || ''
                            const isPresent = status === 'presente_cirurgia'
                            const canConfirm = !!c.visit_id
                            return (
                              <div className="flex items-center justify-end">
                                <button
                                  type="button"
                                  className={`btn-ghost p-2 min-h-0 ${
                                    isPresent ? 'text-emerald-700 hover:text-emerald-800' : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                  onClick={() => (isPresent ? openDocument(c) : markPresence(c))}
                                  disabled={!isPresent && !canConfirm ? true : presenting === c.id}
                                  title={
                                    isPresent
                                      ? 'Abrir documento'
                                      : (canConfirm ? 'Confirmar presença e abrir documento' : 'Sem vínculo com atendimento/agendamento')
                                  }
                                  aria-label={isPresent ? 'Presença confirmada' : 'Presença pendente'}
                                >
                                  {presenting === c.id ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                  ) : isPresent ? (
                                    <Check size={16} />
                                  ) : (
                                    <X size={16} />
                                  )}
                                </button>
                              </div>
                            )
                          })()}
                        </td>
                      </tr>
                      {expanded[c.id] && (
                        <tr key={`${c.id}-expanded-escala`} className="border-b border-slate-50 bg-slate-50/50">
                          <td className="px-3 py-3"></td>
                          <td className="px-3 py-3" colSpan={9}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-slate-400">CPF</p>
                                <p className="text-slate-800 font-medium mt-0.5">{c.cpf ? formatCPF(c.cpf) : '—'}</p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-slate-400">Nascimento</p>
                                <p className="text-slate-800 font-medium mt-0.5">
                                  {(() => {
                                    const p = Array.isArray(c.patient) ? c.patient[0] : c.patient
                                    return p?.birth_date ? new Date(p.birth_date).toLocaleDateString('pt-BR') : '—'
                                  })()}
                                </p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-slate-400">Sexo</p>
                                <p className="text-slate-800 font-medium mt-0.5">
                                  {(() => {
                                    const p = Array.isArray(c.patient) ? c.patient[0] : c.patient
                                    return p?.sex || '—'
                                  })()}
                                </p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-slate-400">Médico</p>
                                <p className="text-slate-800 font-medium mt-0.5">{c.surgeon || '—'}</p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-slate-400">Olho</p>
                                <p className="text-slate-800 font-medium mt-0.5">{c.eye || (c.eye_number ? `#${c.eye_number}` : '—')}</p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-slate-400">Anestesia</p>
                                <p className="text-slate-800 font-medium mt-0.5">{c.anesthesia || '—'}</p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-slate-400">Instrumentador</p>
                                <p className="text-slate-800 font-medium mt-0.5">{c.instrumentador || '—'}</p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-slate-400">Circulante</p>
                                <p className="text-slate-800 font-medium mt-0.5">{c.circulante || '—'}</p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-slate-400">Doenças</p>
                                <p className="text-slate-800 font-medium mt-0.5 whitespace-pre-wrap">{c.diseases || '—'}</p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-slate-400">Alergias</p>
                                <p className="text-slate-800 font-medium mt-0.5 whitespace-pre-wrap">{c.allergies || '—'}</p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-slate-400">Origem</p>
                                <p className="text-slate-800 font-medium mt-0.5">{c.source || '—'}</p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-slate-400">Criado em</p>
                                <p className="text-slate-800 font-medium mt-0.5">{new Date(c.created_at).toLocaleString('pt-BR')}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <Dialog.Root
        open={docOpen}
        onOpenChange={(o) => {
          setDocOpen(o)
          if (!o) {
            setDocCase(null)
            setFormState({})
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Dialog.Title className="text-sm font-semibold text-slate-800">
                  Documento cirúrgico
                </Dialog.Title>
                <p className="text-xs text-slate-500 mt-1 truncate">
                  {docCase?.patient_name || '—'} {docCase?.cpf ? `· ${formatCPF(docCase.cpf)}` : ''}
                </p>
              </div>
              <Dialog.Close asChild>
                <button type="button" className="btn-ghost p-2 min-h-0" aria-label="Fechar">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-xs text-slate-500">
                Documento em HTML (conteúdo completo), com campos automáticos, assinaturas e checkboxes. Use “Baixar PDF” para salvar.
              </p>
            </div>

            <div className="px-5 py-4 overflow-auto">
              {docLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <RefreshCw size={16} className="animate-spin mr-2" />
                  Carregando…
                </div>
              ) : (
                <SurgicalDocumentHtml
                  term={docTerm}
                  setTerm={setDocTerm}
                  sigDoctor={sigDoctor}
                  setSigDoctor={setSigDoctor}
                  sigPatient={sigPatient}
                  setSigPatient={setSigPatient}
                  sigWitness={sigWitness}
                  setSigWitness={setSigWitness}
                  formState={formState}
                  setFormState={setFormState}
                />
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <div className="mr-auto flex items-center gap-2 text-xs text-slate-500">
                {(docSaving || autoSaving) && (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    {docSaving ? 'Salvando…' : 'Salvando automaticamente…'}
                  </>
                )}
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setDocOpen(false)}
                disabled={docSaving || autoSaving}
              >
                Fechar
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={saveDocument}
                disabled={docSaving || autoSaving || docLoading || !docCase}
                title="Salvar no sistema"
              >
                <Save size={14} />
                {docSaving ? 'Salvando…' : 'Salvar'}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={printPdf}
                disabled={docSaving || autoSaving || docLoading || !docCase}
                title="Salvar e abrir impressão para baixar PDF"
              >
                <FileText size={14} />
                Baixar PDF
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </PageLayout>
  )
}
