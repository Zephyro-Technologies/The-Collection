import type { Message } from "../../data/mock";
import { formatTime } from "../../data/mock";

export function MessageThread({ messages }: { messages: Message[] }) {
  return (
    <div className="flex flex-col gap-3 py-4">
      {messages.map((m) => {
        const isCustomer = m.from === "customer";
        const isBot = m.from === "bot";
        return (
          <div key={m.id} className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
            <div className="max-w-[78%]">
              <div
                className={`px-4 py-2.5 rounded-2xl ${
                  isCustomer
                    ? "bg-platinum-soft text-noir rounded-bl-sm"
                    : isBot
                    ? "bg-noir/5 text-noir border border-noir/10 rounded-br-sm"
                    : "bg-noir text-white rounded-br-sm"
                }`}
                style={{ fontSize: "0.88rem", lineHeight: 1.45 }}
              >
                {m.text}
              </div>
              <div className="flex items-center gap-2 mt-1 px-1" style={{ fontSize: "0.65rem", color: "var(--ink-40)", letterSpacing: "0.04em" }}>
                {isBot && <span className="uppercase">Bot</span>}
                {m.from === "human" && <span className="uppercase">You</span>}
                <span>{formatTime(m.at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
