import { redirecionar } from '@/server/http'
import { storeDoUsuario } from '@/server/auth/contexto'
import { erroParaParam } from '@/server/persistence/mensagens'
import { getConselheiro } from '@/server/ia'
import {
  descreverSemanaParaIA,
  LIMITE_DOR,
  LIMITE_TEXTO_IA,
  validarOpiniao,
} from '@/server/proposta/opiniao'

// Opinião consultiva da IA sobre a semana montada: a pessoa diz o que
// mais pesa, a IA devolve sugestões em texto livre e o resultado é
// persistido como OpiniaoSemanal — nunca ajusta proposta nem rotina.
export async function POST(request: Request) {
  const store = await storeDoUsuario()
  if (!store) return redirecionar('/login')

  const form = await request.formData().catch(() => null)
  const dor = String(form?.get('dor') ?? '').trim()
  if (!dor || dor.length > LIMITE_DOR) return redirecionar('/proposta?erro=entrada')

  const lido = await store.load()
  if (!lido.ok) return redirecionar('/proposta?erro=persistencia')

  const semana = lido.value.dados.propostaSemanal ?? lido.value.dados.semanaAtiva
  if (!semana) return redirecionar('/proposta?erro=entrada')

  const resultado = await getConselheiro().aconselhar({
    resumoSemana: descreverSemanaParaIA(semana),
    dor,
  })
  if (!resultado.ok) {
    console.warn('[proposta/opiniao] conselho falhou:', resultado.motivo)
    return redirecionar('/proposta?erro=ia')
  }

  let opiniao
  try {
    opiniao = validarOpiniao({
      texto: resultado.texto.slice(0, LIMITE_TEXTO_IA),
      dor,
      geradaEm: new Date().toISOString(),
    })
  } catch {
    return redirecionar('/proposta?erro=ia')
  }

  const salvo = await store.save({ ...lido.value.dados, opiniaoIA: opiniao }, lido.value.version)
  if (!salvo.ok) return redirecionar(`/proposta?erro=${erroParaParam(salvo.error)}`)
  return redirecionar('/proposta?opiniao=1')
}
