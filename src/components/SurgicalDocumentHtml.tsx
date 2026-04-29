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
        <h2 className="text-sm font-semibold text-slate-900">TERMO DE CONSENTIMENTO E ENTENDIMENTO PRÉ-CIRÚRGICO</h2>
        <div className="mt-3 text-sm text-slate-800 leading-6 space-y-3">
          <p>
            Eu, <span className="font-semibold">{term.nome || '________'}</span>, portador do <span className="font-semibold">{term.cpf || '________'}</span>,{' '}
            <span className="font-semibold">{term.data_nascimento || '____/____/____'}</span>, aceito voluntária e plenamente o tratamento médico cirúrgico proposto e solicitado pelo{' '}
            <span className="font-semibold">{term.medico || '________'}</span>, e sua equipe, para tratar da minha saúde atual conforme julgarem necessário, em procedimento cirúrgico a ser realizado no{' '}
            <span className="font-semibold">{term.hospital || '________'}</span> no dia <span className="font-semibold">{term.data || '____/____/____'}</span>.
          </p>
          <p>
            Tenho pleno conhecimento e estou ciente de que o procedimento cirúrgico foi planejado especificamente para o meu caso e, de maneira voluntária, consinto e autorizo sua realização, sendo este procedimento{' '}
            <span className="font-semibold">{term.cirurgia || '________'}</span> em <span className="font-semibold">{term.olho || '____'}</span>.
          </p>
          <p>
            Entendo que meu médico possa encontrar diferentes condições que requeiram um procedimento adicional ou até mesmo diferente do planejado, portanto, autorizo sua realização na medida que julgarem necessária, deste novo e/ou adicional procedimento.
          </p>
          <p>
            Estou ciente de que todo procedimento pelo qual passarei terá unicamente a finalidade e/ou tentativa de obter melhora das minhas condições atuais, não havendo garantia de resultado e/ou cura.
          </p>
          <p>
            Tenho pleno conhecimento e me foi explicado que nesta cirurgia, como em todas as outras, podem ocorrer, embora raramente, complicações e/ou risco de infecção, que, dependendo da evolução, podem acarretar um estado pior do que me encontro atualmente. Do mesmo modo, pode haver risco e danos na manutenção da minha condição atual sem a realização do procedimento proposto.
          </p>
          <p>
            Declaro estar ciente de que a lente intraocular disponibilizada pelo Sistema Único de Saúde (SUS) possui finalidade exclusiva de tratamento da catarata, sendo uma lente monofocal, não destinada à correção completa de erros refrativos, podendo haver necessidade de uso de óculos após o procedimento. Fui devidamente informado(a) de que, uma vez implantada, essa lente é permanente, não sendo indicada sua substituição por outra de tecnologia superior (lente premium), exceto em situações médicas específicas avaliadas pelo oftalmologista, especialmente no período pós-operatório imediato.
          </p>
          <p>
            Todas as minhas dúvidas sobre o ato operatório, possíveis complicações e resultados foram satisfatoriamente esclarecidas em consultório pelo meu médico oftalmologista, tendo eu plena oportunidade de cancelar a cirurgia programada.
          </p>
          <p>
            Estou informado(a) sobre a necessidade de exames periódicos e cuidados pós-operatórios, devendo suspender medicações somente por ordem médica e não fazer uso de qualquer medicação por conta própria sem autorização prévia do médico.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SignaturePad label="PACIENTE" value={sigPatient} onChange={setSigPatient} height={120} />
          <SignaturePad label="TESTEMUNHA" value={sigWitness} onChange={setSigWitness} height={120} />
          <SignaturePad label="CARIMBO MÉDICO" value={sigDoctor} onChange={setSigDoctor} height={120} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">FICHA DE TRIAGEM PRÉ CIRÚRGICA PARA CIRURGIA DE FACOEMULCIFICAÇÃO</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Nome do paciente</label>
            <input className="input" value={term.nome} onChange={e => setTerm(s => ({ ...s, nome: e.target.value }))} />
          </div>
          <div>
            <label className="label">Data da cirurgia</label>
            <input className="input" value={term.data} onChange={e => setTerm(s => ({ ...s, data: e.target.value }))} />
          </div>
          <div>
            <label className="label">PA</label>
            <input className="input" value={getText('triagem_pa')} onChange={e => setText('triagem_pa', e.target.value)} placeholder="_______" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Hora</label>
              <input className="input" value={getText('triagem_hora')} onChange={e => setText('triagem_hora', e.target.value)} placeholder="__:__" />
            </div>
            <div>
              <label className="label">HGT</label>
              <input className="input" value={getText('triagem_hgt')} onChange={e => setText('triagem_hgt', e.target.value)} placeholder="_______" />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-800">Alergias</p>
            <YesNoRow label="Possui alergias?" value={getYesNo('triagem_alergias')} onChange={v => setYesNo('triagem_alergias', v)} />
            <div className="mt-3">
              <label className="label">A que?</label>
              <input className="input" value={getText('triagem_alergias_que')} onChange={e => setText('triagem_alergias_que', e.target.value)} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-800">Jejum / Acompanhante</p>
            <Checkbox
              checked={getBool('triagem_jejum_ok')}
              onChange={v => setBool('triagem_jejum_ok', v)}
              label="Paciente confirmou jejum e estar acompanhado de um maior de idade que se responsabiliza pelo pós-operatório. (ok)"
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-800">Patologias</p>
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <YesNoRow label="HAS" value={getYesNo('triagem_has')} onChange={v => setYesNo('triagem_has', v)} />
            <YesNoRow label="DM" value={getYesNo('triagem_dm')} onChange={v => setYesNo('triagem_dm', v)} />
            <YesNoRow label="Disfunção cardíaca" value={getYesNo('triagem_cardio')} onChange={v => setYesNo('triagem_cardio', v)} />
            <YesNoRow label="Usa anti-coagulante" value={getYesNo('triagem_anticoag')} onChange={v => setYesNo('triagem_anticoag', v)} />
          </div>
          <div className="mt-3">
            <label className="label">Outras</label>
            <textarea className="input min-h-[100px] resize-y" value={getText('triagem_outras')} onChange={e => setText('triagem_outras', e.target.value)} />
          </div>
        </div>

        <div className="mt-5">
          <SignaturePad
            label="ASSINATURA DO AVALIADOR"
            value={strValue(formState['triagem_assinatura_avaliador'])}
            onChange={(v) => setText('triagem_assinatura_avaliador', v)}
            height={120}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">PRESCRIÇÃO MÉDICA / ASSINATURA — RELATÓRIO MÉDICO</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Hospital</label>
            <input className="input" value={term.hospital} onChange={e => setTerm(s => ({ ...s, hospital: e.target.value }))} />
          </div>
          <div>
            <label className="label">Data da cirurgia</label>
            <input className="input" value={term.data} onChange={e => setTerm(s => ({ ...s, data: e.target.value }))} />
          </div>
          <div>
            <label className="label">Nome do paciente</label>
            <input className="input" value={term.nome} onChange={e => setTerm(s => ({ ...s, nome: e.target.value }))} />
          </div>
          <div>
            <label className="label">CPF</label>
            <input className="input" value={term.cpf} onChange={e => setTerm(s => ({ ...s, cpf: e.target.value }))} />
          </div>
          <div>
            <label className="label">Data nascimento</label>
            <input className="input" value={term.data_nascimento} onChange={e => setTerm(s => ({ ...s, data_nascimento: e.target.value }))} />
          </div>
          <div>
            <label className="label">Olho a ser operado</label>
            <input className="input" value={term.olho} onChange={e => setTerm(s => ({ ...s, olho: e.target.value }))} />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-800 leading-6 space-y-1">
          <p>1 — JEJUM VO. (*MANTER*)</p>
          <p>
            Pós operatório imediato de facoemulsificação com implante de lente intra ocular dobrável em olho <span className="font-semibold">{term.olho || '____'}</span> sem sidel. LIO tópica. Sem sinais de infecção. Paciente segue de Alta, com retorno agendado.
          </p>
          <p>Orientado quanto a sinais de alerta e entregue orientações pós operatório e telefone de SOS.</p>
          <p>2 — AFERIÇÃO DE SSVV E ESTADO CLÍNICO GERAL. (*VERIFICAR*)</p>
          <p>3 — AFERIÇÃO (GLICEMIA CAPILAR) COMUNICAR SE MAIOR QUE 200. (*VERIFICAR*)</p>
          <p>4 — HIGIENIZAÇÃO DAS MÃOS A CADA 30 MIN. (*PROMOVER*)</p>
          <p>5 — Fenilefrina colírio 10%: pingar uma gota no olho <span className="font-semibold">{term.olho || '____'}</span>.</p>
          <p>5 — Diazepan 5 mg CP VO 30 min antes do procedimento.</p>
          <p>6 — Colírio tropicamida 0,1% (uso ocular): 1 gt de 5/5 min no olho <span className="font-semibold">{term.olho || '____'}</span> até o procedimento.</p>
          <p>7 — Diamox 250 mg: 1 CP VO após a cirurgia.</p>
        </div>

        <div className="mt-4">
          <label className="label">Evolução clínica (editável)</label>
          <textarea className="input min-h-[120px] resize-y" value={getText('presc_evolucao')} onChange={e => setText('presc_evolucao', e.target.value)} />
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SignaturePad label="Carimbo do médico (1)" value={strValue(formState['presc_carimbo_1'])} onChange={(v) => setText('presc_carimbo_1', v)} height={120} />
          <SignaturePad label="Carimbo do médico (2)" value={strValue(formState['presc_carimbo_2'])} onChange={(v) => setText('presc_carimbo_2', v)} height={120} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">CHECKLIST DE CIRURGIA SEGURA — CIRURGIA DE CATARATA</h2>
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
          <SignaturePad label="Assinatura — médico" value={strValue(formState['checklist_sig_medico'])} onChange={(v) => setText('checklist_sig_medico', v)} height={120} />
          <SignaturePad label="Assinatura — circulante" value={strValue(formState['checklist_sig_circulante'])} onChange={(v) => setText('checklist_sig_circulante', v)} height={120} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">REGISTRO CIRÚRGICO</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Nome do paciente</label>
            <input className="input" value={term.nome} onChange={e => setTerm(s => ({ ...s, nome: e.target.value }))} />
          </div>
          <div>
            <label className="label">Data nascimento</label>
            <input className="input" value={term.data_nascimento} onChange={e => setTerm(s => ({ ...s, data_nascimento: e.target.value }))} />
          </div>
          <div>
            <label className="label">CPF</label>
            <input className="input" value={term.cpf} onChange={e => setTerm(s => ({ ...s, cpf: e.target.value }))} />
          </div>
          <div>
            <label className="label">Data da cirurgia</label>
            <input className="input" value={term.data} onChange={e => setTerm(s => ({ ...s, data: e.target.value }))} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <label className="label">Operador</label>
            <input className="input" value={term.medico} onChange={e => setTerm(s => ({ ...s, medico: e.target.value }))} />
            <div className="mt-3">
              <label className="label">Instrumentador</label>
              <input className="input" value={term.INSTRUMENTADOR} onChange={e => setTerm(s => ({ ...s, INSTRUMENTADOR: e.target.value }))} />
            </div>
            <div className="mt-3">
              <label className="label">Anestesista</label>
              <input className="input" value={getText('cir_anestesista')} onChange={e => setText('cir_anestesista', e.target.value)} />
            </div>
            <div className="mt-3">
              <label className="label">Tipo anestesia</label>
              <input className="input" value={term.ANESTESIA} onChange={e => setTerm(s => ({ ...s, ANESTESIA: e.target.value }))} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <label className="label">Olho a ser operado</label>
            <input className="input" value={term.olho} onChange={e => setTerm(s => ({ ...s, olho: e.target.value }))} />
            <div className="mt-3">
              <label className="label">Etiqueta LIO</label>
              <textarea className="input min-h-[70px] resize-y" value={getText('cir_etiqueta_lio')} onChange={e => setText('cir_etiqueta_lio', e.target.value)} placeholder="Inserir etiqueta da LIO" />
            </div>
            <div className="mt-3">
              <label className="label">Tipo de operação</label>
              <input className="input" value={term.cirurgia} onChange={e => setTerm(s => ({ ...s, cirurgia: e.target.value }))} />
            </div>
            <div className="mt-3 text-sm text-slate-700">
              <div>Diagnóstico pré-operatório: <span className="font-semibold">Catarata</span></div>
              <div>Diagnóstico pós-operatório: <span className="font-semibold">Pseudofacia</span></div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-800">Intercorrências no ato cirúrgico</p>
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Checkbox checked={getBool('cir_intercorrencia_nao')} onChange={v => setBool('cir_intercorrencia_nao', v)} label="Não" />
            <Checkbox checked={getBool('cir_intercorrencia_sim')} onChange={v => setBool('cir_intercorrencia_sim', v)} label="Sim" />
          </div>
          <div className="mt-3">
            <label className="label">Qual?</label>
            <textarea className="input min-h-[90px] resize-y" value={getText('cir_intercorrencia_qual')} onChange={e => setText('cir_intercorrencia_qual', e.target.value)} />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-800">Descrição da operação</p>
          <div className="mt-3 text-sm text-slate-800 leading-6 space-y-1">
            <p>Assepsia/antissepsia + campos estéreis;</p>
            <p>Incisão principal + paracenteses;</p>
            <p>Azul de tripan na câmara anterior para colorir saco capsular;</p>
            <p>Xilocaína diluída com adrenalina na câmara anterior;</p>
            <p>Metilcelulose à 2% na câmara anterior;</p>
            <p>Capsulorrexis;</p>
            <p>Hidrodissécação + hidrodelineação do núcleo;</p>
            <p>Facoemulsificação do núcleo;</p>
            <p>Aspiração de restos corticais;</p>
            <p>Implante de LIO no saco capsular (in the bag);</p>
            <p>Aspiração de viscoelástico + sutura aquosa;</p>
            <p>Cefuroxima na câmara anterior + Vigamox tópico;</p>
            <p>Protetor acrílico.</p>
          </div>
          <div className="mt-4">
            <label className="label">Observações adicionais</label>
            <textarea className="input min-h-[120px] resize-y" value={getText('descop_observacoes')} onChange={e => setText('descop_observacoes', e.target.value)} />
          </div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SignaturePad label="Carimbo médico (1)" value={strValue(formState['descop_carimbo_1'])} onChange={(v) => setText('descop_carimbo_1', v)} height={110} />
            <SignaturePad label="Carimbo médico (2)" value={strValue(formState['descop_carimbo_2'])} onChange={(v) => setText('descop_carimbo_2', v)} height={110} />
            <SignaturePad label="Carimbo médico (3)" value={strValue(formState['descop_carimbo_3'])} onChange={(v) => setText('descop_carimbo_3', v)} height={110} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">RELATÓRIO DE ENFERMAGEM — INTRAOPERATÓRIO (CIRURGIA DE CATARATA)</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Hora de início</label>
            <input className="input" value={getText('enf_inicio')} onChange={e => setText('enf_inicio', e.target.value)} placeholder="__:__" />
          </div>
          <div>
            <label className="label">Hora de término</label>
            <input className="input" value={getText('enf_termino')} onChange={e => setText('enf_termino', e.target.value)} placeholder="__:__" />
          </div>
          <div>
            <label className="label">Sexo</label>
            <input className="input" value={getText('enf_sexo')} onChange={e => setText('enf_sexo', e.target.value)} placeholder={term.sexo || ''} />
          </div>
          <div>
            <label className="label">Olho operado</label>
            <input className="input" value={term.olho} onChange={e => setTerm(s => ({ ...s, olho: e.target.value }))} />
          </div>
          <div>
            <label className="label">Instrumentador</label>
            <input className="input" value={term.INSTRUMENTADOR} onChange={e => setTerm(s => ({ ...s, INSTRUMENTADOR: e.target.value }))} />
          </div>
          <div>
            <label className="label">Circulante de sala</label>
            <input className="input" value={term.CIRCULANTE} onChange={e => setTerm(s => ({ ...s, CIRCULANTE: e.target.value }))} />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-800">Procedimento intraoperatório</p>
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de anestesia</label>
              <input className="input" value={term.ANESTESIA} onChange={e => setTerm(s => ({ ...s, ANESTESIA: e.target.value }))} />
              <div className="mt-3">
                <Checkbox checked={getBool('enf_sedacao_realizada')} onChange={v => setBool('enf_sedacao_realizada', v)} label="Realizado sedação" />
              </div>
            </div>
            <div>
              <label className="label">Etiqueta LIO implantada</label>
              <textarea className="input min-h-[70px] resize-y" value={getText('enf_etiqueta_lio')} onChange={e => setText('enf_etiqueta_lio', e.target.value)} placeholder="Inserir etiqueta da LIO" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-800">Medicamentos administrados (intra-op)</p>
              <div className="mt-3 flex flex-col gap-2">
                <Checkbox checked={getBool('enf_med_carbacol')} onChange={v => setBool('enf_med_carbacol', v)} label="Carbacol" />
                <Checkbox checked={getBool('enf_med_azul_tripan')} onChange={v => setBool('enf_med_azul_tripan', v)} label="Azul de Tripan" />
                <div>
                  <label className="label">Outro</label>
                  <input className="input" value={getText('enf_med_outro')} onChange={e => setText('enf_med_outro', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-800">Antibiótico profilático intracamaral</p>
              <div className="mt-3 flex flex-col gap-2">
                <Checkbox checked={getBool('enf_atb_cefuroxima')} onChange={v => setBool('enf_atb_cefuroxima', v)} label="Cefuroxima Sódica 750mg, diluída 1/20ml" />
                <div>
                  <label className="label">Outro</label>
                  <input className="input" value={getText('enf_atb_outro')} onChange={e => setText('enf_atb_outro', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-800">Intercorrências</p>
              <div className="mt-3 flex flex-col gap-2">
                <Checkbox checked={getBool('enf_intercorrencia_nao')} onChange={v => setBool('enf_intercorrencia_nao', v)} label="Não houve" />
                <Checkbox checked={getBool('enf_intercorrencia_sim')} onChange={v => setBool('enf_intercorrencia_sim', v)} label="Sim" />
                <div>
                  <label className="label">Descrever</label>
                  <input className="input" value={getText('enf_intercorrencia_desc')} onChange={e => setText('enf_intercorrencia_desc', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-800">Finalização</p>
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <YesNoRow label="Contagem de campos e instrumentais conferida" value={getYesNo('enf_final_contagem')} onChange={v => setYesNo('enf_final_contagem', v)} />
            <YesNoRow label="Integridade da LIO confirmada" value={getYesNo('enf_final_integridade_lio')} onChange={v => setYesNo('enf_final_integridade_lio', v)} />
            <YesNoRow label="Curativo ocular realizado" value={getYesNo('enf_final_curativo')} onChange={v => setYesNo('enf_final_curativo', v)} />
            <YesNoRow label="Paciente encaminhado à recuperação / alta ambulatorial" value={getYesNo('enf_final_encaminhado')} onChange={v => setYesNo('enf_final_encaminhado', v)} />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-800">Condições do paciente na saída da sala</p>
          <div className="mt-3 flex flex-col gap-2">
            <Checkbox checked={getBool('enf_saida_estavel')} onChange={v => setBool('enf_saida_estavel', v)} label="Estável" />
            <Checkbox checked={getBool('enf_saida_sonolento')} onChange={v => setBool('enf_saida_sonolento', v)} label="Sonolento" />
            <div>
              <label className="label">Outras</label>
              <input className="input" value={getText('enf_saida_outras')} onChange={e => setText('enf_saida_outras', e.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <SignaturePad label="CARIMBO/ASSINATURA — CIRCULANTE" value={strValue(formState['enf_carimbo_circulante'])} onChange={(v) => setText('enf_carimbo_circulante', v)} height={120} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">FOLHA DE RASTREABILIDADE E CONTROLE DE ESTERELIZAÇÃO</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Nome do paciente</label>
            <input className="input" value={term.nome} onChange={e => setTerm(s => ({ ...s, nome: e.target.value }))} />
          </div>
          <div>
            <label className="label">Data da cirurgia</label>
            <input className="input" value={term.data} onChange={e => setTerm(s => ({ ...s, data: e.target.value }))} />
          </div>
          <div>
            <label className="label">Olho a ser operado</label>
            <input className="input" value={term.olho} onChange={e => setTerm(s => ({ ...s, olho: e.target.value }))} />
          </div>
          <div>
            <label className="label">Caixa cirúrgica</label>
            <input className="input" value={getText('ester_caixa')} onChange={e => setText('ester_caixa', e.target.value)} placeholder="________________" />
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Etiqueta identificação caixa cirúrgica</label>
          <textarea className="input min-h-[80px] resize-y" value={getText('ester_etiqueta')} onChange={e => setText('ester_etiqueta', e.target.value)} />
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-800">Integrador químico classe 5</p>
          <Checkbox checked={getBool('ester_integrador_5')} onChange={v => setBool('ester_integrador_5', v)} label="Integrador químico classe 5 presente/ok" />
        </div>
        <div className="mt-4">
          <SignaturePad label="CARIMBO CIRCULANTE" value={strValue(formState['ester_carimbo_circulante'])} onChange={(v) => setText('ester_carimbo_circulante', v)} height={120} />
        </div>
      </section>
    </div>
  )
}
