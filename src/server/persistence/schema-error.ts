export class SchemaInvalidoError extends Error {
  constructor(detalhe: string) {
    super(`schema inválido: ${detalhe}`)
    this.name = 'SchemaInvalidoError'
  }
}
