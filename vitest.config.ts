import { defaultExclude, defineConfig } from 'vitest/config'

export default defineConfig({
  server: {
    watch: {
      // ignore fs changes in fixtures
      ignored: [
        ...defaultExclude,
        '**/fixtures/**/*',
      ],
    },
  },

  test: {
    // ...
    exclude: [
      ...defaultExclude,
      '**/fixtures/**',
    ],
  },
})
