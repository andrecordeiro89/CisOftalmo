import { useState, useEffect } from 'react'
import {
  Search, UserCheck, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, RefreshCw, Eye
} from 'lucide-react'
import { PageLayout } from '@/components/PageLayout'
import { DropZone } from '@/components/DropZone'
import { StatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { extractPatientFromPDF, formatCPF, formatDate } from '@/lib/pdfExtractor'
import {
  type Patient, type Visit, type VisitType, type OciSubtype,
  VISIT_TYPE_LABELS, OCI_SUBTYPE_LABELS,
} from '@/types'

// ─── Visit type selector ──────────────────────────────────────────────────────

const VISIT_TYPES: { value: VisitType; label: string }[] = [
  { value: 'primeira_consulta', label: '1ª Consulta' },
  { value: 'retorno',           label: 'Retorno' },
  { value: 'yag_laser',         label: 'Yag Laser' },
  { value: 'oci',               label: 'OCI' },
  { value: 'exames_retina',     label: 'Exames de Retina' },
]

const OCI_SUBTYPES: { value: OciSubtype; label: string }[] = [
  { value: 'avaliacao_0_8',          label: 'Avaliação Oftalmológica — 0 a 8 anos' },
  { value: 'avaliacao_9_mais',       label: 'Avaliação Oftalmológica — 9+ anos' },
  { value: 'retinopatia_diabetica',  label: 'Avaliação de Retinopatia Diabética' },
  { value: 'estrabismo',             label: 'Avaliação de Estrabismo' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface PatientWithVisit extends Patient {
  visits?: Visit[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Recepcao() {
  const { toast } = useToast()

  // Extracted state
  const [extracting, setExtracting]   = useState(false)
  const [extracted, setExtracted]     = useState<{
    name: string; cpf: string; birthDate: string; motherName: string
  } | null>(null)
  const [existingPatient, setExistingPatient] = useState<Patient | null>(null)

  // Form state
  const [visitType, setVisitType]     = useState<VisitType>('primeira_consulta')
  const [ociSubtype, setOciSubtype]   = useState<OciSubtype>('avaliacao_0_8')
  const [saving, setSaving]           = useState(false)

  // Patient list state
  const [patients, setPatients]       = useState<PatientWithVisit[]>([])
  const [search, setSearch]           = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [expandedId, setExpandedId]   = useState<string | null>(null)

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

  useEffect(() => { loadPatients() }, [])

  // ── PDF handler ────────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setExtracting(true)
    setExtracted(null)
    setExistingPatient(null)

    try {
      const data = await extractPatientFromPDF(file)

      const result = {
        name:       data.name       ?? '',
        cpf:        data.cpf        ?? '',
        birthDate:  data.birthDate  ?? '',
        motherName: data.motherName ?? '',
      }

      setExtracted(result)

      // Check for duplicate CPF
      if (result.cpf) {
        const { data: found } = await supabase
          .from('patients')
          .select('*')
          .eq('cpf', result.cpf)
          .maybeSingle()

        if (found) {
          setExistingPatient(found as Patient)
          toast(`Paciente com CPF ${formatCPF(result.cpf)} já está cadastrado.`, 'info')
        }
      }
    } catch (err) {
      toast('Não foi possível extrair os dados do PDF. Verifique o arquivo.', 'error')
    }

    setExtracting(false)
  }

  // ── Save new visit for existing patient ────────────────────────────────────
  const addVisitToExistingPatient = async () => {
    if (!existingPatient) return
    setSaving(true)

    const { error } = await supabase.from('visits').insert({
      patient_id: existingPatient.id,
      visit_type: visitType,
      oci_subtype: visitType === 'oci' ? ociSubtype : null,
      status: 'triagem',
    })

    if (error) {
      toast('Erro ao adicionar atendimento', 'error')
    } else {
      toast(`Novo atendimento adicionado para ${existingPatient.name}`, 'success')
      setExtracted(null)
      setExistingPatient(null)
      loadPatients()
    }
    setSaving(false)
  }

  // ── Save new patient + visit ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!extracted) return
    if (!extracted.name || !extracted.cpf) {
      toast('Nome e CPF são obrigatórios', 'error')
      return
    }

    setSaving(true)

    // Insert patient
    const { data: newPatient, error: pError } = await supabase
      .from('patients')
      .insert({
        name:        extracted.name,
        cpf:         extracted.cpf,
        birth_date:  extracted.birthDate || null,
        mother_name: extracted.motherName || null,
      })
      .select()
      .single()

    if (pError) {
      toast('Erro ao cadastrar paciente: ' + pError.message, 'error')
      setSaving(false)
      return
    }

    // Insert visit
    const { error: vError } = await supabase.from('visits').insert({
      patient_id:  newPatient.id,
      visit_type:  visitType,
      oci_subtype: visitType === 'oci' ? ociSubtype : null,
      status:      'triagem',
    })

    if (vError) {
      toast('Paciente cadastrado, mas erro ao criar atendimento.', 'error')
    } else {
      toast(`${extracted.name} cadastrado com sucesso!`, 'success')
      setExtracted(null)
      loadPatients()
    }

    setSaving(false)
  }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf.includes(search.replace(/\D/g, ''))
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageLayout
      title="Recepção"
      subtitle="Cadastro de pacientes via PDF do sistema AVYX"
      actions={
        <button onClick={loadPatients} className="btn-ghost" title="Atualizar lista">
          <RefreshCw size={14} />
        </button>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">

        {/* ── Left panel: upload + form ── */}
        <div className="flex flex-col gap-4">

          {/* Upload */}
          <div className="card p-5">
            <p className="section-title mb-3">Importar ficha AVYX</p>
            <DropZone
              onFile={handleFile}
              loading={extracting}
              label="Arraste o PDF da recepção aqui"
              hint="Arquivo PDF exportado do sistema AVYX"
            />
          </div>

          {/* Extracted data preview */}
          {extracted && (
            <div className="card p-5 animate-slide-up">

              {/* Duplicate warning */}
              {existingPatient ? (
                <div className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Paciente já cadastrado</p>
                    <p className="text-amber-700 mt-0.5">
                      {existingPatient.name} — CPF {formatCPF(existingPatient.cpf)}
                    </p>
                    <p className="text-amber-600 text-xs mt-1">
                      Selecione o tipo de atendimento e clique em "Adicionar Atendimento".
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 mb-4">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-800 font-medium">Dados extraídos com sucesso</p>
                </div>
              )}

              {/* Patient data cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <DataField label="Nome" value={extracted.name} />
                <DataField label="CPF" value={formatCPF(extracted.cpf)} />
                <DataField label="Data de Nascimento" value={extracted.birthDate ? formatDate(extracted.birthDate) : '—'} />
                <DataField label="Nome da Mãe" value={extracted.motherName || '—'} span />
              </div>

              <div className="divider" />

              {/* Visit type */}
              <div className="mb-3">
                <label className="label">Tipo de Atendimento</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {VISIT_TYPES.map(({ value, label }) => (
                    <label
                      key={value}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        visitType === value
                          ? 'border-brand-400 bg-brand-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="visit_type"
                        value={value}
                        checked={visitType === value}
                        onChange={() => setVisitType(value)}
                        className="accent-brand-600"
                      />
                      <span className={`text-sm ${visitType === value ? 'text-brand-800 font-medium' : 'text-slate-700'}`}>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* OCI subtype */}
              {visitType === 'oci' && (
                <div className="mb-4 animate-fade-in">
                  <label className="label">Subtipo OCI</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {OCI_SUBTYPES.map(({ value, label }) => (
                      <label
                        key={value}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                          ociSubtype === value
                            ? 'border-brand-400 bg-brand-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="oci_subtype"
                          value={value}
                          checked={ociSubtype === value}
                          onChange={() => setOciSubtype(value)}
                          className="accent-brand-600"
                        />
                        <span className={`text-sm ${ociSubtype === value ? 'text-brand-800 font-medium' : 'text-slate-700'}`}>
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Action button */}
              {existingPatient ? (
                <div className="flex gap-2">
                  <button
                    onClick={addVisitToExistingPatient}
                    disabled={saving}
                    className="btn-primary flex-1"
                  >
                    <UserCheck size={14} />
                    {saving ? 'Salvando…' : 'Adicionar Atendimento'}
                  </button>
                  <button
                    onClick={() => { setExtracted(null); setExistingPatient(null) }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary w-full"
                >
                  <UserCheck size={14} />
                  {saving ? 'Cadastrando…' : 'Cadastrar Paciente'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Right panel: patient list ── */}
        <div className="card flex flex-col overflow-hidden">
          {/* Search header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <p className="section-title flex-1">
              Pacientes Cadastrados
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({filtered.length})
              </span>
            </p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-8 w-64 text-sm"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto scrollbar-thin">
            {loadingList ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <RefreshCw size={18} className="animate-spin mr-2" />
                Carregando…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <Eye size={28} className="opacity-30" />
                <p className="text-sm">
                  {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado ainda'}
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="px-5 py-3">Paciente</th>
                    <th className="px-4 py-3">CPF</th>
                    <th className="px-4 py-3">Nascimento</th>
                    <th className="px-4 py-3">Último atendimento</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(patient => {
                    const latestVisit = patient.visits?.sort(
                      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )[0]

                    return (
                      <>
                        <tr
                          key={patient.id}
                          onClick={() => setExpandedId(expandedId === patient.id ? null : patient.id)}
                          className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                                <span className="text-xs font-semibold text-brand-700">
                                  {patient.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-slate-800">{patient.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">
                            {formatCPF(patient.cpf)}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">
                            {patient.birth_date ? formatDate(patient.birth_date) : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">
                            {latestVisit
                              ? VISIT_TYPE_LABELS[latestVisit.visit_type]
                              : '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            {latestVisit ? (
                              <StatusBadge status={latestVisit.status} />
                            ) : (
                              <span className="badge-slate">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-400">
                            {expandedId === patient.id
                              ? <ChevronDown size={14} />
                              : <ChevronRight size={14} />}
                          </td>
                        </tr>

                        {/* Expanded row: all visits */}
                        {expandedId === patient.id && patient.visits && patient.visits.length > 0 && (
                          <tr key={`${patient.id}-expanded`} className="bg-slate-50">
                            <td colSpan={6} className="px-5 py-3">
                              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                                Histórico de Atendimentos
                              </p>
                              <div className="flex flex-col gap-1.5">
                                {patient.visits
                                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                  .map(visit => (
                                    <div
                                      key={visit.id}
                                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-slate-100"
                                    >
                                      <span className="text-xs text-slate-500 w-24 shrink-0">
                                        {new Date(visit.created_at).toLocaleDateString('pt-BR')}
                                      </span>
                                      <span className="text-xs font-medium text-slate-700">
                                        {VISIT_TYPE_LABELS[visit.visit_type]}
                                        {visit.oci_subtype && (
                                          <span className="text-slate-400 ml-1">
                                            — {OCI_SUBTYPE_LABELS[visit.oci_subtype]}
                                          </span>
                                        )}
                                      </span>
                                      <div className="ml-auto">
                                        <StatusBadge status={visit.status} />
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

// ── Small helper component ────────────────────────────────────────────────────

function DataField({
  label, value, span,
}: {
  label: string
  value: string
  span?: boolean
}) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="label">{label}</p>
      <p className="text-sm font-medium text-slate-800 truncate">{value || '—'}</p>
    </div>
  )
}
