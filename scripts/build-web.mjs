import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const publicExtensions = new Set(['.html', '.css', '.js', '.webmanifest', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.woff', '.woff2']);

async function sourceFiles(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await sourceFiles(path.join(directory, entry.name), relative));
    else if (entry.isFile() && publicExtensions.has(path.extname(entry.name))) result.push(relative);
    else if (entry.isSymbolicLink()) throw new Error(`Public assets must not be symbolic links: ${relative}`);
  }
  return result.sort();
}

export async function buildWeb({ outputDirectory = path.join(projectRoot, 'dist', 'web') } = {}) {
  const files = new Map();
  for (const relative of await sourceFiles(path.join(projectRoot, 'app'))) {
    files.set(relative, await readFile(path.join(projectRoot, 'app', relative)));
  }
  for (const name of ['LICENSE', 'NOTICE']) files.set(name, await readFile(path.join(projectRoot, name)));
  for (const name of ['SOURCES.md', 'USER-GUIDE.md', '5X5-GUIDE.md', 'IPHONE-GITHUB-PAGES.md']) {
    try { files.set(`docs/${name}`, await readFile(path.join(projectRoot, 'docs', name))); }
    catch (error) { if (name !== 'IPHONE-GITHUB-PAGES.md' || error.code !== 'ENOENT') throw error; }
  }
  files.set('CNAME', Buffer.from('cubing.orger.org\n'));
  files.set('.nojekyll', Buffer.from(''));
  const hash = createHash('sha256');
  for (const [name, content] of [...files].sort(([a], [b]) => a.localeCompare(b))) hash.update(name).update('\0').update(content).update('\0');
  const version = hash.digest('hex').slice(0, 20);
  const precache = ['./', ...[...files.keys()].filter(name => !['sw.js', 'CNAME', '.nojekyll'].includes(name)).sort().map(name => `./${name}`)];
  const worker = files.get('sw.js').toString()
    .replace(/const CACHE_VERSION = '[^']+';/, `const CACHE_VERSION = '${version}';`)
    .replace(/const PRECACHE = \[[\s\S]*?\n\];/, `const PRECACHE = ${JSON.stringify(precache, null, 2)};`);
  files.set('sw.js', Buffer.from(worker));
  // This is only the generated web output. The sibling macOS app is preserved.
  await rm(outputDirectory, { recursive: true, force: true });
  for (const [name, content] of files) {
    const target = path.join(outputDirectory, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return { outputDirectory, version, files: [...files.keys()].sort(), precache };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildWeb();
  console.log(`Built ${result.files.length} public files for cubing.orger.org in ${result.outputDirectory}`);
  console.log(`Offline version: ${result.version}`);
}
