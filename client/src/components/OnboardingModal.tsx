import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import {
  BrainCircuit, FileText, Calculator, BookOpen,
  Upload, Mic, BarChart3, ChevronRight, ChevronLeft, X
} from "lucide-react";

const STORAGE_KEY = "nmu-hub-onboarded-v1";

const STEPS = [
  {
    title: "Welcome to NMU HUB | HUlinks",
    subtitle: "Your AI-powered study companion for Nelson Mandela University",
    icon: BrainCircuit,
    iconColor: "text-primary",
    iconBg: "bg-primary/10 border border-primary/20",
    content: (
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          NMU HUB gives you AI tools built specifically for NMU students — generate
          exam papers, predict questions, get assignment feedback, and more.
          Everything in one place, no Replit account needed.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
          🎓 Exclusive to Nelson Mandela University Students
        </div>
      </div>
    ),
  },
  {
    title: "AI Quiz & Exam Generator",
    subtitle: "Generate up to 100 unique questions per session",
    icon: BrainCircuit,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50 border border-blue-100",
    content: (
      <div className="space-y-2.5">
        {[
          { label: "Multiple Choice", desc: "4-option questions with one correct answer" },
          { label: "True / False", desc: "Nuanced statements that test deep understanding" },
          { label: "Define Concept", desc: "Define key terms with real-world applications" },
          { label: "Scenario-Based", desc: "Real-world South African context cases" },
        ].map(({ label, desc }) => (
          <div key={label} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-[11px] text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "More AI Tools",
    subtitle: "Everything you need to pass your exams",
    icon: BarChart3,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50 border border-emerald-100",
    content: (
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { icon: BarChart3, label: "Exam Predictor", desc: "AI predicts likely exam questions", color: "text-purple-600", bg: "bg-purple-50" },
          { icon: FileText,  label: "Mock Exams",     desc: "Full timed mock exam papers",       color: "text-blue-600",   bg: "bg-blue-50" },
          { icon: BookOpen,  label: "Assignment Help", desc: "Grammar, structure & referencing", color: "text-amber-600",  bg: "bg-amber-50" },
          { icon: Calculator,label: "Calculator",     desc: "Step-by-step maths & physics",     color: "text-cyan-600",   bg: "bg-cyan-50" },
          { icon: Upload,    label: "Study Uploads",  desc: "Upload notes to personalise AI",   color: "text-emerald-600",bg: "bg-emerald-50" },
          { icon: Mic,       label: "Voice Explainer",desc: "Hear complex topics explained",    color: "text-rose-600",   bg: "bg-rose-50" },
        ].map(({ icon: Icon, label, desc, color, bg }) => (
          <div key={label} className="flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-muted/20">
            <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
            <p className="text-[10px] text-muted-foreground leading-snug">{desc}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Quick Start Guide",
    subtitle: "Get the most out of NMU HUB in 3 steps",
    icon: ChevronRight,
    iconColor: "text-primary",
    iconBg: "bg-primary/10 border border-primary/20",
    content: (
      <div className="space-y-3">
        {[
          {
            step: "1",
            title: "Upload Your Study Notes",
            desc: 'Go to "Study Uploads" and upload your lecture notes or textbook extracts (PDF or TXT). The AI will use them to generate topic-specific questions.',
            color: "bg-primary text-primary-foreground",
          },
          {
            step: "2",
            title: "Generate a Quiz or Exam",
            desc: 'Click "Exams & Quizzes" → "Generate New". Select your module, choose question types, set the number of questions (up to 100), and click Generate.',
            color: "bg-blue-600 text-white",
          },
          {
            step: "3",
            title: "Review & Predict",
            desc: 'After practising, use "Exam Predictor" to get AI-predicted questions for your upcoming exam based on your module and past trends.',
            color: "bg-emerald-600 text-white",
          },
        ].map(({ step, title, desc, color }) => (
          <div key={step} className="flex gap-3 items-start">
            <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>
              {step}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 border-border">
        <VisuallyHidden><DialogTitle>NMU HUB Welcome Guide</DialogTitle></VisuallyHidden>
        <VisuallyHidden><DialogDescription>A quick walkthrough of all NMU HUB features</DialogDescription></VisuallyHidden>
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${current.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${current.iconColor}`} />
              </div>
              <div>
                <h2 className="font-bold text-base text-foreground leading-tight">{current.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{current.subtitle}</p>
              </div>
            </div>
            <button onClick={close} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0" data-testid="button-close-onboarding">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {current.content}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)} className="rounded-full gap-1 px-4" data-testid="button-onboarding-prev">
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep(s => s + 1)} className="rounded-full gap-1 px-5" data-testid="button-onboarding-next">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={close} className="rounded-full px-5" data-testid="button-onboarding-done">
                Let's Go!
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
