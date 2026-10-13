export const COOKIE_SESSAO = 'apoio_sessao'

export function requisicaoSegura(request: Request): boolean {
  return (
    new URL(request.url).protocol === 'https:' ||
    request.headers.get('x-forwarded-proto') === 'https'
  )
}

type OpcoesCookie = {
  seguro: boolean
  maxAgeSegundos: number
}

export function serializarCookieSessao(token: string, opcoes: OpcoesCookie): string {
  const partes = [
    `${COOKIE_SESSAO}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=lax',
    `Max-Age=${opcoes.maxAgeSegundos}`,
  ]
  if (opcoes.seguro) partes.push('Secure')
  return partes.join('; ')
}

export function serializarCookieSessaoLimpo(opcoes: { seguro: boolean }): string {
  return serializarCookieSessao('', { ...opcoes, maxAgeSegundos: 0 })
}
