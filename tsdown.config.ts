/** Standalone client-bundle build for an out-of-tree dsh UI plugin. */
import { defineConfig } from 'tsdown'

const ID = 'dsh-subagent-catalog'

/** Shell-seeded module table keys; every other bare import inlines into the bundle. */
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store', '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives', '@deepseek-ai/dsh-client-ui-dockkit',
]

const isPlatformModule = (specifier: string): boolean => PLATFORM_MODULES.includes(specifier)

export default defineConfig([
  {
    name: ID,
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    deps: { neverBundle: (specifier) => specifier === '@deepseek-ai/cordis' },
  },
  {
    name: ID + '/client',
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    sourcemap: true,
    deps: { neverBundle: isPlatformModule, alwaysBundle: (specifier) => !isPlatformModule(specifier) },
    define: {
      'process.env.NODE_ENV': '"production"',
      'import.meta.env.MODE': '"production"',
      'import.meta.env': '{"MODE":"production"}',
    },
    outputOptions: {
      entryFileNames: 'client.js',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      banner: (chunk) => 'window.__ModuleLoader__.load({ id: ' + JSON.stringify(ID)
        + ', ' + (chunk.isEntry ? '' : 'chunk: ' + JSON.stringify(chunk.fileName) + ', ')
        + 'factory: (require) => {',
      footer: 'return module.exports; } });',
    },
  },
  {
    // Development-only: the pure modules as plain ESM so `node --test` can
    // exercise them without a browser or a bundler. Excluded from `files`.
    name: ID + '/dev',
    entry: { rows: 'src/client/rows.ts', locales: 'src/client/locales.ts' },
    outDir: 'lib/dev',
    format: ['esm'],
    platform: 'browser',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
])
