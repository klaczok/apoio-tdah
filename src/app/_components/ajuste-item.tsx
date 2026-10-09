import styles from '../configurar/configurar.module.css'
import type { ItemDia, Tarefa } from '@/server/dia/modelo'

// Itens protegidos (fixo) só aceitam ajuste com confirmação explícita —
// mesma regra dos compromissos fixos da rotina.
function ConfirmacaoProtegido({ id }: { id: string }) {
  return (
    <label className={styles.opcao} htmlFor={`confirmar-${id}`}>
      <input id={`confirmar-${id}`} type="checkbox" name="confirmar" />
      Confirmo a alteração deste item protegido
    </label>
  )
}

// Formulário de mover/redimensionar um item ou tarefa do dia. `volta` diz
// à rota para qual tela voltar depois do POST (/semana, /amanha, /hoje).
// Tarefa não tem proteção — é sempre flexível por definição.
export function AjusteItem({
  item,
  data,
  volta,
}: {
  item: Pick<ItemDia, 'id' | 'inicio' | 'fim' | 'protecao'> | Tarefa
  data: string
  volta?: 'semana' | 'amanha' | 'hoje'
}) {
  const fixo = 'protecao' in item && item.protecao === 'fixo'
  return (
    <details className={styles.edicao}>
      <summary className={styles.secundaria}>Ajustar</summary>
      <form className={styles.form} action="/api/dia" method="post">
        <input type="hidden" name="acao" value="ajustar" />
        {volta && <input type="hidden" name="volta" value={volta} />}
        <input type="hidden" name="data" value={data} />
        <input type="hidden" name="id" value={item.id} />
        <label className={styles.label} htmlFor={`inicio-${item.id}`}>
          Início
        </label>
        <input
          className={styles.input}
          id={`inicio-${item.id}`}
          name="inicio"
          type="time"
          defaultValue={item.inicio ?? ''}
        />
        <label className={styles.label} htmlFor={`fim-${item.id}`}>
          Fim
        </label>
        <input
          className={styles.input}
          id={`fim-${item.id}`}
          name="fim"
          type="time"
          defaultValue={item.fim ?? ''}
        />
        {fixo && <ConfirmacaoProtegido id={item.id} />}
        <button className={styles.acao} type="submit">
          Salvar ajuste
        </button>
      </form>
    </details>
  )
}
