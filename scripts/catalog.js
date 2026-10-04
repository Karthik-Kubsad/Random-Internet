import { createHash } from 'node:crypto';

const SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'buff.ly', 'is.gd',
  'cutt.ly', 'rb.gy', 'shorturl.at', 'lnkd.in', 'rebrand.ly', 'tiny.cc',
]);

const BLOCKED_TERMS = /(?:^|[\s/_.-])(adult|xxx|porn|casino|gambling|betting|torrent|piracy|warez|crack)(?:$|[\s/_.-])/i;
const TRACKING_PARAMS = /^(utm_.+|fbclid|gclid|dclid|mc_cid|mc_eid|ref_src)$/i;
const KNOWN_TYPES = new Set(['page', 'video', 'product', 'post', 'game', 'article', 'experiment', 'image', 'other']);

function guessType(url) {
  const host = url.hostname;
  const path = url.pathname.toLowerCase();
  if ((host === 'youtube.com' || host === 'm.youtube.com') && ((path === '/watch' && /^[\w-]{11}$/.test(url.searchParams.get('v') || '')) || /^\/shorts\/[\w-]{11}\/?$/.test(path))) return 'video';
  if (host === 'youtu.be' && /^\/[\w-]{11}\/?$/.test(path)) return 'video';
  if (host.startsWith('amazon.') && /\/(?:dp|gp\/product)\//.test(path)) return 'product';
  if (host === 'instagram.com' && /\/(?:p|reel|reels|tv)\//.test(path)) return 'post';
  if ((host === 'x.com' || host === 'twitter.com') && /\/status\//.test(path)) return 'post';
  if (host === 'reddit.com' && /\/comments\//.test(path)) return 'post';
  if (host === 'pinterest.com' && /\/pin\//.test(path)) return 'post';
  if (path.startsWith('/r/')) return 'post';
  return 'page';
}

function defaultTitle(url, type) {
  if (type === 'video') return `YouTube video · ${url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).at(-1) || 'watch'}`;
  if (type === 'product') return `Amazon product · ${url.pathname.split('/').filter(Boolean).at(-1) || 'product'}`;
  if (type === 'post') return `${url.hostname} post · ${url.pathname.split('/').filter(Boolean).at(-1) || 'post'}`;
  return url.pathname === '/' ? url.hostname : `${url.hostname}${url.pathname}`;
}

export function canonicalizeUrl(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  if (url.port && url.port !== '443') return null;
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.pathname = url.pathname.replace(/\/{2,}/g, '/');
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, '');
  if (url.hostname === 'youtube.com' || url.hostname === 'm.youtube.com') {
    for (const key of [...url.searchParams.keys()]) if (!['v', 't', 'list'].includes(key)) url.searchParams.delete(key);
  }
  return url;
}

export function isApprovedHost(hostname, approvedDomains) {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  if (SHORTENERS.has(host)) return false;
  return approvedDomains.some(domain => {
    const approved = String(domain).toLowerCase().replace(/^www\./, '');
    return host === approved || host.endsWith(`.${approved}`);
  });
}

function stableId(url) {
  return createHash('sha256').update(url).digest('hex').slice(0, 20);
}

export function normalizeDestination(input, approvedDomains) {
  if (!input || input.safe !== true || input.active === false) return null;
  const url = canonicalizeUrl(input.url);
  if (!url || !isApprovedHost(url.hostname, approvedDomains)) return null;

  let title = String(input.title || '').trim().slice(0, 180);
  if (BLOCKED_TERMS.test(`${title} ${url.href}`)) return null;
  const type = KNOWN_TYPES.has(input.type) ? input.type : guessType(url);
  // Search-index captures often turn share URLs into malformed paths or carry
  // newsletter tracking payloads. Keep only canonical, specific deep links.
  if (['youtube.com', 'm.youtube.com'].includes(url.hostname) && (url.pathname.startsWith('/watch') || url.pathname.startsWith('/shorts/')) && !(url.pathname === '/watch' && /^[\w-]{11}$/.test(url.searchParams.get('v') || '') || /^\/shorts\/[\w-]{11}$/.test(url.pathname))) return null;
  if (['youtube.com', 'm.youtube.com'].includes(url.hostname) && type === 'video' && !(url.pathname === '/watch' && /^[\w-]{11}$/.test(url.searchParams.get('v') || '') || /^\/shorts\/[\w-]{11}$/.test(url.pathname))) return null;
  if (url.hostname === 'youtube.com' && url.pathname === '/watch' && type !== 'video') return null;
  if (url.hostname === 'youtu.be' && type === 'video' && !/^\/[\w-]{11}$/.test(url.pathname)) return null;
  if ((url.hostname === 'x.com' || url.hostname === 'twitter.com') && type === 'post' && !/^\/@?[\w]+\/status\/\d+$/i.test(url.pathname)) return null;
  if (url.hostname === 'instagram.com' && type === 'post' && !/^\/(?:p|reel|reels)\/[\w-]+$/i.test(url.pathname)) return null;
  if (url.hostname.startsWith('amazon.') && type === 'product' && !/^\/(?:[^/]+\/)?(?:dp|gp\/product)\/[A-Z0-9]{10}$/i.test(url.pathname)) return null;
  const source = String(input.source || 'curated').trim().slice(0, 48) || 'curated';
  const domain = url.hostname;
  if (/^(watch|shorts|video)$/i.test(title)) title = '';

  return {
    id: stableId(url.href),
    url: url.href,
    title: title || defaultTitle(url, type),
    domain,
    source,
    type,
    category: String(input.hiddenCategory || input.category || 'curiosity').trim().slice(0, 32),
    tags: Array.isArray(input.tags) ? input.tags.map(tag => String(tag).trim().slice(0, 24)).filter(Boolean).slice(0, 8) : [],
    reviewed: input.reviewed === true,
    availability: input.availability === 'unknown' ? 'unknown' : 'unverified',
    lastSeenAt: typeof input.crawlTimestamp === 'string' ? input.crawlTimestamp : (typeof input.lastSeenAt === 'string' ? input.lastSeenAt : null),
    safe: true,
    active: true,
  };
}

export function buildCatalog(records, approvedDomains) {
  const byUrl = new Map();
  for (const record of records) {
    const destination = normalizeDestination(record, approvedDomains);
    if (destination && !byUrl.has(destination.url)) byUrl.set(destination.url, destination);
  }
  return [...byUrl.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function buildRetiredCatalog(records, approvedDomains) {
  const retired = records
    .filter(record => record?.active === false && record?.availability === 'offline')
    .map(record => ({ ...record, active: true }));
  return buildCatalog(retired, approvedDomains).map(item => ({
    ...item,
    active: false,
    availability: 'offline',
  }));
}

export function getCatalogStats(catalog) {
  return {
    destinations: catalog.length,
    domains: new Set(catalog.map(item => item.domain)).size,
    videos: catalog.filter(item => item.type === 'video').length,
    products: catalog.filter(item => item.type === 'product').length,
    posts: catalog.filter(item => item.type === 'post').length,
  };
}
