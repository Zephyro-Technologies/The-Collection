import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// --- build-time environment guard -------------------------------------------
//
// Vite INLINES import.meta.env.VITE_* into the bundle at build time. If these
// are absent the build still succeeds, and the app then throws
// "supabaseUrl is required." at module scope on load — React never mounts and
// the page renders blank, with a 200 OK and nothing in the server logs. That
// failure is invisible in CI, so fail the build here instead.
//
// Keep this list in sync with the reader in packages/shared/supabase.ts.
const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

// Values copied straight out of .env.example — present but useless. Catching
// these is the difference between a clear build error and a runtime 401.
const PLACEHOLDERS = ['your-project-ref', 'your-anon-public-key']

function assertBuildEnv(mode: string) {
  // loadEnv reads the .env files; process.env covers CI, where the values
  // arrive as real environment variables and never touch disk. Check both so
  // this can never fail a build that would actually have worked.
  const fileEnv = loadEnv(mode, __dirname, 'VITE_')
  const missing: string[] = []
  const placeholder: string[] = []

  for (const key of REQUIRED_ENV) {
    const value = (fileEnv[key] ?? process.env[key] ?? '').trim()
    if (!value) missing.push(key)
    else if (PLACEHOLDERS.some((p) => value.includes(p))) placeholder.push(key)
  }

  if (!missing.length && !placeholder.length) return

  const problems = [
    missing.length ? `  missing or empty:      ${missing.join(', ')}` : '',
    placeholder.length ? `  still the placeholder: ${placeholder.join(', ')}` : '',
  ].filter(Boolean).join('\n')

  throw new Error(
    `\n\n[@collection/website] Build-time environment check failed.\n\n${problems}\n\n` +
      `  Vite inlines VITE_* into the bundle AT BUILD TIME. Without them this build\n` +
      `  would succeed and then render a BLANK PAGE (HTTP 200, no server error) —\n` +
      `  packages/shared/supabase.ts throws "supabaseUrl is required." on load.\n\n` +
      `  Set them wherever this build runs:\n\n` +
      `    local            apps/website/.env          (copy apps/website/.env.example)\n` +
      `    Cloudflare       Workers & Pages -> collection-website -> Settings -> Build\n` +
      `                     -> Build Variables and Secrets\n` +
      `                     NOT Settings -> Variables & Secrets, which is runtime-only\n` +
      `                     and has no effect on the bundle.\n` +
      `    GitHub Actions   repository secrets, referenced by the build step's env:\n` +
      `                     in .github/workflows/deploy.yml\n\n` +
      `  Only the anon/public key belongs here — never the service_role key.\n`,
  )
}

export default defineConfig(({ command, mode }) => {
  // Guard the production build only. `vite dev` stays usable without
  // credentials for pure UI work; the app will still error at runtime, but
  // that is a visible, local failure rather than a silently broken deploy.
  if (command === 'build') assertBuildEnv(mode)

  return {
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
