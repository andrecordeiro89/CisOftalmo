import { useState, useEffect } from 'react'
import {
  ClipboardList, ChevronRight, CheckCircle2,
  RefreshCw, User, Save, ArrowLeft, List
} from 'lucide-react'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { PageLayout } from '@/components/PageLayout'
import { StatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { formatCPF, formatDate } from '@/lib/pdfExtractor'
import { type Visit, type Patient, AV_OPTIONS } from '@/types'

interface VisitWithPatient extends Visit { patient: Patient }
type Tab = 'motivo' | 'anamnese' | 'exames' | 'resumo'
type MobileView = 'fila' | 'form'

interface TriagemForm {
  consultation_reason: string; main_complaints: string[]; other_complaint: string
  systemic_diseases: string[]; diabetes_duration: string; hypertension_duration: string
  continuous_medications: string[]; other_medications: string
  previous_eye_surgery: boolean; surgery_types: string[]; surgery_other: string; surgery_eye: string
  eye_trauma: boolean; trauma_eye: string; trauma_time: string; trauma_description: string
  drug_allergy: boolean; drug_allergy_description: string
  av_od_cc: string; av_od_sc: string; av_oe_cc: string; av_oe_sc: string
  autorefractor_od_spherical: string; autorefractor_od_cylindrical: string
  autorefractor_od_axis: string; autorefractor_od_k1: string; autorefractor_od_k2: string
  autorefractor_oe_spherical: string; autorefractor_oe_cylindrical: string
  autorefractor_oe_axis: string; autorefractor_oe_k1: string; autorefractor_oe_k2: string
  biometry_od_axial: string; biometry_oe_axial: string; triage_notes: string
}

const EMPTY: TriagemForm = {
  consultation_reason: '', main_complaints: [], other_complaint: '',
  systemic_diseases: [], diabetes_duration: '', hypertension_duration: '',
  continuous_medications: [], other_medications: '',
  previous_eye_surgery: false, surgery_types: [], surgery_other: '', surgery_eye: '',
  eye_trauma: false, trauma_eye: '', trauma_time: '', trauma_description: '',
  drug_allergy: false, drug_allergy_description: '',
  av_od_cc: '', av_od_sc: '', av_oe_cc: '', av_oe_sc: '',
  autorefractor_od_spherical: '', autorefractor_od_cylindrical: '', autorefractor_od_axis: '',
  autorefractor_od_k1: '', autorefractor_od_k2: '',
  autorefractor_oe_spherical: '', autorefractor_oe_cylindrical: '', autorefractor_oe_axis: '',
  autorefractor_oe_k1: '', autorefractor_oe_k2: '',
  biometry_od_axial: '', biometry_oe_axial: '', triage_notes: '',
}

const REASONS = ['Avaliação de Catarata','Consulta de Rotina','Retorno Pós-operatório',
  'Urgência Oftalmológica','Avaliação de Glaucoma','Avaliação de Retina',
  'Avaliação de Córnea','Avaliação de Estrabismo','Consulta para Óculos','Outros']

const COMPLAINTS = ['Visão Embaçada','Diminuição da Visão','Visão Dupla (Diplopia)',
  'Visão Distorcida','Manchas / Pontos Escuros','Moscas Volantes','Flashes de Luz',
  'Dificuldade Visual de Longe','Dificuldade Visual de Perto',
  'Dificuldade para Dirigir à Noite','Outros']

const DISEASES = ['Diabetes','Hipertensão Arterial','Doença Cardíaca',
  'Doença Auto-Imune','Doença da Tireoide','Nenhuma','Outras Doenças']

const MEDS = ['Insulina','Anticoagulante','Corticoide','Colírios Oftalmológicos',
  'Remédio para Próstata','Outros Medicamentos']

const SURGERIES = ['Catarata','Pterígio','Retina','Glaucoma','Estrabismo',
  'Córnea / Transplante','Yag Laser','Vitrectomia','Outra']

const TRAUMA_TIMES = ['Menos de 1 mês','1 a 6 meses','6 meses a 1 ano',
  '1 a 5 anos','Mais de 5 anos']

const EYES = ['Olho Direito','Olho Esquerdo','Ambos']

const TABS: {id: Tab; label: string}[] = [
  {id: 'motivo', label: '1 — Motivo e Queixas'},
  {id: 'anamnese', label: '2 — Anamnese'},
  {id: 'exames', label: '3 — AV / Exames'},
  {id: 'resumo', label: '4 — Resumo'},
]

// ─── Small reusable pieces ────────────────────────────────────────────────────

function ChkItem({label, checked, onChange}: {label: string; checked: boolean; onChange: (v: boolean) => void}) {
  return (
    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
      checked ? 'border-brand-300 bg-brand-50 text-brand-800 font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'
    }`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-brand-600 w-3.5 h-3.5 shrink-0" />
      {label}
    </label>
  )
}

function RadItem({label, checked, onChange}: {label: string; checked: boolean; onChange: () => void}) {
  return (
    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
      checked ? 'border-brand-300 bg-brand-50 text-brand-800 font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'
    }`}>
      <input type="radio" checked={checked} onChange={onChange} className="accent-brand-600 w-3.5 h-3.5 shrink-0" />
      {label}
    </label>
  )
}

