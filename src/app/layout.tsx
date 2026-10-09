import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Apoio à Rotina',
  description: 'Planejador pessoal de baixa carga cognitiva.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
