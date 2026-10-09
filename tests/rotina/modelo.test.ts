import {
  acrescentarCompromisso,
  acrescentarPeriodo,
  ConfirmacaoFixoError,
  definirPresencial,
  definirPreferencias,
  definirSono,
  definirTrabalho,
  removerCompromisso,
  removerPeriodo,
  rotinaVazia,
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
      expect(() => removerCompromisso(rotina, 'inexistente', true)).toThrow(SchemaInvalidoError)
    })
  })

  describe('períodos', () => {
    const cuidado = { tipo: 'cuidado-familiar', diaSemana: 'sab', inicio: '08:00', fim: '12:00' }

    it('acrescenta período de cuidado familiar', () => {
      const rotina = acrescentarPeriodo(rotinaVazia(), cuidado)
      expect(rotina.periodos?.[0]).toMatchObject(cuidado)
    })

    it('remove período por id', () => {
      let rotina = acrescentarPeriodo(rotinaVazia(), cuidado)
      rotina = removerPeriodo(rotina, rotina.periodos![0].id)
      expect(rotina.periodos).toEqual([])
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

  describe('imutabilidade', () => {
    it('mutadores não alteram a rotina original', () => {
      const original: RotinaRecorrente = rotinaVazia()
      definirSono(original, { dormir: '23:00', acordar: '07:00' })
      expect(original.sono).toBeNull()
    })
  })
})
