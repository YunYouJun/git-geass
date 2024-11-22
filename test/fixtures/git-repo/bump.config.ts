// bump.config.ts
import { defineConfig } from 'bumpp'

export default defineConfig({
  // do not need prompt
  release: 'patch',
  // confirm option not work, use bumpp -y
  confirm: false,
  tag: false,
  push: false,
  commit: true,
})
