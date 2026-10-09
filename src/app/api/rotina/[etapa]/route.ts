import { redirecionar } from '@/server/http'
import { getStateStore } from '@/server/persistence'
import { erroParaParam } from '@/server/persistence/mensagens'
import { ehEtapa, ETAPAS_DE_LISTA, proximaEtapa, type Etapa } from '@/app/configurar/etapas'
import {
  acrescentarBlocoEstudo,
  acrescentarBlocoMusica,
  acrescentarCompromisso,
  acrescentarPeriodo,
  atualizarBlocoEstudo,
  atualizarBlocoMusica,
  definirAlimentacao,
  definirMetaEstudo,
  definirPreferencias,
  definirPresencial,
  definirSono,
  definirTrabalho,
  REFEICAO_REFS,
  removerBlocoEstudo,
  removerBlocoMusica,
  removerCompromisso,
  removerPeriodo,
  type RotinaRecorrente,
} from '@/server/rotina/modelo'
import { VERSAO_REFERENCIA_ATUAL } from '@/server/rotina/referencia-alimentar'
import { atualizarRotina } from '@/server/usecases/rotina'

function textoOuNulo(form: FormData, campo: string): string | null {
  const valor = String(form.get(campo) ?? '').trim()
  return valor || null
}

function minutosOuNulo(form: FormData, campo: string): number | null {
  const valor = textoOuNulo(form, campo)
  return valor === null ? null : Number(valor)
}

function diasMarcados(form: FormData): string[] {
  return form.getAll('dias').map(String)
}

function aplicador(etapa: Etapa, form: FormData): (rotina: RotinaRecorrente) => RotinaRecorrente {
  switch (etapa) {
    case 'trabalho':
      return (r) =>
        definirTrabalho(r, {
          diasSemana: diasMarcados(form),
          horasPadrao: Number(form.get('horasPadrao')),
          limiteExcepcional: Number(form.get('limiteExcepcional')),
        })
    case 'presencial':
      return (r) =>
        definirPresencial(r, {
          diasSemana: diasMarcados(form),
          chegadaLimite: textoOuNulo(form, 'chegadaLimite'),
          preparacaoMin: minutosOuNulo(form, 'preparacaoMin'),
          deslocamentoMin: minutosOuNulo(form, 'deslocamentoMin'),
        })
    case 'sono':
      return (r) =>
        definirSono(r, {
          dormir: textoOuNulo(form, 'dormir'),
          acordar: textoOuNulo(form, 'acordar'),
        })
    case 'preferencias':
      return (r) =>
        definirPreferencias(r, {
          transicaoMin: minutosOuNulo(form, 'transicaoMin'),
          preferenciaCarga: textoOuNulo(form, 'preferenciaCarga'),
        })
    case 'compromissos': {
      const acao = form.get('acao')
      if (acao === 'remover') {
        const id = String(form.get('id') ?? '')
        const confirmar = form.get('confirmar') === 'on'
        return (r) => removerCompromisso(r, id, confirmar)
      }
      return (r) =>
        acrescentarCompromisso(r, {
          titulo: String(form.get('titulo') ?? ''),
          diaSemana: String(form.get('diaSemana') ?? ''),
          inicio: String(form.get('inicio') ?? ''),
          duracaoMin: Number(form.get('duracaoMin')),
          categoria: String(form.get('categoria') ?? ''),
          tipo: String(form.get('tipo') ?? ''),
        })
    }
    case 'periodos': {
      const acao = form.get('acao')
      if (acao === 'remover') {
        const id = String(form.get('id') ?? '')
        const confirmar = form.get('confirmar') === 'on'
        return (r) => removerPeriodo(r, id, confirmar)
      }
      return (r) =>
        acrescentarPeriodo(r, {
          tipo: String(form.get('tipo') ?? ''),
          diaSemana: String(form.get('diaSemana') ?? ''),
          inicio: String(form.get('inicio') ?? ''),
          fim: String(form.get('fim') ?? ''),
        })
    }
    case 'alimentacao': {
      const dias = diasMarcados(form)
      const refeicoes = REFEICAO_REFS.map((ref) => ({
        ref,
        horario: textoOuNulo(form, `horario-${ref}`),
        oculta: form.get(`oculta-${ref}`) === 'on',
      }))
      const semTreino = form.get('semTreino') === 'on'
      return (r) =>
        definirAlimentacao(r, {
          refeicoes,
          diasTreino: dias.length ? dias : semTreino ? [] : null,
          referenciaVersao: r.alimentacao?.referenciaVersao ?? VERSAO_REFERENCIA_ATUAL,
        })
    }
    case 'estudo': {
      const acao = form.get('acao')
      const id = String(form.get('id') ?? '')
      if (acao === 'remover') return (r) => removerBlocoEstudo(r, id)
      if (acao === 'meta') {
        const horas = textoOuNulo(form, 'metaHoras')
        return (r) => definirMetaEstudo(r, horas === null ? null : Number(horas) * 60)
      }
      const entrada = {
        tipo: String(form.get('tipo') ?? ''),
        diaSemana: String(form.get('diaSemana') ?? ''),
        inicio: String(form.get('inicio') ?? ''),
        planejadoMin: Number(form.get('planejadoMin')),
        realizadoMin: minutosOuNulo(form, 'realizadoMin'),
      }
      if (acao === 'atualizar') return (r) => atualizarBlocoEstudo(r, id, entrada)
      return (r) => acrescentarBlocoEstudo(r, entrada)
    }
    case 'musica': {
      const acao = form.get('acao')
      const id = String(form.get('id') ?? '')
      if (acao === 'remover') return (r) => removerBlocoMusica(r, id)
      const entrada = {
        tipo: String(form.get('tipo') ?? ''),
        diaSemana: String(form.get('diaSemana') ?? ''),
        inicio: String(form.get('inicio') ?? ''),
        duracaoMin: Number(form.get('duracaoMin')),
      }
      if (acao === 'atualizar') return (r) => atualizarBlocoMusica(r, id, entrada)
      return (r) => acrescentarBlocoMusica(r, entrada)
    }
  }
}

export async function POST(request: Request, contexto: { params: Promise<{ etapa: string }> }) {
  const { etapa } = await contexto.params
  if (!ehEtapa(etapa)) {
    return new Response(null, { status: 404 })
  }
  const form = await request.formData().catch(() => null)
  if (!form) {
    return redirecionar('/configurar')
  }

  const store = await getStateStore()
  const resultado = await atualizarRotina(store, aplicador(etapa, form))

  if (!resultado.ok) {
    return redirecionar(`/configurar/${etapa}?erro=${erroParaParam(resultado.error)}`)
  }
  if (ETAPAS_DE_LISTA.has(etapa)) {
    return redirecionar(`/configurar/${etapa}?salvo=1`)
  }
  const proxima = proximaEtapa(etapa)
  return redirecionar(proxima ? `/configurar/${proxima}` : '/configurar?concluida=1')
}
