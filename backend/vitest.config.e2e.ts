import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['test/vitest-env.ts'],
    globals: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    // Testy zdielaju databazu a session stav, preto ich spustame sekvencne.
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
  },
});
