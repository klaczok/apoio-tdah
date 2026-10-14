// Contrato do conselheiro de IA: recebe a semana já montada (texto
// resumido) e o que mais pesa para a pessoa ("dor"), e devolve texto
// livre de sugestões práticas. É consultivo — a resposta não é parseada
// para estrutura nenhuma e nunca toca a proposta ou a rotina.
export type EntradaConselho = {
  resumoSemana: string
  dor: string
}

export type ResultadoConselho =
  { ok: true; texto: string } | { ok: false; motivo: 'indisponivel' | 'invalida' | 'vazia' }

export interface ConselheiroIA {
  aconselhar(entrada: EntradaConselho): Promise<ResultadoConselho>
}
