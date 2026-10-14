"use client";

import { Button, Skeleton, cn, fieldBorder } from "@hume/ui";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import mark from "@/assets/hume-mark.png";
import { useTerminal } from "@/stores/terminal";
import { AiError, askAi, failureText, fmtSourceTime, isLimit, suggestions, type AiMessage } from "@/lib/ai";

const SPARK = "M12 2C12.8 8 16 11.2 22 12C16 12.8 12.8 16 12 22C11.2 16 8 12.8 2 12C8 11.2 11.2 8 12 2Z";

/// The HUME ring in a small charcoal disc: the assistant's face beside each answer.
function Avatar() {
  return (
    <span aria-hidden="true" className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-charcoal ring-1 ring-gold/60">
      <Image src={mark} alt="" className="h-4 w-auto" />
    </span>
  );
}

/// The panel's slide and the backdrop's fade last this long: the 200 ms ceiling of docs/UI_CONTRACT.md Section 8.
const MOTION_MS = 200;

/// "Ask HUME AI": a chat sheet, laid out like Gemini: a greeting and suggestion tiles when empty, the user's words in a
/// soft pill on the right, answers as plain text beside the assistant's face with source chips under them, and a rounded
/// input bar with a round send button. It explains the open market from Hume's own data. It only reads, so it works
/// without a wallet (the not-connected state needs no handling: there is nothing here that signs or sends). Answers
/// arrive whole, after a loading row; nothing is typed out. Every answer lists its sources with the time of the data.
///
/// It opens with a short slide (up from the bottom on a phone, in from the right on a wide screen) and a fade, and closes
/// the same way. Under reduced motion both collapse to nothing (globals.css).
///
/// States: loading (the row), empty (greeting and suggested questions), error and limit reached (a sentence and a way
/// on), success (the answer and its sources), and the line "AI-generated, not financial advice" which is always on screen.
export function AiAssistant() {
  // The market open in the terminal, if any; empty on a page that has none, and the assistant then answers about any market.
  const symbol = useTerminal((state) => state.symbol);
  // The two terminals pin a Long / Short (or option) bar to the bottom on a phone; the button rides above it.
  const barBelow = /^\/(perpetuals|options)/.test(usePathname());
  // `open` is the intent, `mounted` keeps the sheet in the page while it slides out, `shown` is the slid-in look.
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The conversation belongs to a market: opening another market starts a fresh one.
  const [chat, setChat] = useState<{ symbol: string; messages: AiMessage[] }>({ symbol, messages: [] });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AiError>();
  const [draft, setDraft] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const messages = chat.symbol === symbol ? chat.messages : [];

  const openSheet = () => {
    clearTimeout(closing.current);
    setMounted(true);
    setOpen(true);
    // Two frames: the closed look is painted first, so the change to the open look is a transition.
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
  };
  const closeSheet = () => {
    setOpen(false);
    setShown(false);
    closing.current = setTimeout(() => setMounted(false), MOTION_MS);
  };
  useEffect(() => () => clearTimeout(closing.current), []);

  useEffect(() => {
    setError(undefined);
    setDraft("");
  }, [symbol]);

  // Modal: focus moves in, Tab wraps, Escape closes and focus goes back to the button.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") return closeSheet();
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
  const newChat = () => {
    setChat({ symbol, messages: [] });
    setError(undefined);
    setDraft("");
  };

  // A day's limit or a switched-off assistant will not clear by trying again, so there is no retry or input for them.
  const stuck = error?.failure === "daily_limit" || error?.failure === "disabled";
  const empty = messages.length === 0 && !pending && !error;

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
        onClick={openSheet}
        className={cn(
          "group fixed right-4 z-20 grid size-16 place-items-center rounded-full bg-charcoal shadow-accent-glow ring-1 ring-gold/70 transition-shadow duration-150 hover:ring-2 hover:ring-gold focus-visible:ring-2 focus-visible:ring-gold lg:bottom-6 lg:right-6",
          barBelow ? "bottom-20" : "bottom-4",
        )}
      >
        <Image src={mark} alt="" className="h-9 w-auto transition-transform duration-150 group-hover:rotate-90 group-focus-visible:rotate-90" />
        <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute -right-0.5 -top-0.5 size-5 fill-gold">
          <path d={SPARK} />
        </svg>
      </button>
      {mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-end lg:items-stretch lg:justify-end">
              <button
                type="button"
                tabIndex={-1}
                aria-label="Close HUME AI"
                onClick={closeSheet}
                className={cn("absolute inset-0 hidden cursor-default bg-ground/70 transition-opacity duration-200 ease-out lg:block", shown ? "opacity-100" : "opacity-0")}
              />
              <div
                ref={panel}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="HUME AI"
                className={cn(
                  "relative flex h-dvh w-full flex-col bg-surface outline-none transition-[translate,opacity] duration-200 ease-out lg:m-3 lg:h-[calc(100dvh-1.5rem)] lg:w-[30rem] lg:rounded-panel lg:border lg:border-line",
                  shown ? "max-lg:translate-y-0 lg:translate-x-0 lg:opacity-100" : "max-lg:translate-y-full lg:translate-x-6 lg:opacity-0",
                )}
              >
                <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar />
                    <div className="min-w-0">
                      <h2 className="font-display text-lg font-semibold leading-tight">HUME AI</h2>
                      <p className="truncate text-xs text-muted">{symbol ? `Reading ${symbol}-PERP` : "Any listed market"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {empty ? null : (
                      <Button variant="secondary" size="sm" onClick={newChat} disabled={pending}>
                        New chat
                      </Button>
                    )}
                    <button type="button" aria-label="Close HUME AI" onClick={closeSheet} className="grid size-9 min-w-[44px] place-items-center rounded-full text-muted transition-colors duration-150 hover:bg-raised hover:text-text">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3" aria-live="polite">
                  {empty ? (
                    <div className="flex min-h-full flex-col justify-center gap-6 py-6">
                      <div>
                        <p className="flex items-center gap-2 font-display text-xl text-muted">
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-gold">
                            <path d={SPARK} />
                          </svg>
                          Hello
                        </p>
                        <h3 className="mt-1 font-display text-3xl font-semibold leading-tight">{symbol ? `What do you want to know about ${symbol}?` : "What do you want to know?"}</h3>
                        <p className="mt-3 text-sm text-muted">Answers use Hume&apos;s own prices, charts and news, and say where each number came from.</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {suggestions(symbol || "this market").map((question) => (
                          <button
                            key={question}
                            type="button"
                            onClick={() => ask(question)}
                            className="flex min-h-11 w-full items-center justify-between gap-3 whitespace-normal rounded-panel bg-raised px-4 py-3 text-left text-sm transition-colors duration-150 hover:bg-accent-soft hover:text-accent-hover"
                          >
                            {question}
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12h14M13 6l6 6-6 6" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6 pt-2">
                      {messages.map((message, index) =>
                        message.role === "user" ? (
                          <p key={index} className="ml-auto max-w-[85%] whitespace-pre-wrap break-words rounded-panel bg-raised px-4 py-2.5 text-sm">
                            {message.content}
                          </p>
                        ) : (
                          <div key={index} className="flex gap-3">
                            <Avatar />
                            <div className="min-w-0 flex-1">
                              <p className="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">{message.content}</p>
                              {message.sources?.length ? (
                                <>
                                  <p className="mt-3 text-xs text-muted">Sources</p>
                                  <ul className="mt-1 flex flex-wrap gap-1.5">
                                    {message.sources.map((source) => (
                                      <li key={`${source.tool}-${source.source}-${source.asOf}`} className="break-words rounded-control border border-line bg-raised px-2 py-1 text-xs text-muted">
                                        {source.source} · {fmtSourceTime(source.asOf)}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              ) : null}
                            </div>
                          </div>
                        ),
                      )}

                      {pending ? (
                        <div role="status" className="flex gap-3">
                          <Avatar />
                          <div className="min-w-0 flex-1 space-y-2.5 pt-1">
                            <p className="text-sm text-muted">HUME AI is reading the market…</p>
                            <Skeleton className="block h-3 w-full" />
                            <Skeleton className="block h-3 w-5/6" />
                            <Skeleton className="block h-3 w-2/3" />
                          </div>
                        </div>
                      ) : null}

                      {error ? (
                        <div role="alert" className="flex flex-col items-start gap-2 rounded-panel border border-down bg-down-soft px-4 py-3 text-sm">
                          {isLimit(error.failure) ? <p className="font-medium">Limit reached</p> : null}
                          <p>{failureText(error.failure, error.retryAfterSeconds)}</p>
                          {stuck ? null : (
                            <Button variant="secondary" size="sm" onClick={() => void run(messages)} disabled={pending}>
                              Try again
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                  <div ref={end} />
                </div>

                <div className="shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
                  <form onSubmit={onSubmit} className={cn(fieldBorder, "flex items-center gap-2 rounded-full border bg-raised py-1.5 pl-5 pr-1.5")}>
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
                      placeholder={stuck ? "Not available right now" : symbol ? `Ask about ${symbol}` : "Ask a question"}
                      className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      aria-label="Ask"
                      disabled={stuck || pending || draft.trim() === ""}
                      className="grid size-10 min-w-[44px] shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition-colors duration-150 hover:bg-accent-hover active:bg-accent-press disabled:cursor-not-allowed disabled:bg-line disabled:text-faint"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 19V5M5 12l7-7 7 7" />
                      </svg>
                    </button>
                  </form>
                  <p className="mt-2 text-center text-xs text-muted">AI-generated, not financial advice. HUME AI only explains; it cannot trade for you.</p>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
