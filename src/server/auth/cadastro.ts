import { getUserStore } from '@/server/identidade'
import { normalizarEmail } from '@/server/identidade/usuarios'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import { perfilVazio, type PerfilOnboarding } from '@/server/perfil/modelo'
import { hashSenha } from './senha'

// Requisito de senha divulgado na interface antes do envio.
export const SENHA_MINIMA = 8

const EMAIL_SIMPLES = /^[^\s@]+@[^\s@]+$/

// Códigos estáveis devolvidos na query do cadastro — nunca carregam
// senha nem dados da conta. A página associa cada código ao seu campo.
export type ErroCadastro =
  'email-invalido' | 'senha-fraca' | 'confirmacao-divergente' | 'email-em-uso' | 'indisponivel'

export type ResultadoCadastro = { ok: true; usuarioId: string } | { ok: false; erro: ErroCadastro }

// Cadastro aberto: cria a conta persistida e seu EstadoPrivado vazio.
// A conta nasce antes do estado; como a leitura de uma linha ausente já
// devolve estadoVazio, a gravação inicial é a compensação explícita —
// se falhar, o cadastro é reportado como indisponível sem emitir sessão.
export async function cadastrarUsuario(
  email: string,
  senha: string,
  confirmacao: string,
  perfil: PerfilOnboarding = perfilVazio()
): Promise<ResultadoCadastro> {
  const normalizado = normalizarEmail(email)
  if (!EMAIL_SIMPLES.test(normalizado)) {
    return { ok: false, erro: 'email-invalido' }
  }
  if (senha.length < SENHA_MINIMA) {
    return { ok: false, erro: 'senha-fraca' }
  }
  if (senha !== confirmacao) {
    return { ok: false, erro: 'confirmacao-divergente' }
  }

  const usuarios = await getUserStore()
  const criado = await usuarios.criarUsuario({
    email: normalizado,
    senhaHash: await hashSenha(senha),
  })
  if (!criado.ok) {
    return {
      ok: false,
      erro: criado.error.kind === 'email-em-uso' ? 'email-em-uso' : 'indisponivel',
    }
  }

  const estado = await getStateStore(criado.value.id)
  const gravado = await estado.save({ ...estadoVazio(), perfil }, 0)
  if (!gravado.ok && gravado.error.kind !== 'conflito-versao') {
    return { ok: false, erro: 'indisponivel' }
  }

  return { ok: true, usuarioId: criado.value.id }
}
