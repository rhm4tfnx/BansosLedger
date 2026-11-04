import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
type Coverage = { b: Record<string, number[]> }
const report = JSON.parse(readFileSync(resolve('coverage.json'), 'utf8')) as Record<string, Coverage>
const files = Object.entries(report).filter(([file]) => file.replaceAll('\\', '/').endsWith('/BansosLedger.sol') || file === 'BansosLedger.sol')
if (files.length !== 1) throw new Error('Missing or ambiguous BansosLedger coverage; refusing to pass')
const branches = Object.values(files[0][1].b).flat()
if (!branches.length) throw new Error('Missing branch counters; refusing to pass')
const covered = branches.filter(hits => hits > 0).length
const percent = covered * 100 / branches.length
mkdirSync('reports', { recursive: true })
writeFileSync('reports/coverage-gate.json', JSON.stringify({ covered, total: branches.length, percent, required: 95, passed: percent >= 95 }, null, 2) + '\n')
console.log(`BansosLedger branch coverage: ${covered}/${branches.length} (${percent.toFixed(2)}%); required >=95%`)
if (percent < 95) process.exitCode = 1
