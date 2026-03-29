import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Timer, BookOpen, CheckCircle2, XCircle, AlertCircle,
  TrendingDown, BarChart3, ChevronLeft, ChevronRight, Sparkles, Send
} from "lucide-react";
import { Link } from "wouter";

type Question = {
  id: number;
  type: "mcq" | "short" | "problem";
  question: string;
  marks: number;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
};

type Phase = "setup" | "exam" | "submitted" | "results";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MockExam() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("setup");
  const [form, setForm] = useState({ module: "", topic: "" });
  const [exam, setExam] = useState<any>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [showMemo, setShowMemo] = useState(false);

  // Disable right-click and copy during exam
  useEffect(() => {
    if (phase !== "exam") return;
    const noContext = (e: MouseEvent) => e.preventDefault();
    const noCopy = (e: ClipboardEvent) => e.preventDefault();
    document.addEventListener("contextmenu", noContext);
    document.addEventListener("copy", noCopy);
    return () => {
      document.removeEventListener("contextmenu", noContext);
      document.removeEventListener("copy", noCopy);
    };
  }, [phase]);

  // Timer
  useEffect(() => {
    if (phase !== "exam" || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); handleTimeUp(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, timeLeft]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/exams/generate", form);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (data) => {
      setExam(data);
      setTimeLeft(data.timerSeconds || 50 * 60);
      setCurrentQ(0);
      setAnswers({});
      setPhase("exam");
    },
    onError: (e: any) => toast({ title: "Failed to generate exam", description: e.message, variant: "destructive" }),
  });

  const submitMutation = useMutation({
    mutationFn: async (userAnswers: Record<number, string>) => {
      const res = await apiRequest("POST", `/api/exams/${exam.id}/submit`, { userAnswers: Object.fromEntries(Object.entries(userAnswers).map(([k, v]) => [k, v])) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data);
      setPhase("results");
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
    },
    onError: (e: any) => toast({ title: "Submit failed", description: e.message, variant: "destructive" }),
  });

  const handleTimeUp = useCallback(() => {
    if (exam) { setPhase("submitted"); submitMutation.mutate(answers); }
  }, [exam, answers]);

  const handleSubmit = () => {
    setPhase("submitted");
    submitMutation.mutate(answers);
  };

  const questions: Question[] = exam?.questions || [];
  const q = questions[currentQ];
  const answered = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answered / questions.length) * 100 : 0;
  const timerRed = timeLeft < 300;

  if (phase === "setup") return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mock Exam Generator</h1>
        <p className="text-muted-foreground mt-1">Simulate a real exam — 20 questions, 50-minute timer, automatic scoring</p>
      </div>
      <Card className="border-border bg-card rounded-2xl">
        <CardContent className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); generateMutation.mutate(); }} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-foreground">Module Name</Label>
              <Input placeholder="e.g. Calculus I, Computer Networks"
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value })}
                className="h-11 bg-input border-border text-foreground rounded-xl"
                data-testid="input-exam-module" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Topic / Focus Area</Label>
              <Input placeholder="e.g. Integration, OSI Model, Offer and Acceptance"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                className="h-11 bg-input border-border text-foreground rounded-xl"
                data-testid="input-exam-topic" required />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm text-muted-foreground">
              <div className="p-3 rounded-xl bg-secondary border border-border">
                <p className="font-bold text-foreground text-lg">20</p>
                <p>Questions</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary border border-border">
                <p className="font-bold text-foreground text-lg">50min</p>
                <p>Timer</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary border border-border">
                <p className="font-bold text-foreground text-lg">AI</p>
                <p>Marking</p>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              disabled={generateMutation.isPending} data-testid="button-generate-exam">
              {generateMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Generating Exam...</> : <><Sparkles className="w-4 h-4" />Start Mock Exam</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  if (phase === "submitted") return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-foreground font-semibold text-lg">Marking your exam...</p>
      <p className="text-muted-foreground text-sm">Calculating your score and identifying weak areas</p>
    </div>
  );

  if (phase === "results" && results) {
    const score = results.score ?? 0;
    const weakTopics: string[] = results.weakTopics || [];
    const scoreColor = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-primary" : "text-red-400";

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground">Exam Results</h1>

        <Card className="border-primary/30 bg-card rounded-2xl p-6 text-center">
          <p className="text-muted-foreground mb-1">Your Score</p>
          <p className={`text-6xl font-bold ${scoreColor}`}>{score}<span className="text-2xl">%</span></p>
          <p className="text-muted-foreground text-sm mt-2">{exam?.title}</p>
          <Progress value={score} className="mt-4 h-2" />
        </Card>

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Score", value: `${score}%`, color: scoreColor },
            { label: "Module", value: exam?.module, color: "text-foreground" },
            { label: "Weak Areas", value: weakTopics.length || "None", color: weakTopics.length ? "text-red-400" : "text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-4 rounded-2xl bg-card border border-border">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {weakTopics.length > 0 && (
          <Card className="border-red-500/20 bg-red-500/5 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <p className="font-bold text-foreground">Areas to Improve</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {weakTopics.map((t, i) => (
                  <Badge key={i} className="bg-red-500/15 text-red-400 border-red-500/20 border text-xs">{t}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Memo */}
        <div>
          <Button variant="outline" className="w-full border-border mb-3" onClick={() => setShowMemo(!showMemo)} data-testid="button-toggle-memo">
            <BookOpen className="w-4 h-4 mr-2" /> {showMemo ? "Hide" : "Show"} Answer Memo
          </Button>
          <AnimatePresence>
            {showMemo && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="space-y-3 protected-content">
                {questions.map((q, i) => {
                  const userAns = answers[q.id];
                  const correct = userAns === q.correctAnswer || q.type !== "mcq";
                  return (
                    <Card key={q.id} className={`border rounded-2xl ${q.type === "mcq" ? (correct ? "border-emerald-500/30" : "border-red-500/30") : "border-border"} bg-card`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2.5 mb-2">
                          {q.type === "mcq" ? (
                            correct
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          ) : <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                          <div>
                            <p className="text-sm font-semibold text-foreground">Q{i + 1}: {q.question}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              <span className="font-medium text-primary">Answer: </span>{q.correctAnswer}
                            </p>
                            {!correct && userAns && <p className="text-xs text-red-400 mt-0.5">Your answer: {userAns}</p>}
                            {(q.type === "mcq" || q.type === "truefalse") && q.explanation && (
                              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{q.explanation}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 border-border" onClick={() => { setPhase("setup"); setExam(null); setResults(null); }}>
            New Exam
          </Button>
          <Link href="/exam-history" className="flex-1">
            <Button className="w-full bg-primary text-primary-foreground">View History</Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  // Exam Phase
  return (
    <div className="space-y-6 max-w-2xl mx-auto select-none" onContextMenu={(e) => e.preventDefault()}>
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-background py-2 z-10 border-b border-border">
        <div>
          <p className="text-xs text-muted-foreground">{exam?.title}</p>
          <p className="text-sm font-semibold text-foreground">Q{currentQ + 1} of {questions.length}</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold ${timerRed ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse" : "bg-card border-border text-foreground"}`}>
          <Timer className="w-4 h-4" /> {formatTime(timeLeft)}
        </div>
      </div>

      <Progress value={(currentQ / questions.length) * 100} className="h-1.5" />
      <p className="text-xs text-muted-foreground">{answered} of {questions.length} answered</p>

      {/* Question */}
      <AnimatePresence mode="wait">
        {q && (
          <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="border-border bg-card rounded-2xl">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">{currentQ + 1}</span>
                  <div className="flex-1">
                    <div className="flex gap-2 mb-3">
                      <Badge className={`text-[10px] border ${q.type === "mcq" ? "bg-blue-500/15 text-blue-400 border-blue-500/20" : q.type === "short" ? "bg-purple-500/15 text-purple-400 border-purple-500/20" : "bg-orange-500/15 text-orange-400 border-orange-500/20"}`}>
                        {q.type === "mcq" ? "Multiple Choice" : q.type === "short" ? "Short Answer" : "Problem Solving"}
                      </Badge>
                      <Badge className="text-[10px] bg-card border border-border text-muted-foreground">{q.marks} mark{q.marks !== 1 ? "s" : ""}</Badge>
                    </div>
                    <p className="text-foreground font-medium leading-relaxed">{q.question}</p>
                  </div>
                </div>

                {/* MCQ Options */}
                {q.type === "mcq" && q.options && (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const selected = answers[q.id] === opt;
                      return (
                        <button key={oi} onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all text-sm ${selected ? "border-primary bg-primary/10 text-foreground font-medium" : "border-border bg-secondary hover:border-primary/40 text-foreground"}`}
                          data-testid={`option-${oi}`}>
                          <span className="font-bold text-primary mr-2">{String.fromCharCode(65 + oi)}.</span>{opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Short / Problem */}
                {(q.type === "short" || q.type === "problem") && (
                  <Textarea
                    placeholder={q.type === "problem" ? "Show your working and write your answer here..." : "Write your answer here..."}
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    rows={q.type === "problem" ? 5 : 3}
                    className="bg-input border-border text-foreground rounded-xl resize-none"
                    data-testid={`textarea-answer-${q.id}`} />
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" className="border-border" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>

        {currentQ < questions.length - 1 ? (
          <Button className="bg-primary text-primary-foreground" onClick={() => setCurrentQ(currentQ + 1)} data-testid="button-next-question">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button className="bg-primary text-primary-foreground font-bold gap-2" onClick={handleSubmit}
            disabled={submitMutation.isPending} data-testid="button-submit-exam">
            <Send className="w-4 h-4" /> Submit Exam
          </Button>
        )}
      </div>

      {/* Question dots */}
      <div className="flex flex-wrap gap-1.5 justify-center pt-2">
        {questions.map((_, i) => (
          <button key={i} onClick={() => setCurrentQ(i)}
            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${i === currentQ ? "bg-primary text-primary-foreground" : answers[questions[i]?.id] ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-secondary text-muted-foreground border border-border"}`}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
