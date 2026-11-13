import { FormEvent, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { chatApi, ChatHistory } from "../../lib/api";
import { Skeleton } from "../../components/ui/primitives";
import { RobotMascot } from "../../components/three/RobotMascot";

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

  const messages = history.data?.messages ?? [];
  return (
    <div className="card !p-0 flex flex-col overflow-hidden h-[calc(100vh-8rem)] lg:h-[calc(100vh-7rem)]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] bg-brand-gradient text-white">
        <div className="w-12 h-12 rounded-full bg-white/15 overflow-hidden shrink-0">
          <RobotMascot className="w-12 h-12" />
        </div>
        <h1 className="flex-1 font-black">{t("aiChat.title")}</h1>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3 sm:p-5 chat-bg">
        {messages.length === 0 && !history.isLoading && <AiBubble>{t("variants.chatHello")}</AiBubble>}
        {history.isLoading ? (
          <Skeleton className="h-16 w-2/3" />
        ) : (
          messages.map((m) =>
            m.role === "USER" ? (
              <div key={m.id} className="bubble-user self-end max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 text-sm text-white whitespace-pre-wrap">
                {m.content}
              </div>
            ) : (
              <AiBubble key={m.id}>{m.content}</AiBubble>
            )
          )
        )}
        {sending && (
          <AiBubble>
            <span className="typing text-brand-500"><span /><span /><span /></span>
          </AiBubble>
        )}
        <div ref={bottomRef} />
      </div>
      {sendError && <p role="alert" className="text-sm text-danger px-5">{t("aiChat.sendError")}</p>}
      <div className="p-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="pill-3d text-sm text-white rounded-full px-3.5 py-2 bg-brand-gradient text-left">
                {s}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 rounded-full bubble-ai">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("aiChat.placeholder")}
            className="flex-1 min-w-0 bg-transparent px-4 py-2 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
            aria-label={t("aiChat.messageLabel")}
          />
          <button type="submit" disabled={sending} aria-label={t("aiChat.sendLabel")} className="w-11 h-11 shrink-0 rounded-full bg-brand-gradient text-white flex items-center justify-center pill-3d glow-violet">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

function AiBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="self-start flex items-end gap-2 max-w-[85%]">
      <div className="bubble-ai rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">{children}</div>
    </div>
  );
}
