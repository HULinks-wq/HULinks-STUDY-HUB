import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileUploadZone } from "@/components/FileUploadZone";
import {
  Loader2, Presentation, CheckCircle2, AlertTriangle,
  Lightbulb, BarChart3, Mic2, Users, ChevronRight, Star
} from "lucide-react";

type SlideAnalysis = {
  slideNumber: number;
  title: string;
  feedback: string;
  score: number;
};

type AnalysisResult = {
  overallScore: number;
  structure: string;
  clarity: string;
  engagement: string;
  talkingPoints: string[];
  improvements: string[];
  strengths: string[];
  slideAnalysis: SlideAnalysis[];
  summary: string;
};

const scoreColor = (s: number) =>
  s >= 80 ? "text-emerald-400" : s >= 60 ? "text-primary" : "text-red-400";
const scoreBg = (s: number) =>
  s >= 80 ? "bg-emerald-500/10 border-emerald-500/20" : s >= 60 ? "bg-primary/10 border-primary/20" : "bg-red-500/10 border-red-500/20";

export function PresentationAnalyzer() {
  const { toast } = useToast();
  const [form, setForm] = useState({ title: "", content: "" });
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/presentation/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json() as Promise<AnalysisResult>;
    },
    onSuccess: (data) => setResult(data),
    onError: (e: any) => toast({ title: "Analysis failed", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim() || form.content.trim().length < 30) {
      toast({ title: "Please enter your presentation content", variant: "destructive" }); return;
    }
    setResult(null);
    analyzeMutation.mutate();
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Presentation Analyzer</h1>
        <p className="text-muted-foreground mt-1">Paste your presentation content and get AI feedback on structure, clarity, and delivery</p>
      </div>

      <Card className="border-border bg-card rounded-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FileUploadZone
              compact
              hint="Upload your slide notes, script, or outline — PDF, text, Word, images supported"
              onTextExtracted={(text) => setForm(f => ({ ...f, content: f.content ? f.content + "\n\n" + text : text }))}
            />
            <div className="space-y-1.5">
              <Label className="text-foreground">Presentation Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                placeholder="e.g. The Effects of Climate Change on Marine Ecosystems"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-11 bg-input border-border text-foreground rounded-xl"
                data-testid="input-presentation-title"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Presentation Content <span className="text-red-400">*</span></Label>
              <Textarea
                placeholder={`Paste your slide notes, script, or outline here.\n\nExample:\nSlide 1: Introduction\n- Define climate change\n- Why it matters\n\nSlide 2: Marine impacts\n- Coral bleaching\n- Rising ocean temperatures`}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={10}
                className="bg-input border-border text-foreground rounded-xl resize-none font-mono text-sm"
                data-testid="textarea-presentation-content"
                required
              />
              <p className="text-xs text-muted-foreground">{form.content.length} characters · Paste slide notes, speaker script, or outline</p>
            </div>
            <Button
              type="submit"
              className="w-full h-11 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              disabled={analyzeMutation.isPending}
              data-testid="button-analyze-presentation"
            >
              {analyzeMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing Presentation...</>
                : <><Presentation className="w-4 h-4" />Analyze Presentation</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      <AnimatePresence>
        {analyzeMutation.isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-secondary animate-pulse" />)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 protected-content">
            {/* Overall score */}
            <Card className={`border rounded-2xl ${scoreBg(result.overallScore)}`}>
              <CardContent className="p-5 flex items-center gap-5">
                <div className="text-center shrink-0">
                  <p className={`text-5xl font-bold ${scoreColor(result.overallScore)}`}>{result.overallScore}</p>
                  <p className="text-xs text-muted-foreground mt-1">out of 100</p>
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">
                    {result.overallScore >= 80 ? "Strong Presentation" : result.overallScore >= 60 ? "Good — Needs Polishing" : "Needs Significant Work"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{result.summary}</p>
                </div>
              </CardContent>
            </Card>

            {/* Three pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Structure", icon: BarChart3, text: result.structure },
                { label: "Clarity", icon: Lightbulb, text: result.clarity },
                { label: "Engagement", icon: Users, text: result.engagement },
              ].map(({ label, icon: Icon, text }) => (
                <Card key={label} className="border-border bg-card rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <p className="font-bold text-sm text-foreground">{label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Strengths + Improvements side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-emerald-500/20 bg-emerald-500/5 rounded-2xl">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-2">
                  {result.strengths?.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Star className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground leading-relaxed">{s}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-primary/5 rounded-2xl">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-primary" /> Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-2">
                  {result.improvements?.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground leading-relaxed">{s}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Talking points */}
            {result.talkingPoints?.length > 0 && (
              <Card className="border-border bg-card rounded-2xl">
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mic2 className="w-4 h-4 text-primary" /> Suggested Talking Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-2">
                  {result.talkingPoints.map((tp, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-secondary border border-border">
                      <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <p className="text-sm text-foreground">{tp}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Per-slide analysis */}
            {result.slideAnalysis?.length > 0 && (
              <Card className="border-border bg-card rounded-2xl">
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Presentation className="w-4 h-4 text-primary" /> Slide-by-Slide Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-3">
                  {result.slideAnalysis.map((slide) => (
                    <div key={slide.slideNumber} className="p-3 rounded-xl border border-border bg-secondary">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-semibold text-foreground">Slide {slide.slideNumber}: {slide.title}</p>
                        <Badge className={`text-[10px] border ${scoreBg(slide.score)} ${scoreColor(slide.score)}`}>{slide.score}/100</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{slide.feedback}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Button variant="outline" className="w-full border-border" onClick={() => { setResult(null); setForm({ title: "", content: "" }); }}>
              Analyze Another Presentation
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
