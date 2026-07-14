import { useState } from "react";
import { Send, Bot, UserRound, Clock } from "lucide-react";
import { Button } from "../ui/button";
import type { Handler } from "../../data/mock";

interface Props {
  handler: Handler;
  onSend: (text: string) => void;
  onTakeOver: () => void;
  onHandBack: () => void;
  onResolve: () => void;
  windowClosingSoon?: boolean;
}

export function Composer({ handler, onSend, onTakeOver, onHandBack, onResolve, windowClosingSoon }: Props) {
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="border-t border-border bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/60">
        <div className="flex items-center gap-2 text-ink-60" style={{ fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {handler === "bot" ? <Bot size={13} /> : <UserRound size={13} />}
          {handler === "bot" ? "Bot is handling" : "You have taken over"}
        </div>
        <div className="flex items-center gap-1">
          {windowClosingSoon && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal-red/10 text-signal-red mr-2" style={{ fontSize: "0.65rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              <Clock size={11} /> 24h window closing
            </span>
          )}
          {handler === "bot" ? (
            <Button variant="ghost" size="sm" onClick={onTakeOver}>Take over</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onHandBack}>Hand back</Button>
          )}
          <Button variant="ghost" size="sm" onClick={onResolve}>Mark resolved</Button>
        </div>
      </div>
      <div className="flex items-end gap-2 p-3">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
          placeholder={handler === "bot" ? "Take over to reply personally…" : "Write a reply…"}
          className="flex-1 resize-none bg-input-background rounded-md px-3 py-2 outline-none focus:bg-white border border-transparent focus:border-accent/40"
          style={{ fontSize: "0.88rem", lineHeight: 1.45 }}
          disabled={handler === "bot"}
        />
        <Button
          onClick={send}
          disabled={handler === "bot" || !text.trim()}
          className="bg-noir text-white hover:bg-noir-700 h-10"
        >
          <Send size={15} className="mr-1.5" /> Send
        </Button>
      </div>
    </div>
  );
}
