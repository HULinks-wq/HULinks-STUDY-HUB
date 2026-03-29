import { useState, type ElementType } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useQuizzes, useGenerateQuiz } from "@/hooks/use-quizzes";
import { useCourses } from "@/hooks/use-courses";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrainCircuit, Loader2, PlayCircle, Clock, CheckSquare, ToggleLeft, BookOpen, AlignLeft, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type Mode = "quiz" | "test" | "exam";
type QType = "mcq" | "truefalse" | "define" | "scenario";

const QUESTION_TYPES: { key: QType; label: string; desc: string; icon: ElementType }[] = [
  { key: "mcq",       label: "Multiple Choice",  desc: "4 options, one correct answer",          icon: CheckSquare },
  { key: "truefalse", label: "True / False",     desc: "Nuanced true or false statements",       icon: ToggleLeft },
  { key: "define",    label: "Define Concept",   desc: "Define and apply key terms",             icon: BookOpen },
  { key: "scenario",  label: "Scenario-Based",   desc: "Real-world case questions with context", icon: AlignLeft },
];

const ALL_TYPES: QType[] = QUESTION_TYPES.map(t => t.key);

export function Quizzes() {
  const { data: quizzes, isLoading } = useQuizzes();
  const { data: courses } = useCourses();
  const generateQuiz = useGenerateQuiz();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [courseId, setCourseId] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<Mode>("quiz");
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedTypes, setSelectedTypes] = useState<QType[]>(ALL_TYPES);
  const [enableTimer, setEnableTimer] = useState(false);

  const modeConfig: Record<Mode, { label: string; desc: string; isTest: boolean }> = {
    quiz:  { label: "Quick Quiz",       desc: "Practice with instant marking",        isTest: false },
    test:  { label: "Timed Test",       desc: "Structured test with optional timer",  isTest: true  },
    exam:  { label: "Full Exam Paper",  desc: "Exam-style with answer memo",          isTest: true  },
  };

  const timerMinutes = Math.round((questionCount / 50) * 60);

  const toggleType = (key: QType) => {
    setSelectedTypes(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleAll = () => {
    setSelectedTypes(prev => prev.length === ALL_TYPES.length ? [] : ALL_TYPES);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) {
      toast({ title: "Please select a course", variant: "destructive" });
      return;
    }
    if (selectedTypes.length === 0) {
      toast({ title: "Select at least one question type", variant: "destructive" });
      return;
    }
    const cfg = modeConfig[mode];
    generateQuiz.mutate(
      {
        courseId: parseInt(courseId),
        topic,
        isTest: cfg.isTest,
        questionCount,
        questionTypes: selectedTypes,
        enableTimer: cfg.isTest ? enableTimer : false,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setTopic("");
          toast({ title: `${cfg.label} generated!`, description: "Your AI content is ready." });
        },
        onError: (err) => {
          toast({ title: "Generation failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const filtered = quizzes ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Exams & Quizzes</h1>
          <p className="text-muted-foreground mt-1">Generate AI practice material for any module or topic.</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full px-6 gap-2 shadow-md" data-testid="button-generate-new">
              <BrainCircuit className="w-4 h-4" /> Generate New
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate AI Content</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGenerate} className="space-y-5 pt-2">

              {/* Mode selector */}
              <div className="space-y-2">
                <Label>Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(modeConfig) as Mode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        mode === m
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-zinc-200 hover:border-zinc-300 bg-white"
                      }`}
                      data-testid={`button-mode-${m}`}
                    >
                      <p className="text-xs font-bold text-zinc-900">{modeConfig[m].label}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{modeConfig[m].desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Course selector */}
              <div className="space-y-1.5">
                <Label>Module / Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger className="h-11" data-testid="select-course">
                    <SelectValue placeholder="Select a course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Topic */}
              <div className="space-y-1.5">
                <Label>Topic or Content Area</Label>
                <Input
                  placeholder="e.g. Consumer Decision-Making, Derivatives, Newton's Laws..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="h-11"
                  data-testid="input-topic"
                  required
                />
              </div>

              {/* Question type checkboxes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Question Types <span className="text-zinc-400 font-normal">({selectedTypes.length} selected)</span></Label>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-[11px] text-primary font-semibold hover:underline"
                    data-testid="button-toggle-all-types"
                  >
                    {selectedTypes.length === 0 || selectedTypes.length < ALL_TYPES.length ? "Select All" : "Deselect All"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {QUESTION_TYPES.map(({ key, label, desc, icon: Icon }) => {
                    const checked = selectedTypes.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleType(key)}
                        className={`p-3 rounded-xl border text-left transition-all flex gap-2.5 items-start ${
                          checked
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-zinc-200 hover:border-zinc-300 bg-white"
                        }`}
                        data-testid={`button-qtype-${key}`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-colors ${
                          checked ? "bg-primary border-primary" : "border-zinc-300 bg-white"
                        }`}>
                          {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 leading-tight">{label}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedTypes.length === 0 && (
                  <p className="text-xs text-red-500">Select at least one question type.</p>
                )}
              </div>

              {/* Question count */}
              <div className="space-y-2">
                <Label>
                  Number of Questions:{" "}
                  <span className="text-primary font-bold">{questionCount}</span>
                </Label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="w-full accent-primary"
                  data-testid="slider-questions"
                />
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>1</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>

              {/* Timer toggle (only for test/exam) */}
              {modeConfig[mode].isTest && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 bg-zinc-50">
                  <div>
                    <p className="text-sm font-medium text-zinc-800">Enable Timer</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {questionCount} questions → {timerMinutes < 60
                        ? `${timerMinutes} min`
                        : `${Math.floor(timerMinutes / 60)}h${timerMinutes % 60 > 0 ? ` ${timerMinutes % 60}min` : ""}`}
                    </p>
                  </div>
                  <Switch
                    checked={enableTimer}
                    onCheckedChange={setEnableTimer}
                    data-testid="switch-timer"
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11"
                disabled={generateQuiz.isPending || selectedTypes.length === 0}
                data-testid="button-generate-submit"
              >
                {generateQuiz.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating with AI...</>
                  : <><BrainCircuit className="w-4 h-4 mr-2" />Generate {modeConfig[mode].label}</>}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-36 rounded-2xl bg-zinc-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed bg-white">
          <BrainCircuit className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1 text-zinc-800">Nothing generated yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-5">
            Click "Generate New" to create a quiz, test, or full exam paper using AI.
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <BrainCircuit className="w-4 h-4 mr-2" /> Generate Now
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(quiz => (
            <Card key={quiz.id} className="p-5 rounded-3xl border-zinc-100 flex flex-col hover:border-zinc-200 hover:shadow-sm transition-all" data-testid={`card-quiz-${quiz.id}`}>
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${quiz.isTest ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                  {quiz.isTest ? "Exam / Test" : "Practice Quiz"}
                </span>
                {quiz.timerSeconds && (
                  <span className="flex items-center text-xs text-muted-foreground gap-1">
                    <Clock className="w-3 h-3" /> {Math.round(quiz.timerSeconds / 60)} min
                  </span>
                )}
              </div>
              <h3 className="font-bold text-base text-foreground mb-1 line-clamp-2">{quiz.title}</h3>
              <p className="text-sm text-muted-foreground mb-6">{quiz.questions?.length || 0} Questions</p>

              <Link href={`/quizzes/${quiz.id}`} className="mt-auto">
                <Button variant={quiz.isTest ? "default" : "secondary"} className="w-full rounded-xl gap-2" data-testid={`button-start-${quiz.id}`}>
                  <PlayCircle className="w-4 h-4" />
                  {quiz.isTest ? "Start Exam" : "Start Practice"}
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
