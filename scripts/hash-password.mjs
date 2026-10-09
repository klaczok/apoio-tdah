#!/usr/bin/env node
// Gera os valores de AUTH_PASSWORD_HASH e SESSION_SECRET para configurar o acesso.
// Uso: node scripts/hash-password.mjs <email-do-usuario>
// A senha é digitada sem eco e nunca é impressa ou gravada por este script.

import { scryptSync, randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline'
import { stdout, stdin } from 'node:process'

function perguntarSenha() {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true })
    const escrever = rl._writeToOutput.bind(rl)
    rl._writeToOutput = (chunk) => {
      if (!rl._muted) escrever(chunk)
    }
    rl.question('Senha: ', (senha) => {
      rl.close()
      stdout.write('\n')
      resolve(senha)
    })
    rl._muted = true
  })
}

const email = process.argv[2]
if (!email) {
  console.error('Uso: node scripts/hash-password.mjs <email-do-usuario>')
  process.exit(1)
}

const senha = await perguntarSenha()
if (senha.length < 6) {
  console.error('Senha muito curta: use pelo menos 6 caracteres.')
  process.exit(1)
}

const salt = randomBytes(16)
const key = scryptSync(senha, salt, 64, { N: 16384, r: 8, p: 1 })

console.log('\nConfigure estas variáveis no ambiente protegido (Vercel/GitHub ou .env.local):')
console.log(`AUTH_USER_EMAIL=${email}`)
console.log(`AUTH_PASSWORD_HASH=scrypt:16384:8:1:${salt.toString('hex')}:${key.toString('hex')}`)
console.log(`SESSION_SECRET=${randomBytes(32).toString('hex')}`)
