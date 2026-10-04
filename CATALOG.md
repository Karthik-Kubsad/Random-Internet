# Static destination catalog

The site never calls a runtime backend or a paid API. Its build reads the hand-reviewed destinations in `src/destinations.js` and JSON, JSONL, or NDJSON files in `catalog-input/`, filters and deduplicates them, then writes a static `public/catalog/destinations.json` snapshot and a small `public/catalog/featured.json`. The browser downloads only the reviewed file; public crawl records remain out of the button and directory until someone reviews them.

To add a free, no-account snapshot from the public Common Crawl URL index, run `npm run catalog:commoncrawl`, then `npm run catalog:import`. It queries approved domains sequentially with a pause between requests. Common Crawl rate-limits bulk lookups; a skipped or limited domain can be retried in a later run. The crawl index only indicates that a page was seen as HTML in that crawl, not that it is live today or safe in every detail.

## Import format

Each active imported record must include `url`, `title`, and `safe: true`. `source` and `type` are recommended; `type` can be `page`, `video`, `product`, `post`, `game`, `article`, `experiment`, `image`, or `other`. Set `reviewed: true` when a person has checked the destination. Imported fields never bypass the approved-domain or URL safety checks.

Example JSONL record:

```json
{"url":"https://www.youtube.com/watch?v=VIDEO_ID","title":"A specific video","domain":"youtube.com","source":"youtube-api-export","type":"video","safe":true,"reviewed":true}
```

Use real links from sources you are permitted to use. The catalog importer does not crawl pages or create URLs; the optional Common Crawl importer collects indexed URLs only. No API keys, paid APIs, account creation, or private credentials are needed or accepted in `catalog-input/`. Imported pages are availability-unknown because a crawl capture does not prove the live link still works. Records are marked unreviewed unless a person checks them; only reviewed records can be opened from the site.

For the retired-sites archive, include `"active": false` and `"availability": "offline"` on an otherwise valid record. Retired entries are displayed as history only and cannot be opened or selected by the random button.

## Domain policy and commands

Edit `catalog/approved-domains.json` to add domains you have reviewed. A domain entry also permits its subdomains. The importer rejects HTTP links, unknown domains, URL shorteners, duplicate links, obvious prohibited-content terms, and records not explicitly marked safe.

- `npm run catalog:import` regenerates the static JSON catalog.
- `npm run catalog:commoncrawl` imports URL metadata from Common Crawl without credentials; optional settings are `CC_CRAWL`, `CC_MAX_PER_DOMAIN`, `CC_MAX_DOMAINS`, and `CC_PAUSE_MS`.
- `npm run catalog:check` regenerates it and fails unless it has at least 100,000 distinct destination URLs.
- `npm run dev` and `npm run build` regenerate the catalog before starting Vite/building.
- `npm test` runs URL policy and deduplication checks.

The most recent free Common Crawl snapshot produced 21,242 filtered destination URLs across 143 domains. The 49 reviewed links are the selectable collection; they currently include direct YouTube videos, Instagram Reels, X posts, Amazon products, browser games, India-focused opportunities, and general curiosity pages. The 100,000 destination target is not met yet: the public index throttles or has no results for many domains. No placeholders are generated to inflate the count. The full snapshot is an 8 MB static archive that the browser does not download; it loads only the small reviewed file from the same static site. Catalog availability and user-post safety are best-effort; external content can change after review.

Instagram is not queried live. Add individually selected, public Instagram post links to an import file; the same domain and safety filters apply.

The interface also includes an opt-in sites directory, a retired-sites archive, and a suggestion form inspired by The Useless Web. Suggestions are saved only in the visitor's local browser storage and can be exported as JSON; they are never opened or added to the live catalog until they are reviewed and imported into a later build.
