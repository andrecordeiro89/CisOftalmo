// ─── Enums ───────────────────────────────────────────────────────────────────

export type VisitType =
  | 'primeira_consulta'
  | 'retorno'
  | 'yag_laser'
  | 'oci'
  | 'exames_retina'

export type OciSubtype =
  | 'avaliacao_0_8'
  | 'avaliacao_9_mais'
  | 'retinopatia_diabetica'
  | 'estrabismo'

export type VisitStatus =
  | 'recepcao'
  | 'triagem'
  | 'aguardando_consulta'
  | 'em_consulta'
  | 'finalizado'
  | 'aguardando_agendamento'
  | 'agendado'
  | 'presente_cirurgia'

// ─── Patient ─────────────────────────────────────────────────────────────────

export interface Patient {
  id: string
  name: string
  cpf: string
  birth_date: string
  mother_name: string
  created_at: string
}

// ─── Visit ───────────────────────────────────────────────────────────────────

export interface Visit {
  id: string
  patient_id: string
  visit_type: VisitType
  oci_subtype?: OciSubtype
  status: VisitStatus
  consulta_started_at?: string
  consulta_started_by?: string
  created_at: string
  patient?: Patient
}

// ─── Triage ──────────────────────────────────────────────────────────────────

export interface Triage {
  id: string
  visit_id: string
  consultation_reason: string
  main_complaints: string[]
  other_complaint?: string
  systemic_diseases: string[]
  diabetes_duration?: string
  hypertension_duration?: string
  continuous_medications: string[]
  other_medications?: string
  previous_eye_surgery: boolean
  eye_surgeries?: EyeSurgery[]
  eye_trauma: boolean
  trauma_details?: TraumaDetails
  drug_allergy: boolean
  drug_allergy_description?: string
  av_od_cc: string
  av_od_sc: string
  av_oe_cc: string
  av_oe_sc: string
  autorefractor_photo_url?: string
  autorefractor_od?: AutorefractorValues
  autorefractor_oe?: AutorefractorValues
  biometry_photo_url?: string
  biometry_od_axial?: number
  biometry_oe_axial?: number
  triage_notes?: string
  created_at: string
}

export interface EyeSurgery {
  type: string
  eye: 'od' | 'oe' | 'ao'
}

export interface TraumaDetails {
  eye: 'od' | 'oe' | 'ao'
  time_range: string
  description: string
}

export interface AutorefractorValues {
  spherical?: number
  cylindrical?: number
  axis?: number
  k1?: number
  k2?: number
}

// ─── Medical Record ───────────────────────────────────────────────────────────

export interface MedicalRecord {
  id: string
  visit_id: string
  biomicroscopy_od: string
  biomicroscopy_oe: string
  fo_od: string[]
  fo_oe: string[]
  tono_od: string
  tono_oe: string
  orthoptic_motility: string
  orthoptic_fusion: string
  orthoptic_pupils: string
  orthoptic_deviation?: string
  topography: string
  mec: string
  diagnostic_impressions: string[]
  other_diagnosis?: string
  cid?: string
  conduct: ConductData
  patient_consent: boolean
  created_at: string
}

export interface ConductData {
  cataract?: CataractConduct
  yag?: YagConduct
  glasses: boolean
  return?: string
  discharge: boolean
  other?: string
}

export interface CataractConduct {
  eye: 'od' | 'oe' | 'ao'
  first_eye?: 'od' | 'oe'
  od_diopter?: number
  oe_diopter?: number
  notes?: string
}

export interface YagConduct {
  eye: 'od' | 'oe' | 'ao'
  notes?: string
}

// ─── Appointment ─────────────────────────────────────────────────────────────

export interface Appointment {
  id: string
  visit_id: string
  patient_id: string
  scheduled_date: string
  scheduled_time: string
  procedure: string
  eye: string
  notes?: string
  status: 'agendado' | 'realizado' | 'cancelado'
  created_at: string
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  primeira_consulta: '1ª Consulta',
  retorno: 'Retorno',
  yag_laser: 'Yag Laser',
  oci: 'OCI',
  exames_retina: 'Exames de Retina',
}

export const OCI_SUBTYPE_LABELS: Record<OciSubtype, string> = {
  avaliacao_0_8: 'OCI — Avaliação Oftalmológica 0 a 8 anos',
  avaliacao_9_mais: 'OCI — Avaliação Oftalmológica 9+ anos',
  retinopatia_diabetica: 'OCI — Avaliação de Retinopatia Diabética',
  estrabismo: 'OCI — Avaliação de Estrabismo',
}

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  recepcao: 'Recepção',
  triagem: 'Aguardando Triagem',
  aguardando_consulta: 'Aguardando Consulta',
  em_consulta: 'Em Consulta',
  finalizado: 'Finalizado',
  aguardando_agendamento: 'Aguardando Agendamento',
  agendado: 'Agendado',
  presente_cirurgia: 'Presente — Cirurgia',
}

export const VISIT_STATUS_COLORS: Record<VisitStatus, string> = {
  recepcao: 'badge-slate',
  triagem: 'badge-amber',
  aguardando_consulta: 'badge-blue',
  em_consulta: 'badge-purple',
  finalizado: 'badge-green',
  aguardando_agendamento: 'badge-red',
  agendado: 'badge-green',
  presente_cirurgia: 'badge-teal',
}

export const AV_OPTIONS = [
  '20/20', '20/25', '20/30', '20/40', '20/50',
  '20/60', '20/70', '20/80', '20/100', '20/120',
  '20/150', '20/200', '20/250', '20/300', '20/400',
  'CD (Conta Dedos)', 'MM (Movimento de Mãos)',
  'PL (Percepção de Luz)', 'SPL (Sem Percepção de Luz)',
]
