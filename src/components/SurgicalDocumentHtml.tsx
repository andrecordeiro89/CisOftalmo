import { SignaturePad } from '@/components/SignaturePad'

type ConsentTerm = {
  nome: string
  cpf: string
  data_nascimento: string
  sexo: string
  medico: string
  hospital: string
  cirurgia: string
  data: string
  hora: string
  olho: string
  ANESTESIA: string
  INSTRUMENTADOR: string
  CIRCULANTE: string
}

type YesNo = '' | 'sim' | 'nao'

type FormState = Record<string, unknown>

function yesNoValue(v: unknown): YesNo {
  if (v === 'sim' || v === 'nao') return v
  return ''
}

function boolValue(v: unknown): boolean {
  return v === true
}

function strValue(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-700">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="leading-5">{label}</span>
    </label>
  )
}

function YesNoRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: YesNo
  onChange: (v: YesNo) => void
}) {
  return (
    <div className="flex flex-col gap-2 py-2 border-b border-slate-100">
      <div className="text-sm text-slate-800">{label}</div>
      <div className="flex items-center gap-4 text-sm text-slate-700">
        <label className="inline-flex items-center gap-2">
          <input type="radio" checked={value === 'sim'} onChange={() => onChange('sim')} />
          Sim
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="radio" checked={value === 'nao'} onChange={() => onChange('nao')} />
          Não
        </label>
        <button type="button" className="btn-ghost p-2 min-h-0 text-xs" onClick={() => onChange('')}>
          Limpar
        </button>
      </div>
    </div>
  )
}

