import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { contaAutenticada } from '@/server/auth/contexto'
import { ShellPrivado } from '@/app/_components/shell'

// Moldura da área autenticada: a identidade exibida deriva da sessão
// assinada — nunca de parâmetros do cliente. Sem sessão válida, a rota
// privada não deveria renderizar (middleware + páginas já redirecionam);
// o layout confirma a identidade para exibir a conta correta.
export default async function LayoutArea({ children }: { children: ReactNode }) {
  const conta = await contaAutenticada()
  if (!conta) redirect('/login')
  return <ShellPrivado email={conta.email}>{children}</ShellPrivado>
}
