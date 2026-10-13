import styles from '@/app/(area)/configurar/configurar.module.css'
import {
  CATEGORIAS,
  DIAS_SEMANA,
  ROTULOS_CATEGORIA,
  ROTULOS_DIA,
  type DiaSemana,
} from '@/server/rotina/modelo'

// Criação rápida de compromisso reutilizando o contrato da rotina:
// mesmos campos do domínio, início e fim como o usuário pensa (a API
// converte fim em duração). Sem recorrência nova, multidia ou
// gravação automática — cada envio é uma decisão explícita.
export function FormCompromissoRapido({
  prefixo,
  diaSemanaPadrao,
  semana,
  dia,
}: {
  prefixo: string
  diaSemanaPadrao?: DiaSemana
  semana?: string
  dia?: string
}) {
  const campo = (nome: string) => `${prefixo}-${nome}`
  return (
    <form className={styles.form} action="/api/rotina/compromissos" method="post">
      <input type="hidden" name="acao" value="adicionar" />
      <input type="hidden" name="volta" value="semana" />
      {semana && <input type="hidden" name="semana" value={semana} />}
      {dia && <input type="hidden" name="dia" value={dia} />}

      <label className={styles.label} htmlFor={campo('titulo')}>
        Nome curto
      </label>
      <input
        className={styles.input}
        id={campo('titulo')}
        name="titulo"
        type="text"
        maxLength={60}
        required
      />

      <label className={styles.label} htmlFor={campo('diaSemana')}>
        Dia da semana
      </label>
      <select
        className={styles.input}
        id={campo('diaSemana')}
        name="diaSemana"
        defaultValue={diaSemanaPadrao}
        required
      >
        {DIAS_SEMANA.map((d) => (
          <option key={d} value={d}>
            {ROTULOS_DIA[d]}
          </option>
        ))}
      </select>

      <label className={styles.label} htmlFor={campo('inicio')}>
        Início
      </label>
      <input className={styles.input} id={campo('inicio')} name="inicio" type="time" required />

      <label className={styles.label} htmlFor={campo('fim')}>
        Fim
      </label>
      <input className={styles.input} id={campo('fim')} name="fim" type="time" required />

      <label className={styles.label} htmlFor={campo('categoria')}>
        Categoria
      </label>
      <select className={styles.input} id={campo('categoria')} name="categoria" required>
        {CATEGORIAS.map((categoria) => (
          <option key={categoria} value={categoria}>
            {ROTULOS_CATEGORIA[categoria]}
          </option>
        ))}
      </select>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Proteção</legend>
        <p className={styles.dica}>
          Fixo é protegido: ajustes e remoção pedem confirmação explícita depois.
        </p>
        <label className={styles.opcao} htmlFor={campo('tipo-fixo')}>
          <input id={campo('tipo-fixo')} type="radio" name="tipo" value="fixo" required />
          Compromisso fixo — protegido
        </label>
        <label className={styles.opcao} htmlFor={campo('tipo-flexivel')}>
          <input
            id={campo('tipo-flexivel')}
            type="radio"
            name="tipo"
            value="flexivel"
            required
            defaultChecked
          />
          Bloco flexível
        </label>
      </fieldset>

      <button className={styles.acao} type="submit">
        Criar compromisso
      </button>
    </form>
  )
}
