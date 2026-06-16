import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const excludedDirs = new Set(['.git', '.github', '.idea', 'dist', 'node_modules']);
const extensions = new Set(['.js', '.mjs']);

const files = await collectFiles(ROOT);
let failed = false;

for (const filePath of files) {
  const relativePath = path.relative(ROOT, filePath);
  const exitCode = await checkSyntax(relativePath);
  if (exitCode !== 0) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} JS/MJS files.`);

async function collectFiles(directory) {
  const result = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...await collectFiles(fullPath));
    } else if (extensions.has(path.extname(entry.name))) {
      result.push(fullPath);
    }
  }

  return result.sort();
}

function checkSyntax(filePath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--check', filePath], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: false,
    });

    child.on('close', resolve);
    child.on('error', (error) => {
      console.error(error);
      resolve(1);
    });
  });
}
