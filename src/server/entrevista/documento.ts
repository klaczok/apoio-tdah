// Documento de apoio da entrevista: material transitório que vive
// apenas na memória do processo, indexado pelo usuário da sessão, com
// vida curta. Nunca toca o EstadoPrivado nem o StateStore — ao sair,
// concluir ou expirar a sessão efêmera, é descartado.
export const LIMITE_DOCUMENTO_BYTES = 2 * 1024 * 1024
export const LIMITE_TEXTO_EXTRAIDO = 10_000
const TTL_DOCUMENTO_MS = 30 * 60 * 1000

export const FORMATOS_DOCUMENTO = ['pdf', 'docx', 'txt'] as const
export type FormatoDocumento = (typeof FORMATOS_DOCUMENTO)[number]

export type DocumentoTransitorio = {
  nome: string
  formato: FormatoDocumento
  tamanho: number
  consentidoEm: string
  bytes: Uint8Array
  /** Texto já extraído (TXT agora; PDF/DOCX na etapa de interpretação). */
  texto: string | null
}

export function formatoDoNome(nome: string): FormatoDocumento | null {
  const extensao = nome.toLowerCase().split('.').pop()
  return FORMATOS_DOCUMENTO.find((f) => f === extensao) ?? null
}

export function extrairTextoDocumento(bytes: Uint8Array, formato: FormatoDocumento): string | null {
  if (formato !== 'txt') return null
  const texto = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  return texto.slice(0, LIMITE_TEXTO_EXTRAIDO)
}

const globalState = globalThis as {
  __documentosEntrevista?: Map<string, { doc: DocumentoTransitorio; expira: number }>
}

function mapa() {
  return (globalState.__documentosEntrevista ??= new Map())
}

export function guardarDocumento(usuarioId: string, doc: DocumentoTransitorio): void {
  mapa().set(usuarioId, { doc, expira: Date.now() + TTL_DOCUMENTO_MS })
}

export function obterDocumento(usuarioId: string): DocumentoTransitorio | null {
  const entrada = mapa().get(usuarioId)
  if (!entrada) return null
  if (entrada.expira < Date.now()) {
    mapa().delete(usuarioId)
    return null
  }
  return entrada.doc
}

export function descartarDocumento(usuarioId: string): void {
  mapa().delete(usuarioId)
}
