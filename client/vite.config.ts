import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.CLIENT_PORT) || 7734

  return {
    plugins: [react(), tsconfigPaths()],
    server: {
      port,
    },
    build: {
      outDir: 'dist',
    },
    preview: {
      port,
    },
  }
})