function Sec({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 mt-1">{title}</p>
      {children}
    </div>
  )
}

function AVSel({label, value, onChange}: {label: string; value: string; onChange: (v: string) => void}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="input text-sm">
        <option value="">—</option>
        {AV_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function NumF({label, value, onChange, ph='0.00'}: {label: string; value: string; onChange: (v: string) => void; ph?: string}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" step="0.01" value={value} onChange={e => onChange(e.target.value)}
        placeholder={ph} className="input text-sm" />
    </div>
  )
}

function RRow({label, value}: {label: string; value: string}) {
  return (
    <div className="flex gap-2 py-1 text-sm">
      <span className="text-brand-600 font-medium shrink-0 w-44">{label}:</span>
      <span className="text-slate-700">{value || '—'}</span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Triagem() {
  const {toast} = useToast()
  const [visits, setVisits] = useState<VisitWithPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<VisitWithPatient | null>(null)
  const [mobileView, setMobileView] = useState<MobileView>('fila')
  const [tab, setTab] = useState<Tab>('motivo')
  const [examSectionsOpen, setExamSectionsOpen] = useState(() => {
    const isMobile =
      typeof window !== 'undefined' &&
      typeof window.matchMedia !== 'undefined' &&
      window.matchMedia('(max-width: 640px)').matches

    return {
      av: true,
      autorefracao: !isMobile,
      biometria: !isMobile,
      observacoes: !isMobile,
    }
  })
  const [form, setForm] = useState<TriagemForm>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const {data, error} = await supabase
      .from('visits')
      .select('*, patient:patients(*)')
      .in('status', ['triagem', 'aguardando_consulta'])
      .order('created_at', {ascending: true})
    if (error) toast('Erro ao carregar pacientes', 'error')
    else setVisits((data ?? []) as VisitWithPatient[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (key: keyof TriagemForm, value: unknown) =>
    setForm(f => ({...f, [key]: value}))

  const toggle = (key: keyof TriagemForm, item: string) => {
    const arr = form[key] as string[]
    set(key, arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }
  const toggleExamSection = (key: keyof typeof examSectionsOpen) =>
    setExamSectionsOpen(s => ({ ...s, [key]: !s[key] }))

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)

    const {error: tErr} = await supabase.from('triage').upsert({
      visit_id: selected.id,
      consultation_reason: form.consultation_reason,
      main_complaints: form.main_complaints,
      other_complaint: form.other_complaint || null,
      systemic_diseases: form.systemic_diseases,
      diabetes_duration: form.diabetes_duration || null,
      hypertension_duration: form.hypertension_duration || null,
      continuous_medications: form.continuous_medications,
      other_medications: form.other_medications || null,
      previous_eye_surgery: form.previous_eye_surgery,
      eye_surgeries: form.previous_eye_surgery ? {types: form.surgery_types, other: form.surgery_other, eye: form.surgery_eye} : null,
      eye_trauma: form.eye_trauma,
      trauma_details: form.eye_trauma ? {eye: form.trauma_eye, time_range: form.trauma_time, description: form.trauma_description} : null,
      drug_allergy: form.drug_allergy,
      drug_allergy_description: form.drug_allergy ? form.drug_allergy_description : null,
      av_od_cc: form.av_od_cc, av_od_sc: form.av_od_sc,
      av_oe_cc: form.av_oe_cc, av_oe_sc: form.av_oe_sc,
      autorefractor_od: {spherical: form.autorefractor_od_spherical || null, cylindrical: form.autorefractor_od_cylindrical || null,
        axis: form.autorefractor_od_axis || null, k1: form.autorefractor_od_k1 || null, k2: form.autorefractor_od_k2 || null},
      autorefractor_oe: {spherical: form.autorefractor_oe_spherical || null, cylindrical: form.autorefractor_oe_cylindrical || null,
        axis: form.autorefractor_oe_axis || null, k1: form.autorefractor_oe_k1 || null, k2: form.autorefractor_oe_k2 || null},
      biometry_od_axial: form.biometry_od_axial ? parseFloat(form.biometry_od_axial) : null,
      biometry_oe_axial: form.biometry_oe_axial ? parseFloat(form.biometry_oe_axial) : null,
      triage_notes: form.triage_notes || null,
    }, {onConflict: 'visit_id'})

    if (tErr) { toast('Erro ao salvar: ' + tErr.message, 'error'); setSaving(false); return }

    await supabase.from('visits').update({status: 'aguardando_consulta'}).eq('id', selected.id)
    toast(`Triagem de ${selected.patient.name} salva!`, 'success')
    setSelected(null); setForm(EMPTY); setTab('motivo'); setMobileView('fila'); load()
    setSaving(false)
  }

  const select = (v: VisitWithPatient) => { setSelected(v); setForm(EMPTY); setTab('motivo'); setMobileView('form') }

  const pending = visits.filter(v => v.status === 'triagem')
  const triaged = visits.filter(v => v.status === 'aguardando_consulta')
  const tabIdx = TABS.findIndex(t => t.id === tab)

  return (
    <PageLayout title="Triagem" subtitle="Coleta de dados clínicos pré-consulta"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileView(v => v === 'fila' ? 'form' : 'fila')}
            className="btn-ghost md:hidden"
            disabled={mobileView === 'form' && !selected}
            title="Alternar"
          >
            <List size={14} />
            {mobileView === 'fila' ? 'Formulário' : 'Fila'}
          </button>
          <button onClick={load} className="btn-ghost" title="Atualizar"><RefreshCw size={14} /></button>
        </div>
      }>
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-[calc(100vh-145px)] min-h-0">

        {/* Queue */}
        <div className={`w-full md:w-64 shrink-0 flex flex-col gap-3 ${mobileView === 'form' ? 'hidden md:flex' : ''}`}>
          <div className="card flex flex-col overflow-hidden flex-1">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <p className="text-sm font-semibold text-slate-700">Aguardando
                <span className="ml-1 text-xs font-normal text-slate-400">({pending.length})</span>
              </p>
            </div>
            <div className="flex-1 overflow-auto scrollbar-thin divide-y divide-slate-50">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
                  <RefreshCw size={12} className="animate-spin" /> Carregando…
                </div>
              ) : pending.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Nenhum paciente</p>
              ) : pending.map(v => (
                <QueueItem key={v.id} visit={v} selected={selected?.id === v.id} onClick={() => select(v)} />
              ))}
            </div>
          </div>

          {triaged.length > 0 && (
            <div className="card flex flex-col overflow-hidden max-h-56">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <p className="text-sm font-semibold text-slate-700">Triados
                  <span className="ml-1 text-xs font-normal text-slate-400">({triaged.length})</span>
                </p>
              </div>
              <div className="flex-1 overflow-auto scrollbar-thin divide-y divide-slate-50">
                {triaged.map(v => (
                  <QueueItem key={v.id} visit={v} selected={selected?.id === v.id} onClick={() => select(v)} done />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Form panel */}
        <div className={`flex-1 flex flex-col card overflow-hidden min-h-0 ${mobileView === 'fila' ? 'hidden md:flex' : ''}`}>
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <ClipboardList size={36} className="opacity-20" />
              <p className="text-slate-500 font-medium">Selecione um paciente para iniciar a triagem</p>
              <button onClick={() => setMobileView('fila')} className="btn-secondary md:hidden">Ver fila</button>
            </div>
          ) : (
            <>
              {/* Patient header */}
              <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
                <button onClick={() => setMobileView('fila')} className="btn-ghost p-2 md:hidden" aria-label="Voltar para fila">
                  <ArrowLeft size={16} />
                </button>
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <span className="font-semibold text-brand-700 text-sm">{selected.patient.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{selected.patient.name}</p>
                  <p className="text-xs text-slate-500">
                    CPF {formatCPF(selected.patient.cpf)}
                    {selected.patient.birth_date && ` · ${formatDate(selected.patient.birth_date)}`}
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 px-4 sm:px-5 shrink-0 overflow-x-auto">
                {TABS.map((t, i) => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${
                      tab === t.id ? 'border-brand-500 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto scrollbar-thin p-4 sm:p-5">
                <div className="md:hidden -mt-1 mb-4">
                  <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
                    {[
                      { id: 'motivo' as const, label: 'Motivo' },
                      { id: 'anamnese' as const, label: 'Anamnese' },
                      { id: 'exames' as const, label: 'Exames' },
                      { id: 'resumo' as const, label: 'Resumo' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={`shrink-0 px-3 py-2 rounded-full text-xs font-medium min-h-[44px] transition-colors ${
                          tab === t.id
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TAB 1 */}
                {tab === 'motivo' && (
                  <div className="flex flex-col gap-5 max-w-2xl">
                    <Sec title="Motivo da Consulta">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {REASONS.map(r => (
                          <RadItem key={r} label={r} checked={form.consultation_reason === r}
                            onChange={() => set('consultation_reason', r)} />
                        ))}
                      </div>
                      {form.consultation_reason === 'Outros' && (
                        <textarea value={form.other_complaint}
                          onChange={e => set('other_complaint', e.target.value)}
                          placeholder="Descreva o motivo…" rows={2}
                          className="input mt-2 resize-none text-sm" />
                      )}
                    </Sec>
                    <Sec title="Queixas Principais (múltipla escolha)">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {COMPLAINTS.map(c => (
                          <ChkItem key={c} label={c} checked={form.main_complaints.includes(c)}
                            onChange={() => toggle('main_complaints', c)} />
                        ))}
                      </div>
                      {form.main_complaints.includes('Outros') && (
                        <textarea value={form.other_complaint}
                          onChange={e => set('other_complaint', e.target.value)}
                          placeholder="Outras queixas…" rows={2}
                          className="input mt-2 resize-none text-sm" />
                      )}
                    </Sec>
                  </div>
                )}

                {/* TAB 2 */}
                {tab === 'anamnese' && (
                  <div className="flex flex-col gap-5 max-w-2xl">
                    <Sec title="Doenças Sistêmicas">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {DISEASES.map(d => (
                          <ChkItem key={d} label={d} checked={form.systemic_diseases.includes(d)}
                            onChange={() => toggle('systemic_diseases', d)} />
                        ))}
                      </div>
                      {form.systemic_diseases.includes('Diabetes') && (
                        <div className="mt-2">
                          <label className="label">Tempo de diabetes</label>
                          <input className="input text-sm" placeholder="Ex: 5 anos"
                            value={form.diabetes_duration}
                            onChange={e => set('diabetes_duration', e.target.value)} />
                        </div>
                      )}
                      {form.systemic_diseases.includes('Hipertensão Arterial') && (
                        <div className="mt-2">
                          <label className="label">Tempo de hipertensão</label>
                          <input className="input text-sm" placeholder="Ex: 10 anos"
                            value={form.hypertension_duration}
                            onChange={e => set('hypertension_duration', e.target.value)} />
                        </div>
                      )}
                    </Sec>

                    <Sec title="Medicamentos Contínuos">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {MEDS.map(m => (
                          <ChkItem key={m} label={m} checked={form.continuous_medications.includes(m)}
                            onChange={() => toggle('continuous_medications', m)} />
                        ))}
                      </div>
                      {form.continuous_medications.includes('Outros Medicamentos') && (
                        <input className="input text-sm mt-2" placeholder="Quais medicamentos?"
                          value={form.other_medications}
                          onChange={e => set('other_medications', e.target.value)} />
                      )}
                    </Sec>

                    <Sec title="Histórico Ocular e Alergias">
                      {/* Surgery */}
                      <div className="flex flex-col gap-3 p-4 rounded-xl border border-slate-200 mb-3">
                        <p className="text-sm font-medium text-slate-700">Realizou alguma cirurgia ocular?</p>
                        <div className="flex gap-2">
                          {['Sim','Não'].map(v => (
                            <RadItem key={v} label={v}
                              checked={form.previous_eye_surgery === (v === 'Sim')}
                              onChange={() => set('previous_eye_surgery', v === 'Sim')} />
                          ))}
                        </div>
                        {form.previous_eye_surgery && (
                          <div className="flex flex-col gap-3 animate-fade-in">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {SURGERIES.map(s => (
                                <ChkItem key={s} label={s} checked={form.surgery_types.includes(s)}
                                  onChange={() => toggle('surgery_types', s)} />
                              ))}
                            </div>
                            {form.surgery_types.includes('Outra') && (
                              <input className="input text-sm" placeholder="Qual cirurgia?"
                                value={form.surgery_other} onChange={e => set('surgery_other', e.target.value)} />
                            )}
                            <div>
                              <label className="label">Em qual olho?</label>
                              <div className="flex gap-2">
                                {EYES.map(e => (
                                  <RadItem key={e} label={e} checked={form.surgery_eye === e}
                                    onChange={() => set('surgery_eye', e)} />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Trauma */}
                      <div className="flex flex-col gap-3 p-4 rounded-xl border border-slate-200 mb-3">
                        <p className="text-sm font-medium text-slate-700">Já teve algum trauma ocular?</p>
                        <div className="flex gap-2">
                          {['Sim','Não'].map(v => (
                            <RadItem key={v} label={v}
                              checked={form.eye_trauma === (v === 'Sim')}
                              onChange={() => set('eye_trauma', v === 'Sim')} />
                          ))}
                        </div>
                        {form.eye_trauma && (
                          <div className="flex flex-col gap-3 animate-fade-in">
                            <div>
                              <label className="label">Qual olho?</label>
                              <div className="flex gap-2">
                                {EYES.map(e => (
                                  <RadItem key={e} label={e} checked={form.trauma_eye === e}
                                    onChange={() => set('trauma_eye', e)} />
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="label">Há quanto tempo?</label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {TRAUMA_TIMES.map(t => (
                                  <RadItem key={t} label={t} checked={form.trauma_time === t}
                                    onChange={() => set('trauma_time', t)} />
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="label">Descrição do trauma</label>
                              <textarea className="input text-sm resize-none" rows={2}
                                value={form.trauma_description}
                                onChange={e => set('trauma_description', e.target.value)}
                                placeholder="Descreva o que ocorreu…" />
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Allergy */}
                      <div className="flex flex-col gap-3 p-4 rounded-xl border border-slate-200">
                        <p className="text-sm font-medium text-slate-700">Possui alergia medicamentosa?</p>
                        <div className="flex gap-2">
                          {['Sim','Não'].map(v => (
                            <RadItem key={v} label={v}
                              checked={form.drug_allergy === (v === 'Sim')}
                              onChange={() => set('drug_allergy', v === 'Sim')} />
                          ))}
                        </div>
                        {form.drug_allergy && (
                          <input className="input text-sm animate-fade-in" placeholder="Qual medicamento?"
                            value={form.drug_allergy_description}
                            onChange={e => set('drug_allergy_description', e.target.value)} />
                        )}
                      </div>
                    </Sec>
                  </div>
                )}

                {/* TAB 3 */}
                {tab === 'exames' && (
                  <div className="flex flex-col gap-5 max-w-2xl">
                    <CollapsibleSection
                      title="Acuidade Visual"
                      open={examSectionsOpen.av}
                      onToggle={() => toggleExamSection('av')}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Olho Direito (OD)</p>
                          <div className="flex flex-col gap-2">
                            <AVSel label="AV CC — Com Correção" value={form.av_od_cc} onChange={v => set('av_od_cc', v)} />
                            <AVSel label="AV SC — Sem Correção" value={form.av_od_sc} onChange={v => set('av_od_sc', v)} />
                          </div>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Olho Esquerdo (OE)</p>
                          <div className="flex flex-col gap-2">
                            <AVSel label="AV CC — Com Correção" value={form.av_oe_cc} onChange={v => set('av_oe_cc', v)} />
                            <AVSel label="AV SC — Sem Correção" value={form.av_oe_sc} onChange={v => set('av_oe_sc', v)} />
                          </div>
                        </div>
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                      title="Autorrefração"
                      open={examSectionsOpen.autorefracao}
                      onToggle={() => toggleExamSection('autorefracao')}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">OD</p>
                          <div className="grid grid-cols-2 gap-2">
                            <NumF label="Esférico" value={form.autorefractor_od_spherical} onChange={v => set('autorefractor_od_spherical', v)} ph="+0.00" />
                            <NumF label="Cilíndrico" value={form.autorefractor_od_cylindrical} onChange={v => set('autorefractor_od_cylindrical', v)} ph="-0.00" />
                            <NumF label="Eixo (°)" value={form.autorefractor_od_axis} onChange={v => set('autorefractor_od_axis', v)} ph="0" />
                            <NumF label="K1" value={form.autorefractor_od_k1} onChange={v => set('autorefractor_od_k1', v)} />
                            <NumF label="K2" value={form.autorefractor_od_k2} onChange={v => set('autorefractor_od_k2', v)} />
                          </div>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">OE</p>
                          <div className="grid grid-cols-2 gap-2">
                            <NumF label="Esférico" value={form.autorefractor_oe_spherical} onChange={v => set('autorefractor_oe_spherical', v)} ph="+0.00" />
                            <NumF label="Cilíndrico" value={form.autorefractor_oe_cylindrical} onChange={v => set('autorefractor_oe_cylindrical', v)} ph="-0.00" />
                            <NumF label="Eixo (°)" value={form.autorefractor_oe_axis} onChange={v => set('autorefractor_oe_axis', v)} ph="0" />
                            <NumF label="K1" value={form.autorefractor_oe_k1} onChange={v => set('autorefractor_oe_k1', v)} />
                            <NumF label="K2" value={form.autorefractor_oe_k2} onChange={v => set('autorefractor_oe_k2', v)} />
                          </div>
                        </div>
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                      title="Biometria — Diâmetro Axial"
                      open={examSectionsOpen.biometria}
                      onToggle={() => toggleExamSection('biometria')}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <NumF label="OD (mm)" value={form.biometry_od_axial} onChange={v => set('biometry_od_axial', v)} ph="23.00" />
                        <NumF label="OE (mm)" value={form.biometry_oe_axial} onChange={v => set('biometry_oe_axial', v)} ph="23.00" />
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                      title="Observações de Triagem"
                      open={examSectionsOpen.observacoes}
                      onToggle={() => toggleExamSection('observacoes')}
                    >
                      <textarea className="input text-sm resize-none" rows={3}
                        placeholder="Anotações adicionais…"
                        value={form.triage_notes}
                        onChange={e => set('triage_notes', e.target.value)} />
                    </CollapsibleSection>
                  </div>
                )}

                {/* TAB 4 */}
                {tab === 'resumo' && (
                  <div className="flex flex-col gap-4 max-w-2xl">
                    <div className="p-5 rounded-xl bg-brand-50 border border-brand-100">
                      <p className="text-sm font-semibold text-brand-800 mb-3 flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-brand-600" /> Resumo da Triagem
                      </p>
                      <RRow label="Motivo" value={form.consultation_reason} />
                      <RRow label="Queixas" value={form.main_complaints.join(', ')} />
                      <RRow label="Doenças sistêmicas" value={form.systemic_diseases.join(', ') || 'Nenhuma'} />
                      {form.diabetes_duration && <RRow label="Tempo diabetes" value={form.diabetes_duration} />}
                      {form.hypertension_duration && <RRow label="Tempo hipertensão" value={form.hypertension_duration} />}
                      <RRow label="Medicamentos" value={form.continuous_medications.join(', ') || 'Nenhum'} />
                      <RRow label="Cirurgia ocular prévia" value={form.previous_eye_surgery ? `Sim — ${form.surgery_types.join(', ')} (${form.surgery_eye})` : 'Não'} />
                      <RRow label="Trauma ocular" value={form.eye_trauma ? `Sim — ${form.trauma_eye} (${form.trauma_time})` : 'Não'} />
                      <RRow label="Alergia medicamentosa" value={form.drug_allergy ? (form.drug_allergy_description || 'Sim') : 'Não'} />
                      <div className="border-t border-brand-200 my-3" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        <RRow label="AV OD CC" value={form.av_od_cc} />
                        <RRow label="AV OD SC" value={form.av_od_sc} />
                        <RRow label="AV OE CC" value={form.av_oe_cc} />
                        <RRow label="AV OE SC" value={form.av_oe_sc} />
                      </div>
                      {(form.autorefractor_od_spherical || form.autorefractor_oe_spherical) && (
                        <>
                          <div className="border-t border-brand-200 my-3" />
                          <RRow label="Autoref. OD" value={`Esf ${form.autorefractor_od_spherical} / Cil ${form.autorefractor_od_cylindrical} / Eixo ${form.autorefractor_od_axis}°`} />
                          <RRow label="Autoref. OE" value={`Esf ${form.autorefractor_oe_spherical} / Cil ${form.autorefractor_oe_cylindrical} / Eixo ${form.autorefractor_oe_axis}°`} />
                        </>
                      )}
                      {(form.biometry_od_axial || form.biometry_oe_axial) && (
                        <>
                          <div className="border-t border-brand-200 my-3" />
                          <RRow label="Biom. OD axial" value={form.biometry_od_axial ? `${form.biometry_od_axial} mm` : ''} />
                          <RRow label="Biom. OE axial" value={form.biometry_oe_axial ? `${form.biometry_oe_axial} mm` : ''} />
                        </>
                      )}
                      {form.triage_notes && (
                        <>
                          <div className="border-t border-brand-200 my-3" />
                          <RRow label="Observações" value={form.triage_notes} />
                        </>
                      )}
                    </div>
                    <button onClick={handleSave} disabled={saving} className="btn-primary hidden md:inline-flex">
                      <Save size={14} />
                      {saving ? 'Salvando…' : 'Salvar Triagem e Encaminhar para Consulta'}
                    </button>
                  </div>
                )}
              </div>

              {/* Footer nav */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-slate-100 bg-white shrink-0 safe-bottom">
                <button onClick={() => tabIdx > 0 && setTab(TABS[tabIdx - 1].id)}
                  disabled={tabIdx === 0} className="btn-secondary text-xs disabled:opacity-30">
                  ← Anterior
                </button>
                {tab !== 'resumo' ? (
                  <button onClick={() => setTab(TABS[tabIdx + 1].id)} className="btn-primary text-xs">
                    Próximo →
                  </button>
                ) : (
                  <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
                    <Save size={12} />
                    {saving ? 'Salvando…' : 'Salvar e Encaminhar'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

function QueueItem({visit, selected, onClick, done = false}: {
  visit: VisitWithPatient; selected: boolean; onClick: () => void; done?: boolean
}) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
        selected ? 'bg-brand-50' : 'hover:bg-slate-50'
      }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        done ? 'bg-emerald-100' : 'bg-amber-100'
      }`}>
        {done ? <CheckCircle2 size={14} className="text-emerald-600" />
               : <User size={14} className="text-amber-700" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{visit.patient.name}</p>
        <p className="text-xs text-slate-400">
          {new Date(visit.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
        </p>
      </div>
      <ChevronRight size={12} className="text-slate-300 shrink-0" />
    </button>
  )
}
