import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const violations: string[] = []

function collectFiles(dir: string, exts = ['.ts', '.tsx', '.mjs']): string[] {
  if (!existsSync(dir)) return []
  const entries = readdirSync(dir)
  const files: string[] = []
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'dist') continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      files.push(...collectFiles(full, exts))
    } else if (exts.some((ext) => full.endsWith(ext))) {
      files.push(full)
    }
  }
  return files
}

// 1. Dead folders and middleware rename checks
if (existsSync(join(ROOT, 'src', 'mocks'))) {
  violations.push('src/mocks directory must be deleted.')
}
if (existsSync(join(ROOT, 'src', 'stores'))) {
  violations.push('src/stores directory must be deleted.')
}
if (existsSync(join(ROOT, 'src', 'middleware.ts'))) {
  violations.push('src/middleware.ts must be renamed to src/proxy.ts for Next.js 16.')
}
if (!existsSync(join(ROOT, 'src', 'proxy.ts'))) {
  violations.push('src/proxy.ts is missing.')
}

// 2. next.config.mjs checks
const nextConfigPath = join(ROOT, 'next.config.mjs')
if (existsSync(nextConfigPath)) {
  const nextConfigContent = readFileSync(nextConfigPath, 'utf8')
  if (/ignoreBuildErrors\s*:\s*true/.test(nextConfigContent)) {
    violations.push('next.config.mjs must not set typescript.ignoreBuildErrors: true.')
  }
  if (!/output\s*:\s*['"]standalone['"]/.test(nextConfigContent)) {
    violations.push("next.config.mjs must configure output: 'standalone'.")
  }
  if (!/serverExternalPackages/.test(nextConfigContent)) {
    violations.push('next.config.mjs must configure serverExternalPackages.')
  }
}

// 3. Scan src/ and tests/
const srcFiles = collectFiles(join(ROOT, 'src'))
const testFiles = collectFiles(join(ROOT, 'tests'))

for (const file of [...srcFiles, ...testFiles]) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  const content = readFileSync(file, 'utf8')

  if (/from\s+['"]@\/mocks\b/.test(content)) {
    violations.push(`${rel}: imports removed @/mocks module.`)
  }
  if (/from\s+['"]@\/stores\b/.test(content)) {
    violations.push(`${rel}: imports removed @/stores module.`)
  }
  if (/from\s+['"]swr['"]/.test(content)) {
    violations.push(`${rel}: imports removed 'swr' dependency.`)
  }
  if (/NEXT_PUBLIC_ENABLE_LPJ_MODULE/.test(content)) {
    violations.push(`${rel}: references removed NEXT_PUBLIC_ENABLE_LPJ_MODULE flag.`)
  }
  if (/NEXT_PUBLIC_ENABLE_TEST_MODE/.test(content)) {
    violations.push(`${rel}: references removed NEXT_PUBLIC_ENABLE_TEST_MODE flag.`)
  }
  if (rel.startsWith('src/components/features/') && !rel.includes('__tests__/')) {
    if (/from\s+['"]mongoose['"]/.test(content)) {
      violations.push(`${rel}: feature component must not import mongoose.`)
    }
    if (/import\s+['"]server-only['"]/.test(content)) {
      violations.push(`${rel}: feature component must not import server-only.`)
    }
    if (/from\s+['"]@\/modules\//.test(content)) {
      violations.push(`${rel}: feature component must not import @/modules/**.`)
    }
    if (/\bfetch\s*\(/.test(content)) {
      violations.push(`${rel}: feature component must not call fetch() directly; use hooks in src/lib/api.`)
    }
  }
  if (rel.startsWith('src/lib/api-contract/')) {
    if (/import\s+['"]server-only['"]/.test(content)) {
      violations.push(`${rel}: shared api-contract must not import server-only.`)
    }
  }
  if (rel.startsWith('src/modules/') && !rel.endsWith('.test.ts')) {
    if (!/import\s+['"]server-only['"]/.test(content)) {
      violations.push(`${rel}: backend module must include import 'server-only'.`)
    }
  }
}

if (violations.length > 0) {
  console.error('Lint check failed with the following violations:')
  for (const v of violations) {
    console.error(` - ${v}`)
  }
  process.exit(1)
}

console.log(`Lint check passed (${srcFiles.length} src files, ${testFiles.length} test files verified).`)

