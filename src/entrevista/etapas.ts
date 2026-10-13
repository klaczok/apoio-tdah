// Tipos compartilhados da entrevista e banco de perguntas de reserva.
// As perguntas são formuladas pela IA (perfil de psiquiatra em primeira
// consulta de rotina); quando ela está indisponível, o fluxo usa este
// banco fixo — vocabulário acolhedor e não clínico — para a entrevista
// nunca ficar bloqueada.

export type PerguntaEntrevista = {
  id: string
  titulo: string
  pergunta: string
  /** true = caixas de seleção; false = escolha única. Sem opções = texto livre. */
  multipla?: boolean
  opcoes?: { codigo: string; rotulo: string }[]
}

// Banco de reserva: cinco perguntas com opções, usadas só quando a IA
// não pode formular as perguntas da conversa.
export const PERGUNTAS_PADRAO: PerguntaEntrevista[] = [
  {
    id: 'objetivo',
    titulo: 'Objetivo e prioridade',
    pergunta: 'O que mais importa para você neste momento?',
    multipla: false,
    opcoes: [
      { codigo: 'trabalho', rotulo: 'Trabalho' },
      { codigo: 'estudos', rotulo: 'Estudos' },
      { codigo: 'saude-autocuidado', rotulo: 'Saúde e autocuidado' },
      { codigo: 'familia-casa', rotulo: 'Família e casa' },
      { codigo: 'projetos-pessoais', rotulo: 'Projetos pessoais' },
    ],
  },
  {
    id: 'horarios-fixos',
    titulo: 'Horários fixos',
    pergunta: 'Quais compromissos já têm hora marcada na sua semana?',
    multipla: true,
    opcoes: [
      { codigo: 'trabalho', rotulo: 'Trabalho' },
      { codigo: 'estudo-aulas', rotulo: 'Estudo ou aulas' },
      { codigo: 'consultas-terapias', rotulo: 'Consultas ou acompanhamentos' },
      { codigo: 'cuidado-pessoas', rotulo: 'Cuidado de pessoas (filhos, família)' },
      { codigo: 'deslocamentos', rotulo: 'Deslocamentos fixos' },
      { codigo: 'nenhum', rotulo: 'Nenhum por enquanto' },
    ],
  },
  {
    id: 'cuidados-basicos',
    titulo: 'Sono, refeições e autocuidado',
    pergunta: 'O que precisa fazer parte da rotina para você se cuidar?',
    multipla: true,
    opcoes: [
      { codigo: 'sono-regular', rotulo: 'Horário regular para dormir e acordar' },
      { codigo: 'refeicoes', rotulo: 'Refeições em horários previsíveis' },
      { codigo: 'pausas', rotulo: 'Pausas e descanso entre blocos' },
      { codigo: 'movimento', rotulo: 'Movimento ou exercício' },
      { codigo: 'tempo-livre', rotulo: 'Tempo livre sem obrigação' },
    ],
  },
  {
    id: 'responsabilidades-dificuldades',
    titulo: 'Responsabilidades e dificuldades',
    pergunta: 'Quais responsabilidades pesam — e o que costuma dificultar a organização?',
    multipla: true,
    opcoes: [
      { codigo: 'casa', rotulo: 'Casa e tarefas domésticas' },
      { codigo: 'financas', rotulo: 'Finanças e burocracia' },
      { codigo: 'comecar', rotulo: 'Dificuldade para começar tarefas' },
      { codigo: 'lembrar', rotulo: 'Dificuldade para lembrar compromissos' },
      { codigo: 'estimar-tempo', rotulo: 'Dificuldade para estimar tempo' },
      { codigo: 'transicoes', rotulo: 'Dificuldade com transições entre atividades' },
    ],
  },
  {
    id: 'preferencias-energia',
    titulo: 'Preferências e energia',
    pergunta: 'Quando sua energia costuma estar mais alta?',
    multipla: false,
    opcoes: [
      { codigo: 'manha', rotulo: 'De manhã' },
      { codigo: 'tarde', rotulo: 'À tarde' },
      { codigo: 'noite', rotulo: 'À noite' },
      { codigo: 'variavel', rotulo: 'Varia bastante' },
    ],
  },
]

export type RespostaEtapa = {
  selecionadas: string[]
  texto: string
}

export type RespostasEntrevista = Record<string, RespostaEtapa>

const TAMANHO_MAX_TEXTO = 400

// Sanitiza o que vem do cliente contra as perguntas que foram
// efetivamente feitas (geradas pela IA ou o banco de reserva):
// perguntas e códigos desconhecidos são descartados, seleção única
// corta no primeiro valor e o texto aberto é aparado. Tudo opcional —
// pergunta sem resposta pode simplesmente faltar.
export function normalizarRespostas(
  entrada: unknown,
  perguntas: PerguntaEntrevista[] = PERGUNTAS_PADRAO
): RespostasEntrevista {
  const respostas: RespostasEntrevista = {}
  if (!entrada || typeof entrada !== 'object') return respostas
  for (const pergunta of perguntas) {
    const bruta = (entrada as Record<string, unknown>)[pergunta.id]
    if (!bruta || typeof bruta !== 'object') continue
    const codigosValidos = new Set((pergunta.opcoes ?? []).map((o) => o.codigo))
    const selecionadasBrutas = Array.isArray((bruta as RespostaEtapa).selecionadas)
      ? (bruta as RespostaEtapa).selecionadas
      : []
    const validas = selecionadasBrutas.filter((c) => codigosValidos.has(c))
    const textoBruto = (bruta as RespostaEtapa).texto
    const texto =
      typeof textoBruto === 'string' ? textoBruto.trim().slice(0, TAMANHO_MAX_TEXTO) : ''
    const resposta: RespostaEtapa = {
      selecionadas: pergunta.multipla ? validas : validas.slice(0, 1),
      texto,
    }
    if (resposta.selecionadas.length > 0 || resposta.texto.length > 0) {
      respostas[pergunta.id] = resposta
    }
  }
  return respostas
}
