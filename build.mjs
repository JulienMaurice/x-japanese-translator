import { build, context } from 'esbuild';
import { cpSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const watching = process.argv.includes('--watch');

const sharedConfig = {
  bundle: true,
  platform: 'browser',
  target: 'chrome120',
  logLevel: 'info',
  // kuromoji/DictionaryLoader.js uses path.join() to build dict URLs.
  // Standard path-browserify collapses chrome-extension:// URLs, so we
  // provide a minimal shim that handles the URL case correctly.
  alias: {
    path: resolve(__dirname, 'src/path-shim.js'),
  },
};

async function copyStaticFiles() {
  // Copy manifest
  mkdirSync('dist', { recursive: true });
  copyFileSync('manifest.json', 'dist/manifest.json');

  // Copy kuromoji dictionary files
  const dictSrc = resolve(__dirname, 'node_modules/kuromoji/dict');
  const dictDst = resolve(__dirname, 'dist/dict');
  mkdirSync(dictDst, { recursive: true });
  if (existsSync(dictSrc)) {
    cpSync(dictSrc, dictDst, { recursive: true });
    console.log('[build] Copied kuromoji dict files to dist/dict/');
  } else {
    console.warn('[build] Warning: kuromoji dict not found at', dictSrc, '— run npm install first');
  }
}

if (watching) {
  await copyStaticFiles();

  const contentCtx = await context({
    ...sharedConfig,
    entryPoints: ['src/content/index.js'],
    outfile: 'dist/content.js',
    format: 'iife',
  });

  const bgCtx = await context({
    ...sharedConfig,
    entryPoints: ['src/background/index.js'],
    outfile: 'dist/background.js',
    format: 'esm',
  });

  await contentCtx.watch();
  await bgCtx.watch();
  console.log('[build] Watching for changes...');
} else {
  await copyStaticFiles();

  await Promise.all([
    build({
      ...sharedConfig,
      entryPoints: ['src/content/index.js'],
      outfile: 'dist/content.js',
      format: 'iife',
    }),
    build({
      ...sharedConfig,
      entryPoints: ['src/background/index.js'],
      outfile: 'dist/background.js',
      format: 'esm',
    }),
  ]);

  console.log('[build] Build complete → dist/');
}
