import { identidadeAutenticada } from '@/server/auth/contexto'
import { sessaoDaEntrevista } from '@/server/entrevista/sessao'
import { guardarPerguntas, obterPerguntas } from '@/server/entrevista/material'
import { getEntrevistador } from '@/server/ia'
import { PERGUNTAS_PADRAO } from '@/entrevista/etapas'

// Devolve as cinco perguntas da entrevista, formuladas pela IA com
// perfil de psiquiatra em primeira consulta de rotina. As perguntas
// ficam em material transitório por usuário: "refazer" reencontra as
// mesmas perguntas e as respostas já dadas. Se a IA não puder formular,
// o banco de reserva mantém a entrevista funcionando.
export async function GET() {
  const identidade = await identidadeAutenticada()
  if (!identidade) return Response.json({ erro: 'sessao' }, { status: 401 })
  const sessao = await sessaoDaEntrevista()
  if (!sessao) return Response.json({ erro: 'consentimento' }, { status: 403 })

  const guardadas = obterPerguntas(identidade.usuarioId)
  if (guardadas) return Response.json({ perguntas: guardadas })

  const resultado = await getEntrevistador().perguntar()
  if (!resultado.ok) {
    console.warn('[entrevista] IA não formulou as perguntas:', resultado.motivo)
    return Response.json({ perguntas: PERGUNTAS_PADRAO })
  }

  guardarPerguntas(identidade.usuarioId, resultado.perguntas)
  return Response.json({ perguntas: resultado.perguntas })
}
