import { motion } from "framer-motion";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCourses, useCreateCourse } from "@/hooks/use-courses";
import { useQuizzes } from "@/hooks/use-quizzes";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, FileText, Calculator, Plus, ArrowRight, Loader2,
  BrainCircuit, Clock, PlayCircle, History, Crown, Sparkles, Timer, Upload,
  Presentation, Volume2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: quizzes } = useQuizzes();
  const createCourse = useCreateCourse();
  const [newCourseName, setNewCourseName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const isPremium = user?.tier === "premium" || (user as any)?.isPremium;
  const trialActive = (user as any)?.trialActive;
  const trialDaysLeft = (user as any)?.trialDaysLeft ?? 0;
  const hasAccess = (user as any)?.hasActiveAccess;

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    createCourse.mutate({ name: newCourseName, modules: [] }, {
      onSuccess: () => {
        setDialogOpen(false);
        setNewCourseName("");
        toast({ title: "Course added" });
      }
    });
  };

  const recentQuizzes = quizzes?.slice(0, 3) ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">Welcome back 👋</p>
          <h1 className="text-3xl font-bold text-foreground">
            {user?.name?.split(" ")[0] || "Student"}
          </h1>
          {user?.course && (
            <p className="text-sm text-muted-foreground mt-1">{user.course} · #{user.studentNumber}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {trialActive && (
            <div className="px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-center" data-testid="badge-trial">
              <p className="text-xs font-bold text-primary">Free Trial</p>
              <p className="text-[10px] text-muted-foreground">{trialDaysLeft}d remaining</p>
            </div>
          )}
          {isPremium ? (
            <Badge className="gap-1 rounded-full px-3 py-1 bg-primary text-primary-foreground">
              <Crown className="w-3 h-3" /> Premium
            </Badge>
          ) : !trialActive ? (
            <Link href="/premium">
              <Button size="sm" className="rounded-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-upgrade">
                <Sparkles className="w-3.5 h-3.5" /> Upgrade
              </Button>
            </Link>
          ) : null}
        </div>
      </header>

      {!hasAccess && !trialActive && (
        <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div>
            <p className="font-bold text-foreground">Your free trial has ended</p>
            <p className="text-sm text-muted-foreground mt-0.5">Upgrade to Premium to continue generating quizzes, exams, and getting AI feedback.</p>
          </div>
          <Link href="/premium">
            <Button className="shrink-0 bg-primary text-primary-foreground">Upgrade Now — R29/mo</Button>
          </Link>
        </div>
      )}

      {/* Study Tools */}
      <section>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Study Tools</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <ToolCard title="AI Quiz Generator" desc="5–10 quick questions" icon={BookOpen} href="/quizzes" accent="blue" />
          <ToolCard title="AI Test Generator" desc="10–15 Q with timer" icon={Timer} href="/quizzes" accent="orange" />
          <ToolCard title="AI Exam Generator" desc="20 Q + full memo" icon={BrainCircuit} href="/quizzes" accent="red" />
          <ToolCard title="Exam Predictor" desc="AI predicts likely topics" icon={Sparkles} href="/exam-predictor" accent="yellow" />
          <ToolCard title="Mock Exam" desc="Full 90-min simulation" icon={Timer} href="/mock-exam" accent="purple" />
          <ToolCard title="Assignment Assistant" desc="AI structure feedback" icon={FileText} href="/assignments" accent="green" />
          <ToolCard title="Step-by-Step Calculator" desc="Full solution breakdown" icon={Calculator} href="/calculator" accent="purple" />
          <ToolCard title="My Exam History" desc="View scores & weak topics" icon={History} href="/exam-history" accent="blue" />
          <ToolCard title="Upload Study Notes" desc="Turn notes into quizzes" icon={Upload} href="/study-uploads" accent="green" />
          <ToolCard title="Presentation Analyzer" desc="AI scores your slides & script" icon={Presentation} href="/presentation-analyzer" accent="orange" />
          <ToolCard title="Voice Explainer" desc="Audio + examples from your notes" icon={Volume2} href="/voice-explainer" accent="blue" />
        </div>
      </section>

      {/* Recent Activity */}
      {recentQuizzes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recent Activity</h2>
            <Link href="/quizzes">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {recentQuizzes.map(quiz => (
              <Card key={quiz.id} className="p-4 rounded-2xl border-border flex items-center justify-between gap-4 bg-card" data-testid={`card-recent-${quiz.id}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${quiz.isTest ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
                    {quiz.isTest ? <Clock className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground line-clamp-1">{quiz.title}</p>
                    <p className="text-xs text-muted-foreground">{quiz.questions?.length || 0} questions</p>
                  </div>
                </div>
                <Link href={`/quizzes/${quiz.id}`}>
                  <Button size="sm" variant="ghost" className="rounded-xl shrink-0 text-primary gap-1.5">
                    <PlayCircle className="w-3.5 h-3.5" /> Start
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* My Courses */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">My Modules</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full gap-1.5 border-border" data-testid="button-add-course">
                <Plus className="w-3.5 h-3.5" /> Add Module
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[380px] bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add New Module</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCourse} className="space-y-4 pt-2">
                <Input
                  placeholder="e.g. Intro to Computer Science"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="h-11 bg-input border-border"
                  data-testid="input-course-name"
                  autoFocus
                />
                <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={createCourse.isPending}>
                  {createCourse.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Module
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {coursesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-secondary animate-pulse" />)}
          </div>
        ) : courses?.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border-2 border-dashed border-border bg-card/50">
            <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No modules yet — add one to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {courses?.map(course => (
              <Card key={course.id} className="p-4 rounded-2xl border-border bg-card group hover:border-primary/30 cursor-pointer transition-all" data-testid={`card-course-${course.id}`}>
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center mb-3">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">{course.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{course.modules?.length || 0} topics</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
}

const ACCENT_MAP: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20",
  orange: "bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20",
  red: "bg-red-500/10 text-red-400 group-hover:bg-red-500/20",
  green: "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20",
  purple: "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20",
  yellow: "bg-primary/10 text-primary group-hover:bg-primary/20",
};

function ToolCard({ title, desc, icon: Icon, href, accent }: { title: string; desc: string; icon: any; href: string; accent: string }) {
  return (
    <Link href={href}>
      <Card className="p-4 rounded-2xl border-border bg-card hover:border-primary/30 hover:shadow-lg cursor-pointer h-full transition-all group">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${ACCENT_MAP[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="font-bold text-sm text-foreground mb-0.5">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </Card>
    </Link>
  );
}
