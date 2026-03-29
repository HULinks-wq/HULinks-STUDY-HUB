import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Send, Loader2, Bot, User, RefreshCw, BookOpen,
  ThumbsUp, ThumbsDown, HelpCircle, Lightbulb, ClipboardList, Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FileUploadZone } from "@/components/FileUploadZone";

type Message = { role: "user" | "assistant"; content: string };

const MODULES = [
  "Computer Science 101", "Calculus I", "Physics 101", "Information Technology",
  "Mathematics", "Engineering", "Business Management", "Accounting", "Law",
  "Economics", "Statistics", "Chemistry", "Biology", "Education", "Other",
];

const QUICK_REPLIES = [
  { label: "Give me practice questions", icon: ClipboardList },
  { label: "Explain it differently", icon: RefreshCw },
  { label: "What are the key points?", icon: Lightbulb },
  { label: "What mistakes do students make?", icon: HelpCircle },
];

function ChatBubble({ msg, isLast, onQuickReply }: { msg: Message; isLast: boolean; onQuickReply: (t: string) => void }) {
  const isAI = msg.role === "assistant";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isAI ? "items-start" : "items-start flex-row-reverse"}`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isAI ? "bg-primary text-white" : "bg-zinc-800 text-white"}`}>
        {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      <div className={`flex flex-col gap-2 max-w-[80%] ${isAI ? "items-start" : "items-end"}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isAI
            ? "bg-white border border-zinc-100 text-zinc-800 rounded-tl-sm shadow-sm"
            : "bg-primary text-white rounded-tr-sm"
        }`}>
          {msg.content}
        </div>
        {isAI && isLast && (
          <div className="flex flex-wrap gap-2 mt-1">
            {QUICK_REPLIES.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => onQuickReply(label)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-600 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all bg-white"
              >
                <Icon className="w-3 h-3" /> {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function StudyBuddy() {
  const [module, setModule] = useState("");
  const [struggle, setStruggle] = useState("");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;
    const newHistory: Message[] = [...history, { role: "user", content }];
    setHistory(newHistory);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/study-buddy/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ history: newHistory, module }),
      });
      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();
      setHistory(prev => [...prev, { role: "assistant", content: data.message }]);
    } catch {
      toast({ title: "Couldn't reach the tutor", description: "Please try again.", variant: "destructive" });
      setHistory(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleStart = async () => {
    if (!struggle.trim()) return;
    setStarted(true);
    const opening = module
      ? `I'm studying ${module} and I'm struggling with: ${struggle}`
      : `I'm struggling with: ${struggle}`;
    await sendMessage(opening);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const reset = () => {
    setHistory([]);
    setStarted(false);
    setStruggle("");
    setInput("");
    setModule("");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </span>
            Study Buddy
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Tell me what you're struggling with — I'll explain it, simplify it, and won't stop until it makes sense.</p>
        </div>
        {started && (
          <Button variant="outline" size="sm" onClick={reset} className="gap-2 rounded-xl shrink-0">
            <RefreshCw className="w-3.5 h-3.5" /> New Session
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {!started ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 rounded-3xl border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-zinc-900">What are you struggling with?</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Be as specific as possible — the more detail, the better I can help</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-2">Module (optional)</label>
                  <Select value={module} onValueChange={setModule}>
                    <SelectTrigger className="rounded-xl" data-testid="select-module">
                      <SelectValue placeholder="Select your module..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-2">What's giving you trouble?</label>
                  <textarea
                    className="w-full min-h-[120px] p-4 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm text-zinc-900 placeholder:text-zinc-400 bg-zinc-50 leading-relaxed"
                    placeholder={"e.g. I don't understand how to solve simultaneous equations\ne.g. The concept of supply and demand makes no sense to me\ne.g. I keep getting confused between debits and credits in accounting"}
                    value={struggle}
                    onChange={e => setStruggle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleStart(); }}
                    data-testid="input-struggle"
                  />
                </div>

                <FileUploadZone
                  compact
                  hint="Or upload notes/files — extracted content will be added to your question"
                  onTextExtracted={(text) => setStruggle(prev => prev ? prev + "\n\n" + text : text)}
                />

                <Button
                  onClick={handleStart}
                  disabled={!struggle.trim() || loading}
                  className="w-full rounded-2xl h-12 gap-2 text-base font-semibold shadow-md"
                  data-testid="button-get-help"
                >
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Getting help...</> : <><BookOpen className="w-5 h-5" />Get Help Now</>}
                </Button>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { title: "Explain it simply", desc: "Break down any concept step by step" },
                    { title: "Practice questions", desc: "Get targeted questions to test yourself" },
                    { title: "Keep going until it clicks", desc: "I'll rephrase and retry until you get it" },
                  ].map(({ title, desc }) => (
                    <div key={title} className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-center">
                      <p className="text-xs font-bold text-zinc-700">{title}</p>
                      <p className="text-[11px] text-zinc-400 mt-1">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {module && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{module}</span>
                <span className="text-xs text-zinc-400">— active session</span>
              </div>
            )}
            {history.map((msg, i) => (
              <ChatBubble
                key={i}
                msg={msg}
                isLast={i === history.length - 1 && msg.role === "assistant"}
                onQuickReply={sendMessage}
              />
            ))}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-3 bg-white border border-zinc-100 rounded-2xl rounded-tl-sm shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-2 h-2 rounded-full bg-zinc-300"
                        animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {started && (
        <div className="shrink-0 pt-3 border-t border-zinc-100">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              className="flex-1 min-h-[52px] max-h-32 p-3.5 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm text-zinc-900 placeholder:text-zinc-400 bg-white leading-relaxed"
              placeholder="Ask a follow-up question or say what's still unclear… (Enter to send)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              data-testid="input-followup"
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-12 h-12 rounded-2xl p-0 shrink-0 shadow-md"
              data-testid="button-send"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[11px] text-zinc-400 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
        </div>
      )}
    </motion.div>
  );
}
