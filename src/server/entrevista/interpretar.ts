import {
  acrescentarCompromisso,
  acrescentarPeriodo,
  definirPreferencias,
  definirSono,
  definirTrabalho,
  ehHora,
  rotinaVazia,
  type RotinaRecorrente,
} from '@/server/rotina/modelo'
import { horaParaMinutos } from '@/server/tempo'
import type { InterpretadorIA, ResultadoInterpretacao } from '@/server/ia/interpretador'

// Normalização da interpretação da IA para a RotinaRecorrente: cada
// seção passa pelos mesmos validadores do domínio usados pelos fluxos
// manuais. O que a IA não souber fica ausente; o que vier inválido é
// descartado — a IA nunca inventa nem injeta dados sem validação.
export function normalizarInterpretacao(
  interpretacao: Record<string, unknown>
): RotinaRecorrente | null {
  let rotina = rotinaVazia()
  let tocouAlgo = false
  const tentar = (fn: () => void) => {
    try {
      fn()
      tocouAlgo = true
    } catch {
      // Seção inválida: descartada, sem bloquear as demais.
    }
  }

  const sono = interpretacao.sono
  if (sono && typeof sono === 'object') {
    tentar(() => (rotina = definirSono(rotina, sono)))
  }

  const trabalho = interpretacao.trabalho
  if (trabalho && typeof trabalho === 'object') {
    tentar(() => (rotina = definirTrabalho(rotina, trabalho)))
  }

  const compromissos = interpretacao.compromissos
  if (Array.isArray(compromissos)) {
    for (const bruto of compromissos) {
      if (!bruto || typeof bruto !== 'object') continue
      const entrada = { ...(bruto as Record<string, unknown>) }
      // A IA fala em início/fim; o domínio guarda duração.
      if (
        entrada.duracaoMin == null &&
        typeof entrada.inicio === 'string' &&
        ehHora(entrada.inicio) &&
        typeof entrada.fim === 'string' &&
        ehHora(entrada.fim)
      ) {
        entrada.duracaoMin = horaParaMinutos(entrada.fim) - horaParaMinutos(entrada.inicio)
      }
      delete entrada.fim
      tentar(() => (rotina = acrescentarCompromisso(rotina, entrada)))
    }
  }

  const periodos = interpretacao.periodos
  if (Array.isArray(periodos)) {
    for (const bruto of periodos) {
      if (!bruto || typeof bruto !== 'object') continue
      tentar(() => (rotina = acrescentarPeriodo(rotina, bruto)))
    }
  }

  const preferenciaCarga = interpretacao.preferenciaCarga
  if (preferenciaCarga != null) {
    tentar(() => (rotina = definirPreferencias(rotina, { preferenciaCarga, transicaoMin: null })))
  }

  return tocouAlgo ? rotina : null
}

// Caso de uso da geração: interpreta o material consentido e devolve a
// rotina normalizada pronta para o gerador determinístico. Prompt,
// resposta bruta e respostas não saem desta função.
export async function interpretarEntrevista(
  interpretador: InterpretadorIA,
  entrada: Parameters<InterpretadorIA['interpretar']>[0]
): Promise<{ ok: true; rotina: RotinaRecorrente } | { ok: false; motivo: string }> {
  const resultado: ResultadoInterpretacao = await interpretador.interpretar(entrada)
  if (!resultado.ok) return { ok: false, motivo: resultado.motivo }
  const rotina = normalizarInterpretacao(resultado.interpretacao)
  if (!rotina) return { ok: false, motivo: 'vazia' }
  return { ok: true, rotina }
}
