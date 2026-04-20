import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import geminiProxy from './server/gemini-proxy.js'
import authoringPlugin from './vite-plugin-authoring.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env into process.env so the proxy middleware can read GEMINI_API_KEY
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), geminiProxy(), authoringPlugin()],
  };
})
