import { useState, useEffect, useMemo, Fragment } from 'react'
import {
  Search, ChevronDown, ChevronRight,
  RefreshCw, Eye, Scissors, CheckCheck,
  Users, CalendarClock, Activity, CalendarCheck,
} from 'lucide-react'
import { PageLayout } from '@/components/PageLayout'
import { StatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { formatCPF, formatDate } from '@/lib/pdfExtractor'
import {
  type Patient, type Visit,
  VISIT_TYPE_LABELS, OCI_SUBTYPE_LABELS,
} from '@/types'

interface PatientWithVisit extends Patient {
  visits?: Visit[]
}

interface SurgicalVisit extends Visit {
  patient: Patient
}

type ActiveTab = 'pacientes' | 'cirurgico'

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
      total:     patients.length,
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
      {/* Stats bar */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <StatCard icon={Users}         label="Pacientes cadastrados" value={stats.total}     color="blue"   loading={loadingList} />
        <StatCard icon={CalendarClock} label="Registrados hoje"      value={stats.newToday}  color="green"  loading={loadingList} />
        <StatCard icon={Activity}      label="Em atendimento"        value={stats.active}    color="amber"  loading={loadingList} />
        <StatCard icon={CalendarCheck} label="Agendados"             value={stats.scheduled} color="purple" loading={loadingList} />
      </div>

      {/* Patient card with tabs */}
      <div className="card flex flex-col overflow-hidden">

        {/* Tab header */}
        <div className="flex items-center border-b border-slate-100 px-1">
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
            <div className="relative ml-auto mr-3">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-8 w-56 text-sm h-8"
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
              <table className="table-fixed w-full text-sm">
                <colgroup>
                  <col className="w-[32%]" />
                  <col className="w-[16%]" />
                  <col className="w-[12%]" />
                  <col className="w-[22%]" />
                  <col className="w-[12%]" />
                  <col className="w-[4%]" />
                  <col className="w-8" />
                </colgroup>
                <thead>
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-2.5">Paciente</th>
                    <th className="px-4 py-2.5">CPF</th>
                    <th className="px-4 py-2.5">Nascimento</th>
                    <th className="px-4 py-2.5">Último atendimento</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-center">Nº</th>
                    <th className="px-3 py-2.5"></th>
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
              <table className="table-fixed w-full text-sm">
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
  patient, latestVisit, visitCount, expanded, onToggle,
}: {
  patient: PatientWithVisit
  latestVisit?: Visit
  visitCount: number
  expanded: boolean
  onToggle: () => void
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
      <td className="px-3 py-3 text-slate-400">
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
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
