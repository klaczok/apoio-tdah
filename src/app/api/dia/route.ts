import { redirecionar } from '@/server/http'
import { getStateStore } from '@/server/persistence'
import { erroParaParam } from '@/server/persistence/mensagens'
import { SchemaInvalidoError } from '@/server/persistence/schema-error'
import { AlertasPendentesError, avaliarAlertas } from '@/server/dia/alertas'
import { gerarInstanciaDiaria, instanciaDoDia } from '@/server/dia/gerar'
import {
  adicionarTarefa,
  ajustarItem,
  anotarDia,
  concluirRevisao,
  confirmarDia,
  corrigirEstadoRevisao,
  decidirPendencia,
  dividirTarefa,
  editarTarefa,
  ehDestinoPendencia,
  ehEnergiaRevisao,
  ehEstadoRevisao,
  ehSobrecargaRevisao,
  incluirPendencia,
  promoverPrioridade,
  registrarEstado,
  removerPrioridade,
  removerTarefa,
  substituirPrioridade,
} from '@/server/dia/modelo'
import { ehCategoria, ItemNaoEncontradoError, type Categoria } from '@/server/rotina/modelo'
import { dataCivilAmanha, dataCivilHoje, ehDataCivil, somarDiasCivil } from '@/server/tempo'
import { atualizarDia, type DiaAtual, type DiaNovo } from '@/server/usecases/dia'
import type { PersistenceResult } from '@/server/persistence/store'

function textoOuNulo(form: FormData, campo: string): string | null {
  const valor = String(form.get(campo) ?? '').trim()
  return valor || null
}

// Quase toda ação mira uma data civil — parse e validação uma vez só.
function dataDo(form: FormData): string {
  const data = String(form.get('data') ?? '')
  if (!ehDataCivil(data)) throw new SchemaInvalidoError('data inválida')
  return data
}

// `depois` roda a escrita complementar após a atualização principal —
// usada pela troca de dia, que materializa a pendência no dia de destino.
type Plano = {
  data: string
  aplicar: (atual: DiaAtual) => DiaNovo
  depois?: (
    store: Awaited<ReturnType<typeof getStateStore>>
  ) => Promise<PersistenceResult<unknown> | void>
}

