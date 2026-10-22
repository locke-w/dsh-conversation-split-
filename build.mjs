import { build } from 'esbuild'
import { rm, readFile } from 'node:fs/promises'

const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'))
await rm('lib', { recursive: true, force: true })

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  platform: 'node',
  format: 'esm',
  bundle: true,
  target: 'node22',
})

// The browser module is loaded by the DSH client's module loader; the shared React and
// @deepseek-ai/* packages must come from the host, never be bundled twice.
await build({
  entryPoints: ['src/client/index.tsx'],
  outfile: 'lib/client.js',
  platform: 'browser',
  format: 'cjs',
  bundle: true,
  minify: false,
  target: 'es2022',
  jsx: 'automatic',
  external: ['react', 'react/*', 'react-dom', 'react-dom/*', '@deepseek-ai/*', 'zod', '@tanstack/react-virtual'],
  define: { 'process.env.NODE_ENV': '"production"' },
  banner: {
    js: `window.__ModuleLoader__.load({id:${JSON.stringify(pkg.name)},factory:(require)=>{var module={exports:{}};var exports=module.exports;`,
  },
  footer: { js: 'return module.exports;}});' },
})
console.log('built lib/index.js and lib/client.js')
