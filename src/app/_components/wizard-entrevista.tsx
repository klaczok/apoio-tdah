'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ui from './ui.module.css'
import styles from '../(area)/entrevista/entrevista.module.css'
import { ETAPAS_ENTREVISTA, type RespostasEntrevista } from '@/entrevista/etapas'

// Wizard das cinco etapas: as respostas vivem apenas na memória desta
// página — sair, recarregar ou fechar descarta tudo, como prometido no
// convite. "Voltar" preserva o que já foi respondido nesta sessão. Ao
// concluir, um POST grava a sessão efêmera (cookie assinado) para a
// geração da proposta; nada toca o EstadoPrivado. Quem vem da revisão
// recebe as respostas já registradas — refazer uma etapa não exige
// refazer as cinco.
export function WizardEntrevista({
  respostasIniciais,
}: {
  respostasIniciais?: RespostasEntrevista
}) {
  const router = useRouter()
  const [indice, setIndice] = useState(0)
  const [respostas, setRespostas] = useState<RespostasEntrevista>(respostasIniciais ?? {})
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  const etapa = ETAPAS_ENTREVISTA[indice]!
  const resposta = respostas[etapa.id] ?? { selecionadas: [], texto: '' }
  const ultima = indice === ETAPAS_ENTREVISTA.length - 1

  function alternar(codigo: string) {
    const selecionadas = etapa.multipla
      ? resposta.selecionadas.includes(codigo)
        ? resposta.selecionadas.filter((c) => c !== codigo)
        : [...resposta.selecionadas, codigo]
      : [codigo]
    setRespostas({ ...respostas, [etapa.id]: { ...resposta, selecionadas } })
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
          Etapa {indice + 1} de {ETAPAS_ENTREVISTA.length}
        </span>
        <div
          className={styles.progressoBarra}
          role="progressbar"
          aria-label="Progresso da entrevista"
          aria-valuemin={0}
          aria-valuemax={ETAPAS_ENTREVISTA.length}
          aria-valuenow={indice + 1}
          aria-valuetext={`Etapa ${indice + 1} de ${ETAPAS_ENTREVISTA.length}: ${etapa.titulo}`}
        >
          <div
            className={styles.progressoPreenchimento}
            style={{ width: `${((indice + 1) / ETAPAS_ENTREVISTA.length) * 100}%` }}
          />
        </div>
      </div>

      <section className={styles.cartao} aria-labelledby="etapa-titulo">
        <h2 id="etapa-titulo" className={styles.etapaTitulo}>
          {etapa.titulo}
        </h2>
        <fieldset className={styles.grupo}>
          <legend>{etapa.pergunta}</legend>
          {etapa.opcoes.map((opcao) => (
            <label key={opcao.codigo} className={styles.opcao}>
              <input
                type={etapa.multipla ? 'checkbox' : 'radio'}
                name={etapa.id}
                value={opcao.codigo}
                checked={resposta.selecionadas.includes(opcao.codigo)}
                onChange={() => alternar(opcao.codigo)}
              />
              {opcao.rotulo}
            </label>
          ))}
        </fieldset>

        <label className={styles.textoLivre} htmlFor={`texto-${etapa.id}`}>
          Quer contar com suas palavras? (opcional)
          <textarea
            id={`texto-${etapa.id}`}
            rows={3}
            maxLength={400}
            value={resposta.texto}
            onChange={(e) =>
              setRespostas({ ...respostas, [etapa.id]: { ...resposta, texto: e.target.value } })
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