const SAFETY_CHECKLIST: Array<{ id: string; title: string; items: Array<{ id: string; label: string }> }> = [
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

export function SurgicalDocumentHtml({
  term,
  setTerm,
  sigDoctor,
  setSigDoctor,
  sigPatient,
  setSigPatient,
  sigWitness,
  setSigWitness,
  formState,
  setFormState,
}: {
  term: ConsentTerm
  setTerm: (updater: (prev: ConsentTerm) => ConsentTerm) => void
  sigDoctor: string
  setSigDoctor: (v: string) => void
  sigPatient: string
  setSigPatient: (v: string) => void
  sigWitness: string
  setSigWitness: (v: string) => void
  formState: FormState
  setFormState: (updater: (prev: FormState) => FormState) => void
}) {
  const setText = (key: string, v: string) => {
    setFormState(prev => ({ ...prev, [key]: v }))
  }
  const setBool = (key: string, v: boolean) => {
    setFormState(prev => ({ ...prev, [key]: v }))
  }
  const setYesNo = (key: string, v: YesNo) => {
    setFormState(prev => ({ ...prev, [key]: v }))
  }

  const getText = (key: string) => strValue(formState[key])
  const getBool = (key: string) => boolValue(formState[key])
  const getYesNo = (key: string) => yesNoValue(formState[key])

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Hospital</label>
            <input className="input" value={term.hospital} onChange={e => setTerm(s => ({ ...s, hospital: e.target.value }))} />
          </div>
          <div>
            <label className="label">Data</label>
            <input className="input" value={term.data} onChange={e => setTerm(s => ({ ...s, data: e.target.value }))} />
          </div>
          <div>
            <label className="label">Paciente</label>
            <input className="input" value={term.nome} onChange={e => setTerm(s => ({ ...s, nome: e.target.value }))} />
          </div>
          <div>
            <label className="label">CPF</label>
            <input className="input" value={term.cpf} onChange={e => setTerm(s => ({ ...s, cpf: e.target.value }))} />
          </div>
          <div>
            <label className="label">Nascimento</label>
            <input className="input" value={term.data_nascimento} onChange={e => setTerm(s => ({ ...s, data_nascimento: e.target.value }))} />
          </div>
          <div>
            <label className="label">Sexo</label>
            <input className="input" value={term.sexo} onChange={e => setTerm(s => ({ ...s, sexo: e.target.value }))} />
          </div>
          <div>
            <label className="label">Médico</label>
            <input className="input" value={term.medico} onChange={e => setTerm(s => ({ ...s, medico: e.target.value }))} />
          </div>
          <div>
            <label className="label">Cirurgia</label>
            <input className="input" value={term.cirurgia} onChange={e => setTerm(s => ({ ...s, cirurgia: e.target.value }))} />
          </div>
          <div>
            <label className="label">Olho</label>
            <input className="input" value={term.olho} onChange={e => setTerm(s => ({ ...s, olho: e.target.value }))} />
          </div>
          <div>
            <label className="label">Hora</label>
            <input className="input" value={term.hora} onChange={e => setTerm(s => ({ ...s, hora: e.target.value }))} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Termo de consentimento e entendimento pré-cirúrgico</h2>
        <div className="mt-3 text-sm text-slate-800 leading-6 space-y-3">
          <p>
            Eu, <span className="font-semibold">{term.nome || '________'}</span>, portador do CPF{' '}
            <span className="font-semibold">{term.cpf || '________'}</span>, D/N{' '}
            <span className="font-semibold">{term.data_nascimento || '____/____/____'}</span>, aceito voluntária e plenamente o tratamento médico cirúrgico proposto e solicitado pelo{' '}
            <span className="font-semibold">{term.medico || '________'}</span> e sua equipe, para tratar da minha saúde atual conforme julgarem necessário, em procedimento cirúrgico a ser realizado no{' '}
            <span className="font-semibold">{term.hospital || '________'}</span> no dia{' '}
            <span className="font-semibold">{term.data || '____/____/____'}</span>.
          </p>
          <p>
            Tenho pleno conhecimento e estou ciente que o procedimento cirúrgico foi planejado especificamente para o meu caso e eu, de maneira voluntária, consinto e autorizo sua realização, sendo este procedimento facoemulsificação com implante de lente intraocular em olho{' '}
            <span className="font-semibold">{term.olho || '____'}</span>.
          </p>
          <p>
            Entendo que meu médico possa encontrar diferentes condições que requeiram um procedimento adicional ou até mesmo diferente do planejado, portanto autorizo sua realização na medida que julgarem necessária, deste novo e/ou adicional procedimento.
          </p>
          <p>
            Estou ciente que todo procedimento pelo qual passarei terá unicamente a finalidade e/ou tentativa de obter a melhora de minhas condições atuais sem, no entanto, estar pré-definida qualquer garantia de resultado e/ou cura.
          </p>
          <p>
            Tenho pleno conhecimento e me foi explicado que nesta cirurgia, como em todas as outras, pode ocorrer, embora raro, complicações e/ou risco de infecção, que dependendo da evolução desta, pode acarretar um estado pior do que me encontro atualmente.
          </p>
          <p>
            As lentes intraoculares usadas nas cirurgias do Sistema Único de Saúde são de fabricação nacional e de formato esférico, não havendo a possibilidade de substituição das mesmas.
          </p>
          <p>
            Todas as minhas dúvidas sobre o ato operatório, possíveis complicações e resultados foram satisfatoriamente esclarecidos em consultório e pelo meu médico oftalmologista, salientando que tive plena oportunidade de cancelar a cirurgia programada.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SignaturePad label="Assinatura do paciente" value={sigPatient} onChange={setSigPatient} height={120} />
          <SignaturePad label="Assinatura da testemunha" value={sigWitness} onChange={setSigWitness} height={120} />
          <SignaturePad label="Carimbo/assinatura do médico" value={sigDoctor} onChange={setSigDoctor} height={120} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Observações intra-operatórias</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Olho operado</label>
            <input className="input" value={term.olho} onChange={e => setTerm(s => ({ ...s, olho: e.target.value }))} />
          </div>
          <div>
            <label className="label">Anestesia</label>
            <input className="input" value={term.ANESTESIA} onChange={e => setTerm(s => ({ ...s, ANESTESIA: e.target.value }))} />
          </div>
          <div>
            <label className="label">Instrumentador</label>
            <input className="input" value={term.INSTRUMENTADOR} onChange={e => setTerm(s => ({ ...s, INSTRUMENTADOR: e.target.value }))} />
          </div>
          <div>
            <label className="label">Circulante</label>
            <input className="input" value={term.CIRCULANTE} onChange={e => setTerm(s => ({ ...s, CIRCULANTE: e.target.value }))} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-800">Paciente durante cirurgia</p>
            <div className="mt-3 flex flex-col gap-2">
              <Checkbox checked={getBool('intraop_colaborativo')} onChange={v => setBool('intraop_colaborativo', v)} label="Colaborativo" />
              <Checkbox checked={getBool('intraop_nao_colaborativo')} onChange={v => setBool('intraop_nao_colaborativo', v)} label="Não colaborativo" />
              <Checkbox checked={getBool('intraop_dor')} onChange={v => setBool('intraop_dor', v)} label="Reclamou de dor" />
              <div>
                <label className="label">Outra queixa</label>
                <input className="input" value={getText('intraop_outra_queixa')} onChange={e => setText('intraop_outra_queixa', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-800">Intercorrência intraoperatória</p>
            <YesNoRow label="Houve intercorrência?" value={getYesNo('intraop_intercorrencia')} onChange={v => setYesNo('intraop_intercorrencia', v)} />
            <div className="mt-3">
              <label className="label">Descrição</label>
              <textarea className="input min-h-[90px] resize-y" value={getText('intraop_intercorrencia_desc')} onChange={e => setText('intraop_intercorrencia_desc', e.target.value)} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Checklist de cirurgia segura — cirurgia de catarata</h2>
        <p className="text-xs text-slate-500 mt-1">
          Preencha Sim/Não para cada item.
        </p>
        <div className="mt-4 flex flex-col gap-5">
          {SAFETY_CHECKLIST.map(section => (
            <div key={section.id} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">{section.title}</p>
              <div className="mt-3">
                {section.items.map(it => (
                  <YesNoRow
                    key={it.id}
                    label={it.label}
                    value={getYesNo(`safety_${section.id}_${it.id}`)}
                    onChange={v => setYesNo(`safety_${section.id}_${it.id}`, v)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SignaturePad label="Assinatura do médico" value={strValue(formState['safety_sig_medico'])} onChange={(v) => setText('safety_sig_medico', v)} height={120} />
          <SignaturePad label="Assinatura do circulante" value={strValue(formState['safety_sig_circulante'])} onChange={(v) => setText('safety_sig_circulante', v)} height={120} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Evolução pós-op (registro)</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Data</label>
            <input className="input" value={getText('posop_data')} onChange={e => setText('posop_data', e.target.value)} placeholder="____/____/____" />
          </div>
          <div>
            <label className="label">Olho</label>
            <div className="flex gap-4 mt-2">
              <Checkbox checked={getBool('posop_od')} onChange={v => setBool('posop_od', v)} label="Direito" />
              <Checkbox checked={getBool('posop_oe')} onChange={v => setBool('posop_oe', v)} label="Esquerdo" />
            </div>
          </div>
          <div>
            <label className="label">AV SC OD</label>
            <input className="input" value={getText('posop_av_od')} onChange={e => setText('posop_av_od', e.target.value)} />
          </div>
          <div>
            <label className="label">AV SC OE</label>
            <input className="input" value={getText('posop_av_oe')} onChange={e => setText('posop_av_oe', e.target.value)} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-800">Queixas</p>
            <div className="mt-3 flex flex-col gap-2">
              <Checkbox checked={getBool('posop_queixa_nenhuma')} onChange={v => setBool('posop_queixa_nenhuma', v)} label="Nenhuma" />
              <Checkbox checked={getBool('posop_queixa_lacrimejamento')} onChange={v => setBool('posop_queixa_lacrimejamento', v)} label="Lacrimejamento" />
              <Checkbox checked={getBool('posop_queixa_ardencia')} onChange={v => setBool('posop_queixa_ardencia', v)} label="Ardência" />
              <Checkbox checked={getBool('posop_queixa_dor')} onChange={v => setBool('posop_queixa_dor', v)} label="Dor" />
              <Checkbox checked={getBool('posop_queixa_embacado_perto')} onChange={v => setBool('posop_queixa_embacado_perto', v)} label="Embaçado para perto" />
              <Checkbox checked={getBool('posop_queixa_embacado_longe')} onChange={v => setBool('posop_queixa_embacado_longe', v)} label="Embaçado para longe" />
              <div>
                <label className="label">Outra</label>
                <input className="input" value={getText('posop_queixa_outra')} onChange={e => setText('posop_queixa_outra', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-800">Aderência</p>
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-2">Usou medicação correta?</p>
                <div className="flex gap-4">
                  <Checkbox checked={getBool('posop_med_sim')} onChange={v => setBool('posop_med_sim', v)} label="Sim" />
                  <Checkbox checked={getBool('posop_med_nao')} onChange={v => setBool('posop_med_nao', v)} label="Não" />
                  <Checkbox checked={getBool('posop_med_parcial')} onChange={v => setBool('posop_med_parcial', v)} label="Parcialmente" />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">Realizou repouso correto?</p>
                <div className="flex gap-4">
                  <Checkbox checked={getBool('posop_rep_sim')} onChange={v => setBool('posop_rep_sim', v)} label="Sim" />
                  <Checkbox checked={getBool('posop_rep_nao')} onChange={v => setBool('posop_rep_nao', v)} label="Não" />
                  <Checkbox checked={getBool('posop_rep_parcial')} onChange={v => setBool('posop_rep_parcial', v)} label="Parcialmente" />
                </div>
              </div>
              <div>
                <label className="label">BIO / FO / Conduta (observações)</label>
                <textarea className="input min-h-[120px] resize-y" value={getText('posop_observacoes')} onChange={e => setText('posop_observacoes', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Descrição da operação</h2>
        <p className="text-xs text-slate-500 mt-1">Registro descritivo do ato cirúrgico (modelo padrão).</p>
        <div className="mt-3 text-sm text-slate-800 leading-6 space-y-2">
          <p>Assepsia/antissepsia + campos estéreis.</p>
          <p>Incisão principal + paracenteses.</p>
          <p>Azul de tripan na câmara anterior para colorir saco capsular.</p>
          <p>Xilocaína diluída com adrenalina na câmara anterior.</p>
          <p>Metilcelulose a 2% na câmara anterior.</p>
          <p>Capsulorrexis.</p>
          <p>Hidrodissécação + hidrodelineação do núcleo.</p>
          <p>Facoemulsificação do núcleo.</p>
          <p>Aspiração de restos corticais.</p>
          <p>Implante de LIO no saco capsular (in the bag).</p>
          <p>Aspiração de viscoelástico + sutura aquosa.</p>
          <p>Cefuroxima na câmara anterior + Vigamox tópico.</p>
          <p>Protetor acrílico.</p>
        </div>
        <div className="mt-4">
          <label className="label">Observações adicionais</label>
          <textarea className="input min-h-[120px] resize-y" value={getText('descop_observacoes')} onChange={e => setText('descop_observacoes', e.target.value)} />
        </div>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SignaturePad label="Carimbo/assinatura do médico (1)" value={strValue(formState['descop_carimbo_1'])} onChange={(v) => setText('descop_carimbo_1', v)} height={110} />
          <SignaturePad label="Carimbo/assinatura do médico (2)" value={strValue(formState['descop_carimbo_2'])} onChange={(v) => setText('descop_carimbo_2', v)} height={110} />
          <SignaturePad label="Carimbo/assinatura do médico (3)" value={strValue(formState['descop_carimbo_3'])} onChange={(v) => setText('descop_carimbo_3', v)} height={110} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Prescrição médica / relatório</h2>
        <div className="mt-3 text-sm text-slate-800 leading-6 space-y-2">
          <p>1 — Jejum VO. (Manter)</p>
          <p>2 — Aferição de SSVV e estado clínico geral. (Verificar)</p>
          <p>3 — Aferição de glicemia capilar; comunicar se maior que 200. (Verificar)</p>
          <p>4 — Higienização das mãos a cada 30 min. (Promover)</p>
          <p>5 — Fenilefrina colírio 10%: 1 gota no olho {term.olho || '____'}.</p>
          <p>6 — Diazepam 5 mg VO 30 min antes do procedimento.</p>
          <p>7 — Colírio tropicamida 0,1%: 1 gota de 5/5 min no olho {term.olho || '____'} até o procedimento.</p>
          <p>8 — Diamox 250 mg: 1 cp VO após a cirurgia.</p>
        </div>
        <div className="mt-4">
          <label className="label">Evolução clínica</label>
          <textarea className="input min-h-[120px] resize-y" value={getText('presc_evolucao')} onChange={e => setText('presc_evolucao', e.target.value)} />
        </div>
        <div className="mt-4">
          <SignaturePad label="Carimbo/assinatura do médico" value={strValue(formState['presc_carimbo'])} onChange={(v) => setText('presc_carimbo', v)} height={120} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Relatório de enfermagem — intraoperatório (catarata)</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Horário de início</label>
            <input className="input" value={getText('enf_inicio')} onChange={e => setText('enf_inicio', e.target.value)} placeholder="__:__" />
          </div>
          <div>
            <label className="label">Horário de término</label>
            <input className="input" value={getText('enf_termino')} onChange={e => setText('enf_termino', e.target.value)} placeholder="__:__" />
          </div>
          <div>
            <label className="label">Instrumentador</label>
            <input className="input" value={term.INSTRUMENTADOR} onChange={e => setTerm(s => ({ ...s, INSTRUMENTADOR: e.target.value }))} />
          </div>
          <div>
            <label className="label">Circulante</label>
            <input className="input" value={term.CIRCULANTE} onChange={e => setTerm(s => ({ ...s, CIRCULANTE: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-800">Tipo de anestesia</p>
            <p className="text-xs text-slate-500 mt-1">{term.ANESTESIA || '____'}</p>
            <div className="mt-3 flex flex-col gap-2">
              <Checkbox checked={getBool('enf_sedacao_realizada')} onChange={v => setBool('enf_sedacao_realizada', v)} label="Realizado sedação" />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-800">Técnica cirúrgica</p>
            <div className="mt-3 flex flex-col gap-2">
              <Checkbox checked={getBool('enf_tecnica_faco')} onChange={v => setBool('enf_tecnica_faco', v)} label="Facoemulsificação" />
              <Checkbox checked={getBool('enf_tecnica_eec')} onChange={v => setBool('enf_tecnica_eec', v)} label="EEC" />
              <div>
                <label className="label">Outro</label>
                <input className="input" value={getText('enf_tecnica_outro')} onChange={e => setText('enf_tecnica_outro', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Anotações de enfermagem</label>
          <textarea className="input min-h-[140px] resize-y" value={getText('enf_anotacoes')} onChange={e => setText('enf_anotacoes', e.target.value)} />
        </div>
      </section>
    </div>
  )
}
