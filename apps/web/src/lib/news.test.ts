import assert from "node:assert/strict";
import { test } from "node:test";
import { marketsForChain, ROBINHOOD_MAINNET_CHAIN_ID, type NewsFeed } from "@hume/config";
import { buildMatchers, collectNews, dedupe, fmtAgo, hashId, matchTickers, parseFeed, plainText, safeUrl, type NewsItem } from "./news";

const matchers = buildMatchers(marketsForChain(ROBINHOOD_MAINNET_CHAIN_ID));
const tickers = (title: string) => matchTickers(title, matchers);

const RSS = `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>
<item><title><![CDATA[Nvidia &amp; AMD rally <b>hard</b>]]></title><link>https://example.com/a?utm=1</link><pubDate>Tue, 13 Oct 2026 19:46:52 +0000</pubDate>
<description>&lt;p&gt;Body text that must not be copied&lt;/p&gt;</description><media:thumbnail url="https://img.example.com/a.jpg"/></item>
<item><title>Insecure thumb</title><link>https://example.com/b</link><pubDate>Tue, 13 Oct 2026 10:00:00 GMT</pubDate><media:content url="http://img.example.com/b.jpg" medium="image"/></item>
<item><title>Bad link</title><link>javascript:alert(1)</link><pubDate>Tue, 13 Oct 2026 10:00:00 GMT</pubDate></item>
<item><title>No date</title><link>https://example.com/c</link></item>
<item><title>Enclosure image</title><link>https://example.com/d</link><pubDate>Tue, 13 Oct 2026 09:00:00 GMT</pubDate><enclosure url="https://img.example.com/d.png" type="image/png"/></item>
</channel></rss>`;

const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title type="html">Bitcoin &lt;i&gt;hits&lt;/i&gt; high</title><link rel="self" href="https://example.com/self"/><link rel="alternate" href="https://example.com/atom-1"/><updated>2026-10-13T08:00:00Z</updated></entry></feed>`;

test("RSS items become plain-text titles, safe links and https-only thumbnails", () => {
  const items = parseFeed(RSS);
  assert.deepEqual(items.map((item) => item.title), ["Nvidia & AMD rally hard", "Insecure thumb", "Enclosure image"]);
  assert.equal(items[0]!.url, "https://example.com/a?utm=1");
  assert.equal(items[0]!.publishedAt, "2026-10-13T19:46:52.000Z");
  assert.equal(items[0]!.thumbnail, "https://img.example.com/a.jpg");
  assert.equal(items[1]!.thumbnail, undefined);
  assert.equal(items[2]!.thumbnail, "https://img.example.com/d.png");
  assert.ok(!JSON.stringify(items).includes("Body text"));
});

test("Atom entries use the alternate link and the updated date", () => {
  assert.deepEqual(parseFeed(ATOM), [{ title: "Bitcoin hits high", url: "https://example.com/atom-1", publishedAt: "2026-10-13T08:00:00.000Z" }]);
});

test("markup never survives, escaped or not", () => {
  assert.equal(plainText("&lt;script&gt;alert(1)&lt;/script&gt;Hi &#x2019;x&apos; &amp;amp;"), "alert(1) Hi ’x' &");
  assert.equal(safeUrl("data:text/html,x"), undefined);
  assert.equal(safeUrl("http://a.com/x", true), undefined);
  assert.equal(safeUrl("https://a.com/x", true), "https://a.com/x");
  assert.deepEqual(parseFeed("not xml at all"), []);
});

const item = (title: string, url: string, publishedAt: string): NewsItem => ({ id: hashId(url), title, source: "S", url, publishedAt, category: "stocks", tickers: [] });

test("dedupe keeps the newest of one address or one headline, newest first", () => {
  const kept = dedupe([
    item("Fed holds rates", "https://www.a.com/x/?utm_source=1", "2026-10-13T10:00:00Z"),
    item("Fed holds rates", "https://a.com/x", "2026-10-13T11:00:00Z"),
    item("FED HOLDS RATES!", "https://b.com/y", "2026-10-13T09:00:00Z"),
    item("Other story", "https://c.com/z", "2026-10-13T12:00:00Z"),
  ]);
  assert.deepEqual(kept.map((row) => row.url), ["https://c.com/z", "https://a.com/x"]);
});

test("ticker matching: symbols as whole capitalised words, names in any case, short symbols only when marked", () => {
  assert.deepEqual(tickers("NVDA and AMD jump"), ["NVDA", "AMD"]);
  assert.deepEqual(tickers("Apple unveils a smart-home hub"), ["AAPL"]);
  assert.deepEqual(tickers("Tesla (TSLA) recalls cars"), ["TSLA"]);
  assert.deepEqual(tickers("Bitcoin tops $100k as Ethereum follows"), ["BTC", "ETH"]);
  assert.deepEqual(tickers("Why we like to dream, a life in the sun"), []);
  assert.deepEqual(tickers("Amazonian rainforest"), []);
  assert.deepEqual(tickers("Space stocks and strategy shifts"), []);
  assert.ok(tickers("JD.com earnings (JD) beat").includes("JD"));
  assert.ok(!tickers("A JD Vance speech").includes("JD"));
});

test("a feed that throws costs its own rows and nothing else", async () => {
  const feeds: NewsFeed[] = [
    { source: "Up", url: "https://up.example/rss", category: "crypto" },
    { source: "Down", url: "https://down.example/rss", category: "etf" },
  ];
  const { items, failed } = await collectNews(feeds, async (feed) => {
    if (feed.source === "Down") throw new Error("blocked");
    return [{ title: "Bitcoin up", url: "https://up.example/1", publishedAt: "2026-10-13T08:00:00.000Z" }];
  }, matchers);
  assert.equal(failed, 1);
  assert.deepEqual(items.map((row) => [row.source, row.category, row.tickers]), [["Up", "crypto", ["BTC"]]]);
});

test("relative time", () => {
  const now = Date.parse("2026-10-13T12:00:00Z");
  assert.equal(fmtAgo("2026-10-13T11:59:30Z", now), "just now");
  assert.equal(fmtAgo("2026-10-13T12:05:00Z", now), "just now");
  assert.equal(fmtAgo("2026-10-13T11:35:00Z", now), "25 min ago");
  assert.equal(fmtAgo("2026-10-13T07:00:00Z", now), "5 h ago");
  assert.equal(fmtAgo("2026-10-11T12:00:00Z", now), "2 d ago");
});

test("the per-category cap keeps the newest of each category, and Infinity lifts it", async () => {
  const feeds: NewsFeed[] = [
    { source: "Busy", url: "https://busy.example/rss", category: "crypto" },
    { source: "Quiet", url: "https://quiet.example/rss", category: "china" },
  ];
  const load = async (feed: NewsFeed) =>
    feed.source === "Busy"
      ? Array.from({ length: 5 }, (_, index) => ({ title: `Busy ${index}`, url: `https://busy.example/${index}`, publishedAt: `2026-10-13T1${index}:00:00.000Z` }))
      : [{ title: "Quiet old", url: "https://quiet.example/1", publishedAt: "2026-10-01T00:00:00.000Z" }];
  const capped = await collectNews(feeds, load, matchers, 2);
  assert.deepEqual(capped.items.map((row) => row.title), ["Busy 4", "Busy 3", "Quiet old"]);
  assert.equal((await collectNews(feeds, load, matchers, Infinity)).items.length, 6);
});
