import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--fonte-sans',
})

const serif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--fonte-serif',
})

export const metadata = {
  title: 'Apoio à Rotina',
  description: 'Planejador pessoal de baixa carga cognitiva.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  )
}
