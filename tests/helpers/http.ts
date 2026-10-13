// POST x-www-form-urlencoded idêntico ao enviado pelos formulários das
// páginas — usado pelas jornadas que dirigem os handlers de rota.
export function formPost(url: string, campos: Record<string, string | string[]>) {
  const corpo = new URLSearchParams()
  for (const [chave, valor] of Object.entries(campos)) {
    for (const v of Array.isArray(valor) ? valor : [valor]) corpo.append(chave, v)
  }
  return new Request(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: corpo,
  })
}
