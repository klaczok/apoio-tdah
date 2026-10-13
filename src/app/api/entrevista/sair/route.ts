import { requisicaoSegura } from '@/server/auth/cookies'
import { identidadeAutenticada } from '@/server/auth/contexto'
import { serializarCookieEntrevistaLimpo } from '@/server/entrevista/sessao'
import { descartarMaterial } from '@/server/entrevista/material'
import { redirecionar } from '@/server/http'

// Saída/abandono explícito da entrevista: apaga a sessão efêmera
// (cookie) e todo material transitório — documento e rotina
// interpretada — que de outra forma vazaria para a próxima tentativa
// dentro da janela do TTL. O EstadoPrivado nunca é tocado.
export async function GET(request: Request) {
  const identidade = await identidadeAutenticada()
  if (!identidade) return redirecionar('/login')
  descartarMaterial(identidade.usuarioId)
  const resposta = redirecionar('/hoje')
  resposta.headers.append(
    'Set-Cookie',
    serializarCookieEntrevistaLimpo({ seguro: requisicaoSegura(request) })
  )
  return resposta
}
