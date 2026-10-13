// Marcador visual da conta: iniciais derivadas da parte local do e-mail
// autenticado. Não introduz nome nem avatar configurável — a identidade
// exibida é sempre o e-mail da sessão.
export function iniciaisDoEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const partes = local.split(/[^a-zA-ZÀ-ÿ]+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const iniciais = partes
    .slice(0, 2)
    .map((p) => p[0]!)
    .join('')
  return iniciais.toUpperCase()
}
