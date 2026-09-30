/**
 * Gera o par de chaves VAPID das notificações push, sem dependência (só node:crypto).
 * Uso: node scripts/gerar-vapid.mjs
 *
 * - VITE_VAPID_PUBLIC_KEY → .env.local e variáveis do deploy (é pública, vai no bundle)
 * - VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY → segredos da função `notificar` (supabase secrets set)
 * A PRIVADA nunca vai para arquivo versionado nem para variável VITE_. Guia: docs/notificacoes-push.md
 */
import { generateKeyPairSync } from 'node:crypto'

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const publica = publicKey.export({ format: 'jwk' })
const privada = privateKey.export({ format: 'jwk' })

// Formato do Push API: ponto não comprimido (0x04 || x || y) em base64url; privada = `d` do JWK.
const chavePublica = Buffer.concat([
  Buffer.from([4]),
  Buffer.from(publica.x, 'base64url'),
  Buffer.from(publica.y, 'base64url'),
]).toString('base64url')

console.log(`VITE_VAPID_PUBLIC_KEY=${chavePublica}`)
console.log(`VAPID_PUBLIC_KEY=${chavePublica}`)
console.log(`VAPID_PRIVATE_KEY=${privada.d}`)
