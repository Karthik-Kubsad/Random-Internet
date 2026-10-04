import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isApprovedHost } from './catalog.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const domains = JSON.parse(await readFile(resolve(root, 'catalog/approved-domains.json'), 'utf8'));
const maxPerQuery = Math.max(1, Number(process.env.CC_MAX_PER_DOMAIN || 250));
const maxDomains = Math.max(1, Number(process.env.CC_MAX_DOMAINS || domains.length));
const pauseMs = Math.max(1000, Number(process.env.CC_PAUSE_MS || 1500));
const requestedCrawl = process.env.CC_CRAWL;
const deepLinksOnly = process.env.CC_DEEP_LINKS_ONLY === '1';

function sleep(ms) { return new Promise(resolveSleep => setTimeout(resolveSleep, ms)); }
function titleFromUrl(url) {
  let tail = url.pathname.split('/').filter(Boolean).at(-1) || url.hostname;
  try { tail = decodeURIComponent(tail); } catch { /* Keep the encoded URL segment. */ }
  return tail.replace(/[-_+]+/g, ' ').replace(/\.[a-z0-9]{1,8}$/i, '').replace(/\s+/g, ' ').trim().slice(0, 120) || url.hostname;
}

const collectionsResponse = await fetch('https://index.commoncrawl.org/collinfo.json', {
  headers: { 'user-agent': 'RandomInternetCatalog/1.0 (polite static catalog importer)' },
});
if (!collectionsResponse.ok) throw new Error(`Common Crawl collection list returned HTTP ${collectionsResponse.status}`);
const collections = await collectionsResponse.json();
const collection = requestedCrawl ? collections.find(item => item.id === requestedCrawl) : collections[0];
if (!collection?.['cdx-api']) throw new Error(`Common Crawl collection not found: ${requestedCrawl || '(latest)'}`);
console.log(`Importing public URL index ${collection.id}; no account or API key is used.`);

const outputPath = resolve(root, `catalog-input/commoncrawl-${collection.id}.jsonl`);
const results = new Map();
try {
  const previous = (await readFile(outputPath, 'utf8')).split(/\r?\n/).filter(Boolean);
  for (const line of previous) {
    try { const record = JSON.parse(line); results.set(record.url, record); } catch { /* Ignore malformed old rows. */ }
  }
} catch { /* First import for this crawl. */ }

async function importQuery({ label, urlPattern, matchType, type, postFilter }) {
  const endpoint = new URL(collection['cdx-api']);
  endpoint.searchParams.set('url', urlPattern);
  endpoint.searchParams.set('matchType', matchType);
  endpoint.searchParams.set('output', 'json');
  endpoint.searchParams.append('filter', 'status:200');
  endpoint.searchParams.append('filter', 'mime:text/html');
  endpoint.searchParams.set('collapse', 'urlkey');
  endpoint.searchParams.set('limit', String(maxPerQuery));
  try {
    const response = await fetch(endpoint, {
      headers: { 'user-agent': 'RandomInternetCatalog/1.0 (polite static catalog importer)' },
    });
    if (!response.ok) {
      console.warn(`${label}: index returned HTTP ${response.status}; skipped.`);
      return;
    }
    let added = 0;
    for (const line of (await response.text()).split(/\r?\n/).filter(Boolean)) {
      let row;
      try { row = JSON.parse(line); } catch { continue; }
      let page;
      try { page = new URL(row.url); } catch { continue; }
      if (row.status !== '200' || !String(row.mime || '').startsWith('text/html') || page.protocol !== 'https:' || !isApprovedHost(page.hostname, domains) || (postFilter && !postFilter(page))) continue;
      const record = {
        url: page.href,
        title: titleFromUrl(page),
        source: `commoncrawl:${collection.id}`,
        type,
        safe: true,
        reviewed: false,
        availability: 'unknown',
        crawlTimestamp: row.timestamp,
      };
      if (!results.has(record.url)) added++;
      results.set(record.url, record);
    }
    console.log(`${label}: added ${added.toLocaleString()} public HTML URL(s).`);
  } catch (error) {
    console.warn(`${label}: ${error.message}; skipped.`);
  }
  await sleep(pauseMs);
}

if (!deepLinksOnly) {
  for (const domain of domains.slice(0, maxDomains)) {
    await importQuery({ label: domain, urlPattern: domain, matchType: 'domain' });
  }
}

const specificQueries = [
  { label: 'YouTube videos', urlPattern: 'www.youtube.com/watch', matchType: 'prefix', type: 'video' },
  { label: 'Amazon products', urlPattern: 'www.amazon.com/dp/', matchType: 'prefix', type: 'product' },
  { label: 'Reddit posts', urlPattern: 'www.reddit.com/r/', matchType: 'prefix', type: 'post', postFilter: url => /\/comments\//.test(url.pathname) },
  { label: 'Instagram posts', urlPattern: 'www.instagram.com/p/', matchType: 'prefix', type: 'post' },
  { label: 'Instagram Reels', urlPattern: 'www.instagram.com/reel/', matchType: 'prefix', type: 'post' },
  { label: 'X posts', urlPattern: 'x.com', matchType: 'domain', type: 'post', postFilter: url => /\/status\//.test(url.pathname) },
  { label: 'Pinterest pins', urlPattern: 'www.pinterest.com/pin/', matchType: 'prefix', type: 'post' },
];
for (const query of specificQueries) await importQuery(query);

await writeFile(outputPath, [...results.values()].map(record => JSON.stringify(record)).join('\n') + (results.size ? '\n' : ''), 'utf8');
console.log(`Saved ${results.size.toLocaleString()} URL record(s) to ${outputPath}. Run npm run catalog:import to filter and deduplicate them.`);
