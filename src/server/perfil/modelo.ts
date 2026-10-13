import { SchemaInvalidoError } from '../persistence/schema-error'

// Perfil de onboarding: perguntas fixas respondidas no cadastro, antes
// da entrevista. Diferente do material da entrevista (transitório), o
// perfil faz parte do EstadoPrivado — é contexto estável que a IA usa
// para não repetir perguntas e ir direto ao que falta para montar o
// calendário. Campos textuais são sempre sanitizados com teto fixo.
export const TEXTO_MAX_PERFIL = 600
export const NOME_MAX = 80

export const MOTIVOS_USO = [
  'organizar-rotina',
  'foco-e-procrastinacao',
  'esquecimentos',
  'excesso-de-tarefas',
  'saude-e-habitos',
  'outro',
] as const
export type MotivoUso = (typeof MOTIVOS_USO)[number]

export const ROTULOS_MOTIVO: Record<MotivoUso, string> = {
  'organizar-rotina': 'Organizar a rotina do dia a dia',
  'foco-e-procrastinacao': 'Manter o foco e vencer a procrastinação',
  esquecimentos: 'Parar de esquecer compromissos e tarefas',
  'excesso-de-tarefas': 'Dar conta de muitas tarefas ao mesmo tempo',
  'saude-e-habitos': 'Cuidar de sono, alimentação e hábitos',
  outro: 'Outro motivo',
}

export const NECESSIDADES = [
  'horarios-e-compromissos',
  'dividir-tarefas',
  'constancia',
  'energia-e-descanso',
  'revisao-semanal',
] as const
export type NecessidadePrincipal = (typeof NECESSIDADES)[number]

export const ROTULOS_NECESSIDADE: Record<NecessidadePrincipal, string> = {
  'horarios-e-compromissos': 'Encaixar compromissos e horários na semana',
  'dividir-tarefas': 'Dividir tarefas grandes em passos menores',
  constancia: 'Manter constância sem abandonar o plano',
  'energia-e-descanso': 'Equilibrar energia, sono e descanso',
  'revisao-semanal': 'Revisar a semana e ajustar o que não funcionou',
}

export type PerfilOnboarding = {
  nome: string
  idade: number | null
  motivoUso: MotivoUso | null
  motivoOutro: string | null
  necessidadePrincipal: NecessidadePrincipal | null
  rotinaDiaria: string | null
  tarefasSemana: string | null
}

export function perfilVazio(): PerfilOnboarding {
  return {
    nome: '',
    idade: null,
    motivoUso: null,
    motivoOutro: null,
    necessidadePrincipal: null,
    rotinaDiaria: null,
    tarefasSemana: null,
  }
}

function textoLimpo(entrada: unknown, max = TEXTO_MAX_PERFIL): string | null {
  if (typeof entrada !== 'string') return null
  const texto = entrada.trim().slice(0, max)
  return texto.length > 0 ? texto : null
}

// Normaliza os campos do formulário de cadastro: tudo opcional, o que
// vier vazio ou inválido fica nulo — o perfil nunca bloqueia a conta.
export function perfilDoFormulario(form: FormData): PerfilOnboarding {
  const motivo = textoLimpo(form.get('motivoUso'))
  const necessidade = textoLimpo(form.get('necessidadePrincipal'))
  const idadeBruta = Number.parseInt(String(form.get('idade') ?? ''), 10)
  return {
    nome: textoLimpo(form.get('nome'), NOME_MAX) ?? '',
    idade: Number.isInteger(idadeBruta) && idadeBruta >= 5 && idadeBruta <= 120 ? idadeBruta : null,
    motivoUso: (MOTIVOS_USO as readonly string[]).includes(motivo ?? '')
      ? (motivo as MotivoUso)
      : null,
    motivoOutro: motivo === 'outro' ? textoLimpo(form.get('motivoOutro'), 200) : null,
    necessidadePrincipal: (NECESSIDADES as readonly string[]).includes(necessidade ?? '')
      ? (necessidade as NecessidadePrincipal)
      : null,
    rotinaDiaria: textoLimpo(form.get('rotinaDiaria')),
    tarefasSemana: textoLimpo(form.get('tarefasSemana')),
  }
}

// Validação do que volta do EstadoPrivado persistido — mesma tolerância
// dos demais validadores: campo fora de formato quebra o schema, campo
// opcional ausente vira nulo.
export function validarPerfil(raw: unknown): PerfilOnboarding {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new SchemaInvalidoError('perfil não é um objeto')
  }
  const perfil = raw as Record<string, unknown>
  if (typeof perfil.nome !== 'string' || perfil.nome.length > NOME_MAX) {
    throw new SchemaInvalidoError('perfil.nome inválido')
  }
  if (
    perfil.idade != null &&
    (!Number.isInteger(perfil.idade) || (perfil.idade as number) < 5 || (perfil.idade as number) > 120)
  ) {
    throw new SchemaInvalidoError('perfil.idade inválida')
  }
  if (perfil.motivoUso != null && !(MOTIVOS_USO as readonly string[]).includes(perfil.motivoUso as string)) {
    throw new SchemaInvalidoError('perfil.motivoUso inválido')
  }
  if (
    perfil.necessidadePrincipal != null &&
    !(NECESSIDADES as readonly string[]).includes(perfil.necessidadePrincipal as string)
  ) {
    throw new SchemaInvalidoError('perfil.necessidadePrincipal inválida')
  }
  for (const campo of ['motivoOutro', 'rotinaDiaria', 'tarefasSemana'] as const) {
    if (perfil[campo] != null && typeof perfil[campo] !== 'string') {
      throw new SchemaInvalidoError(`perfil.${campo} inválido`)
    }
  }
  return {
    nome: perfil.nome,
    idade: perfil.idade as number | null,
    motivoUso: perfil.motivoUso as MotivoUso | null,
    motivoOutro: perfil.motivoOutro as string | null,
    necessidadePrincipal: perfil.necessidadePrincipal as NecessidadePrincipal | null,
    rotinaDiaria: perfil.rotinaDiaria as string | null,
    tarefasSemana: perfil.tarefasSemana as string | null,
  }
}

// Texto de contexto para os prompts de IA: lista só o que foi
// respondido — o que ficou vazio é exatamente o que a entrevista ainda
// precisa perguntar. Vazio total devolve null (entrevista clássica).
export function descreverPerfil(perfil: PerfilOnboarding | null): string | null {
  if (!perfil) return null
  const linhas: string[] = []
  if (perfil.nome) linhas.push(`Nome: ${perfil.nome}`)
  if (perfil.idade != null) linhas.push(`Idade: ${perfil.idade} anos`)
  if (perfil.motivoUso) {
    const motivo = perfil.motivoUso === 'outro' && perfil.motivoOutro
      ? perfil.motivoOutro
      : ROTULOS_MOTIVO[perfil.motivoUso]
    linhas.push(`Motivo de usar o produto: ${motivo}`)
  }
  if (perfil.necessidadePrincipal) {
    linhas.push(`Necessidade principal: ${ROTULOS_NECESSIDADE[perfil.necessidadePrincipal]}`)
  }
  if (perfil.rotinaDiaria) linhas.push(`Rotina contada no cadastro: ${perfil.rotinaDiaria}`)
  if (perfil.tarefasSemana) linhas.push(`Tarefas da semana informadas: ${perfil.tarefasSemana}`)
  return linhas.length > 0 ? linhas.join('\n') : null
}
