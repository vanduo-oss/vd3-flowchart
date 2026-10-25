import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const packDir = mkdtempSync(path.join(tmpdir(), 'vd3-flowchart-pack-'));
const required = [
  'package.json',
  'README.md',
  'SKILL.md',
  'CHANGELOG.md',
  'LICENSE',
  'styles.d.ts',
  'recipes/editor.vue',
  'dist/index.js',
  'dist/index.cjs',
  'dist/index.d.ts',
  'dist/core.d.ts',
  'dist/vue.d.ts',
  'dist/vd3-flowchart.css',
];
const forbidden = ['openspec/', 'tests/', 'scripts/', 'src/'];

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

let packed;
try {
  const stdout = execFileSync('pnpm', ['pack', '--json', '--pack-destination', packDir], {
    cwd: root,
    encoding: 'utf8',
  });
  const jsonStart = stdout.indexOf('{');
  const arrayStart = stdout.indexOf('[');
  const start =
    jsonStart === -1 ? arrayStart : arrayStart === -1 ? jsonStart : Math.min(jsonStart, arrayStart);
  packed = JSON.parse(stdout.slice(start));
  if (Array.isArray(packed)) packed = packed[0];
} catch (error) {
  fail(error.stderr || error.message);
}

const files = (packed.files || []).map((file) => String(file.path).replace(/^package\//, ''));
const missing = required.filter((file) => !files.includes(file));
if (missing.length) fail(`Packed tarball is missing: ${missing.join(', ')}`);
const leaked = files.filter((file) => forbidden.some((prefix) => file.startsWith(prefix)));
if (leaked.length) fail(`Packed tarball contains internal files: ${leaked.join(', ')}`);
if (packed.name && packed.name !== manifest.name) {
  fail(`Packed name ${packed.name} does not match ${manifest.name}`);
}
if (packed.version && packed.version !== manifest.version) {
  fail(`Packed version ${packed.version} does not match ${manifest.version}`);
}

const filename = packed.filename || files.find((file) => file.endsWith('.tgz'));
const tarball = path.isAbsolute(filename) ? filename : path.join(packDir, path.basename(filename));
const consumer = mkdtempSync(path.join(tmpdir(), 'vd3-flowchart-consumer-'));

function installConsumer(directory, packageJson) {
  writeFileSync(path.join(directory, 'package.json'), JSON.stringify(packageJson, null, 2));
  execFileSync('pnpm', ['install', '--ignore-workspace'], {
    cwd: directory,
    stdio: 'inherit',
  });
}

try {
  installConsumer(consumer, {
    name: 'vd3-flowchart-esm-consumer',
    private: true,
    type: 'module',
    dependencies: {
      vue: manifest.devDependencies.vue,
      '@vanduo-oss/vd3-flowchart': `file:${tarball}`,
    },
  });
  const esm = path.join(consumer, 'check.mjs');
  writeFileSync(
    esm,
    [
      "import { VdFlowchart, VdFlowchartCore, VD_FLOWCHART_VERSION } from '@vanduo-oss/vd3-flowchart';",
      "if (VdFlowchart == null) throw new Error('Vue export missing');",
      "if (typeof VdFlowchartCore !== 'function') throw new Error('Core export missing');",
      `if (VD_FLOWCHART_VERSION !== ${JSON.stringify(manifest.version)}) throw new Error('Version mismatch');`,
    ].join('\n'),
  );
  execFileSync('node', [esm], { cwd: consumer, stdio: 'inherit' });

  const cjsDir = path.join(consumer, 'cjs');
  mkdirSync(cjsDir, { recursive: true });
  installConsumer(cjsDir, {
    name: 'vd3-flowchart-cjs-consumer',
    private: true,
    dependencies: {
      vue: manifest.devDependencies.vue,
      '@vanduo-oss/vd3-flowchart': `file:${tarball}`,
    },
  });
  const cjs = path.join(cjsDir, 'check.cjs');
  writeFileSync(
    cjs,
    [
      "const { VdFlowchart, VdFlowchartCore, VD_FLOWCHART_VERSION } = require('@vanduo-oss/vd3-flowchart');",
      "if (VdFlowchart == null) throw new Error('Vue export missing');",
      "if (typeof VdFlowchartCore !== 'function') throw new Error('Core export missing');",
      `if (VD_FLOWCHART_VERSION !== ${JSON.stringify(manifest.version)}) throw new Error('Version mismatch');`,
    ].join('\n'),
  );
  execFileSync('node', [cjs], { cwd: cjsDir, stdio: 'inherit' });

  const require = createRequire(path.join(consumer, 'package.json'));
  const css = require.resolve('@vanduo-oss/vd3-flowchart/css');
  if (!css.endsWith('vd3-flowchart.css')) fail(`CSS export resolved to ${css}`);
} catch (error) {
  fail(error.stderr || error.message);
} finally {
  rmSync(packDir, { recursive: true, force: true });
  rmSync(consumer, { recursive: true, force: true });
}

process.stdout.write(
  `${manifest.name}@${manifest.version}: pack contents and ESM/CJS consumers verified.\n`,
);
