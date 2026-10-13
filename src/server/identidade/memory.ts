import { parsePasswordHash, serializePasswordHash } from '@/server/auth/senha'
import { SchemaInvalidoError } from '@/server/persistence/schema-error'
import {
  normalizarEmail,
  novoUsuarioId,
  validarNovoUsuario,
  type IdentidadeResult,
  type NovoUsuario,
  type UserStore,
  type Usuario,
} from './usuarios'

export type RegistroUsuario = {
  id: string
  email: string
  senhaHash: string
  criadoEm: string
  atualizadoEm: string
}

export type CelulaUsuarios = {
  registros: Map<string, RegistroUsuario>
  indisponivel: boolean
}

function paraUsuario(registro: RegistroUsuario): Usuario {
  try {
    return {
      id: registro.id,
      email: registro.email,
      senhaHash: parsePasswordHash(registro.senhaHash),
      criadoEm: new Date(registro.criadoEm),
      atualizadoEm: new Date(registro.atualizadoEm),
    }
  } catch (error) {
    throw new SchemaInvalidoError(error instanceof Error ? error.message : String(error))
  }
}

export class MemoryUserStore implements UserStore {
  constructor(private celula: CelulaUsuarios = { registros: new Map(), indisponivel: false }) {}

  async criarUsuario(entrada: NovoUsuario): Promise<IdentidadeResult<Usuario>> {
    if (this.celula.indisponivel) {
      return { ok: false, error: { kind: 'armazenamento-indisponivel' } }
    }
    const invalido = validarNovoUsuario(entrada)
    if (invalido) return { ok: false, error: invalido }

    const email = normalizarEmail(entrada.email)
    for (const registro of this.celula.registros.values()) {
      if (registro.email === email) {
        return { ok: false, error: { kind: 'email-em-uso' } }
      }
    }

    const agora = new Date().toISOString()
    const registro: RegistroUsuario = {
      id: novoUsuarioId(),
      email,
      senhaHash: serializePasswordHash(entrada.senhaHash),
      criadoEm: agora,
      atualizadoEm: agora,
    }
    this.celula.registros.set(registro.id, registro)
    return { ok: true, value: paraUsuario(registro) }
  }

  private ler(registro: RegistroUsuario | undefined): IdentidadeResult<Usuario | null> {
    if (this.celula.indisponivel) {
      return { ok: false, error: { kind: 'armazenamento-indisponivel' } }
    }
    if (!registro) return { ok: true, value: null }
    try {
      return { ok: true, value: paraUsuario(registro) }
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'schema-invalido',
          detalhe: error instanceof SchemaInvalidoError ? error.message : String(error),
        },
      }
    }
  }

  async buscarPorEmail(email: string): Promise<IdentidadeResult<Usuario | null>> {
    const normalizado = normalizarEmail(email)
    const registro = [...this.celula.registros.values()].find((r) => r.email === normalizado)
    return this.ler(registro)
  }

  async buscarPorId(id: string): Promise<IdentidadeResult<Usuario | null>> {
    return this.ler(this.celula.registros.get(id))
  }
}
