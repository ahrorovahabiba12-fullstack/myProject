import { FormEvent, ReactNode, RefObject } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { Bot, BookOpen, Compass, FileText, GraduationCap, Send, Sparkles, type LucideIcon } from "lucide-react";
import { RobotMascot } from "../../../components/three/RobotMascot";
import { Skeleton } from "../../../components/ui/primitives";

export type ChatMsg = { id: string; role: string; content: string };
export type ChatViewProps = {
  messages: ChatMsg[];
  loading: boolean;
  sending: boolean;
  sendError: boolean;
  input: string;
  setInput: (v: string) => void;
  send: (text: string) => void;
  onSubmit: (e: FormEvent) => void;
  bottomRef: RefObject<HTMLDivElement>;
};

type Topic = { key: string; Icon: LucideIcon; color: string };
const TOPICS: Topic[] = [
  { key: "Career", Icon: Compass, color: "#7c4dff" },
  { key: "Dtm", Icon: FileText, color: "#0ea5e9" },
  { key: "Uni", Icon: GraduationCap, color: "#ec4899" },
  { key: "Study", Icon: BookOpen, color: "#10b981" },
];

const H = "h-[calc(100vh-8rem)] lg:h-[calc(100vh-7rem)]";

function Typing() {
  return (
    <span className="typing text-cyan-300">
      <span />
      <span />
      <span />
    </span>
  );
}

function Composer({ input, setInput, onSubmit, sending, className }: Pick<ChatViewProps, "input" | "setInput" | "onSubmit" | "sending"> & { className?: string }) {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} className={clsx("composer flex items-center gap-2 p-1.5 rounded-full", className)}>
      <Sparkles size={18} className="ml-3 text-cyan-400 shrink-0" aria-hidden="true" />
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t("aiChat.placeholder")}
        className="flex-1 min-w-0 bg-transparent px-2 py-2 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
        aria-label={t("aiChat.messageLabel")}
      />
      <button type="submit" disabled={sending} aria-label={t("aiChat.sendLabel")} className="w-11 h-11 shrink-0 rounded-full bg-brand-gradient text-white flex items-center justify-center pill-3d glow-violet">
        <Send size={18} />
      </button>
    </form>
  );
}

function ErrorLine({ show }: { show: boolean }) {
  const { t } = useTranslation();
  return show ? <p role="alert" className="text-sm text-danger px-1">{t("aiChat.sendError")}</p> : null;
}

/** AI C — "Robot sahnasi": the robot stands on a glowing stage and "speaks"
 * its latest answer in a big speech bubble; topic orbs float around it.
 * The full conversation sits in a glass panel beside the stage. */
