import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  'server-only': fileURLToPath(new URL('./tests/server-only.ts', import.meta.url)),
}

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['tests/**/*.test.ts'],
          environment: 'node',
          testTimeout: 60000,
          hookTimeout: 1800000,
          fileParallelism: false,
          restoreMocks: true,
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          include: ['src/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./tests/setup-jsdom.ts'],
          testTimeout: 30000,
          restoreMocks: true,
        },
      },
    ],
  },
})
