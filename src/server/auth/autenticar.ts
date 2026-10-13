import { getUserStore } from '@/server/identidade'
import { loadCredencialLegada } from './config'
import { verificarCredencialLegada } from './credentials'
import { verificarSenha } from './senha'
import { ID_USUARIO_LEGADO } from './session'

// Resolve o ID do usuário autenticado ou null. O repositório de usuários
// tem precedência; a credencial legada de ambiente cobre e-mails ainda não
// migrados e repositório indisponível, até a migração da conta (ADR 0002).
export async function autenticar(email: string, password: string): Promise<string | null> {
  const usuarios = await getUserStore()
  const encontrado = await usuarios.buscarPorEmail(email)

  if (encontrado.ok && encontrado.value) {
    const confere = await verificarSenha(password, encontrado.value.senhaHash)
    return confere ? encontrado.value.id : null
  }

  if (!encontrado.ok && encontrado.error.kind !== 'armazenamento-indisponivel') {
    console.error(`falha ao consultar identidade: ${encontrado.error.kind}`)
    return null
  }

  let legado = null
  try {
    legado = loadCredencialLegada(process.env)
  } catch {
    console.error('credencial legada em formato inválido')
  }
  if (legado && (await verificarCredencialLegada(legado, email, password))) {
    return ID_USUARIO_LEGADO
  }
  return null
}
