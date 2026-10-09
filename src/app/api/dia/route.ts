import { redirecionar } from '@/server/http'
import { getStateStore } from '@/server/persistence'
import { erroParaParam } from '@/server/persistence/mensagens'
import { SchemaInvalidoError } from '@/server/persistence/schema-error'
import { AlertasPendentesError, avaliarAlertas } from '@/server/dia/alertas'
import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import {
  ajustarItem,
  confirmarDia,
  promoverPrioridade,
  removerPrioridade,
  substituirPrioridade,
} from '@/server/dia/modelo'
import { ItemNaoEncontradoError } from '@/server/rotina/modelo'
import { dataCivilAmanha, ehDataCivil } from '@/server/tempo'
import { atualizarDia, type DiaAtual, type DiaNovo } from '@/server/usecases/dia'

function textoOuNulo(form: FormData, campo: string): string | null {
  const valor = String(form.get(campo) ?? '').trim()
  return valor || null
}

function aplicador(
  acao: string,
  form: FormData
): { data: string; aplicar: (atual: DiaAtual) => DiaNovo } {
  const id = String(form.get('id') ?? '')
  const confirmar = form.get('confirmar') === 'on'
  switch (acao) {
    case 'planejar': {
      const data = dataCivilAmanha()
      return {
        data,
        aplicar: ({ rotina, semanaAtiva, instancia, versao }) => {
          if (!semanaAtiva) throw new ItemNaoEncontradoError('semana ativa ausente')
          if (instancia?.confirmadaEm) return {}
          return { instancia: gerarInstanciaDiaria(semanaAtiva, rotina, data, versao) }
        },
      }
    }
    case 'ajustar': {
      const data = String(form.get('data') ?? '')
      if (!ehDataCivil(data)) throw new SchemaInvalidoError('data inválida')
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return {
            instancia: ajustarItem(
              instancia,
              id,
              {
                inicio: form.has('inicio') ? textoOuNulo(form, 'inicio') : undefined,
                fim: form.has('fim') ? textoOuNulo(form, 'fim') : undefined,
              },
              confirmar
            ),
          }
        },
      }
    }
    case 'confirmar': {
      const data = String(form.get('data') ?? '')
      const ciente = form.get('ciente') === 'on'
      if (!ehDataCivil(data)) throw new SchemaInvalidoError('data inválida')
      return {
        data,
        aplicar: ({ instancia, rotina }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          // Alertas comuns não bloqueiam: bastam o reconhecimento marcado.
          if (!ciente && avaliarAlertas(instancia, rotina).length > 0) {
            throw new AlertasPendentesError()
          }
          return { instancia: confirmarDia(instancia, new Date()) }
        },
      }
    }
    case 'promover': {
      const data = String(form.get('data') ?? '')
      if (!ehDataCivil(data)) throw new SchemaInvalidoError('data inválida')
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return { instancia: promoverPrioridade(instancia, id) }
        },
      }
    }
    case 'despromover': {
      const data = String(form.get('data') ?? '')
      if (!ehDataCivil(data)) throw new SchemaInvalidoError('data inválida')
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return { instancia: removerPrioridade(instancia, id) }
        },
      }
    }
    case 'substituir': {
      const data = String(form.get('data') ?? '')
      const novo = String(form.get('novo') ?? '')
      const antigo = String(form.get('antigo') ?? '')
      if (!ehDataCivil(data)) throw new SchemaInvalidoError('data inválida')
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return { instancia: substituirPrioridade(instancia, antigo, novo) }
        },
      }
    }
    default:
      throw new SchemaInvalidoError('ação desconhecida')
  }
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  if (!form) return redirecionar('/amanha')

  const acao = String(form.get('acao') ?? '')
  let plano: ReturnType<typeof aplicador>
  try {
    plano = aplicador(acao, form)
  } catch {
    return redirecionar('/amanha?erro=entrada')
  }

  const store = await getStateStore()
  const resultado = await atualizarDia(store, plano.data, plano.aplicar)

  if (!resultado.ok) {
    // Limite de prioridades não é erro: o dia volta com a escolha de
    // qual prioridade substituir pelo item candidato.
    if (resultado.error.kind === 'prioridade-cheia' && acao === 'promover') {
      return redirecionar(`/amanha?substituir=${encodeURIComponent(String(form.get('id') ?? ''))}`)
    }
    return redirecionar(`/amanha?erro=${erroParaParam(resultado.error)}`)
  }
  if (acao === 'planejar') return redirecionar('/amanha?planejado=1')
  if (acao === 'confirmar') return redirecionar('/amanha?confirmado=1')
  return redirecionar('/amanha?salvo=1')
}
