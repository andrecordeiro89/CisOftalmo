import { useState } from 'react'
import { UserCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'
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

  const addVisitToExistingPatient = async () => {
    if (!existingPatient) return
    setSaving(true)
    const { error } = await supabase.from('visits').insert({
      patient_id:  existingPatient.id,
      visit_type:  visitType,
      oci_subtype: visitType === 'oci' ? ociSubtype : null,
      status:      'triagem',
    })
    if (error) {
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
