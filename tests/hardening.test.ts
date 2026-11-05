import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDevRolePreviewEnabled } from '@/hooks/use-role-access'
import { register } from '@/instrumentation'
import { buildCspHeader, generateCspNonce, getCspHeaderName } from '@/lib/security/csp'
import { proxy } from '@/proxy'

describe('Hardening — proxy.ts, CSP nonce, instrumentation.ts, and production guards', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('generates unique CSP nonces and switches header name based on CSP_ENFORCE', () => {
    const nonce1 = generateCspNonce()
    const nonce2 = generateCspNonce()
    expect(nonce1).toBeTruthy()
    expect(nonce1).not.toBe(nonce2)

    expect(getCspHeaderName(false)).toBe('Content-Security-Policy-Report-Only')
    expect(getCspHeaderName(true)).toBe('Content-Security-Policy')

    const headerValue = buildCspHeader({
      nonce: nonce1,
      isDev: false,
      rpcUrl: 'http://127.0.0.1:8545',
    })
    expect(headerValue).toContain(`'nonce-${nonce1}'`)
    expect(headerValue).toContain("'strict-dynamic'")
    expect(headerValue).not.toContain("'unsafe-eval'")
    expect(headerValue).toContain('http://127.0.0.1:8545')
    expect(headerValue).toContain("frame-ancestors 'none'")
  })

  it('proxy.ts redirects unauthenticated /dashboard requests to /login?next=... with CSP Report-Only by default', () => {
    delete process.env.CSP_ENFORCE
    const req = new NextRequest('http://localhost:3000/dashboard/penerima')
    const res = proxy(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fdashboard%2Fpenerima')
    expect(res.headers.get('Content-Security-Policy-Report-Only')).toContain("'nonce-")
    expect(res.headers.get('x-nonce')).toBeTruthy()
  })

  it('proxy.ts enforces Content-Security-Policy header when CSP_ENFORCE=true and allows public routes', () => {
    process.env.CSP_ENFORCE = 'true'
    const req = new NextRequest('http://localhost:3000/transparansi')
    const res = proxy(req)

    expect(res.status).toBe(200)
    const nonce = res.headers.get('x-nonce')
    expect(nonce).toBeTruthy()
    expect(res.headers.get('Content-Security-Policy')).toContain(`'nonce-${nonce}'`)
    expect(res.headers.get('Content-Security-Policy-Report-Only')).toBeNull()
  })

  it('instrumentation.ts skips validateServerEnvironment during next build or development, and fails on invalid production runtime env', async () => {
    // 1. During next build (phase-production-build), register() must NOT throw even if env is missing
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_RUNTIME: 'nodejs',
      NEXT_PHASE: 'phase-production-build',
      APP_BASE_URL: '',
      MONGODB_URI: '',
    }
    await expect(register()).resolves.toBeUndefined()

    // 2. In development runtime, register() must NOT throw
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      NEXT_RUNTIME: 'nodejs',
      APP_BASE_URL: '',
      MONGODB_URI: '',
    }
    await expect(register()).resolves.toBeUndefined()

    // 3. In production runtime (not build phase) with missing env, register() MUST throw
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_RUNTIME: 'nodejs',
      NEXT_PHASE: 'phase-production-server',
      APP_BASE_URL: '',
      MONGODB_URI: '',
    }
    await expect(register()).rejects.toThrow(/Konfigurasi server tidak valid/i)

    // 4. In production runtime with valid required env, register() succeeds
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_RUNTIME: 'nodejs',
      NEXT_PHASE: 'phase-production-server',
      APP_BASE_URL: 'https://bansos.barrukab.go.id',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/bansos',
      NIK_ENC_KEY: 'a'.repeat(64),
      NIK_INDEX_KEY: 'b'.repeat(32),
      COMMITMENT_PEPPER: 'c'.repeat(64),
      MFA_ENC_KEY: 'd'.repeat(64),
    }
    await expect(register()).resolves.toBeUndefined()
  })

  it('disables NEXT_PUBLIC_ENABLE_UI_ROLE_PREVIEW outside development', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_ENABLE_UI_ROLE_PREVIEW: 'true',
    }
    expect(isDevRolePreviewEnabled()).toBe(false)

    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      NEXT_PUBLIC_ENABLE_UI_ROLE_PREVIEW: 'true',
    }
    expect(isDevRolePreviewEnabled()).toBe(true)
  })
})

