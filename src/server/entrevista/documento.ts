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

// Extração transitória: TXT decodificado direto; PDF/DOCX passam pelos
// parsers locais. O material usado nunca passa de 10 páginas nem de
// 10 mil caracteres — o que ocorrer primeiro (spec v3). Falhas de
// extração propagam para a rota, que devolve erro factual.
export async function extrairTextoDocumento(
  bytes: Uint8Array,
  formato: FormatoDocumento
): Promise<string | null> {
  if (formato === 'txt') {
    const texto = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    return texto.slice(0, LIMITE_TEXTO_EXTRAIDO)
  }
  if (formato === 'pdf') {
    // pdf-parse v2 puxa pdfjs-dist (só ESM). Sob Jest o transformIgnore-
    // Patterns da config o compila para CJS; no servidor Next o import
    // dinâmico resolve nativamente.
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: Buffer.from(bytes) })
    try {
      // No máximo 10 páginas e 10 mil caracteres — o que ocorrer primeiro.
      const resultado = await parser.getText({ first: 10 })
      return resultado.text.trim().slice(0, LIMITE_TEXTO_EXTRAIDO) || null
    } finally {
      await parser.destroy()
    }
  }
  const mammoth = await import('mammoth')
  const resultado = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
  return resultado.value.trim().slice(0, LIMITE_TEXTO_EXTRAIDO) || null
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
