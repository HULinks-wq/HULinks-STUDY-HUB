import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, CheckCircle2, Calendar, TrendingDown, BookOpen, Sparkles, History } from "lucide-react";
import type { Exam } from "@shared/schema";

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-primary";
  return "text-red-400";
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-muted/20";
  if (score >= 75) return "bg-emerald-500/10";
  if (score >= 50) return "bg-primary/10";
  return "bg-red-500/10";
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export function ExamHistory() {
  const { data: exams, isLoading } = useQuery<Exam[]>({ queryKey: ["/api/exams"] });

  const mocks = exams?.filter(e => e.type === "mock") ?? [];
  const predictions = exams?.filter(e => e.type === "prediction") ?? [];

  const avgScore = mocks.filter(e => e.score !== null).length > 0
    ? Math.round(mocks.filter(e => e.score !== null).reduce((s, e) => s + (e.score || 0), 0) / mocks.filter(e => e.score !== null).length)
    : null;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Exam History</h1>
          <p className="text-muted-foreground mt-1">Track your progress across all mock exams</p>
        </div>
        <div className="flex gap-2">
          <Link href="/exam-predictor">
            <Button variant="outline" size="sm" className="gap-2 border-border">
              <Sparkles className="w-4 h-4" /> Predictor
            </Button>
          </Link>
          <Link href="/mock-exam">
            <Button size="sm" className="gap-2 bg-primary text-primary-foreground" data-testid="button-new-exam">
              <BookOpen className="w-4 h-4" /> New Exam
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {mocks.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-card border border-border text-center">
            <p className="text-2xl font-bold text-foreground">{mocks.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Exams Taken</p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border text-center">
            <p className={`text-2xl font-bold ${avgScore !== null ? scoreColor(avgScore) : "text-muted-foreground"}`}>
              {avgScore !== null ? `${avgScore}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Average Score</p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border text-center">
            <p className="text-2xl font-bold text-primary">{predictions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Predictions</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-secondary animate-pulse" />)}
        </div>
      ) : exams?.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-border">
          <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-semibold mb-1">No exams yet</p>
          <p className="text-muted-foreground text-sm mb-5">Take a mock exam or run an exam prediction to get started</p>
          <div className="flex gap-3 justify-center">
            <Link href="/mock-exam">
              <Button className="bg-primary text-primary-foreground gap-2">
                <BookOpen className="w-4 h-4" /> Take Mock Exam
              </Button>
            </Link>
            <Link href="/exam-predictor">
              <Button variant="outline" className="border-border gap-2">
                <Sparkles className="w-4 h-4" /> Exam Predictor
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mock Exams */}
          {mocks.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Mock Exams</h2>
              <div className="space-y-2">
                {mocks.map((exam, i) => (
                  <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="border-border bg-card rounded-2xl hover:border-primary/30 transition-all" data-testid={`card-exam-${exam.id}`}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${scoreBg(exam.score)} ${scoreColor(exam.score)}`}>
                            {exam.score !== null ? `${exam.score}%` : "—"}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{exam.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{fmtDate(exam.completedAt?.toString())}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          {exam.score !== null && (
                            <Badge className={`text-[10px] border ${exam.score >= 75 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : exam.score >= 50 ? "bg-primary/15 text-primary border-primary/20" : "bg-red-500/15 text-red-400 border-red-500/20"}`}>
                              {exam.score >= 75 ? "Passed" : exam.score >= 50 ? "Average" : "Needs Work"}
                            </Badge>
                          )}
                          {exam.weakTopics && exam.weakTopics.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-red-400">
                              <TrendingDown className="w-3 h-3" /> {exam.weakTopics.length} weak area{exam.weakTopics.length !== 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Predictions */}
          {predictions.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 mt-6">Exam Predictions</h2>
              <div className="space-y-2">
                {predictions.map((exam, i) => (
                  <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="border-border bg-card rounded-2xl" data-testid={`card-prediction-${exam.id}`}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{exam.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {fmtDate(exam.createdAt?.toString())} ·
                            {" "}{(exam.predictionResult as any)?.likelyTopics?.length || 0} predicted topics
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
