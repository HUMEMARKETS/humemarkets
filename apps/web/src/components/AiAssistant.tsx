"use client";

import { Button, Skeleton, chip, cn, fieldBorder } from "@hume/ui";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import mark from "@/assets/hume-mark.png";
import { useTerminal } from "@/stores/terminal";
import { AiError, askAi, failureText, fmtSourceTime, isLimit, suggestions, type AiMessage } from "@/lib/ai";

/// "Ask HUME AI": a sheet that explains the open market from Hume's own data. It only reads, so it works without a
/// wallet (the not-connected state needs no handling: there is nothing here that signs or sends). Answers arrive whole,
/// after a loading row; nothing is typed out or animated. Every answer lists its sources with the time of the data.
///
/// States: loading (the row), empty (suggested questions), error and limit reached (a sentence and a way on),
/// success (the answer and its sources), and the line "AI-generated, not financial advice" which is always on screen.
export function AiAssistant() {
  // The market open in the terminal, if any; empty on a page that has none, and the assistant then answers about any market.
  const symbol = useTerminal((state) => state.symbol);
  // The two terminals pin a Long / Short (or option) bar to the bottom on a phone; the button rides above it.
  const barBelow = /^\/(perpetuals|options)/.test(usePathname());
  const [open, setOpen] = useState(false);
  // The conversation belongs to a market: opening another market starts a fresh one.
  const [chat, setChat] = useState<{ symbol: string; messages: AiMessage[] }>({ symbol, messages: [] });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AiError>();
  const [draft, setDraft] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const messages = chat.symbol === symbol ? chat.messages : [];

  useEffect(() => {
    setError(undefined);
    setDraft("");
  }, [symbol]);

  // Modal: focus moves in, Tab wraps, Escape closes and focus goes back to the chip.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") return setOpen(false);
      if (event.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)")].filter((el) => el.offsetParent !== null);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const here = document.activeElement;
      if (event.shiftKey && (here === first || here === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && here === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const main = document.getElementById("main");
    const previous = main?.style.overflow ?? "";
    if (main) main.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (main) main.style.overflow = previous;
      opener?.focus();
    };
  }, [open]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending, error]);

  async function run(thread: AiMessage[]) {
    setChat({ symbol, messages: thread });
    setPending(true);
    setError(undefined);
    try {
      const { answer, sources } = await askAi(symbol, thread);
      setChat((current) => (current.symbol === symbol ? { symbol, messages: [...current.messages, { role: "assistant", content: answer, sources }] } : current));
    } catch (caught) {
      setError(caught instanceof AiError ? caught : new AiError("unavailable"));
    } finally {
      setPending(false);
    }
  }

  const ask = (text: string) => {
    const question = text.trim();
    if (!question || pending) return;
    setDraft("");
    void run([...messages, { role: "user", content: question }]);
  };
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(draft);
  };

  // A day's limit or a switched-off assistant will not clear by trying again, so there is no retry or input for them.
  const stuck = error?.failure === "daily_limit" || error?.failure === "disabled";

  return (
    <>
      {/* Sticky in the bottom-right corner of every app page, a round button with the HUME mark. It is charcoal in both
          themes because the mark is pale metal. On a phone terminal it sits above the pinned bar; the order sheet (z-30)
          and this sheet (z-50) both cover it. The ring turns a quarter on hover or focus, 150 ms, none under reduced motion. */}
      <button
        type="button"
        aria-label="Ask HUME AI"
        aria-haspopup="dialog"
        title="Ask HUME AI"
        onClick={() => setOpen(true)}
        className={cn(
          "group fixed right-4 z-20 grid size-16 place-items-center rounded-full bg-charcoal shadow-accent-glow ring-1 ring-gold/70 transition-shadow duration-150 hover:ring-2 hover:ring-gold focus-visible:ring-2 focus-visible:ring-gold lg:bottom-6 lg:right-6",
          barBelow ? "bottom-20" : "bottom-4",
        )}
      >
        <Image src={mark} alt="" className="h-9 w-auto transition-transform duration-150 group-hover:rotate-90 group-focus-visible:rotate-90" />
        <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute -right-0.5 -top-0.5 size-5 fill-gold">
          <path d="M12 2C12.8 8 16 11.2 22 12C16 12.8 12.8 16 12 22C11.2 16 8 12.8 2 12C8 11.2 11.2 8 12 2Z" />
        </svg>
      </button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex justify-end">
              <button type="button" tabIndex={-1} aria-label="Close HUME AI" onClick={() => setOpen(false)} className="hidden flex-1 cursor-default bg-ground/70 lg:block" />
              <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label="HUME AI" className="flex h-dvh w-full flex-col bg-surface outline-none lg:w-[28rem] lg:border-l lg:border-line">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold">HUME AI</h2>
                    <p className="truncate text-xs text-muted">{symbol ? `Reading ${symbol}-PERP` : "Ask about any listed market"}</p>
                  </div>
                  <Button variant="secondary" size="sm" aria-label="Close HUME AI" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
                  {messages.length === 0 && !pending && !error ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-muted">Ask about this market. Answers use Hume&apos;s own prices, charts and news, and say where each number came from.</p>
                      {suggestions(symbol || "this market").map((question) => (
                        <button key={question} type="button" onClick={() => ask(question)} className={cn(chip, "min-h-11 w-full whitespace-normal px-3 py-2 text-left text-sm")}>
                          {question}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {messages.map((message, index) =>
                    message.role === "user" ? (
                      <p key={index} className="ml-auto max-w-[85%] whitespace-pre-wrap break-words rounded-panel bg-raised px-3 py-2 text-sm">
                        {message.content}
                      </p>
                    ) : (
                      <div key={index} className="rounded-panel border border-line px-3 py-2 text-sm">
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        {message.sources?.length ? (
                          <ul className="mt-2 space-y-0.5 border-t border-line pt-2 text-xs text-muted">
                            {message.sources.map((source) => (
                              <li key={`${source.tool}-${source.source}-${source.asOf}`} className="break-words">
                                {source.source} · {fmtSourceTime(source.asOf)}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ),
                  )}

                  {pending ? (
                    <div role="status" className="flex flex-col gap-2 rounded-panel border border-line px-3 py-2 text-sm text-muted">
                      HUME AI is reading the market…
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ) : null}

                  {error ? (
                    <div role="alert" className="flex flex-col items-start gap-2 rounded-panel border border-down px-3 py-2 text-sm">
                      {isLimit(error.failure) ? <p className="font-medium">Limit reached</p> : null}
                      <p>{failureText(error.failure, error.retryAfterSeconds)}</p>
                      {stuck ? null : (
                        <Button variant="secondary" size="sm" onClick={() => void run(messages)} disabled={pending}>
                          Try again
                        </Button>
                      )}
                    </div>
                  ) : null}
                  <div ref={end} />
                </div>

                <div className="shrink-0 border-t border-line px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
                  <p className="mb-2 text-xs text-muted">AI-generated, not financial advice. HUME AI only explains; it cannot trade for you.</p>
                  <form onSubmit={onSubmit} className="flex gap-2">
                    <label className="sr-only" htmlFor="hume-ai-input">
                      Your question
                    </label>
                    <input
                      id="hume-ai-input"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      maxLength={500}
                      disabled={stuck}
                      autoComplete="off"
                      placeholder={stuck ? "Not available right now" : "Ask a question"}
                      className={cn(fieldBorder, "h-11 min-w-0 flex-1 rounded-control border bg-ground px-3 text-base outline-none placeholder:text-faint disabled:opacity-60")}
                    />
                    <Button type="submit" variant="primary" className="h-11" disabled={stuck || pending || draft.trim() === ""}>
                      Ask
                    </Button>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
