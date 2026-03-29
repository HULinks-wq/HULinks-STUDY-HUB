import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileUploadZone } from "@/components/FileUploadZone";
import {
  Loader2, Sparkles, BookOpen, Target, ListOrdered, Lightbulb,
  CheckCircle, AlertTriangle, TrendingUp, ChevronRight, History
} from "lucide-react";
import { Link } from "wouter";

type Priority = { topic: string; importance: "High" | "Medium" | "Low"; reason: string };
type Prediction = {
  likelyTopics: string[];
  keyConcepts: string[];
  studyPriorities: Priority[];
  questionPatterns: string[];
  summary: string;
};

const importanceBadge: Record<string, string> = {
  High: "bg-red-500/15 text-red-400 border-red-500/20",
  Medium: "bg-yellow-500/15 text-primary border-primary/20",
  Low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

export function ExamPredictor() {
  const { toast } = useToast();
  const [form, setForm] = useState({ module: "", topics: "", pastQuestions: "" });
  const [result, setResult] = useState<{ id: number; predictionResult: Prediction } | null>(null);

  const predictMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/exams/predict", form);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (data) => setResult(data),
    onError: (e: any) => toast({ title: "Prediction failed", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.module.trim() || !form.topics.trim()) {
      toast({ title: "Fill in module and topics", variant: "destructive" }); return;
    }
    setResult(null);
    predictMutation.mutate();
  };

  const p = result?.predictionResult;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Exam Predictor</h1>
          <p className="text-muted-foreground mt-1">AI identifies the most likely exam topics for your module</p>
        </div>
        <Link href="/exam-history">
          <Button variant="outline" size="sm" className="gap-2 border-border" data-testid="button-view-history">
            <History className="w-4 h-4" /> History
          </Button>
        </Link>
      </div>

      {/* Form */}
      <Card className="border-border bg-card rounded-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FileUploadZone
              compact
              hint="Upload study notes, past papers, textbook chapters — any file type"
              onTextExtracted={(text) => setForm(f => ({
                ...f,
                topics: f.topics ? f.topics + "\n\n" + text : text,
              }))}
            />
            <div className="space-y-1.5">
              <Label className="text-foreground">Module Name</Label>
              <Input placeholder="e.g. Calculus I, Computer Networks, Business Law"
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value })}
                className="h-11 bg-input border-border text-foreground rounded-xl"
                data-testid="input-predictor-module" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Topics / Study Material</Label>
              <Textarea
                placeholder="Paste your study notes, textbook chapters, or list the topics you have studied..."
                value={form.topics}
                onChange={(e) => setForm({ ...form, topics: e.target.value })}
                rows={4}
                className="bg-input border-border text-foreground rounded-xl resize-none"
                data-testid="input-predictor-topics" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Past Exam Questions <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                placeholder="Paste previous exam questions to improve predictions..."
                value={form.pastQuestions}
                onChange={(e) => setForm({ ...form, pastQuestions: e.target.value })}
                rows={3}
                className="bg-input border-border text-foreground rounded-xl resize-none"
                data-testid="input-predictor-past" />
            </div>
            <Button type="submit" className="w-full h-11 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              disabled={predictMutation.isPending} data-testid="button-predict">
              {predictMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</> : <><Sparkles className="w-4 h-4" />Generate Exam Prediction</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      <AnimatePresence>
        {predictMutation.isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-secondary animate-pulse" />)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {p && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 protected-content">
            {/* Summary */}
            <Card className="border-primary/30 bg-primary/5 rounded-2xl">
              <CardContent className="p-5 flex gap-3">
                <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed">{p.summary}</p>
              </CardContent>
            </Card>

            {/* Likely Topics */}
            <Card className="border-border bg-card rounded-2xl">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Most Likely Exam Topics</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {p.likelyTopics?.map((topic, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary border border-border">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-sm text-foreground">{topic}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Study Priorities */}
            <Card className="border-border bg-card rounded-2xl">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Study Priorities</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-2">
                {p.studyPriorities?.map((sp, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-secondary border border-border">
                    <Badge className={`text-[10px] shrink-0 mt-0.5 border ${importanceBadge[sp.importance] || importanceBadge.Medium}`}>{sp.importance}</Badge>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{sp.topic}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{sp.reason}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Key Concepts */}
            <Card className="border-border bg-card rounded-2xl">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />Key Concepts to Master</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="flex flex-wrap gap-2">
                  {p.keyConcepts?.map((concept, i) => (
                    <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-sm text-foreground">
                      <CheckCircle className="w-3 h-3 text-primary" /> {concept}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Question Patterns */}
            <Card className="border-border bg-card rounded-2xl">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-base flex items-center gap-2"><ListOrdered className="w-4 h-4 text-primary" />Predicted Question Patterns</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-2">
                {p.questionPatterns?.map((pattern, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{pattern}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Link href="/mock-exam">
                <Button className="bg-primary text-primary-foreground gap-2 font-semibold" data-testid="button-take-mock-exam">
                  <Sparkles className="w-4 h-4" /> Practice with a Mock Exam
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
