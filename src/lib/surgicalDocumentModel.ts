export type SafetyChecklistItem = { id: string; label: string }
export type SafetyChecklistSection = { id: string; title: string; items: SafetyChecklistItem[] }

export const SAFETY_CHECKLIST: SafetyChecklistSection[] = [
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

