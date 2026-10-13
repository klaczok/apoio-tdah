import { identidadeAutenticada } from '@/server/auth/contexto'
import { sessaoDaEntrevista } from '@/server/entrevista/sessao'
import {
  descartarDocumento,
  extrairTextoDocumento,
  formatoDoNome,
  guardarDocumento,
  LIMITE_DOCUMENTO_BYTES,
} from '@/server/entrevista/documento'
import { redirecionar } from '@/server/http'

// Upload do documento efêmero: exige sessão autenticada, consentimento
// geral registrado e consentimento específico marcado no formulário.
// Erros factuais voltam à tela antes de qualquer uso do conteúdo —
// o arquivo nunca é persistido.
export async function POST(request: Request) {
  const identidade = await identidadeAutenticada()
  if (!identidade) return redirecionar('/login')
  const sessao = await sessaoDaEntrevista()
  if (!sessao) return redirecionar('/entrevista/consentimento')

  const form = await request.formData().catch(() => null)
  if (!form) return redirecionar('/entrevista/documento?erro=entrada')

  if (form.get('acao') === 'remover') {
    descartarDocumento(identidade.usuarioId)
    return redirecionar('/entrevista/documento')
  }

  // Consentimento específico do documento — sem ele, nada é recebido.
  if (form.get('consentimentoDocumento') !== 'aceito') {
    return redirecionar('/entrevista/documento?erro=consentimento')
  }

  const arquivos = form
    .getAll('arquivo')
    .filter((f): f is File => typeof f === 'object' && f !== null && 'size' in f && f.size > 0)
  if (arquivos.length === 0) return redirecionar('/entrevista/documento?erro=entrada')
  if (arquivos.length > 1) return redirecionar('/entrevista/documento?erro=quantidade')

  const arquivo = arquivos[0]!
  const formato = formatoDoNome(arquivo.name)
  if (!formato) return redirecionar('/entrevista/documento?erro=formato')
  if (arquivo.size > LIMITE_DOCUMENTO_BYTES) {
    return redirecionar('/entrevista/documento?erro=tamanho')
  }

  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  let texto: string | null = null
  try {
    texto = await extrairTextoDocumento(bytes, formato)
  } catch {
    // Falha de extração: nada é guardado; a tela oferece remover,
    // tentar de novo ou seguir sem documento.
    return redirecionar('/entrevista/documento?erro=extracao')
  }
  guardarDocumento(identidade.usuarioId, {
    nome: arquivo.name,
    formato,
    tamanho: arquivo.size,
    consentidoEm: new Date().toISOString(),
    texto,
  })
  return redirecionar('/entrevista/documento?selecionado=1')
}
