"use client";

import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type SyntheticEvent,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Expand,
  Loader2,
  Minimize2,
  RefreshCw,
  Send,
  Square,
  X,
  Zap,
} from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type ChatHelpers = ReturnType<typeof useChat>;

const MIN_WIDTH = 360;
const DEFAULT_WIDTH = 420;
const MAX_WIDTH_RATIO = 0.8; // 80% of viewport

interface AISearchContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  chat: ChatHelpers;
  panelWidth: number;
  setPanelWidth: React.Dispatch<React.SetStateAction<number>>;
}

const AISearchContext = createContext<AISearchContextValue | null>(null);

function useAISearch() {
  const ctx = use(AISearchContext);
  if (!ctx) throw new Error("useAISearch must be used within AISearchProvider");
  return ctx;
}

export function AISearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const chat = useChat({
    id: "docs-ai",
    transport: new DefaultChatTransport({
      api: "/api/docs-ai",
    }),
  });

  const value = useMemo(
    () => ({ chat, open, setOpen, panelWidth, setPanelWidth }),
    [chat, open, panelWidth],
  );

  return <AISearchContext value={value}>{children}</AISearchContext>;
}

export function AISearchTrigger({
  className,
  ...props
}: ComponentProps<"button">) {
  const { open, setOpen } = useAISearch();

  return (
    <button
      type="button"
      data-state={open ? "open" : "closed"}
      className={cn(
        "fixed bottom-4 end-4 z-20 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-all",
        "bg-fd-primary text-fd-primary-foreground hover:opacity-90",
        open && "translate-y-10 opacity-0 pointer-events-none",
        className,
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      <Zap className="size-4" />
      Ask AI
    </button>
  );
}

/* ---------- Drag resize handle ---------- */

function ResizeHandle({
  onResize,
  onReset,
}: {
  onResize: (deltaX: number) => void;
  onReset: () => void;
}) {
  const isDragging = useRef(false);
  const startX = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const delta = startX.current - e.clientX;
      startX.current = e.clientX;
      onResize(delta);
    },
    [onResize],
  );

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onReset}
      className="hidden lg:flex absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize items-center justify-center z-10 group"
      title="Drag to resize, double-click to reset"
    >
      <div className="h-8 w-1 rounded-full bg-fd-border group-hover:bg-fd-primary/50 transition-colors" />
    </div>
  );
}

/* ---------- Streaming indicator ---------- */

function StreamingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      <div className="flex items-center gap-1">
        <span className="size-1.5 rounded-full bg-fd-primary animate-bounce [animation-delay:0ms]" />
        <span className="size-1.5 rounded-full bg-fd-primary animate-bounce [animation-delay:150ms]" />
        <span className="size-1.5 rounded-full bg-fd-primary animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="ml-1.5 text-xs text-fd-muted-foreground">
        Generating...
      </span>
    </div>
  );
}

/* ---------- Input ---------- */

function AIInput() {
  const { chat } = useAISearch();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = chat.status === "streaming" || chat.status === "submitted";

  const onSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    chat.sendMessage({ text: input.trim() });
    setInput("");
  };

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 p-2.5">
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask about Lazer..."
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-fd-muted-foreground"
        disabled={isLoading}
      />
      {isLoading ? (
        <button
          type="button"
          onClick={() => chat.stop()}
          className="rounded-full p-1.5 text-fd-muted-foreground hover:text-fd-foreground"
          title="Stop generating"
        >
          <Square className="size-3.5 fill-current" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!input.trim()}
          className="rounded-full p-1.5 text-fd-muted-foreground hover:text-fd-foreground disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      )}
    </form>
  );
}

/* ---------- Markdown rendering ---------- */

function MarkdownContent({ content }: { content: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        // ALL links open in new tab to prevent chat panel from closing
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fd-primary underline underline-offset-2 hover:no-underline"
          >
            {children}
          </a>
        ),
        // Code blocks
        pre: ({ children }) => (
          <pre className="my-2 overflow-x-auto rounded-lg border bg-fd-secondary/50 p-3 text-xs leading-relaxed">
            {children}
          </pre>
        ),
        code: ({ children, className }) => {
          if (className) {
            return <code className={className}>{children}</code>;
          }
          return (
            <code className="rounded bg-fd-secondary px-1.5 py-0.5 text-xs font-mono">
              {children}
            </code>
          );
        },
        // Paragraphs
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        // Headings
        h1: ({ children }) => (
          <h3 className="mt-3 mb-1.5 text-sm font-semibold">{children}</h3>
        ),
        h2: ({ children }) => (
          <h4 className="mt-2.5 mb-1 text-sm font-semibold">{children}</h4>
        ),
        h3: ({ children }) => (
          <h5 className="mt-2 mb-1 text-xs font-semibold">{children}</h5>
        ),
        h4: ({ children }) => (
          <h6 className="mt-2 mb-1 text-xs font-medium">{children}</h6>
        ),
        // Lists
        ul: ({ children }) => (
          <ul className="mb-2 ml-4 list-disc space-y-0.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 ml-4 list-decimal space-y-0.5">{children}</ol>
        ),
        li: ({ children }) => <li className="text-sm">{children}</li>,
        // Tables (GFM)
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-fd-secondary/70 border-b">{children}</thead>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr className="border-b last:border-b-0">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-3 py-1.5 text-left font-medium text-fd-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-1.5 text-fd-muted-foreground">{children}</td>
        ),
        // Horizontal rules
        hr: () => <hr className="my-3 border-fd-border" />,
        // Bold / italic / strikethrough
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        del: ({ children }) => (
          <del className="line-through text-fd-muted-foreground">
            {children}
          </del>
        ),
        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-fd-primary/30 pl-3 text-fd-muted-foreground">
            {children}
          </blockquote>
        ),
        // Images
        img: ({ src, alt }) => (
          <img
            src={src}
            alt={alt ?? ""}
            className="my-2 max-w-full rounded-lg border"
          />
        ),
        // Task list checkboxes (GFM)
        input: ({ checked, type }) => {
          if (type === "checkbox") {
            return (
              <input
                type="checkbox"
                checked={checked}
                readOnly
                className="mr-1.5 rounded"
              />
            );
          }
          return <input type={type} />;
        },
      }}
    >
      {content}
    </Markdown>
  );
}

