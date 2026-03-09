import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@todo-app/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
});
