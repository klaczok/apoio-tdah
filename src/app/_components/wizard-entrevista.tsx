'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ui from './ui.module.css'
import styles from '../(area)/entrevista/entrevista.module.css'
import type { PerguntaEntrevista, RespostasEntrevista } from '@/entrevista/etapas'

// Wizard das cinco perguntas: formuladas pela IA (perfil de psiquiatra
// em primeira consulta de rotina) e buscadas em /api/entrevista/
// perguntas — "refazer" reencontra as mesmas perguntas e as respostas
// já dadas. As respostas vivem apenas na memória desta página: sair,
// recarregar ou fechar descarta tudo, como prometido no convite. Ao
// concluir, um POST grava a sessão efêmera (cookie assinado) para a
// geração da proposta; nada toca o EstadoPrivado.
export function WizardEntrevista({
  respostasIniciais,
  perguntas: perguntasProp,
}: {
  respostasIniciais?: RespostasEntrevista
  /** Perguntas já conhecidas (testes); sem prop, busca no servidor. */
  perguntas?: PerguntaEntrevista[]
}) {
  const router = useRouter()
  const [perguntas, setPerguntas] = useState<PerguntaEntrevista[] | null>(perguntasProp ?? null)
  const [erroPerguntas, setErroPerguntas] = useState(false)
  const [indice, setIndice] = useState(0)
  const [respostas, setRespostas] = useState<RespostasEntrevista>(respostasIniciais ?? {})
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  async function carregarPerguntas() {
    try {
      const respostaHttp = await fetch('/api/entrevista/perguntas')
      if (!respostaHttp.ok) throw new Error('falha')
      const corpo = (await respostaHttp.json()) as { perguntas?: PerguntaEntrevista[] }
      if (!Array.isArray(corpo.perguntas) || corpo.perguntas.length === 0) {
        throw new Error('vazio')
      }
      setPerguntas(corpo.perguntas)
    } catch {
      setErroPerguntas(true)
    }
  }

  useEffect(() => {
    // Busca das perguntas é a única fonte de dados — setState assíncrono
    // após o fetch é o padrão correto aqui.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!perguntasProp) void carregarPerguntas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (erroPerguntas) {
    return (
      <section className={styles.cartao} aria-labelledby="etapa-titulo">
        <h2 id="etapa-titulo" className={styles.etapaTitulo}>
          Não foi possível preparar a entrevista
        </h2>
        <p className={styles.nota} role="alert">
          Algo falhou ao montar suas perguntas. Você pode tentar de novo ou montar a rotina
          manualmente.
        </p>
        <div className={styles.acoes}>
          <button
            type="button"
            className={`${ui.botao} ${ui.botaoPrimario}`}
            onClick={() => {
              setErroPerguntas(false)
              void carregarPerguntas()
            }}
          >
            Tentar de novo
          </button>
          <Link href="/configurar" className={styles.sair}>
            Montar manualmente
          </Link>
        </div>
      </section>
    )
  }

  if (!perguntas) {
    return (
      <section className={styles.cartao} aria-labelledby="etapa-titulo">
        <h2 id="etapa-titulo" className={styles.etapaTitulo}>
          Preparando sua entrevista…
        </h2>
        <p className={styles.nota} role="status">
          A IA está formulando perguntas sobre a sua rotina. Leva só um instante.
        </p>
      </section>
    )
  }

  const pergunta = perguntas[indice]!
  const resposta = respostas[pergunta.id] ?? { selecionadas: [], texto: '' }
  const ultima = indice === perguntas.length - 1
  const opcoes = pergunta.opcoes ?? []

  function alternar(codigo: string) {
    const selecionadas = pergunta.multipla
      ? resposta.selecionadas.includes(codigo)
        ? resposta.selecionadas.filter((c) => c !== codigo)
        : [...resposta.selecionadas, codigo]
      : [codigo]
    setRespostas({ ...respostas, [pergunta.id]: { ...resposta, selecionadas } })
  }

  async function concluir() {
    setEnviando(true)
    setFalha(null)
    try {
      const respostaHttp = await fetch('/api/entrevista/respostas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ respostas }),
      })
      if (!respostaHttp.ok) throw new Error('falha')
      router.push('/entrevista/documento')
    } catch {
      setEnviando(false)
      setFalha('Não foi possível registrar suas respostas agora. Tente de novo.')
    }
  }

  return (
    <>
      <div className={styles.progresso}>
        <span role="status">
          Etapa {indice + 1} de {perguntas.length}
        </span>
        <div
          className={styles.progressoBarra}
          role="progressbar"
          aria-label="Progresso da entrevista"
          aria-valuemin={0}
          aria-valuemax={perguntas.length}
          aria-valuenow={indice + 1}
          aria-valuetext={`Etapa ${indice + 1} de ${perguntas.length}: ${pergunta.titulo}`}
        >
          <div
            className={styles.progressoPreenchimento}
            style={{ width: `${((indice + 1) / perguntas.length) * 100}%` }}
          />
        </div>
      </div>

      <section className={styles.cartao} aria-labelledby="etapa-titulo">
        <h2 id="etapa-titulo" className={styles.etapaTitulo}>
          {pergunta.titulo}
        </h2>
        {opcoes.length > 0 ? (
          <fieldset className={styles.grupo}>
            <legend>{pergunta.pergunta}</legend>
            {opcoes.map((opcao) => (
              <label key={opcao.codigo} className={styles.opcao}>
                <input
                  type={pergunta.multipla ? 'checkbox' : 'radio'}
                  name={pergunta.id}
                  value={opcao.codigo}
                  checked={resposta.selecionadas.includes(opcao.codigo)}
                  onChange={() => alternar(opcao.codigo)}
                />
                {opcao.rotulo}
              </label>
            ))}
          </fieldset>
        ) : (
          <p className={styles.etapaPergunta}>{pergunta.pergunta}</p>
        )}

        <label className={styles.textoLivre} htmlFor={`texto-${pergunta.id}`}>
          {opcoes.length > 0
            ? 'Quer contar com suas palavras? (opcional)'
            : 'Conte com suas palavras — quanto mais contexto, melhor o calendário.'}
          <textarea
            id={`texto-${pergunta.id}`}
            rows={opcoes.length > 0 ? 3 : 5}
            maxLength={400}
            value={resposta.texto}
            onChange={(e) =>
              setRespostas({ ...respostas, [pergunta.id]: { ...resposta, texto: e.target.value } })
            }
          />
        </label>

        {falha && (
          <p role="alert" className={ui.erroCampo}>
            {falha}
          </p>
        )}

        <div className={styles.acoes}>
          {indice > 0 && (
            <button
              type="button"
              className={`${ui.botao} ${ui.botaoSecundario}`}
              onClick={() => setIndice(indice - 1)}
              disabled={enviando}
            >
              Voltar
            </button>
          )}
          {ultima ? (
            <button
              type="button"
              className={`${ui.botao} ${ui.botaoPrimario}`}
              onClick={concluir}
              disabled={enviando}
            >
              {enviando ? 'Registrando…' : 'Concluir entrevista'}
            </button>
          ) : (
            <button
              type="button"
              className={`${ui.botao} ${ui.botaoPrimario}`}
              onClick={() => setIndice(indice + 1)}
            >
              Continuar
            </button>
          )}
          <a href="/api/entrevista/sair" className={styles.sair}>
            Sair e perder o progresso
          </a>
        </div>
        <p className={styles.nota}>
          Se você sair, recarregar ou fechar a página, o que respondeu até aqui é perdido.
        </p>
      </section>
    </>
  )
}
