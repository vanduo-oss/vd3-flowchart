// Single-entry esbuild harness for @vanduo-oss/vd3-flowchart.
//
// Contract: esm + cjs from src/index.js, `vue` external, es2020 target,
// sourcemaps, no minify, NO IIFE, hand-written .d.ts copied alongside,
// styles.css copied to dist/vd3-flowchart.css.

import * as esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');
const srcDir = resolve(rootDir, 'src');

const src = (path) => resolve(srcDir, path);
const dist = (path) => resolve(distDir, path);

const metafiles = [];

function resetDistDirectory() {
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });
}

async function buildEntry(format, outfile) {
  const result = await esbuild.build({
    entryPoints: [src('index.js')],
    outfile: dist(outfile),
    bundle: true,
    format,
    target: ['es2020'],
    sourcemap: true,
    minify: false,
    metafile: true,
    logLevel: 'warning',
    external: ['vue'],
  });
  metafiles.push({ label: `${outfile} [${format}]`, metafile: result.metafile });
  return result.metafile;
}

function toRel(p) {
  return relative(rootDir, resolve(rootDir, p)).replace(/^\.\//, '');
}

function assertIsolation() {
  for (const { label, metafile } of metafiles) {
    for (const input of Object.keys(metafile.inputs)) {
      const rel = toRel(input);
      if (rel.includes('node_modules')) {
        throw new Error(
          `[isolation] "${label}" bundled a node_modules input (${rel}); vue and all peers must stay external`,
        );
      }
      if (!rel.startsWith('src/')) {
        throw new Error(`[isolation] "${label}" pulled out-of-scope input ${rel} (expected src/)`);
      }
    }
    for (const output of Object.values(metafile.outputs)) {
      for (const imp of output.imports ?? []) {
        if (imp.external && imp.path !== 'vue') {
          throw new Error(
            `[isolation] "${label}" externalized ${imp.path}; only vue may be external`,
          );
        }
      }
    }
  }
}

function collectExportTargets(node, out) {
  if (typeof node === 'string') {
    if (node.startsWith('./dist/')) out.add(node);
    return;
  }
  if (node && typeof node === 'object') {
    for (const value of Object.values(node)) collectExportTargets(value, out);
  }
}

function assertExportsExist() {
  const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));
  const targets = new Set();
  collectExportTargets(pkg.exports, targets);
  const missing = [];
  for (const target of targets) {
    if (!existsSync(resolve(rootDir, target))) missing.push(target);
  }
  if (missing.length) {
    throw new Error(
      `[exports] ${missing.length} declared export target(s) missing from dist:\n  ${missing.join('\n  ')}`,
    );
  }
  return targets.size;
}

function writeMetafile() {
  const merged = { inputs: {}, outputs: {} };
  for (const { metafile } of metafiles) {
    Object.assign(merged.inputs, metafile.inputs);
    Object.assign(merged.outputs, metafile.outputs);
  }
  writeFileSync(dist('meta.json'), JSON.stringify(merged, null, 2));
}

async function build() {
  resetDistDirectory();

  await buildEntry('esm', 'index.js');
  await buildEntry('cjs', 'index.cjs');

  for (const decl of ['index.d.ts', 'core.d.ts', 'vue.d.ts']) {
    copyFileSync(src(decl), dist(decl));
  }
  copyFileSync(src('styles.css'), dist('vd3-flowchart.css'));

  writeMetafile();
  assertIsolation();
  const exportCount = assertExportsExist();

  console.log(
    `Built @vanduo-oss/vd3-flowchart: esm + cjs; ${exportCount} export targets verified; isolation + vue-external checks passed.`,
  );
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
