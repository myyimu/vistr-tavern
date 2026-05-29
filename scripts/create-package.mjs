import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
const packageName = `vistr-tavern-${packageJson.version}.zip`;
const outputDir = path.join(ROOT, 'dist');
const outputPath = path.join(outputDir, packageName);
const rootFolder = 'vistr-tavern';
const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  return value >>> 0;
});

const excludedDirs = new Set(['.git', '.github', '.idea', 'node_modules', 'dist']);
const excludedFiles = new Set(['.DS_Store', 'Thumbs.db']);

await mkdir(outputDir, { recursive: true });

const files = await collectFiles(ROOT);
const entries = [];
const centralDirectory = [];
let offset = 0;

for (const filePath of files) {
  const relativePath = path.relative(ROOT, filePath).replaceAll(path.sep, '/');
  const zipPath = `${rootFolder}/${relativePath}`;
  const content = await readFile(filePath);
  const crc = crc32(content);
  const { dosTime, dosDate } = toDosDateTime((await stat(filePath)).mtime);
  const name = Buffer.from(zipPath, 'utf8');

  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0x0800, 6);
  localHeader.writeUInt16LE(0, 8);
  localHeader.writeUInt16LE(dosTime, 10);
  localHeader.writeUInt16LE(dosDate, 12);
  localHeader.writeUInt32LE(crc, 14);
  localHeader.writeUInt32LE(content.length, 18);
  localHeader.writeUInt32LE(content.length, 22);
  localHeader.writeUInt16LE(name.length, 26);
  localHeader.writeUInt16LE(0, 28);

  entries.push(localHeader, name, content);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(0x0800, 8);
  centralHeader.writeUInt16LE(0, 10);
  centralHeader.writeUInt16LE(dosTime, 12);
  centralHeader.writeUInt16LE(dosDate, 14);
  centralHeader.writeUInt32LE(crc, 16);
  centralHeader.writeUInt32LE(content.length, 20);
  centralHeader.writeUInt32LE(content.length, 24);
  centralHeader.writeUInt16LE(name.length, 28);
  centralHeader.writeUInt16LE(0, 30);
  centralHeader.writeUInt16LE(0, 32);
  centralHeader.writeUInt16LE(0, 34);
  centralHeader.writeUInt16LE(0, 36);
  centralHeader.writeUInt32LE(0, 38);
  centralHeader.writeUInt32LE(offset, 42);
  centralDirectory.push(centralHeader, name);

  offset += localHeader.length + name.length + content.length;
}

const centralDirectorySize = centralDirectory.reduce((total, buffer) => total + buffer.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralDirectorySize, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

await writeFile(outputPath, Buffer.concat([...entries, ...centralDirectory, end]));
console.log(`Created ${path.relative(ROOT, outputPath)} with ${files.length} files.`);

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
    } else if (!excludedFiles.has(entry.name) && !entry.name.endsWith('.log')) {
      result.push(fullPath);
    }
  }

  return result.sort();
}

function toDosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
