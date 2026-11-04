import { describe, expect, test } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { ERROR_CATALOG, getErrorInfo } from '@/lib/api-contract/errors'

function scanSourceFiles(dir: string, fileList: string[] = []): string[] {
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      if (!/node_modules|\.next|mocks|components|stores|styles/.test(fullPath)) {
        scanSourceFiles(fullPath, fileList)
      }
    } else if (/\.tsx?$/.test(entry) && !/\.test\./.test(entry)) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

describe('Error Catalog', () => {
  test('catalog contains status and Indonesian message for every code', () => {
    for (const [code, entry] of Object.entries(ERROR_CATALOG)) {
      expect(typeof entry.status).toBe('number')
      expect(entry.status).toBeGreaterThanOrEqual(400)
      expect(entry.status).toBeLessThan(600)
      expect(typeof entry.message).toBe('string')
      expect(entry.message.length).toBeGreaterThan(5)
    }
  })

  test('every error code used in src/ exists in ERROR_CATALOG', () => {
    const files = scanSourceFiles('src')
    const usedCodes = new Set<string>()

    const patterns = [
      /DomainError\(\d+,\s*['"]([A-Za-z0-9_]+)['"]/g,
      /problem\(\d+,\s*['"]([A-Za-z0-9_]+)['"]/g,
      /conflict\(['"]([A-Za-z0-9_]+)['"]/g,
      /chainMessage\(['"]([A-Za-z0-9_]+)['"]/g,
      /errorCode:\s*['"]([A-Za-z0-9_]+)['"]/g,
    ]

    for (const file of files) {
      const content = readFileSync(file, 'utf8')
      for (const pattern of patterns) {
        for (const match of content.matchAll(pattern)) {
          usedCodes.add(match[1])
        }
      }
    }

    const missingCodes: string[] = []
    for (const code of usedCodes) {
      if (!Object.hasOwn(ERROR_CATALOG, code)) {
        missingCodes.push(code)
      }
    }

    expect(missingCodes, `Missing codes in catalog: ${missingCodes.join(', ')}`).toEqual([])
  })

  test('docs/ERRORS.md exists and is consistent with ERROR_CATALOG', () => {
    const errorsDoc = readFileSync(join(process.cwd(), 'docs', 'ERRORS.md'), 'utf8')
    for (const code of Object.keys(ERROR_CATALOG)) {
      expect(errorsDoc).toContain(`\`${code}\``)
    }
  })

  test('getErrorInfo returns valid error entry and fallback for unknown code', () => {
    const known = getErrorInfo('VALIDATION_ERROR')
    expect(known.status).toBe(400)
    expect(known.message).toBe('Parameter permintaan tidak valid.')

    const unknown = getErrorInfo('NON_EXISTENT_CODE')
    expect(unknown.status).toBe(500)
    expect(unknown.message).toContain('NON_EXISTENT_CODE')
  })
})

