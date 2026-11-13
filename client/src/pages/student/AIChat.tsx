import { FormEvent, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Bot, Send } from "lucide-react";
import { chatApi, ChatHistory } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/primitives";
import { RobotMascot } from "../../components/three/RobotMascot";
import clsx from "clsx";
import { ChatStage, ChatTopics } from "./variants/ChatVariants";

export default function AIChat() {
  const { t } = useTranslation();
  const SUGGESTIONS = [t("aiChat.suggestion1"), t("aiChat.suggestion2"), t("aiChat.suggestion3")];
  const queryClient = useQueryClient();
  const history = useQuery({ queryKey: ["chat-history"], queryFn: chatApi.getHistory });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.data?.messages.length, sending]);

  const send = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    setSendError(false);
    setInput("");
    // Optimistic append so the UI feels instant while the request is in flight.
    queryClient.setQueryData<ChatHistory>(["chat-history"], (old) => ({
      conversationId: old?.conversationId ?? "",
      messages: [...(old?.messages ?? []), { id: `temp-${Date.now()}`, role: "USER", content: text }],
    }));
    try {
      await chatApi.sendMessage(text);
    } catch {
      // e.g. the chat rate limit (429) — say so and hand the text back for a
      // retry, instead of leaving the optimistic bubble looking delivered.
      setSendError(true);
      setInput(text);
    } finally {
      // Either way, the server's history is the truth (it may or may not have
      // saved the message before failing).
      await queryClient.invalidateQueries({ queryKey: ["chat-history"] });
      setSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  // ?v=a|b|c|d previews the new chat layouts.
  const v = new URLSearchParams(window.location.search).get("v");
  if (v === "c" || v === "d") {
    const View = v === "c" ? ChatStage : ChatTopics;
    return (
      <View
        messages={history.data?.messages ?? []}
        loading={history.isLoading}
        sending={sending}
        sendError={sendError}
        input={input}
        setInput={setInput}
        send={send}
        onSubmit={handleSubmit}
        bottomRef={bottomRef}
      />
    );
  }
  if (v === "a" || v === "b") {
    const messages = history.data?.messages ?? [];
    const messenger = v === "b";
    const list = (
      <div className={clsx("flex-1 overflow-y-auto flex flex-col gap-3 p-3 sm:p-5", messenger && "chat-bg")}>
        {messenger && messages.length === 0 && !history.isLoading && (
          <AiBubble avatar>{t("variants.chatHello")}</AiBubble>
        )}
        {history.isLoading ? (
          <Skeleton className="h-16 w-2/3" />
        ) : (
          messages.map((m) =>
            m.role === "USER" ? (
              <div key={m.id} className="bubble-user self-end max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 text-sm text-white whitespace-pre-wrap">
                {m.content}
              </div>
            ) : (
              <AiBubble key={m.id} avatar={messenger}>
                {m.content}
              </AiBubble>
            )
          )
        )}
        {sending && (
          <AiBubble avatar={messenger}>
            <span className="typing text-brand-500"><span /><span /><span /></span>
          </AiBubble>
        )}
        <div ref={bottomRef} />
      </div>
    );
    const chips = (
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} className="pill-3d text-sm text-white rounded-full px-3.5 py-2 bg-brand-gradient text-left">
            {s}
          </button>
        ))}
      </div>
    );
    const form = (
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 rounded-full bubble-ai">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("aiChat.placeholder")}
          className="flex-1 bg-transparent px-4 py-2 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
          aria-label={t("aiChat.messageLabel")}
        />
        <button type="submit" disabled={sending} aria-label={t("aiChat.sendLabel")} className="w-11 h-11 rounded-full bg-brand-gradient text-white flex items-center justify-center pill-3d glow-violet">
          <Send size={18} />
        </button>
      </form>
    );
    if (!messenger)
      return (
        <div className="grid lg:grid-cols-[320px_1fr] gap-5 h-[calc(100vh-8rem)] lg:h-[calc(100vh-7rem)]">
          <aside className="cc-hero rounded-[1.75rem] text-white p-5 flex lg:flex-col items-center lg:justify-center gap-4 lg:text-center">
            <RobotMascot className="w-24 h-28 lg:w-60 lg:h-64 shrink-0" />
            <div>
              <h1 className="text-xl lg:text-3xl font-black">{t("aiChat.title")}</h1>
              <p className="text-sm text-emerald-300 font-semibold flex items-center gap-1.5 lg:justify-center mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> {t("variants.online")}
              </p>
              <div className="hidden lg:block mt-6">{chips}</div>
            </div>
          </aside>
          <div className="card !p-0 flex flex-col min-h-0 overflow-hidden">
            {list}
            {sendError && <p role="alert" className="text-sm text-danger px-5">{t("aiChat.sendError")}</p>}
            <div className="p-3 sm:p-4 border-t border-[var(--border-subtle)] flex flex-col gap-3">
              {messages.length === 0 && <div className="lg:hidden">{chips}</div>}
              {form}
            </div>
          </div>
        </div>
      );
    return (
      <div className="card !p-0 flex flex-col overflow-hidden h-[calc(100vh-8rem)] lg:h-[calc(100vh-7rem)]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] bg-brand-gradient text-white">
          <div className="w-12 h-12 rounded-full bg-white/15 overflow-hidden shrink-0">
            <RobotMascot className="w-12 h-12" />
          </div>
          <div className="flex-1">
            <h1 className="font-black">{t("aiChat.title")}</h1>
            <p className="text-xs text-white/80 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-300" /> {t("variants.online")}</p>
          </div>
        </div>
        {list}
        {sendError && <p role="alert" className="text-sm text-danger px-5">{t("aiChat.sendError")}</p>}
        <div className="p-3 flex flex-col gap-3">
          {messages.length === 0 && chips}
          {form}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-3rem)]">
      <div className="flex items-center gap-3 mb-4">
        <RobotMascot className="w-16 h-16 -my-3" />
        <h1 className="font-bold text-lg">{t("aiChat.title")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
        {history.isLoading ? (
          <>
            <Skeleton className="h-16 w-2/3" />
            <Skeleton className="h-16 w-2/3 ml-auto" />
          </>
        ) : (
          history.data?.messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "USER" ? "self-end bg-brand-gradient text-white" : "self-start bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)]"
              }`}
            >
              {m.content}
            </div>
          ))
        )}
        {sending && (
          <div className="self-start bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3 text-sm text-[var(--text-secondary)]">
            {t("aiChat.typing")}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!history.isLoading && (history.data?.messages.length ?? 0) === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-sm bg-brand-50 text-brand-700 rounded-full px-3.5 py-2 hover:bg-brand-100 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {sendError && (
        <p role="alert" className="text-sm text-danger mb-2">
          {t("aiChat.sendError")}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("aiChat.placeholder")}
          className="input-field flex-1"
          aria-label={t("aiChat.messageLabel")}
        />
        <Button type="submit" loading={sending} className="!p-3.5" aria-label={t("aiChat.sendLabel")}>
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
}

function AiBubble({ children, avatar }: { children: React.ReactNode; avatar?: boolean }) {
  return (
    <div className="self-start flex items-end gap-2 max-w-[85%]">
      {avatar && <span className="w-8 h-8 shrink-0 rounded-full bg-brand-gradient flex items-center justify-center text-base icon-3d text-white"><Bot size={17} /></span>}
      <div className="bubble-ai rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">{children}</div>
    </div>
  );
}
