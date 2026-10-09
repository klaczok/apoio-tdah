import { redirecionar } from '@/server/http'
import { getStateStore } from '@/server/persistence'
import { erroParaParam } from '@/server/persistence/mensagens'
import { SchemaInvalidoError } from '@/server/persistence/schema-error'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import {
  aceitarSugestao,
  confirmarProposta,
  editarSugestao,
  removerSugestao,
} from '@/server/proposta/modelo'
import { ItemNaoEncontradoError } from '@/server/rotina/modelo'
import {
  atualizarProposta,
  type PropostaAtual,
  type PropostaNova,
} from '@/server/usecases/proposta'

function textoOuNulo(form: FormData, campo: string): string | null {
  const valor = String(form.get(campo) ?? '').trim()
  return valor || null
}

function aplicador(acao: string, form: FormData): (atual: PropostaAtual) => PropostaNova {
  const id = String(form.get('id') ?? '')
  const exigirRascunho = ({ propostaSemanal }: PropostaAtual) => {
    if (!propostaSemanal) throw new ItemNaoEncontradoError('proposta ausente')
    return propostaSemanal
  }
  switch (acao) {
    case 'gerar':
      return ({ rotina }) => ({ propostaSemanal: gerarPropostaSemanal(rotina) })
    case 'aceitar':
      return (atual) => ({
        propostaSemanal: aceitarSugestao(exigirRascunho(atual), id),
      })
    case 'editar':
      return (atual) => ({
        propostaSemanal: editarSugestao(
          exigirRascunho(atual),
          id,
          {
            titulo: textoOuNulo(form, 'titulo') ?? undefined,
            inicio: form.has('inicio') ? textoOuNulo(form, 'inicio') : undefined,
            fim: form.has('fim') ? textoOuNulo(form, 'fim') : undefined,
          },
          form.get('confirmar') === 'on'
        ),
      })
    case 'remover':
      return (atual) => ({
        propostaSemanal: removerSugestao(exigirRascunho(atual), id, form.get('confirmar') === 'on'),
      })
    case 'confirmar':
      return (atual) => ({
        propostaSemanal: null,
        semanaAtiva: confirmarProposta(exigirRascunho(atual), new Date()),
      })
    default:
      throw new SchemaInvalidoError('ação desconhecida')
  }
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  if (!form) return redirecionar('/proposta')

  const acao = String(form.get('acao') ?? '')
  let aplicar: ReturnType<typeof aplicador>
  try {
    aplicar = aplicador(acao, form)
  } catch {
    return redirecionar('/proposta?erro=entrada')
  }

  const store = await getStateStore()
  const resultado = await atualizarProposta(store, aplicar)

  if (!resultado.ok) {
    return redirecionar(`/proposta?erro=${erroParaParam(resultado.error)}`)
  }
  if (acao === 'gerar') return redirecionar('/proposta?gerada=1')
  if (acao === 'confirmar') return redirecionar('/proposta?confirmada=1')
  return redirecionar('/proposta?salvo=1')
}
