import { useState, useEffect } from 'react'
import { RefreshCw, Stethoscope, ChevronRight, CheckCircle2, Save, User } from 'lucide-react'
import { PageLayout } from '@/components/PageLayout'
import { StatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { formatCPF, formatDate } from '@/lib/pdfExtractor'
import { type Visit, type Patient } from '@/types'

interface VisitWithPatient extends Visit {
  patient: Patient
  triage?: Record<string, unknown>
}

interface ConsultaForm {
  biomicroscopy_od: string; biomicroscopy_oe: string
  fo_od: string[]; fo_oe: string[]
  tono_od_type: string; tono_od_value: string
  tono_oe_type: string; tono_oe_value: string
  ortho_motility: string; ortho_fusion: string; ortho_pupils: string; ortho_deviation: string
  topography: string; mec: string
  diagnostics: string[]; other_diagnosis: string; cid: string
  // Conduta
  conduct_cataract: boolean
  cataract_eye: string; cataract_first: string
  cataract_od_diopter: string; cataract_oe_diopter: string; cataract_notes: string
  conduct_yag: boolean; yag_eye: string; yag_notes: string
  conduct_glasses: boolean
  conduct_return: boolean; return_deadline: string
  conduct_discharge: boolean
  conduct_other: boolean; other_conduct: string
  patient_consent: boolean
}

const EMPTY_C: ConsultaForm = {
  biomicroscopy_od: '', biomicroscopy_oe: '',
  fo_od: [], fo_oe: [],
  tono_od_type: '', tono_od_value: '', tono_oe_type: '', tono_oe_value: '',
  ortho_motility: '', ortho_fusion: '', ortho_pupils: '', ortho_deviation: '',
  topography: '', mec: '',
  diagnostics: [], other_diagnosis: '', cid: '',
  conduct_cataract: false, cataract_eye: '', cataract_first: '',
  cataract_od_diopter: '', cataract_oe_diopter: '', cataract_notes: '',
  conduct_yag: false, yag_eye: '', yag_notes: '',
  conduct_glasses: false,
  conduct_return: false, return_deadline: '',
  conduct_discharge: false,
  conduct_other: false, other_conduct: '',
  patient_consent: false,
}

const FO_OPTIONS = ['Normal','Maculopatia','Suspeita de Glaucoma','RPD','Outro']
const TONO_TYPES = ['Normotenso','Hipertenso','Outro']
const ORTHO_OPTIONS = ['Preservada','Restrita','Alterada','Preservados','Alterados']
const TOPOMEC = ['Normal','Alterada']

const DIAGNOSTICS = [
  'Olho Seco','Conjuntivite','Pterígio','Consulta de Rotina',
  'Blefarite / Meibomite','Suspeita de Glaucoma','Refração Estável',
  'Trauma Ocular','DMRI','Catarata','Erro Refrativo',
  'Retinopatia Diabética','Retinopatia Hipertensiva','Outra',
]

const EYES3 = ['OD','OE','AO']

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChkBox({label, checked, onChange}: {label: string; checked: boolean; onChange: (v: boolean) => void}) {
  return (
    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
      checked ? 'border-brand-300 bg-brand-50 text-brand-800 font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'
    }`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-brand-600 w-3.5 h-3.5 shrink-0" />
      {label}
    </label>
  )
}

function Rad({label, checked, onChange}: {label: string; checked: boolean; onChange: () => void}) {
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
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  )
}

function TriageTag({label, value}: {label: string; value: unknown}) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  const display = Array.isArray(value) ? (value as string[]).join(', ') : String(value)
  return (
    <div className="flex flex-wrap gap-1 mb-1">
      <span className="text-xs font-semibold text-slate-500 mr-1">{label}:</span>
      <span className="text-xs text-slate-700">{display}</span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Consulta() {
  const {toast} = useToast()
  const [visits, setVisits] = useState<VisitWithPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<VisitWithPatient | null>(null)
  const [form, setForm] = useState<ConsultaForm>(EMPTY_C)
  const [saving, setSaving] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  const load = async () => {
    setLoading(true)
    const {data, error} = await supabase
      .from('visits')
      .select('*, patient:patients(*), triage(*)')
      .in('status', ['aguardando_consulta','em_consulta'])
      .order('created_at', {ascending: true})
    if (error) toast('Erro ao carregar', 'error')
    else setVisits((data ?? []) as VisitWithPatient[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (key: keyof ConsultaForm, value: unknown) =>
    setForm(f => ({...f, [key]: value}))

  const toggleArr = (key: keyof ConsultaForm, item: string) => {
    const arr = form[key] as string[]
    set(key, arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }

  const selectVisit = async (v: VisitWithPatient) => {
    setSelected(v); setForm(EMPTY_C); setShowSummary(false)
    await supabase.from('visits').update({status: 'em_consulta'}).eq('id', v.id)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)

    const hasCataract = form.conduct_cataract

    const {error} = await supabase.from('medical_records').upsert({
      visit_id: selected.id,
      biomicroscopy_od: form.biomicroscopy_od,
      biomicroscopy_oe: form.biomicroscopy_oe,
      fo_od: form.fo_od,
      fo_oe: form.fo_oe,
      tono_od: form.tono_od_type + (form.tono_od_value ? ` (${form.tono_od_value})` : ''),
      tono_oe: form.tono_oe_type + (form.tono_oe_value ? ` (${form.tono_oe_value})` : ''),
      orthoptic_motility: form.ortho_motility,
      orthoptic_fusion: form.ortho_fusion,
      orthoptic_pupils: form.ortho_pupils,
      orthoptic_deviation: form.ortho_deviation,
      topography: form.topography,
      mec: form.mec,
      diagnostic_impressions: form.diagnostics,
      other_diagnosis: form.other_diagnosis || null,
      cid: form.cid || null,
      conduct: {
        cataract: hasCataract ? {
          eye: form.cataract_eye, first_eye: form.cataract_first,
          od_diopter: form.cataract_od_diopter ? parseFloat(form.cataract_od_diopter) : null,
          oe_diopter: form.cataract_oe_diopter ? parseFloat(form.cataract_oe_diopter) : null,
          notes: form.cataract_notes,
        } : null,
        yag: form.conduct_yag ? {eye: form.yag_eye, notes: form.yag_notes} : null,
        glasses: form.conduct_glasses,
        return: form.conduct_return ? form.return_deadline : null,
        discharge: form.conduct_discharge,
        other: form.conduct_other ? form.other_conduct : null,
      },
      patient_consent: form.patient_consent,
    }, {onConflict: 'visit_id'})

    if (error) { toast('Erro ao salvar: ' + error.message, 'error'); setSaving(false); return }

    const newStatus = hasCataract ? 'aguardando_agendamento' : 'finalizado'
    await supabase.from('visits').update({status: newStatus}).eq('id', selected.id)

    toast(`Consulta de ${selected.patient.name} finalizada!`, 'success')
    setShowSummary(true)
    load()
    setSaving(false)
  }

  const pending = visits.filter(v => v.status === 'aguardando_consulta')
  const inConsulta = visits.filter(v => v.status === 'em_consulta')
  const triage = selected?.triage as Record<string, unknown> | undefined

  return (
    <PageLayout title="Consulta Médica" subtitle="Evolução e conduta do atendimento"
      actions={<button onClick={load} className="btn-ghost"><RefreshCw size={14} /></button>}>
      <div className="flex gap-6 h-[calc(100vh-145px)]">

        {/* Queue */}
        <div className="w-64 shrink-0 flex flex-col gap-3">
          <div className="card flex flex-col overflow-hidden flex-1">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />
              <p className="text-sm font-semibold text-slate-700">Aguardando
                <span className="ml-1 text-xs font-normal text-slate-400">({pending.length})</span>
              </p>
            </div>
            <div className="flex-1 overflow-auto scrollbar-thin divide-y divide-slate-50">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
                  <RefreshCw size={12} className="animate-spin" />Carregando…
                </div>
              ) : pending.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Nenhum paciente</p>
              ) : pending.map(v => (
                <CQueueItem key={v.id} visit={v} selected={selected?.id === v.id} onClick={() => selectVisit(v)} />
              ))}
            </div>
          </div>

          {inConsulta.length > 0 && (
            <div className="card overflow-hidden max-h-48">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <p className="text-sm font-semibold text-slate-700">Em Consulta
                  <span className="ml-1 text-xs font-normal text-slate-400">({inConsulta.length})</span>
                </p>
              </div>
              <div className="divide-y divide-slate-50 overflow-auto max-h-36 scrollbar-thin">
                {inConsulta.map(v => (
                  <CQueueItem key={v.id} visit={v} selected={selected?.id === v.id} onClick={() => selectVisit(v)} inProgress />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main panel */}
        <div className="flex-1 flex flex-col card overflow-hidden">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <Stethoscope size={36} className="opacity-20" />
              <p className="text-slate-500 font-medium">Selecione um paciente para iniciar a consulta</p>
            </div>
          ) : showSummary ? (
            <ConsultaSummary form={form} patient={selected.patient} onClose={() => {setShowSummary(false); setSelected(null)}} />
          ) : (
            <>
              {/* Patient header */}
              <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <span className="font-semibold text-purple-700 text-sm">{selected.patient.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{selected.patient.name}</p>
                  <p className="text-xs text-slate-500">CPF {formatCPF(selected.patient.cpf)}
                    {selected.patient.birth_date && ` · ${formatDate(selected.patient.birth_date)}`}
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="flex-1 overflow-auto scrollbar-thin p-5 flex flex-col gap-6">

                {/* ── Triage summary (read-only) ── */}
                {triage && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Resumo da Triagem</p>
                    <div className="grid grid-cols-2 gap-x-6">
                      <TriageTag label="Motivo" value={triage.consultation_reason} />
                      <TriageTag label="Queixas" value={triage.main_complaints} />
                      <TriageTag label="Doenças" value={triage.systemic_diseases} />
                      <TriageTag label="Medicamentos" value={triage.continuous_medications} />
                      <TriageTag label="Alergia" value={triage.drug_allergy ? (triage.drug_allergy_description || 'Sim') : 'Não'} />
                      <TriageTag label="Cirurgia prévia" value={triage.previous_eye_surgery ? 'Sim' : 'Não'} />
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[['AV OD CC', triage.av_od_cc],['AV OD SC', triage.av_od_sc],['AV OE CC', triage.av_oe_cc],['AV OE SC', triage.av_oe_sc]]
                        .map(([l, v]) => v ? (
                          <div key={l as string} className="px-2 py-1 rounded bg-white border border-slate-200 text-center">
                            <p className="text-xs text-slate-400">{l as string}</p>
                            <p className="text-sm font-semibold text-slate-800">{v as string}</p>
                          </div>
                        ) : null)}
                    </div>
                  </div>
                )}

                {/* ── Medical evaluation ── */}
                <Sec title="Biomicroscopia">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">OD</label>
                      <textarea className="input text-sm resize-none" rows={3} value={form.biomicroscopy_od}
                        onChange={e => set('biomicroscopy_od', e.target.value)} placeholder="Biomicroscopia olho direito…" />
                    </div>
                    <div>
                      <label className="label">OE</label>
                      <textarea className="input text-sm resize-none" rows={3} value={form.biomicroscopy_oe}
                        onChange={e => set('biomicroscopy_oe', e.target.value)} placeholder="Biomicroscopia olho esquerdo…" />
                    </div>
                  </div>
                </Sec>

                <Sec title="Fundo de Olho (FO/MR)">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="label">OD</p>
                      <div className="flex flex-col gap-1">
                        {FO_OPTIONS.map(o => (
                          <ChkBox key={o} label={o} checked={form.fo_od.includes(o)}
                            onChange={() => toggleArr('fo_od', o)} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="label">OE</p>
                      <div className="flex flex-col gap-1">
                        {FO_OPTIONS.map(o => (
                          <ChkBox key={o} label={o} checked={form.fo_oe.includes(o)}
                            onChange={() => toggleArr('fo_oe', o)} />
                        ))}
                      </div>
                    </div>
                  </div>
                </Sec>

                <Sec title="Tonometria (PIO)">
                  <div className="grid grid-cols-2 gap-4">
                    {[{side: 'OD', typeKey: 'tono_od_type', valKey: 'tono_od_value'} as const,
                      {side: 'OE', typeKey: 'tono_oe_type', valKey: 'tono_oe_value'} as const,
                    ].map(({side, typeKey, valKey}) => (
                      <div key={side} className="p-3 rounded-xl border border-slate-200">
                        <p className="label mb-2">{side}</p>
                        <div className="flex flex-col gap-1 mb-2">
                          {TONO_TYPES.map(t => (
                            <Rad key={t} label={t} checked={form[typeKey] === t}
                              onChange={() => set(typeKey, t)} />
                          ))}
                        </div>
                        <input className="input text-sm" placeholder="Valor (mmHg)"
                          value={form[valKey]} onChange={e => set(valKey, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </Sec>

                <Sec title="Teste Ortóptico / Motilidade">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="label">Motilidade Ocular</p>
                      <div className="flex flex-col gap-1">
                        {['Preservada','Restrita'].map(o => (
                          <Rad key={o} label={o} checked={form.ortho_motility === o}
                            onChange={() => set('ortho_motility', o)} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="label">Fusional</p>
                      <div className="flex flex-col gap-1">
                        {['Preservada','Alterada'].map(o => (
                          <Rad key={o} label={o} checked={form.ortho_fusion === o}
                            onChange={() => set('ortho_fusion', o)} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="label">Reflexos Pupilares</p>
                      <div className="flex flex-col gap-1">
                        {['Preservados','Alterados'].map(o => (
                          <Rad key={o} label={o} checked={form.ortho_pupils === o}
                            onChange={() => set('ortho_pupils', o)} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="label">Desvios Oculares</p>
                      <input className="input text-sm" value={form.ortho_deviation}
                        onChange={e => set('ortho_deviation', e.target.value)} placeholder="Se houver…" />
                    </div>
                    <div>
                      <p className="label">Topografia (TOPO)</p>
                      <div className="flex gap-2">
                        {TOPOMEC.map(o => <Rad key={o} label={o} checked={form.topography === o} onChange={() => set('topography', o)} />)}
                      </div>
                    </div>
                    <div>
                      <p className="label">MEC</p>
                      <div className="flex gap-2">
                        {TOPOMEC.map(o => <Rad key={o} label={o} checked={form.mec === o} onChange={() => set('mec', o)} />)}
                      </div>
                    </div>
                  </div>
                </Sec>

                <Sec title="Impressão Diagnóstica">
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {DIAGNOSTICS.map(d => (
                      <ChkBox key={d} label={d} checked={form.diagnostics.includes(d)}
                        onChange={() => toggleArr('diagnostics', d)} />
                    ))}
                  </div>
                  {form.diagnostics.includes('Outra') && (
                    <input className="input text-sm mb-2" placeholder="Outra diagnose…"
                      value={form.other_diagnosis} onChange={e => set('other_diagnosis', e.target.value)} />
                  )}
                  <div>
                    <label className="label">CID</label>
                    <input className="input text-sm w-40" placeholder="Ex: H26.9"
                      value={form.cid} onChange={e => set('cid', e.target.value)} />
                  </div>
                </Sec>

                <Sec title="Conduta">
                  <div className="flex flex-col gap-3">

                    {/* Cataract */}
                    <div className="p-4 rounded-xl border border-slate-200">
                      <ChkBox label="Encaminhar para Cirurgia de Catarata"
                        checked={form.conduct_cataract}
                        onChange={v => set('conduct_cataract', v)} />
                      {form.conduct_cataract && (
                        <div className="mt-3 flex flex-col gap-3 animate-fade-in">
                          <div>
                            <label className="label">Olho a operar</label>
                            <div className="flex gap-2">
                              {EYES3.map(e => <Rad key={e} label={e} checked={form.cataract_eye === e} onChange={() => set('cataract_eye', e)} />)}
                            </div>
                          </div>
                          {(form.cataract_eye === 'AO') && (
                            <div>
                              <label className="label">Operar primeiro</label>
                              <div className="flex gap-2">
                                {['OD','OE'].map(e => <Rad key={e} label={e} checked={form.cataract_first === e} onChange={() => set('cataract_first', e)} />)}
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="label">Dioptria OD</label>
                              <input type="number" step="0.25" className="input text-sm"
                                value={form.cataract_od_diopter} onChange={e => set('cataract_od_diopter', e.target.value)} placeholder="0.00" />
                            </div>
                            <div>
                              <label className="label">Dioptria OE</label>
                              <input type="number" step="0.25" className="input text-sm"
                                value={form.cataract_oe_diopter} onChange={e => set('cataract_oe_diopter', e.target.value)} placeholder="0.00" />
                            </div>
                          </div>
                          <div>
                            <label className="label">Observações para cirurgia</label>
                            <textarea className="input text-sm resize-none" rows={2}
                              value={form.cataract_notes} onChange={e => set('cataract_notes', e.target.value)} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* YAG */}
                    <div className="p-4 rounded-xl border border-slate-200">
                      <ChkBox label="Capsulotomia — YAG Laser"
                        checked={form.conduct_yag}
                        onChange={v => set('conduct_yag', v)} />
                      {form.conduct_yag && (
                        <div className="mt-3 flex flex-col gap-2 animate-fade-in">
                          <div>
                            <label className="label">Olho</label>
                            <div className="flex gap-2">
                              {EYES3.map(e => <Rad key={e} label={e} checked={form.yag_eye === e} onChange={() => set('yag_eye', e)} />)}
                            </div>
                          </div>
                          <div>
                            <label className="label">Observações</label>
                            <input className="input text-sm" value={form.yag_notes}
                              onChange={e => set('yag_notes', e.target.value)} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Other conducts */}
                    <div className="grid grid-cols-3 gap-2">
                      <ChkBox label="Óculos / Refração" checked={form.conduct_glasses} onChange={v => set('conduct_glasses', v)} />
                      <ChkBox label="Alta" checked={form.conduct_discharge} onChange={v => set('conduct_discharge', v)} />
                      <ChkBox label="Outras Condutas" checked={form.conduct_other} onChange={v => set('conduct_other', v)} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Return */}
                      <div className="p-3 rounded-xl border border-slate-200">
                        <ChkBox label="Retorno / Acompanhamento" checked={form.conduct_return} onChange={v => set('conduct_return', v)} />
                        {form.conduct_return && (
                          <div className="mt-2 animate-fade-in">
                            <label className="label">Prazo do retorno</label>
                            <input className="input text-sm" placeholder="Ex: 30 dias"
                              value={form.return_deadline} onChange={e => set('return_deadline', e.target.value)} />
                          </div>
                        )}
                      </div>
                      {/* Other text */}
                      {form.conduct_other && (
                        <div className="p-3 rounded-xl border border-slate-200 animate-fade-in">
                          <label className="label">Descrição da conduta</label>
                          <textarea className="input text-sm resize-none" rows={3}
                            value={form.other_conduct} onChange={e => set('other_conduct', e.target.value)} />
                        </div>
                      )}
                    </div>
                  </div>
                </Sec>

                {/* Consent */}
                <div className="p-4 rounded-xl border border-slate-200 bg-emerald-50">
                  <ChkBox
                    label="Paciente entendeu e aceitou o diagnóstico e a terapêutica proposta, saindo do serviço com todas as dúvidas sanadas, ciente dos riscos e benefícios."
                    checked={form.patient_consent}
                    onChange={v => set('patient_consent', v)}
                  />
                </div>

                {/* Save */}
                <button onClick={handleSave} disabled={saving} className="btn-primary self-start">
                  <Save size={14} />
                  {saving ? 'Finalizando…' : 'Finalizar Consulta'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

// ─── Consulta Summary ─────────────────────────────────────────────────────────

function ConsultaSummary({form, patient, onClose}: {
  form: ConsultaForm; patient: Patient; onClose: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border-b border-emerald-200">
        <CheckCircle2 size={20} className="text-emerald-600" />
        <p className="font-semibold text-emerald-800">Consulta finalizada — {patient.name}</p>
        <button onClick={onClose} className="ml-auto btn-secondary text-xs">Fechar</button>
      </div>
      <div className="flex-1 overflow-auto p-5 scrollbar-thin">
        <div className="max-w-xl flex flex-col gap-3">
          <SRow label="Biomicroscopia OD" value={form.biomicroscopy_od} />
          <SRow label="Biomicroscopia OE" value={form.biomicroscopy_oe} />
          <SRow label="FO OD" value={form.fo_od.join(', ')} />
          <SRow label="FO OE" value={form.fo_oe.join(', ')} />
          <SRow label="PIO OD" value={`${form.tono_od_type} ${form.tono_od_value}`} />
          <SRow label="PIO OE" value={`${form.tono_oe_type} ${form.tono_oe_value}`} />
          <SRow label="Motilidade" value={form.ortho_motility} />
          <SRow label="Diagnósticos" value={form.diagnostics.join(', ')} />
          <SRow label="CID" value={form.cid} />
          {form.conduct_cataract && <SRow label="Conduta" value={`Cirurgia de Catarata — ${form.cataract_eye}`} />}
          {form.conduct_yag && <SRow label="YAG Laser" value={`${form.yag_eye} — ${form.yag_notes}`} />}
          {form.conduct_glasses && <SRow label="Óculos/Refração" value="Indicado" />}
          {form.conduct_return && <SRow label="Retorno" value={form.return_deadline} />}
          {form.conduct_discharge && <SRow label="Alta" value="Paciente recebeu alta" />}
          <SRow label="Consentimento" value={form.patient_consent ? 'Paciente consentiu ✓' : 'Não registrado'} />
        </div>
      </div>
    </div>
  )
}

function SRow({label, value}: {label: string; value: string}) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm border-b border-slate-100 pb-2">
      <span className="font-medium text-slate-500 w-40 shrink-0">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  )
}

function CQueueItem({visit, selected, onClick, inProgress = false}: {
  visit: VisitWithPatient; selected: boolean; onClick: () => void; inProgress?: boolean
}) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
        selected ? 'bg-brand-50' : 'hover:bg-slate-50'
      }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        inProgress ? 'bg-purple-100' : 'bg-brand-100'
      }`}>
        {inProgress
          ? <Stethoscope size={14} className="text-purple-700" />
          : <User size={14} className="text-brand-700" />}
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
