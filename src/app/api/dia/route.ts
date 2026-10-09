import { redirecionar } from '@/server/http'
import { getStateStore } from '@/server/persistence'
import { erroParaParam } from '@/server/persistence/mensagens'
import { SchemaInvalidoError } from '@/server/persistence/schema-error'
import { AlertasPendentesError, avaliarAlertas } from '@/server/dia/alertas'
import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import {
  adicionarTarefa,
  ajustarItem,
  anotarDia,
  concluirRevisao,
  confirmarDia,
  dividirTarefa,
  editarTarefa,
  ehEnergiaRevisao,
  ehEstadoRevisao,
  ehSobrecargaRevisao,
  promoverPrioridade,
  registrarEstado,
  removerPrioridade,
  removerTarefa,
  substituirPrioridade,
} from '@/server/dia/modelo'
import { ehCategoria, ItemNaoEncontradoError } from '@/server/rotina/modelo'
import { dataCivilAmanha, dataCivilHoje, ehDataCivil } from '@/server/tempo'
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
    case 'tarefa-criar': {
      const data = String(form.get('data') ?? '')
      if (!ehDataCivil(data)) throw new SchemaInvalidoError('data inválida')
      const titulo = String(form.get('titulo') ?? '').trim()
      const categoria = String(form.get('categoria') ?? '')
      if (!titulo || !ehCategoria(categoria)) {
        throw new SchemaInvalidoError('tarefa inválida')
      }
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return {
            instancia: adicionarTarefa(instancia, {
              titulo,
              categoria,
              inicio: textoOuNulo(form, 'inicio'),
              fim: textoOuNulo(form, 'fim'),
              nota: textoOuNulo(form, 'nota'),
            }),
          }
        },
      }
    }
    case 'tarefa-editar': {
      const data = String(form.get('data') ?? '')
      if (!ehDataCivil(data)) throw new SchemaInvalidoError('data inválida')
      const categoria = String(form.get('categoria') ?? '')
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return {
            instancia: editarTarefa(instancia, id, {
              titulo: form.has('titulo') ? String(form.get('titulo') ?? '').trim() : undefined,
              categoria: ehCategoria(categoria) ? categoria : undefined,
              inicio: form.has('inicio') ? textoOuNulo(form, 'inicio') : undefined,
              fim: form.has('fim') ? textoOuNulo(form, 'fim') : undefined,
              nota: form.has('nota') ? textoOuNulo(form, 'nota') : undefined,
            }),
          }
        },
      }
    }
    case 'tarefa-remover': {
      const data = String(form.get('data') ?? '')
      if (!ehDataCivil(data)) throw new SchemaInvalidoError('data inválida')
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return { instancia: removerTarefa(instancia, id, confirmar) }
        },
      }
    }
    case 'tarefa-dividir': {
      const data = String(form.get('data') ?? '')
      if (!ehDataCivil(data)) throw new SchemaInvalidoError('data inválida')
      const partes = String(form.get('partes') ?? '')
        .split('\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return { instancia: dividirTarefa(instancia, id, partes) }
        },
      }
    }
    case 'revisar-item': {
      const data = String(form.get('data') ?? '')
      // Revisão olha o que aconteceu — dias futuros não são revisáveis.
      if (!ehDataCivil(data) || data > dataCivilHoje()) {
        throw new SchemaInvalidoError('data inválida')
      }
      const estado = String(form.get('estado') ?? '')
      if (estado !== '' && !ehEstadoRevisao(estado)) {
        throw new SchemaInvalidoError('estado de revisão inválido')
      }
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return { instancia: registrarEstado(instancia, id, estado === '' ? null : estado) }
        },
      }
    }
    case 'revisar-concluir': {
      const data = String(form.get('data') ?? '')
      if (!ehDataCivil(data) || data > dataCivilHoje()) {
        throw new SchemaInvalidoError('data inválida')
      }
      const energia = textoOuNulo(form, 'energia')
      const sobrecarga = textoOuNulo(form, 'sobrecarga')
      if (energia !== null && !ehEnergiaRevisao(energia)) {
        throw new SchemaInvalidoError('escala inválida')
      }
      if (sobrecarga !== null && !ehSobrecargaRevisao(sobrecarga)) {
        throw new SchemaInvalidoError('escala inválida')
      }
      // Aliases capturam o tipo já refinado pelos guards acima.
      const energiaSel = energia
      const sobrecargaSel = sobrecarga
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return {
            instancia: concluirRevisao(
              instancia,
              {
                energia: energiaSel,
                sobrecarga: sobrecargaSel,
                motivo: textoOuNulo(form, 'motivo'),
                nota: textoOuNulo(form, 'nota'),
              },
              new Date()
            ),
          }
        },
      }
    }
    case 'nota-dia': {
      const data = String(form.get('data') ?? '')
      if (!ehDataCivil(data)) throw new SchemaInvalidoError('data inválida')
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return { instancia: anotarDia(instancia, String(form.get('nota') ?? '')) }
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
  const revisao = acao.startsWith('revisar-')
  const destino = revisao ? '/hoje' : '/amanha'
  let plano: ReturnType<typeof aplicador>
  try {
    plano = aplicador(acao, form)
  } catch {
    return redirecionar(`${destino}?erro=entrada`)
  }

  const store = await getStateStore()
  const resultado = await atualizarDia(store, plano.data, plano.aplicar)

  if (!resultado.ok) {
    // Limite de prioridades não é erro: o dia volta com a escolha de
    // qual prioridade substituir pelo item candidato.
    if (resultado.error.kind === 'prioridade-cheia' && acao === 'promover') {
      return redirecionar(`/amanha?substituir=${encodeURIComponent(String(form.get('id') ?? ''))}`)
    }
    return redirecionar(`${destino}?erro=${erroParaParam(resultado.error)}`)
  }
  if (acao === 'planejar') return redirecionar('/amanha?planejado=1')
  if (acao === 'confirmar') return redirecionar('/amanha?confirmado=1')
  if (acao === 'revisar-concluir') return redirecionar('/hoje?revisado=1')
  if (acao === 'revisar-item') return redirecionar('/hoje?estado=1')
  return redirecionar(`${destino}?salvo=1`)
}
