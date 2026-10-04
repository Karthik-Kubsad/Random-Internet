import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { destinations as fallbackDestinations } from '../src/destinations.js';
import { buildCatalog, buildRetiredCatalog, getCatalogStats } from './catalog.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputDirectory = resolve(root, 'catalog-input');
const domainsPath = resolve(root, 'catalog/approved-domains.json');
const outputPath = resolve(root, 'public/catalog/destinations.json');
const reviewedOutputPath = resolve(root, 'public/catalog/featured.json');
const retiredOutputPath = resolve(root, 'public/catalog/retired.json');

function parseJsonLines(contents, filename) {
  return contents.split(/\r?\n/).filter(line => line.trim()).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${filename}:${index + 1}: ${error.message}`); }
  });
}

async function readImportFile(filename) {
  const contents = await readFile(resolve(inputDirectory, filename), 'utf8');
  if (filename.endsWith('.jsonl') || filename.endsWith('.ndjson')) return parseJsonLines(contents, filename);
  const data = JSON.parse(contents);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.destinations)) return data.destinations;
  throw new Error(`${filename} must contain an array or an object with a destinations array.`);
}

const approvedDomains = JSON.parse(await readFile(domainsPath, 'utf8'));
const importFiles = (await readdir(inputDirectory)).filter(name => /\.(json|jsonl|ndjson)$/i.test(name)).sort();
const imported = [];
for (const filename of importFiles) imported.push(...await readImportFile(filename));

const records = [...fallbackDestinations, ...imported];
const catalog = buildCatalog(records, approvedDomains);
const retired = buildRetiredCatalog(imported, approvedDomains);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(catalog)}\n`, 'utf8');
await writeFile(reviewedOutputPath, `${JSON.stringify(catalog.filter(item => item.reviewed))}\n`, 'utf8');
await writeFile(retiredOutputPath, `${JSON.stringify(retired)}\n`, 'utf8');

const stats = getCatalogStats(catalog);
console.log(`Wrote ${stats.destinations.toLocaleString()} destinations across ${stats.domains.toLocaleString()} domains.`);
console.log(`Deep links: ${stats.videos} videos, ${stats.products} products, ${stats.posts} posts.`);
console.log(`Read ${importFiles.length} import file(s) from catalog-input/.`);
console.log(`Archived ${retired.length.toLocaleString()} retired destination(s).`);

if (process.argv.includes('--require-100k') && stats.destinations < 100_000) {
  console.error(`Catalog target not met: ${stats.destinations.toLocaleString()} / 100,000 destinations.`);
  process.exitCode = 1;
}
