import { NextResponse } from 'next/server'
import { isSecureRequest, serializeClearedSessionCookie } from '@/server/auth/cookies'

export async function POST(request: Request) {
  const secure = isSecureRequest(request)
  const response = NextResponse.redirect(new URL('/', request.url), 303)
  response.headers.append('Set-Cookie', serializeClearedSessionCookie({ secure }))
  return response
}
