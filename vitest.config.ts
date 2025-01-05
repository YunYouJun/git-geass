import { defineConfig } from 'vitest/config'

export default defineConfig({
  server: {
    watch: {
      // ignore fs changes in fixtures
      ignored: ['**/fixtures/**'],
    },
  },

  test: {
    // ...
    exclude: ['**/fixtures/**'],
  },
})
