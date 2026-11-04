import 'server-only'
import mongoose from 'mongoose'
import { getEnv } from '@/lib/env'
import { ServiceUnavailableError } from '@/lib/service-error'

const state = globalThis as typeof globalThis & { bansosMongo?: Promise<typeof mongoose> }
export function assertDatabaseConfigured() {
  try { return getEnv('MONGODB_URI') } catch { throw new ServiceUnavailableError() }
}
export async function connectDatabase() {
  const uri = assertDatabaseConfigured()
  if (mongoose.connection.readyState === 1) return mongoose
  if (!state.bansosMongo) {
    state.bansosMongo = mongoose.connect(uri, { autoIndex: false, autoCreate: false, bufferCommands: false, serverSelectionTimeoutMS: 5000, maxPoolSize: 10 }).catch(() => {
      state.bansosMongo = undefined
      throw new ServiceUnavailableError()
    })
  }
  return state.bansosMongo
}
