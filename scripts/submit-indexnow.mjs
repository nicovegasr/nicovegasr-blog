// Tells Bing (and the other IndexNow engines) which URLs the site has, so new
// and updated pages are crawled in minutes instead of days. ChatGPT search reads
// Bing's index. Runs after a deploy; see .github/workflows/indexnow.yml.
//
// The URLs come from the sitemap in dist/ (run `npm run build` first), not the
// live site: Cloudflare's bot protection answers 403 to CI runners.

import { readFile } from 'node:fs/promises';

const SITE = 'https://nicovegasr.com';
const KEY = '0a25d9d0ea1060dc1269e87f25b0489e';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const BUILD_DIRECTORY = 'dist';

const readBuiltFile = (url) => readFile(`${BUILD_DIRECTORY}${new URL(url).pathname}`, 'utf8');

const locationsIn = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, location]) => location.trim());

const sitemapIndex = await readBuiltFile(`${SITE}/sitemap-index.xml`);
const sitemaps = await Promise.all(locationsIn(sitemapIndex).map(readBuiltFile));
const urlList = [...new Set([...sitemaps.flatMap(locationsIn), `${SITE}/llms.txt`])];

const response = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
});

console.log(`IndexNow: ${urlList.length} URLs submitted, answer ${response.status}`);
if (!response.ok) {
  console.error(await response.text());
  process.exit(1);
}
