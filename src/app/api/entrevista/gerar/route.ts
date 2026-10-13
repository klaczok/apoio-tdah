import { identidadeAutenticada } from '@/server/auth/contexto'
import { sessaoDaEntrevista } from '@/server/entrevista/sessao'
import { obterDocumento } from '@/server/entrevista/documento'
import { interpretarEntrevista } from '@/server/entrevista/interpretar'
import { getInterpretador } from '@/server/ia'
import { getStateStore } from '@/server/persistence'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'

function redirecionar(destino: string) {
  return new Response(null, { status: 303, headers: { location: destino } })
}

// Geração da proposta a partir da entrevista: interpreta o material
// consentido via adaptador de servidor, normaliza para a
// RotinaRecorrente e alimenta o gerador determinístico — a proposta fica
// em rascunho para revisão, nunca promovida diretamente a SemanaAtiva.
export async function POST() {
  const identidade = await identidadeAutenticada()
  if (!identidade) return redirecionar('/login')
  const sessao = await sessaoDaEntrevista()
  if (!sessao) return redirecionar('/entrevista/consentimento')
  if (!sessao.respostas) return redirecionar('/entrevista/etapas')

  const documento = obterDocumento(identidade.usuarioId)
  const resultado = await interpretarEntrevista(getInterpretador(), {
    respostas: sessao.respostas,
    documentoTexto: documento?.texto ?? null,
  })
  if (!resultado.ok) return redirecionar(`/entrevista/revisao?erro=${resultado.motivo}`)

  const store = await getStateStore(identidade.usuarioId)
  const lido = await store.load()
  if (!lido.ok) return redirecionar('/entrevista/revisao?erro=indisponivel')
  const proposta = gerarPropostaSemanal(resultado.rotina)
  const salvo = await store.save(
    { ...lido.value.dados, rotina: resultado.rotina, propostaSemanal: proposta },
    lido.value.version
  )
  if (!salvo.ok) return redirecionar('/entrevista/revisao?erro=indisponivel')
  return redirecionar('/entrevista/revisao?gerada=1')
}
