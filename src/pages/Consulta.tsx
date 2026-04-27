import { useRef, useState, useEffect } from 'react'
import { RefreshCw, Stethoscope, ChevronRight, CheckCircle2, Save, User, ArrowLeft, List } from 'lucide-react'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { PageLayout } from '@/components/PageLayout'
import { MobileActionBar } from '@/components/MobileActionBar'
import { StatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { formatCPF, formatDate } from '@/lib/pdfExtractor'
import { type Visit, type Patient } from '@/types'

interface VisitWithPatient extends Visit {
  patient: Patient
  triage?: Record<string, unknown>
}
type MobileView = 'fila' | 'form'

interface ConsultaForm {
  biomicroscopy_od: string; biomicroscopy_oe: string
  fo_od: string[]; fo_oe: string[]; fo_od_other: string; fo_oe_other: string
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
  fo_od: [], fo_oe: [], fo_od_other: '', fo_oe_other: '',
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Consulta() {
  const {toast} = useToast()
  const [visits, setVisits] = useState<VisitWithPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<VisitWithPatient | null>(null)
  const [mobileView, setMobileView] = useState<MobileView>('fila')
  const [sectionsOpen, setSectionsOpen] = useState(() => {
    const isMobile =
      typeof window !== 'undefined' &&
      typeof window.matchMedia !== 'undefined' &&
      window.matchMedia('(max-width: 640px)').matches

    return {
      triageSummary: !isMobile,
      biomicroscopy: true,
      fo: true,
      tonometry: true,
      orthoptic: !isMobile,
      diagnostics: !isMobile,
      conduct: true,
      consent: true,
    }
  })
  const [form, setForm] = useState<ConsultaForm>(EMPTY_C)
  const [saving, setSaving] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const triageSummaryRef = useRef<HTMLDivElement | null>(null)
  const biomicroscopyRef = useRef<HTMLDivElement | null>(null)
  const foRef = useRef<HTMLDivElement | null>(null)
  const tonometryRef = useRef<HTMLDivElement | null>(null)
  const orthopticRef = useRef<HTMLDivElement | null>(null)
  const diagnosticsRef = useRef<HTMLDivElement | null>(null)
  const conductRef = useRef<HTMLDivElement | null>(null)
  const consentRef = useRef<HTMLDivElement | null>(null)

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
  const toggleFo = (side: 'od' | 'oe', item: string) => {
    const key = side === 'od' ? 'fo_od' : 'fo_oe'
    const otherKey = side === 'od' ? 'fo_od_other' : 'fo_oe_other'
    const arr = form[key] as string[]
    const next = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]
    set(key, next)
    if (arr.includes(item) && item === 'Outro') set(otherKey, '')
  }

  const selectVisit = (v: VisitWithPatient) => {
    setSelected(v)
    setForm(EMPTY_C)
    setShowSummary(false)
    setMobileView('form')
  }

  const startConsultation = async (v: VisitWithPatient) => {
    if (claiming) return
    setClaiming(true)
    try {
      const { data, error } = await supabase.rpc('claim_consulta', { p_visit_id: v.id })
      if (error) {
        const msg = error.message?.includes('already_claimed')
          ? 'Este paciente já foi chamado para consulta.'
          : error.message?.includes('forbidden')
            ? 'Sem permissão para chamar paciente.'
            : `Erro ao chamar paciente: ${error.message}`
        toast(msg, error.message?.includes('already_claimed') ? 'info' : 'error')
        load()
        return
      }
      toast('Paciente chamado para consulta', 'success')
      setSelected({ ...v, ...(data as Visit), status: 'em_consulta' })
      setMobileView('form')
      load()
    } finally {
      setClaiming(false)
    }
  }

  const handleSave = async () => {
    if (!selected) return
    if (selected.status !== 'em_consulta') {
      toast('Clique em “Chamar paciente” para iniciar a consulta antes de salvar.', 'error')
      return
    }
    setSaving(true)

    const hasCataract = form.conduct_cataract

    const {error} = await supabase.from('medical_records').upsert({
      visit_id: selected.id,
      biomicroscopy_od: form.biomicroscopy_od,
      biomicroscopy_oe: form.biomicroscopy_oe,
      fo_od: form.fo_od,
      fo_oe: form.fo_oe,
      fo_od_other: form.fo_od.includes('Outro') ? (form.fo_od_other || null) : null,
      fo_oe_other: form.fo_oe.includes('Outro') ? (form.fo_oe_other || null) : null,
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

    if (hasCataract) {
      const cpf = (selected.patient as { cpf?: string } | undefined)?.cpf ?? ''
      const eye = form.cataract_eye || null
      const eye_number = eye === 'OD' ? 1 : eye === 'OE' ? 2 : null
      const notes = form.cataract_notes || null

      if (cpf) {
        await supabase.from('surgical_cases').upsert({
          visit_id: selected.id,
          patient_id: selected.patient_id,
          cpf,
          patient_name: selected.patient.name,
          surgeon: null,
          surgery_date: null,
          surgery_time: null,
          eye,
          eye_number,
          anesthesia: null,
          instrumentador: null,
          circulante: null,
          lio: null,
          surgery: 'Catarata',
          diseases: null,
          observation: notes,
          allergies: null,
          av_pre_op: null,
          city: null,
          source: 'system',
          source_file: null,
          source_row: null,
        }, { onConflict: 'visit_id' })
      }
    }

    toast(`Consulta de ${selected.patient.name} finalizada!`, 'success')
    setShowSummary(true)
    load()
    setSaving(false)
  }

  const pending = visits.filter(v => v.status === 'aguardando_consulta')
  const inConsulta = visits.filter(v => v.status === 'em_consulta')
  const triage = selected?.triage as Record<string, unknown> | undefined
  const toggleSection = (key: keyof typeof sectionsOpen) =>
    setSectionsOpen(s => ({ ...s, [key]: !s[key] }))
  const openAndScroll = (key: keyof typeof sectionsOpen, ref: React.RefObject<HTMLDivElement | null>) => {
    setSectionsOpen(s => ({ ...s, [key]: true }))
    requestAnimationFrame(() => {
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
    })
  }

  return (
    <PageLayout title="Consulta Médica" subtitle="Evolução e conduta do atendimento"
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
        <div className={`flex-1 flex flex-col card overflow-hidden min-h-0 ${mobileView === 'fila' ? 'hidden md:flex' : ''}`}>
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <Stethoscope size={36} className="opacity-20" />
              <p className="text-slate-500 font-medium">Selecione um paciente para iniciar a consulta</p>
              <button onClick={() => setMobileView('fila')} className="btn-secondary md:hidden">Ver fila</button>
            </div>
          ) : showSummary ? (
            <ConsultaSummary form={form} patient={selected.patient} onClose={() => {setShowSummary(false); setSelected(null); setMobileView('fila')}} />
          ) : (
            <>
              {/* Patient header */}
              <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
                <button onClick={() => setMobileView('fila')} className="btn-ghost p-2 md:hidden" aria-label="Voltar para fila">
                  <ArrowLeft size={16} />
                </button>
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

              <div className="flex-1 overflow-auto scrollbar-thin p-4 sm:p-5 pb-28 sm:pb-5 flex flex-col gap-6">
                {selected?.status === 'aguardando_consulta' && !showSummary && (
                  <div className="card p-4 border-brand-200 bg-brand-50">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-brand-200 flex items-center justify-center shrink-0">
                        <Stethoscope size={16} className="text-brand-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-brand-900 text-sm">Paciente aguardando</p>
                        <p className="text-xs text-brand-800/80">
                          Para registrar a consulta, inicie o atendimento.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => selected && startConsultation(selected)}
                        disabled={claiming}
                        className="btn-primary text-xs"
                      >
                        {claiming ? 'Chamando…' : 'Chamar paciente'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="md:hidden -mt-2">
                  <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
                    {triage && (
                      <button
                        type="button"
                        onClick={() => openAndScroll('triageSummary', triageSummaryRef)}
                        className="shrink-0 px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium min-h-[44px]"
                      >
                        Triagem
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openAndScroll('biomicroscopy', biomicroscopyRef)}
                      className="shrink-0 px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium min-h-[44px]"
                    >
                      Bio
                    </button>
                    <button
                      type="button"
                      onClick={() => openAndScroll('fo', foRef)}
                      className="shrink-0 px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium min-h-[44px]"
                    >
                      FO
                    </button>
                    <button
                      type="button"
                      onClick={() => openAndScroll('tonometry', tonometryRef)}
                      className="shrink-0 px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium min-h-[44px]"
                    >
                      PIO
                    </button>
                    <button
                      type="button"
                      onClick={() => openAndScroll('orthoptic', orthopticRef)}
                      className="shrink-0 px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium min-h-[44px]"
                    >
                      Ortóptico
                    </button>
                    <button
                      type="button"
                      onClick={() => openAndScroll('diagnostics', diagnosticsRef)}
                      className="shrink-0 px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium min-h-[44px]"
                    >
                      Diagnóstico
                    </button>
                    <button
                      type="button"
                      onClick={() => openAndScroll('conduct', conductRef)}
                      className="shrink-0 px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium min-h-[44px]"
                    >
                      Conduta
                    </button>
                    <button
                      type="button"
                      onClick={() => openAndScroll('consent', consentRef)}
                      className="shrink-0 px-3 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium min-h-[44px]"
                    >
                      Consentimento
                    </button>
                  </div>
                </div>

                {/* ── Triage summary (read-only) ── */}
                {triage && (() => {
                  const asText = (v: unknown) => typeof v === 'string' ? v.trim() : ''
                  const asArr = (v: unknown) =>
                    Array.isArray(v)
                      ? (v as unknown[]).filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean)
                      : []

                  const otherText = asText(triage.other_complaint)
                  const reason = asText(triage.consultation_reason)
                  const reasonIsOther = reason === 'Outros'

                  const mainComplaints = asArr(triage.main_complaints)
                  const complaintsHasOther = mainComplaints.includes('Outros')
                  const complaintsBase = mainComplaints.filter(c => c !== 'Outros')

                  const diseases = asArr(triage.systemic_diseases)
                  const meds = asArr(triage.continuous_medications)

                  const allergy = triage.drug_allergy === true
                  const allergyDesc = asText(triage.drug_allergy_description)
                  const surgery = triage.previous_eye_surgery === true

                  const av = {
                    od_cc: asText(triage.av_od_cc),
                    od_sc: asText(triage.av_od_sc),
                    oe_cc: asText(triage.av_oe_cc),
                    oe_sc: asText(triage.av_oe_sc),
                  }

                  const renderBadges = (items: string[], emptyLabel: string) => {
                    if (!items.length) return <span className="text-sm text-slate-400">{emptyLabel}</span>
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        {items.map(it => (
                          <span key={it} className="badge-slate">{it}</span>
                        ))}
                      </div>
                    )
                  }

                  return (
                    <div ref={triageSummaryRef}>
                      <CollapsibleSection
                        title="Resumo da Triagem"
                        open={sectionsOpen.triageSummary}
                        onToggle={() => toggleSection('triageSummary')}
                        className="bg-slate-50"
                        headerClassName="border-b border-slate-200"
                        contentClassName="pt-4"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Motivo e Queixas</p>
                              {reasonIsOther && <span className="badge-amber">Motivo: outros</span>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Motivo da consulta</p>
                                <div className="mt-1">
                                  {reasonIsOther ? (
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="badge-slate">Outros</span>
                                        <span className="text-sm font-medium text-slate-800">
                                          {otherText ? 'Detalhado' : 'Sem descrição'}
                                        </span>
                                      </div>
                                      <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{otherText || '—'}</p>
                                    </div>
                                  ) : (
                                    <p className="text-sm font-medium text-slate-800">{reason || '—'}</p>
                                  )}
                                </div>
                              </div>

                              <div>
                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Queixas principais</p>
                                <div className="mt-1">
                                  {renderBadges(complaintsBase.length ? complaintsBase : (mainComplaints.length ? mainComplaints : []), '—')}
                                  {complaintsHasOther && !reasonIsOther && (
                                    <div className="mt-2">
                                      <div className="flex items-center gap-2">
                                        <span className="badge-slate">Outras</span>
                                        <span className="text-sm font-medium text-slate-800">
                                          {otherText ? 'Detalhado' : 'Sem descrição'}
                                        </span>
                                      </div>
                                      <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{otherText || '—'}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Anamnese</p>

                            <div className="flex flex-col gap-3">
                              <div>
                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Doenças sistêmicas</p>
                                <div className="mt-1">{renderBadges(diseases, 'Nenhuma')}</div>
                              </div>

                              <div>
                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Medicamentos</p>
                                <div className="mt-1">{renderBadges(meds, 'Nenhum')}</div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Alergia</p>
                                  <p className="text-sm font-medium text-slate-800 mt-1">
                                    {allergy ? (allergyDesc || 'Sim') : 'Não'}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Cirurgia prévia</p>
                                  <p className="text-sm font-medium text-slate-800 mt-1">
                                    {surgery ? 'Sim' : 'Não'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {(av.od_cc || av.od_sc || av.oe_cc || av.oe_sc) && (
                          <div className="rounded-xl border border-slate-200 bg-white p-4 mt-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Acuidade Visual</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                ['OD CC', av.od_cc],
                                ['OD SC', av.od_sc],
                                ['OE CC', av.oe_cc],
                                ['OE SC', av.oe_sc],
                              ].map(([l, v]) => (
                                <div key={l} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                  <p className="text-xs text-slate-500">{l}</p>
                                  <p className="text-sm font-semibold text-slate-800">{v || '—'}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CollapsibleSection>
                    </div>
                  )
                })()}

                {/* ── Medical evaluation ── */}
                <div ref={biomicroscopyRef}>
                  <CollapsibleSection
                    title="Biomicroscopia"
                    open={sectionsOpen.biomicroscopy}
                    onToggle={() => toggleSection('biomicroscopy')}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  </CollapsibleSection>
                </div>

                <div ref={foRef}>
                  <CollapsibleSection
                    title="Fundo de Olho (FO/MR)"
                    open={sectionsOpen.fo}
                    onToggle={() => toggleSection('fo')}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="label">OD</p>
                        <div className="flex flex-col gap-1">
                          {FO_OPTIONS.map(o => (
                            <ChkBox key={o} label={o} checked={form.fo_od.includes(o)}
                              onChange={() => toggleFo('od', o)} />
                          ))}
                        </div>
                        {form.fo_od.includes('Outro') && (
                          <textarea
                            className="input text-sm resize-none mt-2"
                            rows={2}
                            placeholder="Descreva (OD)…"
                            value={form.fo_od_other}
                            onChange={e => set('fo_od_other', e.target.value)}
                          />
                        )}
                      </div>
                      <div>
                        <p className="label">OE</p>
                        <div className="flex flex-col gap-1">
                          {FO_OPTIONS.map(o => (
                            <ChkBox key={o} label={o} checked={form.fo_oe.includes(o)}
                              onChange={() => toggleFo('oe', o)} />
                          ))}
                        </div>
                        {form.fo_oe.includes('Outro') && (
                          <textarea
                            className="input text-sm resize-none mt-2"
                            rows={2}
                            placeholder="Descreva (OE)…"
                            value={form.fo_oe_other}
                            onChange={e => set('fo_oe_other', e.target.value)}
                          />
                        )}
                      </div>
                    </div>
                  </CollapsibleSection>
                </div>

                <div ref={tonometryRef}>
                  <CollapsibleSection
                    title="Tonometria (PIO)"
                    open={sectionsOpen.tonometry}
                    onToggle={() => toggleSection('tonometry')}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </CollapsibleSection>
                </div>

                <div ref={orthopticRef}>
                  <CollapsibleSection
                    title="Teste Ortóptico / Motilidade"
                    open={sectionsOpen.orthoptic}
                    onToggle={() => toggleSection('orthoptic')}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </CollapsibleSection>
                </div>

                <div ref={diagnosticsRef}>
                  <CollapsibleSection
                    title="Impressão Diagnóstica"
                    open={sectionsOpen.diagnostics}
                    onToggle={() => toggleSection('diagnostics')}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 mb-3">
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
                  </CollapsibleSection>
                </div>

                <div ref={conductRef}>
                  <CollapsibleSection
                    title="Conduta"
                    open={sectionsOpen.conduct}
                    onToggle={() => toggleSection('conduct')}
                  >
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <ChkBox label="Óculos / Refração" checked={form.conduct_glasses} onChange={v => set('conduct_glasses', v)} />
                      <ChkBox label="Alta" checked={form.conduct_discharge} onChange={v => set('conduct_discharge', v)} />
                      <ChkBox label="Outras Condutas" checked={form.conduct_other} onChange={v => set('conduct_other', v)} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  </CollapsibleSection>
                </div>

                {/* Consent */}
                <div ref={consentRef}>
                  <CollapsibleSection
                    title="Consentimento"
                    open={sectionsOpen.consent}
                    onToggle={() => toggleSection('consent')}
                    className="bg-emerald-50 border-emerald-200"
                  >
                    <ChkBox
                      label="Paciente entendeu e aceitou o diagnóstico e a terapêutica proposta, saindo do serviço com todas as dúvidas sanadas, ciente dos riscos e benefícios."
                      checked={form.patient_consent}
                      onChange={v => set('patient_consent', v)}
                    />
                  </CollapsibleSection>
                </div>

                {/* Save */}
                <button onClick={handleSave} disabled={saving} className="btn-primary self-start hidden md:inline-flex">
                  <Save size={14} />
                  {saving ? 'Finalizando…' : 'Finalizar Consulta'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {selected && !showSummary && (
        <MobileActionBar>
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center">
            <Save size={14} />
            {saving ? 'Finalizando…' : 'Finalizar Consulta'}
          </button>
        </MobileActionBar>
      )}
    </PageLayout>
  )
}

// ─── Consulta Summary ─────────────────────────────────────────────────────────

function ConsultaSummary({form, patient, onClose}: {
  form: ConsultaForm; patient: Patient; onClose: () => void
}) {
  const foOdSummary = [
    form.fo_od.join(', '),
    form.fo_od.includes('Outro') && form.fo_od_other ? `(${form.fo_od_other})` : '',
  ].filter(Boolean).join(' ')
  const foOeSummary = [
    form.fo_oe.join(', '),
    form.fo_oe.includes('Outro') && form.fo_oe_other ? `(${form.fo_oe_other})` : '',
  ].filter(Boolean).join(' ')

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
          <SRow label="FO OD" value={foOdSummary} />
          <SRow label="FO OE" value={foOeSummary} />
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
