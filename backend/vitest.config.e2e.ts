import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['test/vitest-env.ts'],
    globals: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    // Testy zdieľajú databázu a stav relácie, preto ich spúšťame postupne.
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
  },
});
