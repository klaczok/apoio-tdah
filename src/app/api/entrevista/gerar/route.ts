import { identidadeAutenticada } from '@/server/auth/contexto'
import { sessaoDaEntrevista } from '@/server/entrevista/sessao'
import { obterDocumento, descartarDocumento } from '@/server/entrevista/documento'
import { guardarRotinaInterpretada, obterPerguntas } from '@/server/entrevista/material'
import { interpretarEntrevista } from '@/server/entrevista/interpretar'
import { getInterpretador } from '@/server/ia'
import { getStateStore } from '@/server/persistence'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { redirecionar } from '@/server/http'

// Geração da proposta a partir da entrevista: interpreta o material
// consentido via adaptador de servidor, normaliza para a
// RotinaRecorrente e alimenta o gerador determinístico — a proposta fica
// em rascunho para revisão, nunca promovida diretamente a SemanaAtiva.
// A rotina interpretada fica em material transitório até a confirmação:
// gerar não sobrescreve uma rotina montada manualmente.
export async function POST() {
  const identidade = await identidadeAutenticada()
  if (!identidade) return redirecionar('/login')
  const sessao = await sessaoDaEntrevista()
  if (!sessao) return redirecionar('/entrevista/consentimento')
  if (!sessao.respostas) return redirecionar('/entrevista/etapas')

  const documento = obterDocumento(identidade.usuarioId)
  const perguntas = obterPerguntas(identidade.usuarioId)
  const resultado = await interpretarEntrevista(getInterpretador(), {
    respostas: sessao.respostas,
    perguntas: perguntas?.map(({ id, titulo, pergunta }) => ({ id, titulo, pergunta })) ?? null,
    documentoTexto: documento?.texto ?? null,
  })
  if (!resultado.ok) {
    console.warn('[entrevista] geração falhou:', resultado.motivo)
    return redirecionar(`/entrevista/revisao?erro=${resultado.motivo}`)
  }

  const store = await getStateStore(identidade.usuarioId)
  const lido = await store.load()
  if (!lido.ok) return redirecionar('/entrevista/revisao?erro=indisponivel')
  const proposta = gerarPropostaSemanal(resultado.rotina)
  const salvo = await store.save(
    { ...lido.value.dados, propostaSemanal: proposta },
    lido.value.version
  )
  if (!salvo.ok) return redirecionar('/entrevista/revisao?erro=indisponivel')
  // A rotina interpretada aguarda a confirmação em memória transitória;
  // o documento já cumpriu seu papel — descarte imediato.
  guardarRotinaInterpretada(identidade.usuarioId, resultado.rotina)
  descartarDocumento(identidade.usuarioId)
  return redirecionar('/entrevista/revisao?gerada=1')
}
