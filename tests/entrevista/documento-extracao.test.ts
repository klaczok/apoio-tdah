/** @jest-environment node */

import { extrairTextoDocumento, LIMITE_TEXTO_EXTRAIDO } from '@/server/entrevista/documento'

async function pdfComTexto(paginas: string[]): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (const texto of paginas) {
    const pagina = doc.addPage()
    pagina.drawText(texto, { x: 50, y: 700, size: 12, font })
  }
  return new Uint8Array(await doc.save())
}

async function docxComTexto(texto: string): Promise<Uint8Array> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  )
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
  )
  zip.file(
    'word/document.xml',
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${texto}</w:t></w:r></w:p></w:body></w:document>`
  )
  return zip.generateAsync({ type: 'uint8array' })
}

describe('extrairTextoDocumento', () => {
  it('decodifica TXT dentro do limite de caracteres', async () => {
    const bytes = new TextEncoder().encode('rotina: dormir 23h'.repeat(1000))
    const texto = await extrairTextoDocumento(bytes, 'txt')
    expect(texto?.length).toBeLessThanOrEqual(LIMITE_TEXTO_EXTRAIDO)
    expect(texto).toContain('rotina')
  })

  it('extrai texto de PDF real', async () => {
    const bytes = await pdfComTexto(['Dormir as 23h, acordar as 7h'])
    const texto = await extrairTextoDocumento(bytes, 'pdf')
    expect(texto).toContain('Dormir as 23h')
  })

  it('limita o material do PDF às primeiras 10 páginas', async () => {
    const paginas = Array.from({ length: 12 }, (_, i) => `conteudo da pagina ${i + 1}`)
    const bytes = await pdfComTexto(paginas)
    const texto = await extrairTextoDocumento(bytes, 'pdf')
    expect(texto).toContain('pagina 10')
    expect(texto).not.toContain('pagina 11')
    expect(texto).not.toContain('pagina 12')
  })

  it('extrai texto de DOCX real', async () => {
    const bytes = await docxComTexto('trabalho seg a sex 9h as 15h')
    const texto = await extrairTextoDocumento(bytes, 'docx')
    expect(texto).toContain('trabalho seg a sex')
  })

  it('falha de leitura propaga para a rota tratar como erro factual', async () => {
    const lixo = new Uint8Array([0, 1, 2, 3, 4, 5])
    await expect(extrairTextoDocumento(lixo, 'pdf')).rejects.toThrow()
  })
})
