import { isSecureRequest, serializeClearedSessionCookie } from '@/server/auth/cookies'

export async function POST(request: Request) {
  const secure = isSecureRequest(request)
  const response = new Response(null, { status: 303, headers: { location: '/' } })
  response.headers.append('Set-Cookie', serializeClearedSessionCookie({ secure }))
  return response
}
