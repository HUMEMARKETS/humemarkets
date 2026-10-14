"use client";

import { Button, Panel, Skeleton, Tabs } from "@hume/ui";
import { marketForSymbol, NEWS_CATEGORIES, NEWS_CATEGORY_LABEL, ROBINHOOD_MAINNET_CHAIN_ID, type NewsCategory } from "@hume/config";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useNow } from "@/hooks/useNow";
import { useOnline } from "@/hooks/useOnline";
import { fmtAgo, type NewsItem } from "@/lib/news";
import { PanelState } from "./PanelState";

type Tab = "all" | NewsCategory;

const tabs: Array<{ id: Tab; label: string }> = [{ id: "all", label: "All" }, ...NEWS_CATEGORIES.map((id) => ({ id, label: NEWS_CATEGORY_LABEL[id] }))];

interface NewsResponse {
  items: NewsItem[];
  updatedAt: string;
  failed: number;
}

/// Headlines from this app's own `/api/news` route, which the CDN holds for five minutes. A typed symbol that is a listed
/// market asks for that market's own feed as well; anything else only narrows the headlines already loaded.
const newsQuery = (ticker: string) => ({
  queryKey: ["news", ticker],
  queryFn: async (): Promise<NewsResponse> => {
    const response = await fetch(ticker ? `/api/news?ticker=${encodeURIComponent(ticker)}` : "/api/news");
    if (!response.ok) throw new Error("news unavailable");
    return response.json();
  },
  refetchInterval: 5 * 60_000,
  retry: 1,
});

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

function Skeletons() {
  return (
    <div aria-busy="true" aria-label="Loading the news">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex gap-3 border-t border-line px-3 py-3 first:border-t-0">
          <Skeleton className="aspect-[4/3] w-24 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="w-full" />
            <Skeleton className="w-2/3" />
            <Skeleton className="w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/// The thumbnail's box is fixed, so a late or failed image moves nothing. Only an https address ever gets here.
function Thumb({ src }: { src?: string }) {
  return (
    <span className="block aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-sm bg-raised">
      {/* eslint-disable-next-line @next/next/no-img-element -- publisher images, many hosts, no loader */}
      {src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" /> : null}
    </span>
  );
}

function Row({ item, now }: { item: NewsItem; now: number }) {
  return (
    <li className="border-t border-line first:border-t-0">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 px-3 py-3 hover:bg-accent-soft">
        <Thumb src={item.thumbnail} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-medium leading-snug">{item.title}</span>
          <span className="text-xs text-muted">
            {item.source}
            {now ? ` · ${fmtAgo(item.publishedAt, now)}` : ""}
            {item.tickers.length ? ` · ${item.tickers.slice(0, 4).join(" ")}` : ""}
          </span>
        </span>
      </a>
    </li>
  );
}

/// The seven states: loading (skeleton rows), empty (nothing in this category or for this ticker), error (what happened,
/// and Try again), success, stale (the last good list stays, with the time it is from), offline, and not-connected, which does
/// not apply: this page is public and needs no wallet.
export function NewsView() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(NEWS_CATEGORIES.includes(params.get("category") as NewsCategory) ? (params.get("category") as NewsCategory) : "all");
  const [filter, setFilter] = useState(params.get("ticker")?.toUpperCase() ?? "");
  const online = useOnline();
  const now = useNow();

  const symbol = filter.trim().toUpperCase();
  const asked = symbol && marketForSymbol(ROBINHOOD_MAINNET_CHAIN_ID, symbol) ? symbol : "";
  const news = useQuery(newsQuery(asked));
  const items = (news.data?.items ?? []).filter((item) => (tab === "all" || item.category === tab) && (!symbol || item.tickers.some((ticker) => ticker.includes(symbol))));

  const retry = (
    <Button size="sm" onClick={() => void news.refetch()}>
      Try again
    </Button>
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Panel
        className="flex-1"
        title={<Tabs label="News categories" tabs={tabs} value={tab} onChange={setTab} />}
        actions={
          <input
            type="search"
            aria-label="Filter by ticker"
            placeholder="Filter by ticker"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="my-1 h-8 w-44 rounded-md border border-line bg-ground px-2 text-sm placeholder:text-faint hover:border-accent-line focus:border-accent"
          />
        }
      >
        {news.data && (news.isError || !online) ? (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-1 text-xs text-muted">
            <p>{online ? `Showing news from ${clock(news.data.updatedAt)}. The refresh failed, so this list may be old.` : `You are offline. Showing news from ${clock(news.data.updatedAt)}.`}</p>
            {online ? retry : null}
          </div>
        ) : null}
        <div className="flex flex-1 flex-col">
          {!online && !news.data ? (
            <PanelState action={retry}>You are offline, so the news cannot load. It will refresh by itself when you reconnect.</PanelState>
          ) : news.isPending ? (
            <Skeletons />
          ) : news.isError && !news.data ? (
            <PanelState action={retry}>The news feeds did not answer, so there is nothing to show. Nothing is wrong with your account. Try again in a moment.</PanelState>
          ) : items.length === 0 ? (
            <PanelState>{symbol ? `No headline names ${symbol}${tab === "all" ? "" : ` in ${NEWS_CATEGORY_LABEL[tab]}`} right now.` : tab === "all" ? "No headlines right now." : `No ${NEWS_CATEGORY_LABEL[tab]} headlines right now.`}</PanelState>
          ) : (
            <ul aria-label="Headlines">
              {items.map((item) => (
                <Row key={item.id} item={item} now={now} />
              ))}
            </ul>
          )}
        </div>
      </Panel>
      <p className="max-w-prose text-xs leading-snug text-muted">
        Headlines come from the publishers' public RSS feeds and refresh every five minutes. Each row links to the publisher's own page; Hume does not copy articles. Headlines are information, not advice.
      </p>
    </div>
  );
}
