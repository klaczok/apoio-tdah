import { redirecionar } from '@/server/http'
import { storeDoUsuario } from '@/server/auth/contexto'
import { erroParaParam } from '@/server/persistence/mensagens'
import { registrarNotaDoDia } from '@/server/usecases/nota-do-dia'

export async function POST(request: Request) {
  const store = await storeDoUsuario()
  if (!store) return redirecionar('/login')

  const form = await request.formData().catch(() => null)
  const data = String(form?.get('data') ?? '')
  const nota = String(form?.get('nota') ?? '')

  const resultado = await registrarNotaDoDia(store, data, nota)

  if (!resultado.ok) {
    return redirecionar(`/hoje?erro=${erroParaParam(resultado.error)}`)
  }
  return redirecionar('/hoje?salvo=1')
}
