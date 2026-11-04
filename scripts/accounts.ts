import { randomBytes } from 'node:crypto'
import { userInfo } from 'node:os'
import { createInterface } from 'node:readline/promises'
import { parseArgs } from 'node:util'
import mongoose from 'mongoose'
import { z } from 'zod'
import { connectDatabase } from '../src/lib/db/connection'
import { Users } from '../src/lib/db/models'
import { dbRoleSchema } from '../src/lib/auth/role-map'
import { hashPassword } from '../src/lib/auth/password'
import { revokeAllUserSessions } from '../src/lib/auth/session'
import { appendAudit } from '../src/modules/audit/service'

async function main() {
  const actor = `cli:${userInfo().username}`
  await connectDatabase()
  let command = 'invalid'
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: { name: { type: 'string' }, institution: { type: 'string' }, role: { type: 'string' }, email: { type: 'string' }, username: { type: 'string' } } })
    command = positionals[0] || ''
    if (positionals.length !== 1 || !['create', 'deactivate', 'activate', 'revoke-sessions', 'list'].includes(command)) throw new Error('Perintah tidak valid.')
    const username = command === 'list' ? userInfo().username : z.string().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/).parse(values.username).toLowerCase()
    if (process.env.NODE_ENV === 'production') {
      if (!process.stdin.isTTY) throw new Error('Konfirmasi interaktif diperlukan.')
      const prompt = createInterface({ input: process.stdin, output: process.stdout })
      try { if (await prompt.question(`Ketik username ${username} untuk konfirmasi: `) !== username) throw new Error('Konfirmasi dibatalkan.') }
      finally { prompt.close() }
    }
    if (command === 'list') {
      const rows = await Users.find().select('username email name institution role isActive mustChangePassword').lean()
      await appendAudit({ actor, action: 'ACCOUNT_LIST', entity: 'users', diff: { count: rows.length } })
      console.table(rows.map(({ _id, ...rest }) => ({ id: String(_id), ...rest })))
      return
    }
    if (command === 'create') {
      const input = z.object({ name: z.string().min(1).max(160), institution: z.string().min(1).max(160), email: z.string().email().max(254), role: dbRoleSchema }).parse(values)
      const password = randomBytes(24).toString('base64url')
      const passwordHash = await hashPassword(password, username, input.email)
      const user = await Users.create({ ...input, username, email: input.email.toLowerCase(), passwordHash, mustChangePassword: true, isActive: false })
      await appendAudit({ actor, action: 'ACCOUNT_CREATED', entity: 'users', entityId: String(user._id), diff: { username, role: input.role } })
      await Users.updateOne({ _id: user._id, isActive: false }, { $set: { isActive: true } })
      console.info(`Kata sandi sekali tampil: ${password}`)
      return
    }
    const user = await Users.findOne({ username }).lean()
    if (!user) throw new Error('Akun tidak ditemukan.')
    if (command === 'activate' || command === 'deactivate') {
      await Users.updateOne({ _id: user._id }, { $set: { isActive: command === 'activate' } })
    }
    if (command !== 'activate') await revokeAllUserSessions(String(user._id))
    await appendAudit({ actor, action: `ACCOUNT_${command.toUpperCase().replace('-', '_')}`, entity: 'users', entityId: String(user._id) })
    console.info('Perintah selesai.')
  } catch (error) {
    await appendAudit({ actor, action: 'ACCOUNT_COMMAND_FAILED', entity: 'users', diff: { command } })
    throw error
  }
}
main().catch(() => { console.error('Perintah gagal. Periksa argumen, konfigurasi, indeks, dan izin database.'); process.exitCode = 1 }).finally(() => mongoose.disconnect())
