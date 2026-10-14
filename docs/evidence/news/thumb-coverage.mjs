// How many stories end up with a picture. Usage: node thumb-coverage.mjs <base> [ticker]
// For each story the feed gave no image for, ask the thumbnail route and count the answers.
const [BASE = "http://localhost:3000", TICKER] = process.argv.slice(2);
const data = await (await fetch(`${BASE}/api/news${TICKER ? `?ticker=${TICKER}` : ""}`)).json();
const bySource = new Map();
const tally = (source, key) => {
  const row = bySource.get(source) ?? { feed: 0, page: 0, none: 0, blocked: 0 };
  row[key]++;
  bySource.set(source, row);
};
const queue = data.items.filter((item) => item.thumbnail ? (tally(item.source, "feed"), false) : true);
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < queue.length) {
    const item = queue[next++];
    const response = await fetch(`${BASE}/api/news/thumb?url=${encodeURIComponent(item.url)}`);
    if (response.status === 400) { tally(item.source, "blocked"); continue; }
    const { image } = await response.json();
    tally(item.source, image && image.startsWith("https://") ? "page" : "none");
  }
}));
let total = 0, got = 0;
for (const [source, row] of [...bySource].sort()) {
  const all = row.feed + row.page + row.none + row.blocked;
  total += all; got += row.feed + row.page;
  console.log(`${source.padEnd(26)} ${all} stories: feed ${row.feed}, page ${row.page}, none ${row.none}, refused ${row.blocked}`);
}
console.log(`picture for ${got} of ${total} stories (${Math.round((got / total) * 100)}%)`);
process.exit(got === total ? 0 : 1);
