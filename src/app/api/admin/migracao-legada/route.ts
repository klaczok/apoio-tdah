import { NextResponse } from 'next/server'
import { loadCredencialLegada } from '@/server/auth/config'
import { getUserStore } from '@/server/identidade'
import { migrarContaLegada, statusMigracao } from '@/server/migracao/legado'

export const dynamic = 'force-dynamic'

// Endpoint operacional da migração da conta legada. Exige o segredo
// MIGRATION_SECRET no cabeçalho Authorization — separado do segredo de
// sessão e sem qualquer dado da credencial na resposta.
function autorizado(request: Request): boolean {
  const segredo = process.env.MIGRATION_SECRET
  if (!segredo) return false
  return request.headers.get('authorization') === `Bearer ${segredo}`
}

function negado() {
  return NextResponse.json({ erro: 'nao-autorizado' }, { status: 401 })
}

export async function GET(request: Request) {
  if (!autorizado(request)) return negado()
  let credencial = null
  try {
    credencial = loadCredencialLegada(process.env)
  } catch {
    return NextResponse.json({ status: 'credencial-invalida' }, { status: 500 })
  }
  const usuarios = await getUserStore()
  return NextResponse.json({ status: await statusMigracao(usuarios, credencial) })
}

export async function POST(request: Request) {
  if (!autorizado(request)) return negado()
  let credencial = null
  try {
    credencial = loadCredencialLegada(process.env)
  } catch {
    return NextResponse.json({ status: 'credencial-invalida' }, { status: 500 })
  }
  const usuarios = await getUserStore()
  const resultado = await migrarContaLegada(usuarios, credencial)
  // Nunca devolve hash, e-mail cru ou id novo além do status da operação.
  return NextResponse.json({
    status: resultado.status,
    usuarioId: 'usuario' in resultado ? resultado.usuario.id : undefined,
  })
}
