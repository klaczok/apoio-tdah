import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/server/auth/cookies'
import { verifySessionToken } from '@/server/auth/session'

const PUBLIC_PATHS = new Set(['/', '/login'])
const PUBLIC_PREFIXES = ['/api/auth/']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const sessionSecret = process.env.SESSION_SECRET
  const identidade =
    token && sessionSecret ? await verifySessionToken(sessionSecret, token, new Date()) : null

  if (!identidade) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