function aplicador(acao: string, form: FormData): Plano {
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
      // Ajuste é ato de planejamento: só dias de hoje em diante, dentro da
      // janela de uma semana, para não criar datas soltas no estado.
      const hojeAgora = dataCivilHoje()
      const data = dataDo(form)
      if (data < hojeAgora || data > somarDiasCivil(hojeAgora, 7)) {
        throw new SchemaInvalidoError('data inválida')
      }
      return {
        data,
        aplicar: ({ instancia, rotina, semanaAtiva, versao }) => {
          // Ajuste explícito materializa o dia se ele ainda só existe como
          // projeção da semana ativa (visão /semana).
          const alvo = instanciaDoDia(instancia, { semanaAtiva, rotina }, data, versao)
          if (!alvo) throw new ItemNaoEncontradoError('dia não planejado')
          return {
            instancia: ajustarItem(
              alvo,
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
      const data = dataDo(form)
      const ciente = form.get('ciente') === 'on'
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
      const data = dataDo(form)
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return { instancia: promoverPrioridade(instancia, id) }
        },
      }
    }
    case 'despromover': {
      const data = dataDo(form)
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return { instancia: removerPrioridade(instancia, id) }
        },
      }
    }
    case 'substituir': {
      const data = dataDo(form)
      const novo = String(form.get('novo') ?? '')
      const antigo = String(form.get('antigo') ?? '')
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return { instancia: substituirPrioridade(instancia, antigo, novo) }
        },
      }
    }
    case 'tarefa-criar': {
      const data = dataDo(form)
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
      const data = dataDo(form)
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
      const data = dataDo(form)
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return { instancia: removerTarefa(instancia, id, confirmar) }
        },
      }
    }
    case 'tarefa-dividir': {
      const data = dataDo(form)
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
      const data = dataDo(form)
      // Revisão é o fluxo de hoje — dias passados ficam no histórico, onde a
      // única mutação é a correção explícita e auditada.
      if (data !== dataCivilHoje()) throw new SchemaInvalidoError('data inválida')
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
      const data = dataDo(form)
      if (data !== dataCivilHoje()) throw new SchemaInvalidoError('data inválida')
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
    case 'pendencia-prever': {
      const data = dataDo(form)
      const destino = String(form.get('destino') ?? '')
      // Decisões de pendência também são fluxo do dia corrente.
      if (data !== dataCivilHoje() || !ehDataCivil(destino) || destino <= data) {
        throw new SchemaInvalidoError('data inválida')
      }
      // Não grava nada — só devolve a página com a prévia do destino.
      return { data, aplicar: () => ({}) }
    }
    case 'pendencia-decidir': {
      const data = dataDo(form)
      if (data !== dataCivilHoje()) throw new SchemaInvalidoError('data inválida')
      const tipo = String(form.get('tipo') ?? '')
      if (!ehDestinoPendencia(tipo)) {
        throw new SchemaInvalidoError('destino de pendência inválido')
      }
      const partes = String(form.get('partes') ?? '')
        .split('\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
      let movido: {
        id: string
        titulo: string
        categoria: Categoria
        inicio: string | null
        fim: string | null
      } | null = null
      const destinoData = textoOuNulo(form, 'destino')
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          const origem =
            instancia.itens.find((i) => i.id === id) ?? instancia.tarefas.find((t) => t.id === id)
          if (!origem) throw new ItemNaoEncontradoError('item não encontrado')
          const proxima = decidirPendencia(
            instancia,
            id,
            {
              tipo,
              destino: destinoData,
              escopo: textoOuNulo(form, 'escopo'),
              partes,
              confirmar,
            },
            new Date()
          )
          if (tipo === 'trocar-dia') movido = origem
          return { instancia: proxima }
        },
        depois:
          tipo === 'trocar-dia' && destinoData
            ? async (store) => {
                const item = movido
                if (!item) return
                return atualizarDia(
                  store,
                  destinoData,
                  ({ instancia, rotina, semanaAtiva, versao }) => {
                    const alvo = instanciaDoDia(
                      instancia,
                      { semanaAtiva, rotina },
                      destinoData,
                      versao
                    )
                    if (!alvo) throw new ItemNaoEncontradoError('destino sem dia planejável')
                    return { instancia: incluirPendencia(alvo, item) }
                  }
                )
              }
            : undefined,
      }
    }
    case 'revisao-corrigir': {
      const data = dataDo(form)
      // Correção vale para revisões já concluídas de dias que passaram.
      if (data >= dataCivilHoje()) throw new SchemaInvalidoError('data inválida')
      const estado = String(form.get('estado') ?? '')
      if (!ehEstadoRevisao(estado)) throw new SchemaInvalidoError('estado de revisão inválido')
      return {
        data,
        aplicar: ({ instancia }) => {
          if (!instancia) throw new ItemNaoEncontradoError('dia não planejado')
          return {
            instancia: corrigirEstadoRevisao(instancia, id, estado, confirmar, new Date()),
          }
        },
      }
    }
    case 'nota-dia': {
      const data = dataDo(form)
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
  const revisao = acao.startsWith('revisar-') || acao.startsWith('pendencia-')
  // `volta` devolve para a tela de origem — whitelist, nunca URL livre.
  const volta = String(form.get('volta') ?? '')
  const dataForm = String(form.get('data') ?? '')
  const pagina =
    volta === 'semana'
      ? '/semana'
      : volta === 'hoje'
        ? '/hoje'
        : volta === 'historico'
          ? ehDataCivil(dataForm)
            ? `/historico/${dataForm}`
            : '/historico'
          : revisao
            ? '/hoje'
            : '/amanha'
  let plano: ReturnType<typeof aplicador>
  try {
    plano = aplicador(acao, form)
  } catch {
    return redirecionar(`${pagina}?erro=entrada`)
  }

  const store = await getStateStore()
  const resultado = await atualizarDia(store, plano.data, plano.aplicar)

  if (!resultado.ok) {
    // Limite de prioridades não é erro: o dia volta com a escolha de
    // qual prioridade substituir pelo item candidato.
    if (resultado.error.kind === 'prioridade-cheia' && acao === 'promover') {
      return redirecionar(`/amanha?substituir=${encodeURIComponent(String(form.get('id') ?? ''))}`)
    }
    return redirecionar(`${pagina}?erro=${erroParaParam(resultado.error)}`)
  }

  // A escrita do dia de destino pode falhar depois de a decisão já ter sido
  // gravada — o erro é reportado em vez de deixar a pendência sumir.
  if (plano.depois) {
    try {
      const complementar = await plano.depois(store)
      if (complementar && !complementar.ok) {
        return redirecionar(`${pagina}?erro=${erroParaParam(complementar.error)}`)
      }
    } catch {
      return redirecionar(`${pagina}?erro=persistencia`)
    }
  }
  if (acao === 'planejar') return redirecionar('/amanha?planejado=1')
  if (acao === 'confirmar') return redirecionar('/amanha?confirmado=1')
  if (acao === 'revisar-concluir') return redirecionar('/hoje?revisado=1')
  if (acao === 'revisar-item') return redirecionar('/hoje?estado=1')
  if (acao === 'pendencia-prever') {
    return redirecionar(
      `/hoje?prever=${encodeURIComponent(String(form.get('id') ?? ''))}&destino=${encodeURIComponent(String(form.get('destino') ?? ''))}`
    )
  }
  if (acao === 'pendencia-decidir') return redirecionar('/hoje?decisao=1')
  if (acao === 'revisao-corrigir') return redirecionar(`${pagina}?corrigido=1`)
  return redirecionar(`${pagina}?salvo=1`)
}
