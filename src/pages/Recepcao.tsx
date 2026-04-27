import { useState, useEffect, useMemo, Fragment } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Search, ChevronDown, ChevronRight,
  RefreshCw, Eye, Scissors, CheckCheck,
  CalendarClock, Activity, CalendarCheck,
  RotateCcw, X,
} from 'lucide-react'
import { PageLayout } from '@/components/PageLayout'
import { StatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { formatCPF, formatDate } from '@/lib/pdfExtractor'
import {
  type Patient, type Visit,
  type VisitType, type OciSubtype,
  VISIT_TYPE_LABELS, OCI_SUBTYPE_LABELS,
} from '@/types'

interface PatientWithVisit extends Patient {
  visits?: Visit[]
}

interface SurgicalVisit extends Visit {
  patient: Patient
}

type ActiveTab = 'pacientes' | 'cirurgico'

const VISIT_TYPE_OPTIONS: VisitType[] = [
  'primeira_consulta',
  'retorno',
  'yag_laser',
  'oci',
  'exames_retina',
]

const OCI_SUBTYPE_OPTIONS: OciSubtype[] = [
  'avaliacao_0_8',
  'avaliacao_9_mais',
  'retinopatia_diabetica',
  'estrabismo',
]

export function Recepcao() {
  const { toast } = useToast()

  const [activeTab, setActiveTab]     = useState<ActiveTab>('pacientes')

  const [patients, setPatients]       = useState<PatientWithVisit[]>([])
  const [search, setSearch]           = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [expandedId, setExpandedId]   = useState<string | null>(null)

  const [surgicalVisits, setSurgicalVisits]       = useState<SurgicalVisit[]>([])
  const [loadingSurgical, setLoadingSurgical]     = useState(true)
  const [markingPresent, setMarkingPresent]       = useState<string | null>(null)

  const [readmitOpen, setReadmitOpen] = useState(false)
  const [readmitPatient, setReadmitPatient] = useState<PatientWithVisit | null>(null)
  const [readmitType, setReadmitType] = useState<VisitType>('primeira_consulta')
  const [readmitOciSubtype, setReadmitOciSubtype] = useState<OciSubtype>('avaliacao_0_8')
  const [readmitForce, setReadmitForce] = useState(false)
  const [readmitting, setReadmitting] = useState(false)

  // ── Load patients ──────────────────────────────────────────────────────────
  const loadPatients = async () => {
    setLoadingList(true)
    const { data, error } = await supabase
      .from('patients')
      .select('*, visits(*)')
      .order('created_at', { ascending: false })

    if (error) {
      toast('Erro ao carregar pacientes', 'error')
    } else {
      setPatients((data ?? []) as PatientWithVisit[])
    }
    setLoadingList(false)
  }

  // ── Load surgical visits ───────────────────────────────────────────────────
  const loadSurgical = async () => {
    setLoadingSurgical(true)

    const { data: visitsData, error: visitsError } = await supabase
      .from('visits')
      .select('*')
      .in('status', ['aguardando_agendamento', 'presente_cirurgia'])
      .order('created_at', { ascending: true })

    if (visitsError) {
      toast('Erro ao carregar pacientes cirúrgicos', 'error')
      setLoadingSurgical(false)
      return
    }

    if (!visitsData || visitsData.length === 0) {
      setSurgicalVisits([])
      setLoadingSurgical(false)
      return
    }

    const patientIds = [...new Set(visitsData.map(v => v.patient_id))]
    const { data: patientsData, error: patientsError } = await supabase
      .from('patients')
      .select('*')
      .in('id', patientIds)

    if (patientsError) {
      toast('Erro ao carregar dados dos pacientes', 'error')
      setLoadingSurgical(false)
      return
    }

    const patientsMap = new Map((patientsData ?? []).map(p => [p.id, p]))
    setSurgicalVisits(
      visitsData.map(v => ({ ...v, patient: patientsMap.get(v.patient_id)! })) as SurgicalVisit[]
    )
    setLoadingSurgical(false)
  }

  useEffect(() => { loadPatients(); loadSurgical() }, [])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const allVisits = patients.flatMap(p => p.visits ?? [])
    const todayStr  = new Date().toDateString()
    return {
      newToday:  patients.filter(p => new Date(p.created_at).toDateString() === todayStr).length,
      active:    allVisits.filter(v => ['recepcao','triagem','aguardando_consulta','em_consulta','aguardando_agendamento'].includes(v.status)).length,
      scheduled: allVisits.filter(v => v.status === 'agendado').length,
    }
  }, [patients])

  // ── Mark surgical patient as present ──────────────────────────────────────
  const markPresent = async (visitId: string, patientName: string) => {
    setMarkingPresent(visitId)
    const { error } = await supabase
      .from('visits')
      .update({ status: 'presente_cirurgia' })
      .eq('id', visitId)

    if (error) {
      toast('Erro ao marcar presença', 'error')
    } else {
      toast(`${patientName} marcado como presente para cirurgia`, 'success')
      loadSurgical()
    }
    setMarkingPresent(null)
  }

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf.includes(search.replace(/\D/g, ''))
  )

  const surgicalPending  = surgicalVisits.filter(v => v.status === 'aguardando_agendamento')
  const surgicalPresente = surgicalVisits.filter(v => v.status === 'presente_cirurgia')

  const openReadmit = (patient: PatientWithVisit) => {
    const sorted = [...(patient.visits ?? [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const latest = sorted[0]
    setReadmitPatient(patient)
    setReadmitType(latest?.visit_type ?? 'primeira_consulta')
    setReadmitOciSubtype(latest?.oci_subtype ?? 'avaliacao_0_8')
    setReadmitForce(false)
    setReadmitOpen(true)
  }

  const createReadmission = async () => {
    if (!readmitPatient || readmitting) return

    const visits = readmitPatient.visits ?? []
    const ongoing = visits.filter(v => v.status !== 'finalizado')
    const hasOngoing = ongoing.length > 0

    if (hasOngoing && !readmitForce) {
      toast('Este paciente já possui um atendimento em andamento. Confirme a readmissão para criar outro.', 'info')
      return
    }

    setReadmitting(true)
    const { error } = await supabase.from('visits').insert({
      patient_id: readmitPatient.id,
      visit_type: readmitType,
      oci_subtype: readmitType === 'oci' ? readmitOciSubtype : null,
      status: 'triagem',
    })

    if (error) {
      toast('Erro ao readmitir paciente: ' + error.message, 'error')
      setReadmitting(false)
      return
    }

    toast(`Paciente readmitido: ${readmitPatient.name}`, 'success')
    setReadmitOpen(false)
    setReadmitPatient(null)
    loadPatients()
    setReadmitting(false)
  }

  return (
    <PageLayout
      title="Recepção"
      subtitle="Visão geral de pacientes e atendimentos"
      actions={
        <button
          onClick={() => { loadPatients(); loadSurgical() }}
          className="btn-ghost"
          title="Atualizar"
        >
          <RefreshCw size={14} />
        </button>
      }
    >
      <Dialog.Root
        open={readmitOpen}
        onOpenChange={open => {
          setReadmitOpen(open)
          if (!open) {
            setReadmitPatient(null)
            setReadmitting(false)
            setReadmitForce(false)
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 border border-brand-200">
                <RotateCcw size={18} className="text-brand-700" />
              </div>
              <div className="flex-1 min-w-0">
                <Dialog.Title className="font-display font-semibold text-slate-900">
                  Readmitir paciente
                </Dialog.Title>
                <Dialog.Description className="text-xs text-slate-500">
                  Cria um novo atendimento e envia o paciente para triagem.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="btn-ghost p-2 min-h-0" aria-label="Fechar">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {readmitPatient && (() => {
                const sorted = [...(readmitPatient.visits ?? [])].sort(
                  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
                const latest = sorted[0]
                const ongoing = sorted.filter(v => v.status !== 'finalizado')
                const hasOngoing = ongoing.length > 0
                const ongoingStatuses = [...new Set(ongoing.map(v => v.status))].join(', ')

                return (
                  <>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-800">{readmitPatient.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        CPF <span className="font-mono">{formatCPF(readmitPatient.cpf)}</span>
                        {readmitPatient.birth_date ? ` · Nasc ${formatDate(readmitPatient.birth_date)}` : ''}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Último atendimento: {latest ? VISIT_TYPE_LABELS[latest.visit_type] : '—'}
                      </p>
                    </div>

                    {hasOngoing && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-900">Atenção</p>
                        <p className="text-xs text-amber-900/80 mt-1">
                          Existe atendimento em andamento ({ongoingStatuses}). Recomendado finalizar antes de readmitir.
                        </p>
                        <label className="mt-3 flex items-center gap-2 text-xs text-amber-900/90">
                          <input
                            type="checkbox"
                            checked={readmitForce}
                            onChange={e => setReadmitForce(e.target.checked)}
                            className="accent-brand-600"
                          />
                          Criar novo atendimento mesmo assim
                        </label>
                      </div>
                    )}
                  </>
                )
              })()}

              <div>
                <label className="label">Tipo de Atendimento</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {VISIT_TYPE_OPTIONS.map(value => (
                    <label
                      key={value}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors ${
                        readmitType === value
                          ? 'border-brand-400 bg-brand-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="readmit_visit_type"
                        value={value}
                        checked={readmitType === value}
                        onChange={() => setReadmitType(value)}
                        className="accent-brand-600"
                      />
                      <span className={`text-xs leading-tight ${readmitType === value ? 'text-brand-800 font-medium' : 'text-slate-700'}`}>
                        {VISIT_TYPE_LABELS[value]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {readmitType === 'oci' && (
                <div className="animate-fade-in">
                  <label className="label">Subtipo OCI</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {OCI_SUBTYPE_OPTIONS.map(value => (
                      <label
                        key={value}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors ${
                          readmitOciSubtype === value
                            ? 'border-brand-400 bg-brand-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="readmit_oci_subtype"
                          value={value}
                          checked={readmitOciSubtype === value}
                          onChange={() => setReadmitOciSubtype(value)}
                          className="accent-brand-600"
                        />
                        <span className={`text-xs leading-tight ${readmitOciSubtype === value ? 'text-brand-800 font-medium' : 'text-slate-700'}`}>
                          {OCI_SUBTYPE_LABELS[value]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Dialog.Close asChild>
                  <button type="button" className="btn-secondary" disabled={readmitting}>
                    Cancelar
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={createReadmission}
                  disabled={readmitting || (!!readmitPatient && (readmitPatient.visits ?? []).some(v => v.status !== 'finalizado') && !readmitForce)}
                >
                  {readmitting && <RefreshCw size={14} className="animate-spin" />}
                  Readmitir
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Stats bar */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
        <StatCard icon={CalendarClock} label="Registrados hoje"      value={stats.newToday}  color="green"  loading={loadingList} />
        <StatCard icon={Activity}      label="Em atendimento"        value={stats.active}    color="amber"  loading={loadingList} />
        <StatCard icon={CalendarCheck} label="Agendados"             value={stats.scheduled} color="purple" loading={loadingList} />
      </div>

      {/* Patient card with tabs */}
      <div className="card flex flex-col overflow-hidden">

        {/* Tab header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center border-b border-slate-100 px-1 py-1 sm:py-0">
          <TabBtn
            label="Pacientes"
            count={filtered.length}
            active={activeTab === 'pacientes'}
            onClick={() => setActiveTab('pacientes')}
          />
          <TabBtn
            label="Cirúrgico"
            count={surgicalVisits.length}
            active={activeTab === 'cirurgico'}
            onClick={() => setActiveTab('cirurgico')}
            highlight={surgicalPending.length > 0}
          />

          {/* Search — only shown on pacientes tab */}
          {activeTab === 'pacientes' && (
            <div className="relative sm:ml-auto sm:mr-3 px-3 sm:px-0">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-8 w-full sm:w-56 text-sm h-10 sm:h-8"
              />
            </div>
          )}
        </div>

        {/* ── Pacientes tab ── */}
        {activeTab === 'pacientes' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
            {loadingList ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <RefreshCw size={16} className="animate-spin mr-2" />
                Carregando…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <Eye size={26} className="opacity-30" />
                <p className="text-sm">
                  {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado ainda'}
                </p>
              </div>
            ) : (
              <>
                <div className="sm:hidden p-3 flex flex-col gap-2">
                  {filtered.map(patient => {
                    const sorted = [...(patient.visits ?? [])].sort(
                      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                    const latestVisit = sorted[0]
                    const isExpanded  = expandedId === patient.id
                    return (
                      <div key={patient.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : patient.id)}
                          className="w-full text-left px-4 py-3 flex items-start gap-3"
                        >
                          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                            <span className="text-sm font-semibold text-brand-700">
                              {patient.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-slate-800 truncate">{patient.name}</p>
                              {latestVisit ? <StatusBadge status={latestVisit.status} /> : <span className="badge-slate">—</span>}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              CPF <span className="font-mono">{formatCPF(patient.cpf)}</span>
                              {patient.birth_date ? ` · Nasc ${formatDate(patient.birth_date)}` : ''}
                            </p>
                            <div className="flex items-center justify-between gap-2 mt-2">
                              <p className="text-xs text-slate-600 truncate">
                                {latestVisit ? VISIT_TYPE_LABELS[latestVisit.visit_type] : 'Sem atendimento'}
                              </p>
                              <div className="flex items-center gap-2 text-slate-400">
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={e => { e.stopPropagation(); openReadmit(patient) }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      openReadmit(patient)
                                    }
                                  }}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                  title="Readmitir paciente"
                                  aria-label="Readmitir paciente"
                                >
                                  <RotateCcw size={14} />
                                </span>
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                                  {sorted.length}
                                </span>
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </div>
                            </div>
                          </div>
                        </button>

                        {isExpanded && sorted.length > 0 && (
                          <div className="px-4 pb-4">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                              Histórico de Atendimentos
                            </p>
                            <div className="flex flex-col gap-1.5">
                              {sorted.map(visit => (
                                <div
                                  key={visit.id}
                                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
                                >
                                  <span className="text-xs text-slate-500 w-20 shrink-0">
                                    {new Date(visit.created_at).toLocaleDateString('pt-BR')}
                                  </span>
                                  <span className="text-xs font-medium text-slate-700 flex-1">
                                    {VISIT_TYPE_LABELS[visit.visit_type]}
                                    {visit.oci_subtype && (
                                      <span className="text-slate-400 ml-1">
                                        — {OCI_SUBTYPE_LABELS[visit.oci_subtype]}
                                      </span>
                                    )}
                                  </span>
                                  <StatusBadge status={visit.status} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="table-fixed w-full text-sm min-w-[880px]">
                    <colgroup>
                      <col className="w-[32%]" />
                      <col className="w-[16%]" />
                      <col className="w-[12%]" />
                      <col className="w-[22%]" />
                      <col className="w-[12%]" />
                      <col className="w-[4%]" />
                      <col className="w-16" />
                    </colgroup>
                    <thead>
                      <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-2.5">Paciente</th>
                        <th className="px-4 py-2.5">CPF</th>
                        <th className="px-4 py-2.5">Nascimento</th>
                        <th className="px-4 py-2.5">Último atendimento</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-center">Nº</th>
                        <th className="px-3 py-2.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(patient => {
                        const sorted = [...(patient.visits ?? [])].sort(
                          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        )
                        const latestVisit = sorted[0]
                        const isExpanded  = expandedId === patient.id

                        return (
                          <Fragment key={patient.id}>
                            <TableRow
                              patient={patient}
                              latestVisit={latestVisit}
                              visitCount={sorted.length}
                              expanded={isExpanded}
                              onToggle={() => setExpandedId(isExpanded ? null : patient.id)}
                              onReadmit={() => openReadmit(patient)}
                            />
                            {isExpanded && sorted.length > 0 && (
                              <tr className="bg-slate-50/80">
                                <td colSpan={7} className="px-5 py-3">
                                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                                    Histórico de Atendimentos
                                  </p>
                                  <div className="flex flex-col gap-1.5">
                                    {sorted.map(visit => (
                                      <div
                                        key={visit.id}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-slate-100"
                                      >
                                        <span className="text-xs text-slate-400 w-20 shrink-0">
                                          {new Date(visit.created_at).toLocaleDateString('pt-BR')}
                                        </span>
                                        <span className="text-xs font-medium text-slate-700 flex-1">
                                          {VISIT_TYPE_LABELS[visit.visit_type]}
                                          {visit.oci_subtype && (
                                            <span className="text-slate-400 ml-1">
                                              — {OCI_SUBTYPE_LABELS[visit.oci_subtype]}
                                            </span>
                                          )}
                                        </span>
                                        <StatusBadge status={visit.status} />
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Cirúrgico tab ── */}
        {activeTab === 'cirurgico' && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loadingSurgical ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <RefreshCw size={16} className="animate-spin mr-2" />
                Carregando…
              </div>
            ) : surgicalVisits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <Scissors size={26} className="opacity-30" />
                <p className="text-sm">Nenhum paciente cirúrgico no momento</p>
              </div>
            ) : (
              <>
                <div className="sm:hidden p-3 flex flex-col gap-2">
                  {surgicalVisits.map(visit => {
                    const isPresente = visit.status === 'presente_cirurgia'
                    return (
                      <div key={visit.id} className={`rounded-xl border overflow-hidden ${
                        isPresente ? 'border-teal-200 bg-teal-50/30' : 'border-slate-200 bg-white'
                      }`}>
                        <div className="px-4 py-3 flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isPresente ? 'bg-teal-100' : 'bg-amber-100'
                          }`}>
                            {isPresente
                              ? <CheckCheck size={16} className="text-teal-700" />
                              : <Scissors size={16} className="text-amber-700" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-slate-800 truncate">{visit.patient.name}</p>
                              <StatusBadge status={visit.status} />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              CPF <span className="font-mono">{formatCPF(visit.patient.cpf)}</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Encaminhado em {new Date(visit.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        {!isPresente && (
                          <div className="px-4 pb-4">
                            <button
                              onClick={() => markPresent(visit.id, visit.patient.name)}
                              disabled={markingPresent === visit.id}
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                              <CheckCheck size={14} />
                              {markingPresent === visit.id ? 'Salvando…' : 'Marcar Presente'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="table-fixed w-full text-sm min-w-[760px]">
                    <colgroup>
                      <col className="w-[30%]" />
                      <col className="w-[16%]" />
                      <col className="w-[14%]" />
                      <col className="w-[18%]" />
                      <col className="w-[22%]" />
                    </colgroup>
                    <thead>
                      <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-2.5">Paciente</th>
                        <th className="px-4 py-2.5">CPF</th>
                        <th className="px-4 py-2.5">Encaminhado em</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {surgicalVisits.map(visit => (
                        <SurgicalRow
                          key={visit.id}
                          visit={visit}
                          marking={markingPresent === visit.id}
                          onMarkPresent={() => markPresent(visit.id, visit.patient.name)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Summary footer */}
            {surgicalVisits.length > 0 && (
              <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Aguardando: {surgicalPending.length}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  Presente: {surgicalPresente.length}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  )
}

// ── SurgicalRow ───────────────────────────────────────────────────────────────

function SurgicalRow({
  visit, marking, onMarkPresent,
}: {
  visit: SurgicalVisit
  marking: boolean
  onMarkPresent: () => void
}) {
  const isPresente = visit.status === 'presente_cirurgia'

  return (
    <tr className={`border-b border-slate-50 transition-colors ${isPresente ? 'bg-teal-50/40' : 'hover:bg-slate-50/70'}`}>
      <td className="px-5 py-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            isPresente ? 'bg-teal-100' : 'bg-amber-100'
          }`}>
            {isPresente
              ? <CheckCheck size={13} className="text-teal-700" />
              : <Scissors  size={13} className="text-amber-700" />
            }
          </div>
          <span className="font-medium text-slate-800 truncate">{visit.patient.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{formatCPF(visit.patient.cpf)}</td>
      <td className="px-4 py-3 text-slate-500 text-xs">
        {new Date(visit.created_at).toLocaleDateString('pt-BR')}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={visit.status} />
      </td>
      <td className="px-4 py-3">
        {!isPresente && (
          <button
            onClick={onMarkPresent}
            disabled={marking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <CheckCheck size={12} />
            {marking ? 'Salvando…' : 'Marcar Presente'}
          </button>
        )}
        {isPresente && (
          <span className="text-xs text-teal-600 font-medium">Confirmado ✓</span>
        )}
      </td>
    </tr>
  )
}

// ── TableRow ──────────────────────────────────────────────────────────────────

function TableRow({
  patient, latestVisit, visitCount, expanded, onToggle, onReadmit,
}: {
  patient: PatientWithVisit
  latestVisit?: Visit
  visitCount: number
  expanded: boolean
  onToggle: () => void
  onReadmit: () => void
}) {
  return (
    <tr
      onClick={onToggle}
      className="border-b border-slate-50 hover:bg-slate-50/70 cursor-pointer transition-colors"
    >
      <td className="px-5 py-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-brand-700">
              {patient.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="font-medium text-slate-800 truncate">{patient.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-500 font-mono text-xs truncate">{formatCPF(patient.cpf)}</td>
      <td className="px-4 py-3 text-slate-500 text-xs">{patient.birth_date ? formatDate(patient.birth_date) : '—'}</td>
      <td className="px-4 py-3 text-slate-600 text-xs truncate">
        {latestVisit ? VISIT_TYPE_LABELS[latestVisit.visit_type] : '—'}
      </td>
      <td className="px-4 py-3">
        {latestVisit ? <StatusBadge status={latestVisit.status} /> : <span className="badge-slate">—</span>}
      </td>
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
          {visitCount}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onReadmit() }}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            title="Readmitir paciente"
            aria-label="Readmitir paciente"
          >
            <RotateCcw size={12} />
          </button>
          <span className="text-slate-400">
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
        </div>
      </td>
    </tr>
  )
}

// ── TabBtn ────────────────────────────────────────────────────────────────────

function TabBtn({
  label, count, active, onClick, highlight = false,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  highlight?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-brand-500 text-brand-700'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
        active
          ? 'bg-brand-100 text-brand-700'
          : highlight
            ? 'bg-amber-100 text-amber-700'
            : 'bg-slate-100 text-slate-500'
      }`}>
        {count}
      </span>
    </button>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  blue:   { bg: 'bg-brand-50',   icon: 'text-brand-500',   value: 'text-brand-700'   },
  green:  { bg: 'bg-emerald-50', icon: 'text-emerald-500', value: 'text-emerald-700' },
  amber:  { bg: 'bg-amber-50',   icon: 'text-amber-500',   value: 'text-amber-700'   },
  purple: { bg: 'bg-purple-50',  icon: 'text-purple-500',  value: 'text-purple-700'  },
} as const

function StatCard({
  icon: Icon, label, value, color, loading,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: keyof typeof COLOR_MAP
  loading: boolean
}) {
  const c = COLOR_MAP[color]
  return (
    <div className="card px-4 py-3.5 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
        <Icon size={17} className={c.icon} />
      </div>
      <div>
        <p className="text-xs text-slate-500 leading-tight">{label}</p>
        {loading ? (
          <div className="h-5 w-8 bg-slate-100 rounded animate-pulse mt-0.5" />
        ) : (
          <p className={`text-xl font-semibold leading-tight ${c.value}`}>{value}</p>
        )}
      </div>
    </div>
  )
}
