import { requisicaoSegura } from '@/server/auth/cookies'
import { identidadeAutenticada } from '@/server/auth/contexto'
import { sessaoDaEntrevista, serializarCookieEntrevistaLimpo } from '@/server/entrevista/sessao'
import { obterRotinaInterpretada, descartarMaterial } from '@/server/entrevista/material'
import { getStateStore } from '@/server/persistence'
import { erroParaParam } from '@/server/persistence/mensagens'
import { atualizarProposta } from '@/server/usecases/proposta'
import { confirmarProposta } from '@/server/proposta/modelo'
import { ItemNaoEncontradoError } from '@/server/rotina/modelo'
import { redirecionar } from '@/server/http'

// Confirmação da proposta da entrevista: reutiliza o mesmo caminho do
// fluxo de /proposta (confirmarProposta promove o rascunho revisado a
// SemanaAtiva). Só depois da gravação bem-sucedida o material
// transitório — cookie da entrevista e documento — é descartado.
export async function POST(request: Request) {
  const identidade = await identidadeAutenticada()
  if (!identidade) return redirecionar('/login')
  const sessao = await sessaoDaEntrevista()
  if (!sessao) return redirecionar('/entrevista/consentimento')

  const store = await getStateStore(identidade.usuarioId)
  const rotinaInterpretada = obterRotinaInterpretada(identidade.usuarioId)
  const resultado = await atualizarProposta(store, ({ propostaSemanal, rotina }) => {
    if (!propostaSemanal) throw new ItemNaoEncontradoError('proposta ausente')
    // A confirmação promove junto a rotina interpretada — até aqui ela
    // era só material transitório, nunca sobrescreveu a rotina manual.
    return {
      rotina: rotinaInterpretada ?? rotina,
      propostaSemanal: null,
      semanaAtiva: confirmarProposta(propostaSemanal, new Date()),
    }
  })
  if (!resultado.ok) {
    return redirecionar(`/entrevista/revisao?erro=${erroParaParam(resultado.error)}`)
  }

  descartarMaterial(identidade.usuarioId)
  const resposta = redirecionar('/entrevista/concluida')
  resposta.headers.append(
    'Set-Cookie',
    serializarCookieEntrevistaLimpo({ seguro: requisicaoSegura(request) })
  )
  return resposta
}
