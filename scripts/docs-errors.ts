import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ERROR_CATALOG } from '../src/lib/api-contract/errors'

const entries = Object.entries(ERROR_CATALOG).sort(([a], [b]) => a.localeCompare(b))

let content = `# Katalog Kode Error BansosLedger

Dokumen ini dihasilkan secara otomatis oleh skrip \`pnpm docs:errors\` dari \`src/lib/api-contract/errors.ts\`.
Setiap respons error pada API v1 mengikuti spesifikasi RFC 9457 (\`application/problem+json\`) dengan \`code\` dan \`requestId\`.

| Kode Error | HTTP Status | Pesan (Bahasa Indonesia) |
|---|---|---|
`

for (const [code, info] of entries) {
  content += `| \`${code}\` | ${info.status} | ${info.message.replace(/\|/g, '\\|')} |\n`
}

writeFileSync(join(process.cwd(), 'docs', 'ERRORS.md'), content, 'utf8')
console.log(`Generated docs/ERRORS.md with ${entries.length} error entries.`)

