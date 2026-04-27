import { useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { UserCheck, AlertTriangle, CheckCircle2, Plus, RefreshCw, X } from 'lucide-react'
import { PageLayout } from '@/components/PageLayout'
import { DropZone } from '@/components/DropZone'
import { useToast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { extractPatientFromPDF, formatCPF, formatDate } from '@/lib/pdfExtractor'
import { type Patient, type VisitType, type OciSubtype } from '@/types'

const VISIT_TYPES: { value: VisitType; label: string }[] = [
  { value: 'primeira_consulta', label: '1ª Consulta' },
  { value: 'retorno',           label: 'Retorno' },
  { value: 'yag_laser',         label: 'Yag Laser' },
  { value: 'oci',               label: 'OCI' },
  { value: 'exames_retina',     label: 'Exames de Retina' },
]

const OCI_SUBTYPES: { value: OciSubtype; label: string }[] = [
  { value: 'avaliacao_0_8',         label: '0 a 8 anos' },
  { value: 'avaliacao_9_mais',      label: '9+ anos' },
  { value: 'retinopatia_diabetica', label: 'Retinopatia Diabética' },
  { value: 'estrabismo',            label: 'Estrabismo' },
]

export function Paciente() {
  const { toast } = useToast()

  const [extracting, setExtracting]   = useState(false)
  const [extracted, setExtracted]     = useState<{
    name: string; cpf: string; birthDate: string; motherName: string
  } | null>(null)
  const [existingPatient, setExistingPatient] = useState<Patient | null>(null)
  const [visitType, setVisitType]     = useState<VisitType>('primeira_consulta')
  const [ociSubtype, setOciSubtype]   = useState<OciSubtype>('avaliacao_0_8')
  const [saving, setSaving]           = useState(false)
  const [manualOpen, setManualOpen]   = useState(false)
  const [manualName, setManualName]   = useState('')
  const [manualCpf, setManualCpf]     = useState('')
  const [manualBirth, setManualBirth] = useState('')
  const [manualMother, setManualMother] = useState('')
  const [manualExisting, setManualExisting] = useState<Patient | null>(null)
  const [manualVisitType, setManualVisitType] = useState<VisitType>('primeira_consulta')
  const [manualOciSubtype, setManualOciSubtype] = useState<OciSubtype>('avaliacao_0_8')
  const [manualSaving, setManualSaving] = useState(false)

  const manualCpfDigits = useMemo(() => manualCpf.replace(/\D/g, ''), [manualCpf])

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
    } catch {
      toast('Não foi possível extrair os dados do PDF. Verifique o arquivo.', 'error')
    }

    setExtracting(false)
  }

  const resetManual = () => {
    setManualName('')
    setManualCpf('')
    setManualBirth('')
    setManualMother('')
    setManualExisting(null)
    setManualVisitType('primeira_consulta')
    setManualOciSubtype('avaliacao_0_8')
  }

  const findPatientByCpf = async (cpfDigits: string) => {
    if (!cpfDigits) return null
    const { data: found } = await supabase
      .from('patients')
      .select('*')
      .eq('cpf', cpfDigits)
      .maybeSingle()
    return (found as Patient | null) ?? null
  }

  const addVisit = async (patient: Patient, type: VisitType, subtype: OciSubtype) => {
    const { error } = await supabase.from('visits').insert({
      patient_id: patient.id,
      visit_type: type,
      oci_subtype: type === 'oci' ? subtype : null,
      status: 'triagem',
    })
    return { ok: !error, error }
  }

  const addVisitToExistingPatient = async () => {
    if (!existingPatient) return
    setSaving(true)
    const res = await addVisit(existingPatient, visitType, ociSubtype)
    if (!res.ok) {
      toast('Erro ao adicionar atendimento', 'error')
    } else {
      toast(`Novo atendimento adicionado para ${existingPatient.name}`, 'success')
      setExtracted(null)
      setExistingPatient(null)
    }
    setSaving(false)
  }

  const handleSave = async () => {
    if (!extracted) return
    if (!extracted.name || !extracted.cpf) {
      toast('Nome e CPF são obrigatórios', 'error')
      return
    }
    setSaving(true)

    const { data: newPatient, error: pError } = await supabase
      .from('patients')
      .insert({
        name:        extracted.name,
        cpf:         extracted.cpf,
        birth_date:  extracted.birthDate  || null,
        mother_name: extracted.motherName || null,
      })
      .select()
      .single()

    if (pError) {
      toast('Erro ao cadastrar paciente: ' + pError.message, 'error')
      setSaving(false)
      return
    }

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
    }
    setSaving(false)
  }

  return (
    <PageLayout
      title="Paciente"
      subtitle="Cadastro de pacientes via PDF do sistema AVYX"
      actions={
        <Dialog.Root
          open={manualOpen}
          onOpenChange={open => {
            setManualOpen(open)
            if (open) resetManual()
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
            <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl">
              <div className="p-5 border-b border-slate-100 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 border border-brand-200">
                  <Plus size={18} className="text-brand-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <Dialog.Title className="font-display font-semibold text-slate-900">
                    Novo paciente
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-slate-500">
                    Cadastre manualmente e já crie um atendimento em triagem.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button className="btn-ghost p-2 min-h-0" aria-label="Fechar">
                    <X size={16} />
                  </button>
                </Dialog.Close>
              </div>

              <form
                className="p-5 flex flex-col gap-4"
                onSubmit={async e => {
                  e.preventDefault()
                  const cpf = manualCpfDigits
                  const name = manualName.trim()
                  if (!name || !cpf) { toast('Nome e CPF são obrigatórios', 'error'); return }
                  if (cpf.length !== 11) { toast('CPF inválido', 'error'); return }
                  setManualSaving(true)
                  try {
                    const existing = manualExisting ?? (await findPatientByCpf(cpf))
                    if (existing) {
                      const res = await addVisit(existing, manualVisitType, manualOciSubtype)
                      if (!res.ok) {
                        toast('Erro ao adicionar atendimento', 'error')
                        return
                      }
                      toast(`Novo atendimento adicionado para ${existing.name}`, 'success')
                      setManualOpen(false)
                      return
                    }

                    const { data: newPatient, error: pError } = await supabase
                      .from('patients')
                      .insert({
                        name,
                        cpf,
                        birth_date: manualBirth || null,
                        mother_name: manualMother.trim() || null,
                      })
                      .select()
                      .single()

                    if (pError) {
                      toast('Erro ao cadastrar paciente: ' + pError.message, 'error')
                      return
                    }

                    const res = await addVisit(newPatient as Patient, manualVisitType, manualOciSubtype)
                    if (!res.ok) {
                      toast('Paciente cadastrado, mas erro ao criar atendimento.', 'error')
                      return
                    }
                    toast('Paciente cadastrado com sucesso', 'success')
                    setManualOpen(false)
                  } finally {
                    setManualSaving(false)
                  }
                }}
              >
                {manualExisting && (
                  <div className="flex gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">CPF já cadastrado</p>
                      <p className="text-amber-700 mt-0.5 text-xs">
                        {manualExisting.name} — CPF {formatCPF(manualExisting.cpf)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="label">Nome</label>
                    <input
                      className="input"
                      value={manualExisting ? manualExisting.name : manualName}
                      onChange={e => setManualName(e.target.value)}
                      disabled={!!manualExisting}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <label className="label">CPF</label>
                    <input
                      className="input"
                      inputMode="numeric"
                      value={manualCpf}
                      onChange={e => {
                        setManualCpf(e.target.value)
                        setManualExisting(null)
                      }}
                      onBlur={async () => {
                        const cpf = manualCpfDigits
                        if (cpf.length !== 11) return
                        const found = await findPatientByCpf(cpf)
                        if (found) {
                          setManualExisting(found)
                          toast(`Paciente com CPF ${formatCPF(cpf)} já está cadastrado.`, 'info')
                        }
                      }}
                      placeholder="Somente números"
                    />
                  </div>
                  <div>
                    <label className="label">Nascimento</label>
                    <input
                      className="input"
                      type="date"
                      value={manualExisting ? (manualExisting.birth_date ?? '') : manualBirth}
                      onChange={e => setManualBirth(e.target.value)}
                      disabled={!!manualExisting}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Nome da mãe</label>
                    <input
                      className="input"
                      value={manualExisting ? (manualExisting.mother_name ?? '') : manualMother}
                      onChange={e => setManualMother(e.target.value)}
                      disabled={!!manualExisting}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="divider" />

                <div>
                  <label className="label">Tipo de Atendimento</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {VISIT_TYPES.map(({ value, label }) => (
                      <label
                        key={value}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors ${
                          manualVisitType === value
                            ? 'border-brand-400 bg-brand-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="manual_visit_type"
                          value={value}
                          checked={manualVisitType === value}
                          onChange={() => setManualVisitType(value)}
                          className="accent-brand-600"
                        />
                        <span className={`text-xs leading-tight ${manualVisitType === value ? 'text-brand-800 font-medium' : 'text-slate-700'}`}>
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {manualVisitType === 'oci' && (
                  <div className="animate-fade-in">
                    <label className="label">Subtipo OCI</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {OCI_SUBTYPES.map(({ value, label }) => (
                        <label
                          key={value}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors ${
                            manualOciSubtype === value
                              ? 'border-brand-400 bg-brand-50'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="manual_oci_subtype"
                            value={value}
                            checked={manualOciSubtype === value}
                            onChange={() => setManualOciSubtype(value)}
                            className="accent-brand-600"
                          />
                          <span className={`text-xs leading-tight ${manualOciSubtype === value ? 'text-brand-800 font-medium' : 'text-slate-700'}`}>
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Dialog.Close asChild>
                    <button type="button" className="btn-secondary" disabled={manualSaving}>
                      Cancelar
                    </button>
                  </Dialog.Close>
                  <button type="submit" className="btn-primary" disabled={manualSaving}>
                    {manualSaving && <RefreshCw size={14} className="animate-spin" />}
                    {manualExisting ? 'Adicionar atendimento' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      }
    >
      <div className="max-w-md mx-auto flex flex-col gap-4">

        <div className="card p-4">
          <p className="section-title mb-3">Importar ficha AVYX</p>
          <DropZone
            onFile={handleFile}
            loading={extracting}
            label="Arraste o PDF da recepção aqui"
            hint="Arquivo PDF exportado do sistema AVYX"
          />
        </div>

        {extracted && (
          <div className="card p-4 animate-slide-up">

            {existingPatient ? (
              <div className="flex gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Paciente já cadastrado</p>
                  <p className="text-amber-700 mt-0.5 text-xs">
                    {existingPatient.name} — CPF {formatCPF(existingPatient.cpf)}
                  </p>
                  <p className="text-amber-600 text-xs mt-1">
                    Selecione o tipo de atendimento e clique em "Adicionar Atendimento".
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 mb-4">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800 font-medium">Dados extraídos com sucesso</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
              <DataField label="Nome" value={extracted.name} span />
              <DataField label="CPF" value={formatCPF(extracted.cpf)} />
              <DataField label="Nascimento" value={extracted.birthDate ? formatDate(extracted.birthDate) : '—'} />
              <DataField label="Nome da Mãe" value={extracted.motherName || '—'} span />
            </div>

            <div className="divider" />

            <div className="mb-3">
              <label className="label">Tipo de Atendimento</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {VISIT_TYPES.map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors ${
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
                    <span className={`text-xs leading-tight ${visitType === value ? 'text-brand-800 font-medium' : 'text-slate-700'}`}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {visitType === 'oci' && (
              <div className="mb-4 animate-fade-in">
                <label className="label">Subtipo OCI</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {OCI_SUBTYPES.map(({ value, label }) => (
                    <label
                      key={value}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors ${
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
                      <span className={`text-xs leading-tight ${ociSubtype === value ? 'text-brand-800 font-medium' : 'text-slate-700'}`}>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {existingPatient ? (
              <div className="flex gap-2">
                <button onClick={addVisitToExistingPatient} disabled={saving} className="btn-primary flex-1">
                  <UserCheck size={13} />
                  {saving ? 'Salvando…' : 'Adicionar Atendimento'}
                </button>
                <button onClick={() => { setExtracted(null); setExistingPatient(null) }} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            ) : (
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
                <UserCheck size={13} />
                {saving ? 'Cadastrando…' : 'Cadastrar Paciente'}
              </button>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  )
}

function DataField({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="label">{label}</p>
      <p className="text-sm font-medium text-slate-800 truncate">{value || '—'}</p>
    </div>
  )
}
