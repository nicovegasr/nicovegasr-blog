// Tells Bing (and the other IndexNow engines) which URLs the live site has, so
// new and updated pages are crawled in minutes instead of days. ChatGPT search
// reads Bing's index. Runs after a deploy; see .github/workflows/indexnow.yml.

const SITE = 'https://nicovegasr.com';
const KEY = '0a25d9d0ea1060dc1269e87f25b0489e';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const fetchText = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.text();
};

const locationsIn = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, location]) => location.trim());

const sitemapIndex = await fetchText(`${SITE}/sitemap-index.xml`);
const sitemaps = await Promise.all(locationsIn(sitemapIndex).map(fetchText));
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
