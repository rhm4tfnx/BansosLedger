import { connectDatabase } from '../src/lib/db/connection'
import { models } from '../src/lib/db/models'
import mongoose from 'mongoose'
async function main() {
try {
  await connectDatabase()
  for (const model of models) {
    await model.createCollection()
    await model.createIndexes()
    console.info(`Indexes ensured: ${model.collection.name}`)
  }
} catch { console.error('Pembuatan indeks gagal. Periksa konfigurasi, izin provisioning, dan konflik data.'); process.exitCode = 1 }
finally { await mongoose.disconnect() }
}
void main()
