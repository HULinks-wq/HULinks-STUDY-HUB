import { useParams, Link } from "wouter";
import { useQuiz } from "@/hooks/use-quizzes";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Clock, Trophy, BookOpen, MessageSquare } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

const OPEN_TYPES = new Set(["define", "scenario"]);

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  mcq:         { label: "Multiple Choice",  color: "bg-blue-50 text-blue-700 border-blue-100" },
  truefalse:   { label: "True / False",     color: "bg-violet-50 text-violet-700 border-violet-100" },
  define:      { label: "Define Concept",   color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  scenario:    { label: "Scenario-Based",   color: "bg-orange-50 text-orange-700 border-orange-100" },
};

export function QuizSession() {
  const { id } = useParams<{ id: string }>();
  const { data: quiz, isLoading } = useQuiz(parseInt(id));
  const { user } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showMemo, setShowMemo] = useState(false);

  useEffect(() => {
    if (quiz?.isTest && quiz.timerSeconds && !isSubmitted) {
      setTimeLeft(quiz.timerSeconds);
    }
  }, [quiz, isSubmitted]);

  useEffect(() => {
    if (timeLeft === null || isSubmitted) return;
    if (timeLeft <= 0) { setIsSubmitted(true); return; }
    const t = setInterval(() => setTimeLeft(p => (p || 1) - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, isSubmitted]);

  if (isLoading) return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!quiz) return <div className="text-center py-20 text-muted-foreground">Quiz not found</div>;

  const questions = (quiz.questions as any[]) || [];
  const currentQ = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const progress = ((currentIdx + 1) / questions.length) * 100;

  const isOpenEnded = (q: any) => OPEN_TYPES.has(q?.type) || (!q?.options && q?.type !== "truefalse");

  const calculateScore = () => {
    let correct = 0;
    let scorable = 0;
    questions.forEach((q: any, i: number) => {
      if (!isOpenEnded(q)) {
        scorable++;
        if (answers[i] === q.correctAnswer) correct++;
      }
    });
    const total = questions.length;
    const pct = scorable > 0 ? Math.round((correct / scorable) * 100) : 0;
    return { correct, scorable, total, pct };
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (isSubmitted) {
    const { correct, scorable, total, pct } = calculateScore();
    const passed = pct >= 50;
    const canSeeExplanations = !quiz.isTest || user?.tier === "premium" || user?.hasActiveAccess;
    const openCount = questions.filter((q: any) => isOpenEnded(q)).length;

    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto pt-6">
        <div className={`rounded-3xl p-8 text-center mb-8 ${passed ? "bg-emerald-50 border border-emerald-100" : "bg-red-50 border border-red-100"}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
            <Trophy className="w-8 h-8" />
          </div>
          {scorable > 0 ? (
            <>
              <h1 className="text-3xl font-bold mb-1 text-zinc-900">{pct}%</h1>
              <p className="text-lg text-zinc-600">{correct} of {scorable} marked questions correct · {passed ? "Well done!" : "Keep practising!"}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-1 text-zinc-900">Submitted!</h1>
              <p className="text-base text-zinc-600">Compare your answers to the model answers below.</p>
            </>
          )}
          {openCount > 0 && (
            <p className="text-sm text-zinc-500 mt-2">{openCount} open-ended question{openCount > 1 ? "s" : ""} — self-assess using the model answers</p>
          )}
          {quiz.isTest && (
            <Button variant="outline" className="mt-4 rounded-full" onClick={() => setShowMemo(!showMemo)} data-testid="button-toggle-memo">
              {showMemo ? "Hide" : "View"} Answer Memo
            </Button>
          )}
        </div>

        <div className="space-y-4 mb-8">
          {questions.map((q: any, i: number) => {
            const open = isOpenEnded(q);
            const isCorrect = !open && answers[i] === q.correctAnswer;
            const typeMeta = TYPE_LABELS[q.type] ?? { label: q.type ?? "Question", color: "bg-zinc-50 text-zinc-600 border-zinc-100" };

            return (
              <Card
                key={i}
                className={`p-5 rounded-2xl ${
                  open
                    ? "border-amber-100 bg-amber-50/20"
                    : isCorrect
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-red-200 bg-red-50/30"
                }`}
                data-testid={`card-answer-${i}`}
              >
                <div className="flex gap-3">
                  <div className="mt-0.5 shrink-0">
                    {open
                      ? <BookOpen className="w-5 h-5 text-amber-500" />
                      : isCorrect
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      : <XCircle className="w-5 h-5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeMeta.color}`}>
                        {typeMeta.label}
                      </span>
                      {q.marks && (
                        <span className="text-[10px] text-zinc-400">[{q.marks} mark{q.marks > 1 ? "s" : ""}]</span>
                      )}
                    </div>
                    <p className="font-medium text-sm mb-2 text-foreground">{i + 1}. {q.question}</p>

                    {open ? (
                      <>
                        {answers[i] && (
                          <div className="mb-2 p-3 bg-white/70 rounded-xl border border-zinc-100">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1">Your Working</span>
                            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{answers[i]}</p>
                          </div>
                        )}
                        {(showMemo || !quiz.isTest) && q.correctAnswer && (
                          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide block mb-1">Answer</span>
                            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{q.correctAnswer}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className={`text-sm ${isCorrect ? "text-emerald-700 font-medium" : "text-red-600 line-through"}`}>
                          Your answer: {answers[i] || "Skipped"}
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-emerald-700 font-medium">Correct: {q.correctAnswer}</p>
                        )}
                      </>
                    )}

                    {(canSeeExplanations || showMemo) && q.explanation && (q.type === "mcq" || q.type === "truefalse") && (
                      <div className="mt-3 p-3 bg-white/60 rounded-xl border border-zinc-100 text-xs text-zinc-600 leading-relaxed">
                        <span className="font-bold text-zinc-400 uppercase tracking-wide text-[10px] block mb-1">Why this answer is correct</span>
                        {q.explanation}
                      </div>
                    )}
                    {!canSeeExplanations && !showMemo && q.explanation && !open && (q.type === "mcq" || q.type === "truefalse") && (
                      <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between gap-3">
                        <p className="text-xs text-amber-800">Upgrade to Premium for explanations on timed tests.</p>
                        <Link href="/premium">
                          <Button size="sm" variant="link" className="text-amber-900 font-bold p-0 h-auto text-xs">Upgrade</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Link href="/quizzes">
          <Button size="lg" className="w-full rounded-2xl" data-testid="button-back-quizzes">Back to Exams & Quizzes</Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <Link href="/quizzes">
          <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground gap-1.5" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        {timeLeft !== null && (
          <div className={`flex items-center font-mono font-bold px-4 py-2 rounded-full border text-sm ${timeLeft < 60 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-white text-zinc-700 border-zinc-200"}`} data-testid="text-timer">
            <Clock className="w-4 h-4 mr-2" /> {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-baseline mb-2">
          <h1 className="text-xl font-bold text-foreground line-clamp-1">{quiz.title}</h1>
          <span className="text-sm text-muted-foreground shrink-0 ml-4">{currentIdx + 1} / {questions.length}</span>
        </div>
        <Progress value={progress} className="h-1.5 rounded-full" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.18 }}
        >
          <Card className="p-6 sm:p-8 rounded-3xl border-zinc-200 shadow-sm mb-6 bg-white">
            {currentQ?.type && TYPE_LABELS[currentQ.type] && (
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${TYPE_LABELS[currentQ.type].color}`}>
                  {TYPE_LABELS[currentQ.type].label}
                </span>
                {currentQ.marks && (
                  <span className="text-xs text-zinc-400">{currentQ.marks} mark{currentQ.marks > 1 ? "s" : ""}</span>
                )}
                {OPEN_TYPES.has(currentQ.type) && (
                  <span className="ml-auto text-xs text-amber-600 font-medium flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Self-assessed
                  </span>
                )}
              </div>
            )}

            <h2 className="text-base font-medium leading-relaxed mb-6 text-zinc-900 dark:text-zinc-900">{currentQ?.question}</h2>

            {currentQ?.options ? (
              <RadioGroup
                value={answers[currentIdx] || ""}
                onValueChange={(val) => setAnswers(p => ({ ...p, [currentIdx]: val }))}
                className="space-y-3"
              >
                {currentQ.options.map((opt: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border border-zinc-100 p-4 rounded-xl hover:bg-zinc-50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 cursor-pointer"
                    data-testid={`option-${i}`}
                  >
                    <RadioGroupItem value={opt} id={`opt-${i}`} />
                    <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer text-zinc-700">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <textarea
                className="w-full min-h-[180px] p-4 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y text-sm leading-relaxed text-zinc-900 bg-white placeholder:text-zinc-400"
                placeholder=""
                value={answers[currentIdx] || ""}
                onChange={(e) => setAnswers(p => ({ ...p, [currentIdx]: e.target.value }))}
                data-testid="input-short-answer"
              />
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentIdx(p => Math.max(0, p - 1))} disabled={currentIdx === 0} className="rounded-full px-6" data-testid="button-previous">
          Previous
        </Button>
        {isLast ? (
          <Button onClick={() => setIsSubmitted(true)} className="rounded-full px-8" data-testid="button-submit">
            Submit
          </Button>
        ) : (
          <Button onClick={() => setCurrentIdx(p => p + 1)} className="rounded-full px-8" data-testid="button-next">
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