/* ---------- Message bubble ---------- */

function extractMessageText(msg: ChatHelpers["messages"][number]): string {
  if (!Array.isArray(msg.parts)) return "";
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function AIMessage({ msg }: { msg: ChatHelpers["messages"][number] }) {
  const text = extractMessageText(msg);
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-fd-primary px-3.5 py-2 text-sm text-fd-primary-foreground">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-fd-primary/10">
        <Zap className="size-3 text-fd-primary" />
      </div>
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        <MarkdownContent content={text} />
      </div>
    </div>
  );
}

/* ---------- Panel ---------- */

export function AISearchPanel() {
  const { open, setOpen, chat, panelWidth, setPanelWidth } = useAISearch();
  const listRef = useRef<HTMLDivElement>(null);
  const isLoading = chat.status === "streaming" || chat.status === "submitted";
  const isStreaming = chat.status === "streaming";

  const handleResize = useCallback(
    (delta: number) => {
      setPanelWidth((prev: number) => {
        const maxW = window.innerWidth * MAX_WIDTH_RATIO;
        return Math.max(MIN_WIDTH, Math.min(maxW, prev + delta));
      });
    },
    [setPanelWidth],
  );

  const handleReset = useCallback(() => {
    setPanelWidth(DEFAULT_WIDTH);
  }, [setPanelWidth]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [chat.messages]);

  // Hotkey: Cmd+/ to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        e.preventDefault();
      }
      if (e.key === "/" && (e.metaKey || e.ctrlKey) && !open) {
        setOpen(true);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  if (!open) return null;

  const messages = chat.messages.filter((m) => m.role !== "system");
  const showThinkingIndicator =
    isLoading && messages[messages.length - 1]?.role === "user";

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed z-30 bg-fd-card text-fd-card-foreground shadow-xl",
          "max-lg:inset-x-2 max-lg:top-4 max-lg:bottom-4 max-lg:border max-lg:rounded-2xl",
          "lg:top-0 lg:right-0 lg:h-dvh lg:border-s",
        )}
        style={{ width: panelWidth }}
      >
        {/* Drag handle on left edge */}
        <ResizeHandle onResize={handleResize} onReset={handleReset} />

        <div className="flex flex-col size-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-fd-primary/10">
                <Zap className="size-3.5 text-fd-primary" />
              </div>
              <div>
                <p className="text-sm font-medium leading-none">Ask AI</p>
                <p className="mt-0.5 text-[11px] text-fd-muted-foreground">
                  Lazer Docs Assistant
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Expand / shrink toggle */}
              <button
                type="button"
                onClick={() =>
                  setPanelWidth(
                    panelWidth > DEFAULT_WIDTH
                      ? DEFAULT_WIDTH
                      : Math.min(window.innerWidth * 0.7, 900),
                  )
                }
                className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-secondary hover:border-fd-foreground/30 transition-colors"
              >
                {panelWidth > DEFAULT_WIDTH ? (
                  <>
                    <Minimize2 className="size-3.5" />
                    Shrink
                  </>
                ) : (
                  <>
                    <Expand className="size-3.5" />
                    Expand
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border p-1.5 text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-secondary transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-4 py-4"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent, white 0.5rem, white calc(100% - 0.5rem), transparent 100%)",
            }}
          >
            {messages.length === 0 ? (
              <div className="size-full flex flex-col items-center justify-center text-center gap-3 text-fd-muted-foreground/80">
                <div className="flex size-10 items-center justify-center rounded-xl bg-fd-primary/10">
                  <Zap className="size-5 text-fd-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-fd-foreground/80">
                    Ask about Lazer
                  </p>
                  <p className="mt-1 text-xs">
                    Try: &quot;How do I capture assets?&quot;
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                  {[
                    "How do scenes work?",
                    "Setup the extension",
                    "What are shots?",
                  ].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => chat.sendMessage({ text: q })}
                      className="rounded-full border px-3 py-1.5 text-xs text-fd-muted-foreground hover:text-fd-foreground hover:border-fd-foreground/30 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((msg) => (
                  <AIMessage key={msg.id} msg={msg} />
                ))}
                {/* Thinking indicator - shown before first token arrives */}
                {showThinkingIndicator && <StreamingDots />}
                {/* Streaming cursor on the last assistant message */}
                {isStreaming &&
                  messages[messages.length - 1]?.role === "assistant" && (
                    <div className="flex items-center gap-1.5 text-[11px] text-fd-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      Streaming...
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Footer actions + input */}
          <div className="border-t">
            {/* Quick actions bar */}
            {messages.length > 0 && !isLoading && (
              <div className="flex items-center gap-1.5 px-4 pt-2">
                <button
                  type="button"
                  onClick={() => chat.regenerate()}
                  className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] text-fd-muted-foreground hover:text-fd-foreground hover:border-fd-foreground/30 transition-colors"
                >
                  <RefreshCw className="size-3" />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => chat.setMessages([])}
                  className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] text-fd-muted-foreground hover:text-fd-foreground hover:border-fd-foreground/30 transition-colors"
                >
                  <X className="size-3" />
                  Clear
                </button>
              </div>
            )}

            {/* Input */}
            <AIInput />
          </div>
        </div>
      </div>
    </>
  );
}
