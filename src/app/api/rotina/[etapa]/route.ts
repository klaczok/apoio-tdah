import { getStateStore } from '@/server/persistence'
import { erroParaParam } from '@/server/persistence/mensagens'
import { ehEtapa, ETAPAS_DE_LISTA, proximaEtapa, type Etapa } from '@/app/configurar/etapas'
import {
  acrescentarCompromisso,
  acrescentarPeriodo,
  definirPreferencias,
  definirPresencial,
  definirSono,
  definirTrabalho,
  removerCompromisso,
  removerPeriodo,
  type RotinaRecorrente,
} from '@/server/rotina/modelo'
import { atualizarRotina } from '@/server/usecases/rotina'

function redirecionar(caminho: string): Response {
  return new Response(null, { status: 303, headers: { location: caminho } })
}

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
        const confirmar = form.get('confirmarFixo') === 'on'
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
        return (r) => removerPeriodo(r, id)
      }
      return (r) =>
        acrescentarPeriodo(r, {
          tipo: String(form.get('tipo') ?? ''),
          diaSemana: String(form.get('diaSemana') ?? ''),
          inicio: String(form.get('inicio') ?? ''),
          fim: String(form.get('fim') ?? ''),
        })
    }
  }
}

export async function POST(request: Request, contexto: { params: Promise<{ etapa: string }> }) {
  const { etapa } = await contexto.params
  const form = await request.formData().catch(() => null)
  if (!form || !ehEtapa(etapa)) {
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
