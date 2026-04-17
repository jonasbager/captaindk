import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  id: string;
  role: "user" | "system";
  content: string;
}

const fallback: ChatMessage = {
  id: "",
  role: "system",
  content: "AI-bogføring er endnu ikke koblet til. Tilføj rigtig modelintegration for at få konteringsforslag.",
};

export default function Bogfoer() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg, { ...fallback, id: `s-${Date.now()}` }]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2.75rem)]">
      <div ref={scrollRef} className="flex-1 overflow-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Ingen samtaler endnu. Beskriv en postering for at komme i gang.
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[75%]">
                <div
                  className={`rounded px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-accent text-foreground"
                      : "bg-card border border-border/40"
                  }`}
                >
                  <p>{msg.content}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="border-t border-border/30 p-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Button type="button" variant="outline" size="icon" className="shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Beskriv en postering eller stil et spørgsmål..."
            className="bg-background"
          />
          <Button type="submit" size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
