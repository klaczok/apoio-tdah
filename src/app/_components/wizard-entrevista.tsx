'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import ui from './ui.module.css'
import styles from '../(area)/entrevista/entrevista.module.css'
import type { MensagemConversa } from '@/entrevista/conversa'

// A entrevista é uma conversa conduzida pela IA — como uma organizadora de rotina em
// primeira consulta de rotina. A transcrição fica no servidor em
// material transitório: sair, recarregar ou fechar preserva o que foi
// dito até a próxima tentativa (e a saída limpa descarta tudo). Quando
// a IA sinaliza que já conhece a rotina da pessoa, a conversa encerra e
// o fluxo segue para o documento e a proposta.
export function WizardEntrevista() {
  const router = useRouter()
  const [mensagens, setMensagens] = useState<MensagemConversa[] | null>(null)
  const [concluiu, setConcluiu] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)
  const [erroInicial, setErroInicial] = useState(false)
  const [texto, setTexto] = useState('')
  const fimRef = useRef<HTMLDivElement>(null)

  async function enviar(textoPessoa?: string) {
    setEnviando(true)
    setFalha(null)
    try {
      const respostaHttp = await fetch('/api/entrevista/conversa', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(textoPessoa ? { mensagem: textoPessoa } : {}),
      })
      if (!respostaHttp.ok) throw new Error('falha')
      const corpo = (await respostaHttp.json()) as {
        mensagem?: string | null
        concluiu?: boolean
      }
      if (textoPessoa) {
        setMensagens((atual) => [
          ...(atual ?? []),
          { papel: 'pessoa', texto: textoPessoa },
          ...(corpo.mensagem ? [{ papel: 'ia' as const, texto: corpo.mensagem }] : []),
        ])
      } else {
        setMensagens((atual) => [
          ...(atual ?? []),
          ...(corpo.mensagem ? [{ papel: 'ia' as const, texto: corpo.mensagem }] : []),
        ])
      }
      if (corpo.concluiu) setConcluiu(true)
    } catch {
      setErroInicial(mensagens === null)
      setFalha('A IA não respondeu agora. Você pode tentar de novo ou montar manualmente.')
    } finally {
      setEnviando(false)
    }
  }

  useEffect(() => {
    // Retoma a transcrição guardada (refazer continua de onde parou);
    // conversa vazia pede a abertura à IA.
    let ativo = true
    fetch('/api/entrevista/conversa')
      .then(async (res) => {
        if (!res.ok) throw new Error('falha')
        const corpo = (await res.json()) as {
          mensagens?: MensagemConversa[]
          concluiu?: boolean
        }
        if (!ativo) return
        if (corpo.concluiu) setConcluiu(true)
        if (corpo.mensagens && corpo.mensagens.length > 0) {
          setMensagens(corpo.mensagens)
        } else {
          await enviar()
        }
      })
      .catch(() => {
        if (ativo) {
          setErroInicial(true)
          setFalha('A IA não respondeu agora. Você pode tentar de novo ou montar manualmente.')
          setMensagens([])
        }
      })
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fimRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [mensagens])

  function mandar() {
    const mensagem = texto.trim()
    if (!mensagem || enviando) return
    setTexto('')
    void enviar(mensagem)
  }

  if (mensagens === null) {
    return (
      <section className={styles.cartao} aria-labelledby="conversa-titulo">
        <h2 id="conversa-titulo" className={styles.etapaTitulo}>
          Preparando sua entrevista…
        </h2>
        <p className={styles.nota} role="status">
          A IA está se apresentando. Leva só um instante.
        </p>
      </section>
    )
  }

  if (erroInicial && mensagens.length === 0) {
    return (
      <section className={styles.cartao} aria-labelledby="conversa-titulo">
        <h2 id="conversa-titulo" className={styles.etapaTitulo}>
          Não foi possível começar a entrevista
        </h2>
        <p className={styles.nota} role="alert">
          {falha}
        </p>
        <div className={styles.acoes}>
          <button
            type="button"
            className={`${ui.botao} ${ui.botaoPrimario}`}
            onClick={() => {
              setErroInicial(false)
              setFalha(null)
              setMensagens(null)
              void enviar()
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

  return (
    <section className={styles.cartao} aria-labelledby="conversa-titulo">
      <h2 id="conversa-titulo" className={styles.etapaTitulo}>
        Conversa com a IA
      </h2>
      <p className={styles.nota}>
        Ela faz uma pergunta por vez, no seu ritmo — a conversa termina quando ela conhecer o
        suficiente da sua rotina.
      </p>

      <ol className={styles.conversa} aria-live="polite" aria-label="Transcrição da entrevista">
        {mensagens.map((m, i) => (
          <li
            key={i}
            className={`${styles.mensagem} ${m.papel === 'ia' ? styles.mensagemIa : styles.mensagemPessoa}`}
          >
            <span className={styles.mensagemAutor}>{m.papel === 'ia' ? 'IA' : 'Você'}</span>
            <p>{m.texto}</p>
          </li>
        ))}
        {enviando && (
          <li className={`${styles.mensagem} ${styles.mensagemIa}`} role="status">
            <span className={styles.mensagemAutor}>IA</span>
            <p>pensando…</p>
          </li>
        )}
      </ol>
      <div ref={fimRef} />

      {falha && mensagens.length > 0 && (
        <p role="alert" className={ui.erroCampo}>
          {falha}
        </p>
      )}

      {concluiu ? (
        <div className={styles.acoes}>
          <button
            type="button"
            className={`${ui.botao} ${ui.botaoPrimario}`}
            onClick={() => router.push('/entrevista/documento')}
          >
            Seguir para a proposta
          </button>
          <a href="/api/entrevista/sair" className={styles.sair}>
            Sair e perder o progresso
          </a>
        </div>
      ) : (
        <div className={styles.entradaConversa}>
          <label className={styles.textoLivre} htmlFor="resposta-conversa">
            Sua resposta
            <textarea
              id="resposta-conversa"
              rows={3}
              maxLength={600}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  mandar()
                }
              }}
            />
          </label>
          <div className={styles.acoes}>
            <button
              type="button"
              className={`${ui.botao} ${ui.botaoPrimario}`}
              onClick={mandar}
              disabled={enviando || !texto.trim()}
            >
              {enviando ? 'Enviando…' : 'Responder'}
            </button>
            <a href="/api/entrevista/sair" className={styles.sair}>
              Sair e perder o progresso
            </a>
          </div>
        </div>
      )}
      <p className={styles.nota}>
        A conversa fica só nesta sessão — sair ou concluir apaga a transcrição.
      </p>
    </section>
  )
}
