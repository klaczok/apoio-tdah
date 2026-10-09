import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { horaParaMinutos as emMinutos } from '@/server/tempo'
import type { PropostaSemanal, Sugestao } from '@/server/proposta/modelo'
import {
  acrescentarBlocoEstudo,
  acrescentarBlocoMusica,
  acrescentarCompromisso,
  acrescentarPeriodo,
  definirAlimentacao,
  definirMetaEstudo,
  definirPreferencias,
  definirPresencial,
  definirSono,
  definirTrabalho,
  REFEICOES_PADRAO,
  rotinaVazia,
  type DiaSemana,
  type RotinaRecorrente,
} from '@/server/rotina/modelo'

const AGORA = new Date('2026-10-12T12:00:00Z')

function rotinaBase(): RotinaRecorrente {
  let r = rotinaVazia()
  r = definirSono(r, { dormir: '23:00', acordar: '07:00' })
  r = definirTrabalho(r, {
    diasSemana: ['seg', 'ter', 'qua', 'qui', 'sex'],
    horasPadrao: 8,
    limiteExcepcional: 10,
  })
  return r
}

function dia(proposta: PropostaSemanal, diaSemana: DiaSemana) {
  const d = proposta.dias.find((x) => x.diaSemana === diaSemana)
  if (!d) throw new Error(`dia ${diaSemana} ausente na proposta`)
  return d
}

function sugestoes(proposta: PropostaSemanal, diaSemana: DiaSemana): Sugestao[] {
  return dia(proposta, diaSemana).sugestoes
}

function sobrepoe(a: Sugestao, b: Sugestao): boolean {
  if (a.inicio === null || a.fim === null || b.inicio === null || b.fim === null) return false
  return emMinutos(a.inicio) < emMinutos(b.fim) && emMinutos(b.inicio) < emMinutos(a.fim)
}

