import { isSecureRequest } from '@/server/auth/cookies'
import { identidadeAutenticada } from '@/server/auth/contexto'
import { sessaoDaEntrevista, serializeClearedEntrevistaCookie } from '@/server/entrevista/sessao'
import { descartarDocumento } from '@/server/entrevista/documento'
import { getStateStore } from '@/server/persistence'
import { erroParaParam } from '@/server/persistence/mensagens'
import { atualizarProposta } from '@/server/usecases/proposta'
import { confirmarProposta } from '@/server/proposta/modelo'
import { ItemNaoEncontradoError } from '@/server/rotina/modelo'

function redirecionar(destino: string) {
  return new Response(null, { status: 303, headers: { location: destino } })
}

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
  const resultado = await atualizarProposta(store, ({ propostaSemanal }) => {
    if (!propostaSemanal) throw new ItemNaoEncontradoError('proposta ausente')
    return { propostaSemanal: null, semanaAtiva: confirmarProposta(propostaSemanal, new Date()) }
  })
  if (!resultado.ok) {
    return redirecionar(`/entrevista/revisao?erro=${erroParaParam(resultado.error)}`)
  }

  descartarDocumento(identidade.usuarioId)
  const resposta = redirecionar('/entrevista/concluida')
  resposta.headers.append(
    'Set-Cookie',
    serializeClearedEntrevistaCookie({ secure: isSecureRequest(request) })
  )
  return resposta
}
