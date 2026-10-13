import type { ReactNode } from 'react'
import styles from './ui.module.css'

// Componentes fundamentais compartilhados da fundação visual.
// Semântica primeiro: cabeçalho usa hierarquia real, avisos usam
// role=status/alert, nada depende de cor sozinha para comunicar estado.

export function CabecalhoPagina({
  eyebrow,
  titulo,
  subtitulo,
  acoes,
  compacto = false,
}: {
  eyebrow?: string
  titulo: string
  subtitulo?: string
  acoes?: ReactNode
  compacto?: boolean
}) {
  return (
    <header className={`${styles.cabecalho} ${compacto ? styles.cabecalhoCompacto : ''}`}>
      <div>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.titulo}>{titulo}</h1>
        {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
      </div>
      {acoes && <div className={styles.acoes}>{acoes}</div>}
    </header>
  )
}

export function Cartao({ suave = false, children }: { suave?: boolean; children: ReactNode }) {
  return <div className={`${styles.cartao} ${suave ? styles.cartaoSuave : ''}`}>{children}</div>
}

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={styles.secao}>
      <h2 className={styles.secaoTitulo}>{titulo}</h2>
      {children}
    </section>
  )
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className={styles.tag}>{children}</span>
}

// Mensagens de feedback: 'erro' interrompe (role=alert); os demais são
// anunciados sem roubar foco (role=status). Movimento nunca é o único
// indicador — o texto sempre está presente.
export function Aviso({
  tipo = 'info',
  children,
}: {
  tipo?: 'info' | 'sucesso' | 'erro'
  children: ReactNode
}) {
  const classe =
    tipo === 'sucesso' ? styles.avisoSucesso : tipo === 'erro' ? styles.avisoErro : styles.avisoInfo
  return (
    <p role={tipo === 'erro' ? 'alert' : 'status'} className={`${styles.aviso} ${classe}`}>
      {children}
    </p>
  )
}

export function EstadoVazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className={styles.vazio}>
      <h2 className={styles.vazioTitulo}>{titulo}</h2>
      {children}
    </div>
  )
}
