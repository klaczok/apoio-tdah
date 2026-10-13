import { randomUUID } from 'node:crypto'
import { passwordHashValido, type PasswordHash } from '@/server/auth/senha'

export type Usuario = {
  id: string
  email: string
  senhaHash: PasswordHash
  criadoEm: Date
  atualizadoEm: Date
}

export type IdentidadeError =
  | { kind: 'email-em-uso' }
  | { kind: 'entrada-invalida'; detalhe: string }
  | { kind: 'schema-invalido'; detalhe: string }
  | { kind: 'armazenamento-indisponivel' }

export type IdentidadeResult<T> = { ok: true; value: T } | { ok: false; error: IdentidadeError }

export type NovoUsuario = {
  email: string
  senhaHash: PasswordHash
}

export interface UserStore {
  criarUsuario(entrada: NovoUsuario): Promise<IdentidadeResult<Usuario>>
  buscarPorEmail(email: string): Promise<IdentidadeResult<Usuario | null>>
  buscarPorId(id: string): Promise<IdentidadeResult<Usuario | null>>
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function novoUsuarioId(): string {
  return randomUUID()
}

const EMAIL_SIMPLES = /^[^\s@]+@[^\s@]+$/

export function validarNovoUsuario(entrada: NovoUsuario): IdentidadeError | null {
  if (!EMAIL_SIMPLES.test(normalizarEmail(entrada.email))) {
    return { kind: 'entrada-invalida', detalhe: 'e-mail inválido' }
  }
  const hash = entrada.senhaHash
  if (!hash || !passwordHashValido(hash)) {
    return { kind: 'entrada-invalida', detalhe: 'hash de senha inválido' }
  }
  return null
}

export function userStoreIndisponivel(): UserStore {
  const falha = { ok: false as const, error: { kind: 'armazenamento-indisponivel' as const } }
  return {
    criarUsuario: async () => falha,
    buscarPorEmail: async () => falha,
    buscarPorId: async () => falha,
  }
}
