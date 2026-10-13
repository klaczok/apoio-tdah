import { ID_USUARIO_LEGADO } from '@/server/auth/session'
import type { CredencialLegada } from '@/server/auth/config'
import { normalizarEmail, type UserStore, type Usuario } from '@/server/identidade/usuarios'

// Migração da conta de ambiente para uma conta persistida. O ID do
// usuário migrado é o próprio ID legado — a linha 'usuario' da tabela
// de estado continua com o mesmo proprietário, então rotina, proposta,
// semana ativa, dias e notas não se movem e a equivalência é trivial.
//
// Idempotente: detecta conta já migrada e não repete nada. Colisão de
// e-mail em outro usuário aborta antes de qualquer escrita. Falha de
// armazenamento não grava nada e pode ser retomada reexecutando.

export type ResultadoMigracao =
  | { status: 'migrada'; usuario: Usuario }
  | { status: 'ja-migrada'; usuario: Usuario }
  | { status: 'sem-credencial' }
  | { status: 'colisao-email'; email: string }
  | { status: 'indisponivel' }

export async function migrarContaLegada(
  usuarios: UserStore,
  credencial: CredencialLegada | null
): Promise<ResultadoMigracao> {
  if (!credencial) return { status: 'sem-credencial' }

  const email = normalizarEmail(credencial.userEmail)
  const existente = await usuarios.buscarPorEmail(email)
  if (!existente.ok) return { status: 'indisponivel' }

  if (existente.value) {
    if (existente.value.id === ID_USUARIO_LEGADO) {
      return { status: 'ja-migrada', usuario: existente.value }
    }
    // E-mail já pertence a outra conta — nada é escrito.
    return { status: 'colisao-email', email }
  }

  const criado = await usuarios.criarUsuario({
    id: ID_USUARIO_LEGADO,
    email,
    senhaHash: credencial.passwordHash,
  })
  if (!criado.ok) {
    if (criado.error.kind === 'email-em-uso') return { status: 'colisao-email', email }
    return { status: 'indisponivel' }
  }
  return { status: 'migrada', usuario: criado.value }
}

// Estado observável da migração sem efeito colateral — usado pelo GET
// do endpoint operacional e pelos procedimentos documentados.
export async function statusMigracao(
  usuarios: UserStore,
  credencial: CredencialLegada | null
): Promise<'migrada' | 'pendente' | 'sem-credencial' | 'colisao-email' | 'indisponivel'> {
  if (!credencial) return 'sem-credencial'
  const existente = await usuarios.buscarPorEmail(credencial.userEmail)
  if (!existente.ok) return 'indisponivel'
  if (!existente.value) return 'pendente'
  return existente.value.id === ID_USUARIO_LEGADO ? 'migrada' : 'colisao-email'
}
