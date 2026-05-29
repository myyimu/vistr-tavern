import { readFile } from 'node:fs/promises';
import { EXTENSION_VERSION } from '../data/version.js';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const manifestJson = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));

const expected = packageJson.version;
const mismatches = [
  ['manifest.json', manifestJson.version],
  ['data/version.js', EXTENSION_VERSION],
].filter(([, value]) => value !== expected);

if (mismatches.length) {
  console.error(`Version mismatch: package.json is ${expected}.`);
  for (const [source, value] of mismatches) {
    console.error(`- ${source}: ${value}`);
  }
  process.exit(1);
}

console.log(`Version check passed: ${expected}`);
