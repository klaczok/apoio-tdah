import { getStateStore } from '@/server/persistence'
import { erroParaParam } from '@/server/persistence/mensagens'
import { registrarNotaDoDia } from '@/server/usecases/nota-do-dia'

function redirecionar(caminho: string): Response {
  return new Response(null, { status: 303, headers: { location: caminho } })
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  const data = String(form?.get('data') ?? '')
  const nota = String(form?.get('nota') ?? '')

  const store = await getStateStore()
  const resultado = await registrarNotaDoDia(store, data, nota)

  if (!resultado.ok) {
    return redirecionar(`/hoje?erro=${erroParaParam(resultado.error)}`)
  }
  return redirecionar('/hoje?salvo=1')
}