export function ChatStage(p: ChatViewProps) {
  const { t } = useTranslation();
  const lastAi = [...p.messages].reverse().find((m) => m.role !== "USER");
  return (
    <div className={clsx("grid lg:grid-cols-[1fr_400px] gap-4", H)}>
      <section className="stage-hero relative overflow-hidden rounded-[1.75rem] text-white flex flex-col min-h-0 max-lg:h-[300px] max-lg:shrink-0">
        <div className="relative z-10 p-4 sm:p-6 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h1 className="font-black text-lg sm:text-2xl">{t("aiChat.title")}</h1>
          <span className="text-xs text-emerald-300 font-semibold">{t("variants.online")}</span>
        </div>

        {/* speech bubble */}
        <div className="relative z-10 px-4 sm:px-8 max-lg:pr-[46%]">
          <div className="speech-big max-w-xl rounded-3xl rounded-bl-md px-4 py-3 sm:px-6 sm:py-5 text-sm sm:text-lg leading-relaxed max-h-[150px] lg:max-h-[220px] overflow-y-auto">
            {p.sending ? <Typing /> : lastAi?.content ?? t("variants.chatHello")}
          </div>
        </div>

        {/* robot on its stage */}
        <div className="absolute right-0 bottom-0 w-[46%] h-[85%] lg:w-[52%] lg:h-[72%] flex items-end justify-center">
          <div className="stage-disc" aria-hidden="true" />
          <RobotMascot className="relative w-40 h-48 lg:w-[22rem] lg:h-[26rem] -mb-2" />
        </div>

        {/* topic orbs (desktop) */}
        <div className="hidden lg:flex absolute left-6 bottom-6 z-10 flex-col gap-3 max-w-[48%]">
          <p className="text-xs uppercase tracking-widest text-white/50 font-semibold">{t("variants.askAbout")}</p>
          {TOPICS.map(({ key, Icon, color }, i) => (
            <button
              key={key}
              onClick={() => p.send(t(`variants.topic${key}Q`))}
              className="topic-orb flex items-center gap-3 rounded-full pr-5 pl-1.5 py-1.5 text-left"
              style={{ ["--c" as string]: color, animation: `chip-float 6s ease-in-out ${-i * 1.3}s infinite` }}
            >
              <span className="career-tile w-10 h-10 rounded-full inline-flex items-center justify-center">
                <Icon size={19} strokeWidth={2} />
              </span>
              <span className="text-sm font-semibold">{t(`variants.topic${key}Q`)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card !p-0 flex flex-col min-h-0 overflow-hidden">
        <div className="lg:hidden flex gap-2 overflow-x-auto p-3 border-b border-[var(--border-subtle)] no-scrollbar">
          {TOPICS.map(({ key, Icon, color }) => (
            <button key={key} onClick={() => p.send(t(`variants.topic${key}Q`))} className="shrink-0 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-white" style={{ background: color }}>
              <Icon size={15} /> {t(`variants.topic${key}`)}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-4">
          {p.loading ? (
            <Skeleton className="h-16 w-2/3" />
          ) : (
            p.messages.map((m) =>
              m.role === "USER" ? (
                <div key={m.id} className="bubble-user self-end max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white whitespace-pre-wrap">
                  {m.content}
                </div>
              ) : (
                <div key={m.id} className="self-start max-w-[90%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm bubble-ai whitespace-pre-wrap">
                  {m.content}
                </div>
              )
            )
          )}
          <div ref={p.bottomRef} />
        </div>
        <div className="p-3 border-t border-[var(--border-subtle)] flex flex-col gap-2">
          <ErrorLine show={p.sendError} />
          <Composer {...p} />
        </div>
      </section>
    </div>
  );
}

function AiLine({ children }: { children: ReactNode }) {
  return (
    <div className="self-start flex items-start gap-2.5 max-w-[92%] sm:max-w-[80%]">
      <span className="w-9 h-9 shrink-0 rounded-xl bg-brand-gradient text-white flex items-center justify-center icon-3d">
        <Bot size={19} />
      </span>
      <div className="ai-glow rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">{children}</div>
    </div>
  );
}

/** AI D — "Mavzu kartalari": a big headline and four colourful 3D topic
 * cards (each sends a ready question), then the chat with glowing answers. */
export function ChatTopics(p: ChatViewProps) {
  const { t } = useTranslation();
  const empty = !p.loading && p.messages.length === 0;
  return (
    <div className={clsx("flex flex-col gap-4", H)}>
      <header className="flex items-center gap-3 sm:gap-4">
        <RobotMascot className="w-16 h-20 sm:w-20 sm:h-24 shrink-0 -my-2" />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-black leading-tight text-gradient-brand">{t("variants.chatHeadline")}</h1>
          <p className="text-sm text-[var(--text-secondary)]">{t("variants.chatSub")}</p>
        </div>
      </header>

      <div className={clsx("grid gap-3 [perspective:1000px]", empty ? "grid-cols-2 lg:grid-cols-4" : "grid-flow-col auto-cols-[46%] sm:auto-cols-[30%] lg:grid-flow-row lg:grid-cols-4 overflow-x-auto no-scrollbar")}>
        {TOPICS.map(({ key, Icon, color }) => (
          <button
            key={key}
            data-tilt
            onClick={() => p.send(t(`variants.topic${key}Q`))}
            className="topic-card relative overflow-hidden rounded-2xl p-3 sm:p-4 text-left text-white"
            style={{ ["--c" as string]: color }}
          >
            <Icon strokeWidth={1} className="absolute -right-4 -bottom-5 w-24 h-24 text-white/20" aria-hidden="true" />
            <span className="relative flex items-center gap-2 font-black">
              <span className="w-8 h-8 rounded-xl bg-white/25 inline-flex items-center justify-center">
                <Icon size={17} />
              </span>
              {t(`variants.topic${key}`)}
            </span>
            <span className="relative block text-xs sm:text-sm text-white/85 mt-2 leading-snug">{t(`variants.topic${key}Q`)}</span>
          </button>
        ))}
      </div>

      <div className="card chat-bg !p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 sm:p-5">
          {empty && <AiLine>{t("variants.chatHello")}</AiLine>}
          {p.loading ? (
            <Skeleton className="h-16 w-2/3" />
          ) : (
            p.messages.map((m) =>
              m.role === "USER" ? (
                <div key={m.id} className="bubble-user self-end max-w-[85%] sm:max-w-[70%] rounded-2xl rounded-tr-md px-4 py-3 text-sm text-white whitespace-pre-wrap">
                  {m.content}
                </div>
              ) : (
                <AiLine key={m.id}>{m.content}</AiLine>
              )
            )
          )}
          {p.sending && (
            <AiLine>
              <Typing />
            </AiLine>
          )}
          <div ref={p.bottomRef} />
        </div>
        <div className="p-3 flex flex-col gap-2">
          <ErrorLine show={p.sendError} />
          <Composer {...p} />
        </div>
      </div>
    </div>
  );
}
