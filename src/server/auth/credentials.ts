import { createHash, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'
import type { AuthConfig } from './config'

function deriveKey(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key)))
  })
}

function hashEmail(email: string): Buffer {
  return createHash('sha256').update(email.trim().toLowerCase(), 'utf8').digest()
}

export async function verifyCredentials(
  config: AuthConfig,
  email: string,
  password: string
): Promise<boolean> {
  const derived = await deriveKey(password, config.passwordHash.salt, 64, {
    N: config.passwordHash.N,
    r: config.passwordHash.r,
    p: config.passwordHash.p,
  })

  const passwordOk = timingSafeEqual(derived, config.passwordHash.key)
  const emailOk = timingSafeEqual(hashEmail(email), hashEmail(config.userEmail))

  return passwordOk && emailOk
}
