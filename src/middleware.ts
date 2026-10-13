import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_SESSAO } from '@/server/auth/cookies'
import { verificarTokenSessao } from '@/server/auth/session'

const CAMINHOS_PUBLICOS = new Set(['/', '/login', '/cadastro'])
const PREFIXOS_PUBLICOS = ['/api/auth/']

function ehCaminhoPublico(pathname: string): boolean {
  return CAMINHOS_PUBLICOS.has(pathname) || PREFIXOS_PUBLICOS.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  if (ehCaminhoPublico(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_SESSAO)?.value
  const segredoSessao = process.env.SESSION_SECRET
  const identidade =
    token && segredoSessao ? await verificarTokenSessao(segredoSessao, token, new Date()) : null

  if (!identidade) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
