import assert from 'node:assert/strict';
import { buildCatalog, buildRetiredCatalog, canonicalizeUrl, isApprovedHost } from './catalog.js';

const approved = ['youtube.com', 'example.org', 'instagram.com', 'x.com', 'amazon.in'];
assert.equal(canonicalizeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=test#part').href, 'https://youtube.com/watch?v=dQw4w9WgXcQ');
assert.equal(canonicalizeUrl('http://youtube.com/watch?v=abc'), null);
assert.equal(canonicalizeUrl('https://user:pass@youtube.com/'), null);
assert.equal(isApprovedHost('m.youtube.com', approved), true);
assert.equal(isApprovedHost('notyoutube.com', approved), false);
assert.equal(isApprovedHost('bit.ly', ['bit.ly']), false);

const catalog = buildCatalog([
  { url: 'https://youtube.com/watch?v=dQw4w9WgXcQ', title: 'A video', source: 'youtube', type: 'video', safe: true },
  { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_campaign=share', title: 'Duplicate', safe: true },
  { url: 'https://youtube.com/watch/dQw4w9WgXcQ?feature=oembed', title: 'Malformed video', type: 'video', safe: true },
  { url: 'https://youtube.com/watch?source=email', title: 'Malformed watch', safe: true },
  { url: 'https://www.instagram.com/reel/ABC123xyz/', title: 'A public reel', source: 'curated', safe: true, reviewed: true },
  { url: 'https://x.com/creator/status/1234567890', title: 'A public post', source: 'curated', safe: true, reviewed: true },
  { url: 'https://www.amazon.in/Product-Name/dp/B012345678', title: 'A specific product', source: 'curated', safe: true, reviewed: true },
  { url: 'http://example.org/page', title: 'Insecure', safe: true },
  { url: 'https://unknown.test/page', title: 'Unknown host', safe: true },
  { url: 'https://example.org/xxx-content', title: 'Blocked content', safe: true },
  { url: 'https://example.org/ordinary', title: 'Not approved', safe: false },
], approved);
assert.equal(catalog.length, 4);
assert.equal(catalog.find(item => item.type === 'video').url, 'https://youtube.com/watch?v=dQw4w9WgXcQ');
assert.equal(catalog.find(item => item.type === 'post' && item.domain === 'instagram.com').url, 'https://instagram.com/reel/ABC123xyz');
assert.equal(catalog.find(item => item.type === 'post' && item.domain === 'x.com').url, 'https://x.com/creator/status/1234567890');
assert.equal(catalog.find(item => item.type === 'product').url, 'https://amazon.in/Product-Name/dp/B012345678');
const retired = buildRetiredCatalog([
  { url: 'https://example.org/old', title: 'Old place', safe: true, active: false, availability: 'offline' },
  { url: 'https://example.org/live', title: 'Still live', safe: true, active: true, availability: 'online' },
], approved);
assert.equal(retired.length, 1);
assert.equal(retired[0].active, false);
console.log('Catalog validation checks passed.');
