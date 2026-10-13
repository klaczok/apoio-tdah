import Link from 'next/link'
import { redirect } from 'next/navigation'
import styles from '../../configurar/configurar.module.css'
import { Aviso, CabecalhoPagina } from '@/app/_components/ui'
import { FormCompromissoRapido } from '@/app/_components/compromisso-rapido'
import { storeDoUsuario } from '@/server/auth/contexto'
import { MENSAGENS_ERRO } from '@/server/persistence/mensagens'
import { dataCivilHoje, diaSemanaDe, ehDataCivil } from '@/server/tempo'
import { diasDaSemana } from '@/server/dia/semana'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ erro?: string; semana?: string; dia?: string }>
}

// Destino da ação central do celular e da criação em contexto: página
// dedicada de um formulário só, que devolve o usuário à agenda.
export default async function NovoCompromissoPage({ searchParams }: Props) {
  const params = await searchParams
  const store = await storeDoUsuario()
  if (!store) redirect('/login')

  const hoje = dataCivilHoje()
  const semana = params.semana && ehDataCivil(params.semana) ? params.semana : undefined
  const dia =
    params.dia && ehDataCivil(params.dia) && diasDaSemana(semana ?? hoje).includes(params.dia)
      ? params.dia
      : undefined
  const mensagemErro = params.erro ? MENSAGENS_ERRO[params.erro] : undefined

  const volta = semana ? `/semana?semana=${semana}${dia ? `&dia=${dia}` : ''}` : '/semana'

  return (
    <main className={styles.container}>
      <CabecalhoPagina
        eyebrow="Agenda"
        titulo="Novo compromisso"
        subtitulo="Cria uma recorrência na sua rotina — entra nas próximas propostas semanais."
        acoes={
          <Link className={styles.voltar} href={volta}>
            Voltar à agenda
          </Link>
        }
      />
      {mensagemErro && <Aviso tipo="erro">{mensagemErro}</Aviso>}

      <FormCompromissoRapido
        prefixo="novo"
        diaSemanaPadrao={dia ? diaSemanaDe(dia) : diaSemanaDe(hoje)}
        semana={semana}
        dia={dia}
      />
    </main>
  )
}
