import { createHash, timingSafeEqual } from 'node:crypto'
import { verificarSenha } from './senha'
import type { CredencialLegada } from './config'

function hashEmail(email: string): Buffer {
  return createHash('sha256').update(email.trim().toLowerCase(), 'utf8').digest()
}

export async function verificarCredencialLegada(
  credencial: CredencialLegada,
  email: string,
  password: string
): Promise<boolean> {
  const passwordOk = await verificarSenha(password, credencial.passwordHash)
  const emailOk = timingSafeEqual(hashEmail(email), hashEmail(credencial.userEmail))

  return passwordOk && emailOk
}
