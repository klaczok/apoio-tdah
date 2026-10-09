import {
  acrescentarBlocoEstudo,
  acrescentarBlocoMusica,
  acrescentarCompromisso,
  acrescentarPeriodo,
  atualizarBlocoEstudo,
  atualizarBlocoMusica,
  ConfirmacaoFixoError,
  ItemNaoEncontradoError,
  definirAlimentacao,
  definirMetaEstudo,
  definirPresencial,
  definirPreferencias,
  definirSono,
  definirTrabalho,
  removerBlocoEstudo,
  removerBlocoMusica,
  removerCompromisso,
  removerPeriodo,
  rotinaVazia,
  somatorioEstudo,
  tipoDiaAlimentar,
  validarRotina,
  type RotinaRecorrente,
} from '@/server/rotina/modelo'
import { SchemaInvalidoError } from '@/server/persistence/schema-error'

describe('rotina recorrente — modelo', () => {
  describe('validarRotina', () => {
    it('aceita rotina completamente a confirmar', () => {
      expect(validarRotina(rotinaVazia())).toEqual(rotinaVazia())
    })

    it('rejeita horário fora do formato HH:MM', () => {
      expect(() =>
        validarRotina({ ...rotinaVazia(), sono: { dormir: '25:00', acordar: null } })
      ).toThrow(SchemaInvalidoError)
    })

    it('rejeita jornada com limite excepcional acima de 10 horas', () => {
      expect(() =>
        validarRotina({
          ...rotinaVazia(),
          trabalho: { diasSemana: ['seg'], horasPadrao: 8, limiteExcepcional: 11 },
        })
      ).toThrow(SchemaInvalidoError)
    })

    it('rejeita período com início depois do fim', () => {
      expect(() =>
        validarRotina({
          ...rotinaVazia(),
          periodos: [
            {
              id: 'p1',
              tipo: 'indisponibilidade',
              diaSemana: 'seg',
              inicio: '18:00',
              fim: '07:00',
            },
          ],
        })
      ).toThrow(SchemaInvalidoError)
    })

    it('trata seção ausente como a confirmar, não como schema inválido', () => {
      const parcial = { trabalho: null }
      expect(validarRotina(parcial)).toEqual(rotinaVazia())
    })

    it('deduplica dias repetidos na validação', () => {
      const rotina = validarRotina({
        ...rotinaVazia(),
        trabalho: { diasSemana: ['seg', 'seg', 'qua'], horasPadrao: 8, limiteExcepcional: 10 },
      })
      expect(rotina.trabalho?.diasSemana).toEqual(['seg', 'qua'])
    })
  })

  describe('definirTrabalho', () => {
    it('registra jornada e dias de trabalho', () => {
      const rotina = definirTrabalho(rotinaVazia(), {
        diasSemana: ['seg', 'ter', 'qua', 'qui', 'sex'],
        horasPadrao: 8,
        limiteExcepcional: 10,
      })
      expect(rotina.trabalho).toEqual({
        diasSemana: ['seg', 'ter', 'qua', 'qui', 'sex'],
        horasPadrao: 8,
        limiteExcepcional: 10,
      })
    })

    it('mantém demais seções a confirmar', () => {
      const rotina = definirTrabalho(rotinaVazia(), {
        diasSemana: ['seg'],
        horasPadrao: 8,
        limiteExcepcional: 10,
      })
      expect(rotina.sono).toBeNull()
      expect(rotina.compromissos).toBeNull()
    })

    it('rejeita entrada inválida sem alterar a rotina', () => {
      expect(() =>
        definirTrabalho(rotinaVazia(), {
          diasSemana: ['seg'],
          horasPadrao: 0,
          limiteExcepcional: 4,
        })
      ).toThrow(SchemaInvalidoError)
    })
  })

  describe('definirPresencial', () => {
    it('registra apenas campos informados, deixando ausentes a confirmar', () => {
      const rotina = definirPresencial(rotinaVazia(), {
        diasSemana: ['qua'],
        chegadaLimite: '09:00',
        preparacaoMin: null,
        deslocamentoMin: null,
      })
      expect(rotina.presencial).toEqual({
        diasSemana: ['qua'],
        chegadaLimite: '09:00',
        preparacaoMin: null,
        deslocamentoMin: null,
      })
    })
  })

  describe('compromissos', () => {
    const entradaFixa = {
      titulo: 'Terapia',
      diaSemana: 'qui',
      inicio: '18:30',
      duracaoMin: 50,
      categoria: 'saude',
      tipo: 'fixo',
    }

    it('acrescenta compromisso gerando id próprio', () => {
      const rotina = acrescentarCompromisso(rotinaVazia(), entradaFixa)
      expect(rotina.compromissos).toHaveLength(1)
      expect(rotina.compromissos?.[0]).toMatchObject(entradaFixa)
      expect(rotina.compromissos?.[0].id).toEqual(expect.any(String))
    })

    it('distingue bloco flexível de compromisso fixo', () => {
      const rotina = acrescentarCompromisso(rotinaVazia(), { ...entradaFixa, tipo: 'flexivel' })
      expect(rotina.compromissos?.[0].tipo).toBe('flexivel')
    })

    it('remove compromisso flexível sem confirmação', () => {
      let rotina = acrescentarCompromisso(rotinaVazia(), { ...entradaFixa, tipo: 'flexivel' })
      const id = rotina.compromissos![0].id
      rotina = removerCompromisso(rotina, id, false)
      expect(rotina.compromissos).toEqual([])
    })

    it('exige confirmação explícita para remover compromisso fixo', () => {
      const rotina = acrescentarCompromisso(rotinaVazia(), entradaFixa)
      const id = rotina.compromissos![0].id
      expect(() => removerCompromisso(rotina, id, false)).toThrow(ConfirmacaoFixoError)
      expect(removerCompromisso(rotina, id, true).compromissos).toEqual([])
    })

    it('rejeita remoção de compromisso inexistente', () => {
      const rotina = acrescentarCompromisso(rotinaVazia(), entradaFixa)
      expect(() => removerCompromisso(rotina, 'inexistente', true)).toThrow(ItemNaoEncontradoError)
    })
  })

  describe('períodos', () => {
    const cuidado = { tipo: 'cuidado-familiar', diaSemana: 'sab', inicio: '08:00', fim: '12:00' }

    it('acrescenta período de cuidado familiar', () => {
      const rotina = acrescentarPeriodo(rotinaVazia(), cuidado)
      expect(rotina.periodos?.[0]).toMatchObject(cuidado)
    })

    it('remove período de indisponibilidade por id', () => {
      let rotina = acrescentarPeriodo(rotinaVazia(), { ...cuidado, tipo: 'indisponibilidade' })
      rotina = removerPeriodo(rotina, rotina.periodos![0].id, false)
      expect(rotina.periodos).toEqual([])
    })

    it('exige confirmação explícita para remover período de cuidado familiar', () => {
      const rotina = acrescentarPeriodo(rotinaVazia(), cuidado)
      const id = rotina.periodos![0].id
      expect(() => removerPeriodo(rotina, id, false)).toThrow(ConfirmacaoFixoError)
      expect(removerPeriodo(rotina, id, true).periodos).toEqual([])
    })

    it('rejeita remoção de período inexistente', () => {
      const rotina = acrescentarPeriodo(rotinaVazia(), cuidado)
      expect(() => removerPeriodo(rotina, 'inexistente', true)).toThrow(ItemNaoEncontradoError)
    })
  })

  describe('sono e preferências', () => {
    it('registra sono parcialmente informado', () => {
      const rotina = definirSono(rotinaVazia(), { dormir: '23:00', acordar: null })
      expect(rotina.sono).toEqual({ dormir: '23:00', acordar: null })
    })

    it('registra margens e preferência de carga', () => {
      const rotina = definirPreferencias(rotinaVazia(), {
        transicaoMin: 15,
        preferenciaCarga: 'leve',
      })
      expect(rotina.margens).toEqual({ transicaoMin: 15 })
      expect(rotina.preferenciaCarga).toBe('leve')
    })

    it('rejeita preferência de carga desconhecida', () => {
      expect(() =>
        definirPreferencias(rotinaVazia(), { transicaoMin: null, preferenciaCarga: 'extrema' })
      ).toThrow(SchemaInvalidoError)
    })
  })

  describe('alimentação', () => {
    const refeicoesPrescritas = [
      { ref: 'cafe-da-manha', horario: '09:00', oculta: false },
      { ref: 'almoco', horario: '12:45', oculta: false },
      { ref: 'lanche-da-tarde', horario: '16:00', oculta: true },
      { ref: 'jantar', horario: '20:30', oculta: false },
    ] as const

    it('registra refeições com horários editados e ocultação individual', () => {
      const rotina = definirAlimentacao(rotinaVazia(), {
        refeicoes: [...refeicoesPrescritas],
        diasTreino: ['seg', 'qua'],
        referenciaVersao: 1,
      })
      expect(rotina.alimentacao).toEqual({
        refeicoes: [...refeicoesPrescritas],
        diasTreino: ['seg', 'qua'],
        referenciaVersao: 1,
      })
    })

    it('mantém dias de treino e referência a confirmar quando ausentes', () => {
      const rotina = definirAlimentacao(rotinaVazia(), {
        refeicoes: [],
        diasTreino: null,
        referenciaVersao: null,
      })
      expect(rotina.alimentacao?.diasTreino).toBeNull()
      expect(rotina.alimentacao?.referenciaVersao).toBeNull()
    })

    it('o tipo de dia seleciona com treino ou sem treino pela configuração', () => {
      const rotina = definirAlimentacao(rotinaVazia(), {
        refeicoes: [],
        diasTreino: ['seg', 'qua', 'qui', 'sex'],
        referenciaVersao: 1,
      })
      expect(tipoDiaAlimentar(rotina.alimentacao, 'seg')).toBe('com-treino')
      expect(tipoDiaAlimentar(rotina.alimentacao, 'ter')).toBe('sem-treino')
      expect(tipoDiaAlimentar(rotina.alimentacao, 'dom')).toBe('sem-treino')
    })

    it('tipo de dia fica a confirmar quando dias de treino não foram informados', () => {
      const rotina = definirAlimentacao(rotinaVazia(), {
        refeicoes: [],
        diasTreino: null,
        referenciaVersao: null,
      })
      expect(tipoDiaAlimentar(rotina.alimentacao, 'seg')).toBeNull()
      expect(tipoDiaAlimentar(null, 'seg')).toBeNull()
    })

    it('rejeita refeição com horário inválido', () => {
      expect(() =>
        definirAlimentacao(rotinaVazia(), {
          refeicoes: [{ ref: 'almoco', horario: '25:99', oculta: false }],
          diasTreino: null,
          referenciaVersao: null,
        })
      ).toThrow(SchemaInvalidoError)
    })

    it('rejeita refeição fora das previstas na prescrição', () => {
      expect(() =>
        definirAlimentacao(rotinaVazia(), {
          refeicoes: [{ ref: 'ceia', horario: '22:00', oculta: false }],
          diasTreino: null,
          referenciaVersao: null,
        })
      ).toThrow(SchemaInvalidoError)
    })

    it('rejeita refeição duplicada', () => {
      expect(() =>
        definirAlimentacao(rotinaVazia(), {
          refeicoes: [
            { ref: 'almoco', horario: '12:30', oculta: false },
            { ref: 'almoco', horario: '13:00', oculta: true },
          ],
          diasTreino: null,
          referenciaVersao: null,
        })
      ).toThrow(SchemaInvalidoError)
    })

    it('valida a alimentação ao ler a rotina persistida', () => {
      const rotina = validarRotina({
        ...rotinaVazia(),
        alimentacao: {
          refeicoes: [{ ref: 'jantar', horario: '21:00', oculta: false }],
          diasTreino: ['sab'],
          referenciaVersao: 1,
        },
      })
      expect(rotina.alimentacao?.refeicoes[0]).toEqual({
        ref: 'jantar',
        horario: '21:00',
        oculta: false,
      })
    })
  })

  describe('estudo', () => {
    const blocoTeoria = {
      tipo: 'teoria',
      diaSemana: 'seg',
      inicio: '19:00',
      planejadoMin: 60,
      realizadoMin: null,
    }

    it('registra meta semanal ajustável sem impor a referência de 10 horas', () => {
      expect(definirMetaEstudo(rotinaVazia(), 240).estudo?.metaSemanalMin).toBe(240)
      expect(definirMetaEstudo(rotinaVazia(), 900).estudo?.metaSemanalMin).toBe(900)
    })

    it('meta não informada permanece a confirmar', () => {
      const rotina = definirMetaEstudo(rotinaVazia(), null)
      expect(rotina.estudo?.metaSemanalMin).toBeNull()
      expect(rotina.estudo?.blocos).toEqual([])
    })

    it('bloco aceita somente as categorias previstas de estudo', () => {
      for (const tipo of ['teoria', 'laboratorio-case', 'aplicacao-reflexao', 'revisao']) {
        const rotina = acrescentarBlocoEstudo(rotinaVazia(), { ...blocoTeoria, tipo })
        expect(rotina.estudo?.blocos[0].tipo).toBe(tipo)
      }
      for (const tipo of ['prova', 'estudo', 'trabalho']) {
        expect(() => acrescentarBlocoEstudo(rotinaVazia(), { ...blocoTeoria, tipo })).toThrow(
          SchemaInvalidoError
        )
      }
    })

    it('registra tempo planejado e realizado separadamente', () => {
      const rotina = acrescentarBlocoEstudo(rotinaVazia(), {
        ...blocoTeoria,
        planejadoMin: 90,
        realizadoMin: 45,
      })
      expect(rotina.estudo?.blocos[0].planejadoMin).toBe(90)
      expect(rotina.estudo?.blocos[0].realizadoMin).toBe(45)
    })

    it('tempo realizado pode permanecer a confirmar', () => {
      const rotina = acrescentarBlocoEstudo(rotinaVazia(), blocoTeoria)
      expect(rotina.estudo?.blocos[0].realizadoMin).toBeNull()
    })

    it('edita e remove blocos de estudo sem confirmação, pois são flexíveis', () => {
      let rotina = acrescentarBlocoEstudo(rotinaVazia(), blocoTeoria)
      const id = rotina.estudo!.blocos[0].id
      rotina = atualizarBlocoEstudo(rotina, id, {
        ...blocoTeoria,
        inicio: '20:30',
        realizadoMin: 30,
      })
      expect(rotina.estudo?.blocos[0]).toMatchObject({ id, inicio: '20:30', realizadoMin: 30 })
      rotina = removerBlocoEstudo(rotina, id)
      expect(rotina.estudo?.blocos).toEqual([])
    })

    it('rejeita edição de bloco inexistente', () => {
      const rotina = acrescentarBlocoEstudo(rotinaVazia(), blocoTeoria)
      expect(() => atualizarBlocoEstudo(rotina, 'sumiu', blocoTeoria)).toThrow(
        ItemNaoEncontradoError
      )
      expect(() => removerBlocoEstudo(rotina, 'sumiu')).toThrow(ItemNaoEncontradoError)
    })

    it('soma tempo por tipo separando planejado de realizado', () => {
      let rotina = acrescentarBlocoEstudo(rotinaVazia(), {
        ...blocoTeoria,
        planejadoMin: 60,
        realizadoMin: 40,
      })
      rotina = acrescentarBlocoEstudo(rotina, {
        ...blocoTeoria,
        diaSemana: 'qua',
        planejadoMin: 30,
        realizadoMin: null,
      })
      rotina = acrescentarBlocoEstudo(rotina, {
        ...blocoTeoria,
        tipo: 'revisao',
        diaSemana: 'sab',
        planejadoMin: 45,
        realizadoMin: 45,
      })
      const total = somatorioEstudo(rotina.estudo)
      expect(total.teoria).toEqual({ planejadoMin: 90, realizadoMin: 40 })
      expect(total.revisao).toEqual({ planejadoMin: 45, realizadoMin: 45 })
      expect(total['laboratorio-case']).toEqual({ planejadoMin: 0, realizadoMin: 0 })
    })

    it('blocos de estudo não viram compromissos fixos', () => {
      const rotina = acrescentarBlocoEstudo(rotinaVazia(), blocoTeoria)
      expect(rotina.compromissos).toBeNull()
    })
  })

  describe('música', () => {
    const blocoViolino = { tipo: 'violino', diaSemana: 'sab', inicio: '14:00', duracaoMin: 45 }

    it('cria blocos distintos para estudo musical, composição e violino', () => {
      for (const tipo of ['estudo-musical', 'composicao', 'violino']) {
        const rotina = acrescentarBlocoMusica(rotinaVazia(), { ...blocoViolino, tipo })
        expect(rotina.musica?.[0].tipo).toBe(tipo)
      }
    })

    it('rejeita bloco musical fora dos tipos previstos', () => {
      expect(() =>
        acrescentarBlocoMusica(rotinaVazia(), { ...blocoViolino, tipo: 'show' })
      ).toThrow(SchemaInvalidoError)
    })

    it('blocos são flexíveis: editáveis e removíveis sem confirmação', () => {
      let rotina = acrescentarBlocoMusica(rotinaVazia(), blocoViolino)
      const id = rotina.musica![0].id
      rotina = atualizarBlocoMusica(rotina, id, { ...blocoViolino, duracaoMin: 30 })
      expect(rotina.musica?.[0]).toMatchObject({ id, duracaoMin: 30 })
      rotina = removerBlocoMusica(rotina, id)
      expect(rotina.musica).toEqual([])
    })

    it('rejeita remoção de bloco inexistente', () => {
      expect(() => removerBlocoMusica(rotinaVazia(), 'nada')).toThrow(ItemNaoEncontradoError)
    })
  })

  describe('imutabilidade', () => {
    it('mutadores não alteram a rotina original', () => {
      const original: RotinaRecorrente = rotinaVazia()
      definirSono(original, { dormir: '23:00', acordar: '07:00' })
      expect(original.sono).toBeNull()
    })
  })
})
