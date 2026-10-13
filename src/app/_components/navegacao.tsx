'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Destino } from './destinos'
import styles from './shell.module.css'

function emRota(caminho: string, href: string): boolean {
  return caminho === href || caminho.startsWith(`${href}/`)
}

// Item de navegação que sabe a própria localização — a marcação
// aria-current é o indicador de estado (a cor é só reforço visual).
export function ItemNavegacao({ destino }: { destino: Destino }) {
  const ativo = emRota(usePathname(), destino.href)
  return (
    <Link
      href={destino.href}
      className={`${styles.navItem} ${ativo ? styles.ativo : ''}`}
      aria-current={ativo ? 'page' : undefined}
    >
      <span aria-hidden="true">{destino.icone}</span> {destino.rotulo}
    </Link>
  )
}