describe('gerarPropostaSemanal', () => {
  it('gera a semana inteira a partir da configuração persistida', () => {
    const proposta = gerarPropostaSemanal(rotinaBase(), AGORA)

    expect(proposta.dias.map((d) => d.diaSemana)).toEqual([
      'seg',
      'ter',
      'qua',
      'qui',
      'sex',
      'sab',
      'dom',
    ])
    expect(proposta.confirmadaEm).toBeNull()
  })

  it('posiciona compromissos fixos, cuidado familiar e refeições antes dos flexíveis', () => {
    let r = rotinaBase()
    r = acrescentarCompromisso(r, {
      titulo: 'Terapia',
      diaSemana: 'qui',
      inicio: '18:00',
      duracaoMin: 50,
      categoria: 'saude',
      tipo: 'fixo',
    })
    r = acrescentarPeriodo(r, {
      tipo: 'cuidado-familiar',
      diaSemana: 'sab',
      inicio: '14:00',
      fim: '18:00',
    })
    r = definirAlimentacao(r, {
      refeicoes: [
        { ref: 'almoco', horario: '12:30', oculta: false },
        { ref: 'jantar', horario: '20:30', oculta: true },
      ],
      diasTreino: [],
      referenciaVersao: 1,
    })

    const proposta = gerarPropostaSemanal(r, AGORA)

    expect(sugestoes(proposta, 'qui')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          titulo: 'Terapia',
          inicio: '18:00',
          fim: '18:50',
          protecao: 'fixo',
          categoria: 'saude',
        }),
      ])
    )
    expect(sugestoes(proposta, 'sab')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ inicio: '14:00', fim: '18:00', protecao: 'fixo' }),
      ])
    )
    const seg = sugestoes(proposta, 'seg')
    expect(seg).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ titulo: 'Almoço', inicio: '12:30', origem: 'refeicao' }),
      ])
    )
    expect(seg.some((s) => s.titulo === 'Jantar')).toBe(false)
  })

  it('não sobrepõe itens protegidos ao posicionar trabalho', () => {
    let r = rotinaBase()
    r = acrescentarCompromisso(r, {
      titulo: 'Plantão',
      diaSemana: 'seg',
      inicio: '07:00',
      duracaoMin: 600,
      categoria: 'trabalho',
      tipo: 'fixo',
    })

    const proposta = gerarPropostaSemanal(r, AGORA)
    const seg = sugestoes(proposta, 'seg')
    const trabalho = seg.find((s) => s.origem === 'trabalho')
    const protegidos = seg.filter((s) => s.protecao === 'fixo')

    expect(trabalho).toBeDefined()
    expect(trabalho!.protecao).toBe('flexivel')
    for (const protegido of protegidos) {
      expect(sobrepoe(trabalho!, protegido)).toBe(false)
    }
  })

  it('posiciona preparação e deslocamento antes da chegada limite presencial', () => {
    let r = rotinaBase()
    r = definirPresencial(r, {
      diasSemana: ['qua', 'qui'],
      chegadaLimite: '10:00',
      preparacaoMin: 30,
      deslocamentoMin: 40,
    })

    const proposta = gerarPropostaSemanal(r, AGORA)
    const qui = sugestoes(proposta, 'qui')

    expect(qui).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ origem: 'deslocamento', inicio: '09:20', fim: '10:00' }),
        expect.objectContaining({ origem: 'preparacao', inicio: '08:50', fim: '09:20' }),
      ])
    )
  })

  it('trabalho presencial começa na chegada e usa a jornada configurada', () => {
    let r = rotinaBase()
    r = definirPresencial(r, {
      diasSemana: ['qua'],
      chegadaLimite: '10:00',
      preparacaoMin: 30,
      deslocamentoMin: 40,
    })

    const proposta = gerarPropostaSemanal(r, AGORA)
    const trabalho = sugestoes(proposta, 'qua').find((s) => s.origem === 'trabalho')

    expect(trabalho).toMatchObject({ inicio: '10:00', fim: '18:00' })
  })

  it('respeita a margem de transição antes dos objetivos flexíveis', () => {
    let r = rotinaBase()
    r = definirPreferencias(r, { transicaoMin: 15, preferenciaCarga: null })
    r = acrescentarCompromisso(r, {
      titulo: 'Reunião',
      diaSemana: 'seg',
      inicio: '09:00',
      duracaoMin: 60,
      categoria: 'trabalho',
      tipo: 'fixo',
    })

    const proposta = gerarPropostaSemanal(r, AGORA)
    const trabalho = sugestoes(proposta, 'seg').find((s) => s.origem === 'trabalho')

    expect(emMinutos(trabalho!.inicio!)).toBeGreaterThanOrEqual(emMinutos('10:15'))
  })

  it('emite pausas de transição visíveis quando a margem está configurada', () => {
    let r = rotinaBase()
    r = definirPreferencias(r, { transicaoMin: 15, preferenciaCarga: null })
    r = acrescentarCompromisso(r, {
      titulo: 'Terapia',
      diaSemana: 'qui',
      inicio: '18:00',
      duracaoMin: 50,
      categoria: 'saude',
      tipo: 'fixo',
    })

    const proposta = gerarPropostaSemanal(r, AGORA)
    const qui = sugestoes(proposta, 'qui')

    expect(qui).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          origem: 'pausa',
          titulo: 'Pausa',
          inicio: '18:50',
          fim: '19:05',
          protecao: 'flexivel',
        }),
      ])
    )
    const pausas = qui.filter((s) => s.origem === 'pausa')
    const demais = qui.filter((s) => s.origem !== 'pausa' && s.inicio !== null)
    for (const p of pausas) {
      for (const o of demais) {
        expect(sobrepoe(p, o)).toBe(false)
      }
    }
  })

  it('distribui estudo de forma gradual conforme a preferência de carga', () => {
    let r = rotinaVazia()
    r = definirSono(r, { dormir: '23:00', acordar: '07:00' })
    r = definirMetaEstudo(r, 180)
    r = definirPreferencias(r, { transicaoMin: null, preferenciaCarga: 'leve' })

    const proposta = gerarPropostaSemanal(r, AGORA)
    const estudos = proposta.dias.flatMap((d) =>
      d.sugestoes.filter((s) => s.origem === 'estudo' && s.inicio && s.fim)
    )
    const porDia = new Map<string, number>()
    for (const s of estudos) {
      porDia.set(
        s.diaSemana,
        (porDia.get(s.diaSemana) ?? 0) + emMinutos(s.fim!) - emMinutos(s.inicio!)
      )
    }

    const total = estudos.reduce((acc, s) => acc + emMinutos(s.fim!) - emMinutos(s.inicio!), 0)
    expect(total).toBe(180)
    for (const minutos of porDia.values()) {
      expect(minutos).toBeLessThanOrEqual(30)
    }
  })

  it('mantém blocos de estudo e música nos horários configurados', () => {
    let r = rotinaBase()
    r = acrescentarBlocoEstudo(r, {
      tipo: 'teoria',
      diaSemana: 'ter',
      inicio: '21:00',
      planejadoMin: 60,
      realizadoMin: null,
    })
    r = acrescentarBlocoMusica(r, {
      tipo: 'violino',
      diaSemana: 'sab',
      inicio: '15:00',
      duracaoMin: 45,
    })

    const proposta = gerarPropostaSemanal(r, AGORA)

    expect(sugestoes(proposta, 'ter')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ origem: 'estudo', inicio: '21:00', fim: '22:00' }),
      ])
    )
    expect(sugestoes(proposta, 'sab')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ origem: 'musica', inicio: '15:00', fim: '15:45' }),
      ])
    )
  })

  it('não conta terapia, refeições e família como trabalho', () => {
    let r = rotinaBase()
    r = acrescentarCompromisso(r, {
      titulo: 'Terapia',
      diaSemana: 'qui',
      inicio: '18:00',
      duracaoMin: 50,
      categoria: 'saude',
      tipo: 'fixo',
    })
    r = acrescentarPeriodo(r, {
      tipo: 'cuidado-familiar',
      diaSemana: 'qui',
      inicio: '19:00',
      fim: '21:00',
    })
    r = definirAlimentacao(r, {
      refeicoes: [{ ref: 'jantar', horario: '21:00', oculta: false }],
      diasTreino: null,
      referenciaVersao: null,
    })

    const proposta = gerarPropostaSemanal(r, AGORA)
    const qui = sugestoes(proposta, 'qui')
    const minutosTrabalho = qui
      .filter((s) => s.origem === 'trabalho' && s.inicio && s.fim)
      .reduce((acc, s) => acc + emMinutos(s.fim!) - emMinutos(s.inicio!), 0)

    expect(minutosTrabalho).toBe(8 * 60)
    expect(qui.find((s) => s.titulo === 'Terapia')?.categoria).toBe('saude')
  })

  it('preserva campos a confirmar sem inventar horários', () => {
    let r = rotinaVazia()
    r = definirTrabalho(r, { diasSemana: ['seg'], horasPadrao: 8, limiteExcepcional: 10 })
    r = definirAlimentacao(r, {
      refeicoes: [{ ref: 'almoco', horario: null, oculta: false }],
      diasTreino: null,
      referenciaVersao: null,
    })

    const proposta = gerarPropostaSemanal(r, AGORA)
    const seg = sugestoes(proposta, 'seg')
    const trabalho = seg.find((s) => s.origem === 'trabalho')
    const almoco = seg.find((s) => s.origem === 'refeicao')

    expect(trabalho).toMatchObject({ inicio: null, fim: null })
    expect(almoco).toMatchObject({ inicio: null, fim: null })
    expect(almoco!.explicacao).toMatch(/confirmar/i)
  })

  it('toda sugestão carrega uma explicação curta', () => {
    let r = rotinaBase()
    r = acrescentarCompromisso(r, {
      titulo: 'Terapia',
      diaSemana: 'qui',
      inicio: '18:00',
      duracaoMin: 50,
      categoria: 'saude',
      tipo: 'fixo',
    })

    const proposta = gerarPropostaSemanal(r, AGORA)

    for (const d of proposta.dias) {
      for (const s of d.sugestoes) {
        expect(typeof s.explicacao).toBe('string')
        expect(s.explicacao.length).toBeGreaterThan(0)
      }
    }
  })

  it('não posiciona nada fora da janela de sono configurada', () => {
    const proposta = gerarPropostaSemanal(rotinaBase(), AGORA)

    for (const d of proposta.dias) {
      for (const s of d.sugestoes) {
        if (s.inicio === null || s.fim === null) continue
        expect(emMinutos(s.inicio)).toBeGreaterThanOrEqual(emMinutos('07:00'))
        expect(emMinutos(s.fim)).toBeLessThanOrEqual(emMinutos('23:00'))
      }
    }
  })

  it('ordena as sugestões do dia por horário', () => {
    const proposta = gerarPropostaSemanal(rotinaBase(), AGORA)

    for (const d of proposta.dias) {
      const comHorario = d.sugestoes.filter((s) => s.inicio !== null)
      const inicios = comHorario.map((s) => emMinutos(s.inicio!))
      expect([...inicios].sort((a, b) => a - b)).toEqual(inicios)
    }
  })

  it('registra quando a proposta foi gerada', () => {
    const proposta = gerarPropostaSemanal(rotinaBase(), AGORA)

    expect(proposta.geradaEm).toBe(AGORA.toISOString())
  })
})
