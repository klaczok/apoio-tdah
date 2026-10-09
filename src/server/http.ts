export function redirecionar(caminho: string): Response {
  return new Response(null, { status: 303, headers: { location: caminho } })
}
